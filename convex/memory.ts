/* eslint-disable @typescript-eslint/no-explicit-any */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("agentMemory")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();
  },
});

export const get = query({
  args: { userId: v.id("users"), key: v.string() },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("agentMemory")
      .withIndex("by_user_key", (q: any) =>
        q.eq("userId", args.userId).eq("key", args.key)
      )
      .unique();
  },
});

export const upsert = mutation({
  args: {
    userId: v.id("users"),
    key: v.string(),
    value: v.string(),
    source: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    const existing = await ctx.db
      .query("agentMemory")
      .withIndex("by_user_key", (q: any) =>
        q.eq("userId", args.userId).eq("key", args.key)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        source: args.source,
        confidence: args.confidence,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("agentMemory", {
      userId: args.userId,
      key: args.key,
      value: args.value,
      source: args.source,
      confidence: args.confidence,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { userId: v.id("users"), key: v.string() },
  handler: async (ctx: any, args: any) => {
    const existing = await ctx.db
      .query("agentMemory")
      .withIndex("by_user_key", (q: any) =>
        q.eq("userId", args.userId).eq("key", args.key)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
