/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool } from "ai";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { AgentPlugin } from "../plugin-types";

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud";
  return new ConvexHttpClient(convexUrl);
}

const askUserPermission = tool({
  description: "Ask the user for permission before proceeding with a sensitive action (like adding a meeting to their calendar or committing to a plan). This will create an 'Action Required' item in the user's sidebar.",
  inputSchema: z.object({
    type: z.enum(["commitment", "schedule", "share_info"]).describe("The type of permission being requested."),
    description: z.string().describe("A clear, human-readable description of what you want to do (e.g., 'Add a meeting with Bob at 2pm tomorrow')."),
    tool: z.string().describe("The name of the tool that you want to call after receiving permission."),
    sourceAgentHandle: z.string().optional().describe("The handle of the remote agent who initiated this request, if applicable."),
  }),
  execute: async ({ type, description, tool: toolName, sourceAgentHandle }, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");

    const convex = getConvexClient();

    // Create the pending confirmation in Convex
    const confirmationId = await convex.mutation(api.confirmations.create, {
      userId: userId as any,
      type,
      description,
      context: JSON.stringify({ tool: toolName }),
      sourceAgentHandle,
    });

    // We also return a Generative UI component (ConfirmationCard) for the chat history
    return {
      kind: "ConfirmationCard",
      data: {
        title: "Permission Requested",
        description,
        confirmationId,
        options: [
          { label: "Approve", value: "approved" },
          { label: "Reject", value: "rejected" }
        ]
      }
    };
  },
});

export const autonomyPlugin: AgentPlugin = {
  name: "autonomy",
  description: "Tools for managing agent autonomy and user permissions.",
  tools: {
    ask_user_permission: askUserPermission,
  },
  autonomyRules: {
    autoHandle: [],
    requireConfirmation: [], // This tool itself is the confirmation mechanism
  },
};
