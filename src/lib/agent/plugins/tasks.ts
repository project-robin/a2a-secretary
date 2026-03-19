/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { tool } from "ai";
import { z } from "zod";
import { AgentPlugin } from "../plugin-types";

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud";
  return new ConvexHttpClient(convexUrl);
}

export const tasksPlugin: AgentPlugin = {
  name: "tasks",
  description: "Manage personal tasks and todos.",
  autonomyRules: {
    autoHandle: ["list_tasks"],
    requireConfirmation: ["create_task", "update_task"],
  },
  tools: {
    list_tasks: tool({
      description: "List all tasks for the current user.",
      inputSchema: z.object({
        status: z.optional(z.string()).describe("Filter by status (pending, in_progress, done)."),
      }),
      execute: async ({ status }, { experimental_context }) => {
        console.log("[Plugin:Tasks] list_tasks called");
        const context = experimental_context as { userId?: string } | undefined;
        const userId = context?.userId;
        if (!userId) throw new Error("userId not found in execution context");

        const convex = getConvexClient();
        if (status) {
          return await convex.query(api.tasks.listByStatus, { userId, status } as any);
        }
        return await convex.query(api.tasks.list, { userId } as any);
      },
    }),

    create_task: tool({
      description: "Create a new task.",
      inputSchema: z.object({
        title: z.string().describe("Brief title of the task."),
        description: z.optional(z.string()).describe("Detailed description."),
        priority: z.optional(z.string()).describe("Priority (low, medium, high)."),
        relatedAgentHandle: z.optional(z.string()).describe("Handle of the remote agent this task is related to."),
      }),
      execute: async (args, { experimental_context }) => {
        console.log(`[Plugin:Tasks] create_task called: ${args.title}`);
        const context = experimental_context as { userId?: string } | undefined;
        const userId = context?.userId;
        if (!userId) throw new Error("userId not found in execution context");

        const convex = getConvexClient();
        await convex.mutation(api.tasks.create, {
          userId,
          ...args,
          assignedVia: "user"
        } as any);
        return "Task created successfully.";
      },
    }),

    update_task: tool({
      description: "Update an existing task's status, title, or description.",
      inputSchema: z.object({
        taskId: z.string().describe("The Convex ID of the task to update."),
        status: z.optional(z.string()).describe("New status (pending, in_progress, done)."),
        title: z.optional(z.string()).describe("New title."),
        description: z.optional(z.string()).describe("New description."),
        priority: z.optional(z.string()).describe("New priority."),
      }),
      execute: async (args, { experimental_context }) => {
        console.log(`[Plugin:Tasks] update_task called for ${args.taskId}`);
        const context = experimental_context as { userId?: string } | undefined;
        const userId = context?.userId;
        if (!userId) throw new Error("userId not found in execution context");

        const convex = getConvexClient();
        await convex.mutation(api.tasks.update, args as any);
        return "Task updated successfully.";
      },
    }),
  },
};
