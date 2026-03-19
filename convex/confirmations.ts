/* eslint-disable @typescript-eslint/no-explicit-any */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listPending = query({
  args: { userId: v.id("users") },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("pendingConfirmations")
      .withIndex("by_user_status", (q: any) =>
        q.eq("userId", args.userId).eq("status", "awaiting")
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    description: v.string(),
    context: v.string(),
    sourceAgentHandle: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    return await ctx.db.insert("pendingConfirmations", {
      userId: args.userId,
      type: args.type,
      description: args.description,
      context: args.context,
      sourceAgentHandle: args.sourceAgentHandle,
      status: "awaiting",
      createdAt: Date.now(),
    });
  },
});

export const resolve = mutation({
  args: {
    confirmationId: v.id("pendingConfirmations"),
    status: v.string(), // "approved" | "rejected"
  },
  handler: async (ctx: any, args: any) => {
    await ctx.db.patch(args.confirmationId, {
      status: args.status,
      resolvedAt: Date.now(),
    });
  },
});
