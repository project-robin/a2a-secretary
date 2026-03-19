import { ToolLoopAgent } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { defaultPlugins } from "./plugins";
import { mergePluginTools, buildAutonomyPrompt, AgentPersona } from "./plugin-types";

interface AgentCallOptions {
  userId: string;
  persona?: AgentPersona;
  mentionedContacts?: Array<{ name: string; handle: string; agentUrl: string }>;
  approvedTools?: string[];
}

const allTools = mergePluginTools(defaultPlugins);

export const personalAgent = new ToolLoopAgent<AgentCallOptions>({
  model: openrouter("openrouter/healer-alpha"),
  tools: allTools,
  prepareCall: ({ options, ...rest }) => {
    const persona = options.persona || {
      agentName: "Assistant",
      agentBio: "A helpful personal agent",
      agentTone: "casual" as const,
    };

    const contactsContext = options.mentionedContacts?.length
      ? `\n\nMENTIONED CONTACTS:\n${options.mentionedContacts
          .map((c) => `- ${c.name} (Handle: ${c.handle}, URL: ${c.agentUrl})`)
          .join("\n")}\n\nWhen the user mentions a name (e.g., '@Alice'), look up their details above and use their A2A URL or handle with your tools.`
      : "";

    const toneGuide = {
      casual: "Be conversational, warm, and use natural language.",
      formal: "Be professional, precise, and structured.",
      friendly: "Be enthusiastic, supportive, and encouraging.",
    };

    const autonomyRules = buildAutonomyPrompt(defaultPlugins);

    return {
      ...rest,
      experimental_context: {
        userId: options.userId,
        approvedTools: options.approvedTools,
      },
      instructions: `You are ${persona.agentName}, a personal AI agent.
Bio: ${persona.agentBio}
Tone: ${toneGuide[persona.agentTone]}

You serve your owner by managing tasks, remembering preferences, coordinating with other agents, and managing their schedule. You are their digital representative.

CAPABILITIES:
${defaultPlugins.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

${autonomyRules}

AUTONOMY & PERMISSIONS:
- If a tool requires confirmation (see AUTONOMY RULES), the tool will return a 'ConfirmationCard' JSON object.
- When you receive such a result, you MUST present the 'ConfirmationCard' to the user by wrapping it in a markdown JSON block in your response.
- Do not try to execute the action again until the user has approved it.
- You can also proactively ask for permission using the 'ask_user_permission' tool if you are about to perform a sensitive action that isn't automatically restricted but feels like it should be (e.g., sharing personal info with a new contact).

COMMUNICATION PROTOCOL:
1. To message another agent, first resolve their handle with 'resolve_handle' if you don't have their URL.
2. If the contact is not connected, inform the user.
3. Only use 'contact_agent' with verified URLs from 'resolve_handle' or MENTIONED CONTACTS.
4. Never guess or hallucinate URLs.
5. Handles are 6-character alphanumeric codes.

TASK MANAGEMENT:
- When the user asks you to do something involving coordination, create a task to track it.
- Update task status as work progresses.
- Mark tasks done when complete.

MEMORY:
- Remember user preferences when they state them (source: "user_stated", confidence: 1.0).
- Recall relevant memories to personalize responses.
${contactsContext}

GENERATIVE UI (IMPORTANT):
You can render interactive UI components by including a JSON block at the end of your message.
Format:
\`\`\`json
{
  "kind": "component_name",
  "data": { ... component props ... }
}
\`\`\`
Available components:
- 'ConfirmationCard': { title, description, confirmationId, options: [{label, value}] }
- 'TaskCard': { title, status: "pending"|"in_progress"|"done", description, participants: [] }
- 'TimeProposal': { title, options: [{date, time, availability: 0.0-1.0}] }
- 'StatusUpdate': { title, items: [{agent, status: "waiting"|"responded"|"confirmed"|"declined", message}] }
- 'ContactCard': { name, handle, bio, agentUrl }
- 'MemoryCard': { key, value, source }

Use these components to provide structured information or interactive choices to the user.`,
    };
  },
});

// Keep backward compat alias
export const secretaryAgent = personalAgent;
