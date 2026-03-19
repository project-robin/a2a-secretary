/* eslint-disable @typescript-eslint/no-explicit-any */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();
  },
});

export const listByStatus = query({
  args: { userId: v.id("users"), status: v.string() },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user_status", (q: any) =>
        q.eq("userId", args.userId).eq("status", args.status)
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.string()),
    assignedVia: v.optional(v.string()),
    relatedAgentHandle: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    return await ctx.db.insert("tasks", {
      userId: args.userId,
      title: args.title,
      description: args.description,
      status: "pending",
      priority: args.priority || "medium",
      assignedVia: args.assignedVia || "user",
      relatedAgentHandle: args.relatedAgentHandle,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const { taskId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    if (filtered.status === "done") {
      (filtered as any).completedAt = Date.now();
    }
    await ctx.db.patch(taskId, filtered);
  },
});
