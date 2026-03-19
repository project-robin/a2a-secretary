import { tool } from "ai";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { AgentPlugin } from "../plugin-types";

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud";
  return new ConvexHttpClient(convexUrl);
}

const remember = tool({
  description: "Store a piece of information the user wants you to remember (preference, fact, etc).",
  inputSchema: z.object({
    key: z.string().describe("Short key describing what to remember (e.g. 'preferred_meeting_time')."),
    value: z.string().describe("The value to remember."),
    source: z.enum(["user_stated", "agent_inferred", "a2a_learned"]).describe("How this was learned."),
    confidence: z.number().min(0).max(1).describe("Confidence level (1.0 for user-stated)."),
  }),
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");
    const convex = getConvexClient();
    await convex.mutation(api.memory.upsert, { userId, ...input } as any);
    return JSON.stringify({
      kind: "MemoryCard",
      data: {
        key: input.key,
        value: input.value,
        source: input.source
      }
    });
  },
});

const recall = tool({
  description: "Recall everything the agent knows about the user, or a specific memory by key.",
  inputSchema: z.object({
    key: z.string().optional().describe("Specific key to recall, or omit for all memories."),
  }),
  execute: async ({ key }, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");
    const convex = getConvexClient();
    if (key) {
      const memory = await convex.query(api.memory.get, { userId, key } as any);
      return memory || { error: `No memory found for key '${key}'` };
    }
    return await convex.query(api.memory.list, { userId } as any);
  },
});

const forget = tool({
  description: "Remove a specific memory by key.",
  inputSchema: z.object({
    key: z.string().describe("The key of the memory to forget."),
  }),
  execute: async ({ key }, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");
    const convex = getConvexClient();
    await convex.mutation(api.memory.remove, { userId, key } as any);
    return { success: true, forgotten: key };
  },
});

export const memoryPlugin: AgentPlugin = {
  name: "memory",
  description: "Remember, recall, and forget user preferences and context.",
  tools: {
    remember: remember,
    recall: recall,
    forget: forget,
  },
  autonomyRules: {
    autoHandle: ["recall"],
    requireConfirmation: ["remember", "forget"],
  },
};
