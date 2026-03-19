import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

export interface AutonomyRules {
  autoHandle: string[];        // tool names agent can use without asking
  requireConfirmation: string[]; // tool names that need owner approval
}

export interface AgentPlugin {
  name: string;
  description: string;
  tools: Record<string, any>;
  autonomyRules: AutonomyRules;
}

export interface AgentPersona {
  agentName: string;
  agentBio: string;
  agentTone: "casual" | "formal" | "friendly";
}

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud";
  return new ConvexHttpClient(convexUrl);
}

export function mergePluginTools(
  plugins: AgentPlugin[]
): Record<string, any> {
  const tools: Record<string, any> = {};
  for (const plugin of plugins) {
    for (const [name, tool] of Object.entries(plugin.tools)) {
      // Wrap tools that require confirmation
      if (plugin.autonomyRules.requireConfirmation.includes(name)) {
        const originalExecute = tool.execute;
        if (originalExecute) {
          tool.execute = async (args: any, context: any) => {
            const userId = context.experimental_context?.userId;
            if (!userId) throw new Error("userId required for confirmation check");

            // 1. Check if we have an explicit approval in the context for this call
            // (Passed from the executor when a user clicks 'Approve')
            if (context.experimental_context?.approvedTools?.includes(name)) {
              console.log(`[Autonomy] Tool '${name}' approved via context. Executing.`);
              return await originalExecute(args, context);
            }

            // 2. Otherwise, create a pending confirmation in Convex
            console.log(`[Autonomy] Tool '${name}' requires confirmation. Creating request.`);
            const convex = getConvexClient();
            const confirmationId = await convex.mutation(api.confirmations.create, {
              userId,
              type: "tool_call",
              description: `Agent wants to call ${name} with arguments: ${JSON.stringify(args)}`,
              context: JSON.stringify({ tool: name, args }),
              sourceAgentHandle: "self",
            } as any);

            return JSON.stringify({
              kind: "ConfirmationCard",
              data: {
                title: "Permission Required",
                description: `I need your approval to execute the '${name}' tool.`,
                confirmationId,
                options: [
                  { label: "Approve", value: "approved" },
                  { label: "Reject", value: "rejected" }
                ]
              }
            });
          };
        }
      }
      tools[name] = tool;
    }
  }
  return tools;
}

export function buildAutonomyPrompt(plugins: AgentPlugin[]): string {
  const sections = plugins.map((p) => {
    const auto = p.autonomyRules.autoHandle.join(", ") || "none";
    const confirm = p.autonomyRules.requireConfirmation.join(", ") || "none";
    return `[${p.name}] Auto: ${auto} | Confirm: ${confirm}`;
  });
  return `AUTONOMY RULES:\n${sections.join("\n")}`;
}
