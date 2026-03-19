import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const send = mutation({
  args: {
    userId: v.id("users"),
    role: v.string(),
    text: v.string(),
    richContent: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      userId: args.userId,
      role: args.role,
      text: args.text,
      richContent: args.richContent,
      metadata: args.metadata,
      createdAt: args.createdAt || Date.now(),
    });
  },
});
