/* eslint-disable @typescript-eslint/no-explicit-any */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * TODO: Replace `any` with `QueryCtx` / `MutationCtx` once Convex types are
 * generated via `npx convex dev`. Currently, placeholder types in
 * `_generated/server.ts` do not provide type inference, so we use explicit
 * `any` to satisfy the compiler while maintaining the required logic.
 */

export const getEvents = query({
  args: { userId: v.id("users") },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("calendarEvents")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();
  },
});

export const addEvent = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    await ctx.db.insert("calendarEvents", {
      userId: args.userId,
      title: args.title,
      startTime: args.startTime,
      endTime: args.endTime,
    });
  },
});

export const getUsers = query({
  args: {},
  handler: async (ctx: any) => {
    return await ctx.db.query("users").collect();
  },
});

export const seedUsers = mutation({
  args: {},
  handler: async (ctx: any) => {
    const existingUsers = await ctx.db.query("users").collect();
    if (existingUsers.length === 0) {
      const aliceId = await ctx.db.insert("users", {
        name: "Alice",
        agentUrl: "http://localhost:3000/api/a2a/alice",
      });
      const bobId = await ctx.db.insert("users", {
        name: "Bob",
        agentUrl: "http://localhost:3000/api/a2a/bob",
      });
      return { aliceId, bobId };
    }
  },
});
