/* eslint-disable @typescript-eslint/no-explicit-any */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * TODO: Replace `any` with `QueryCtx` / `MutationCtx` once Convex types are
 * generated via `npx convex dev`. Currently, placeholder types in
 * `_generated/server.ts` do not provide type inference, so we use explicit
 * `any` to satisfy the compiler while maintaining the required logic.
 */

function generateHandle(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

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
    // Idempotency: check if the exact same event already exists
    const existingEvents = await ctx.db
      .query("calendarEvents")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("title"), args.title),
          q.eq(q.field("startTime"), args.startTime),
          q.eq(q.field("endTime"), args.endTime)
        )
      )
      .collect();

    if (existingEvents.length > 0) {
      console.log(`[Calendar] Event "${args.title}" already exists, skipping insertion to prevent duplicates.`);
      return;
    }

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

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx: any, args: any) => {
    return await ctx.db.get(args.userId);
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const getByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("users")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.handle.toUpperCase()))
      .unique();
  },
});

export const createUserForClerk = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    baseUrl: v.string(),
  },
  handler: async (ctx: any, { clerkId, name, baseUrl }: any) => {
    // Idempotency: return existing user if already created
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", clerkId))
      .unique();
    if (existing) return existing._id;

    // Generate a unique 6-char handle
    let handle = generateHandle();
    while (
      await ctx.db
        .query("users")
        .withIndex("by_handle", (q: any) => q.eq("handle", handle))
        .unique()
    ) {
      handle = generateHandle();
    }

    const userId = await ctx.db.insert("users", {
      agentName: name, // default agent name = user's display name
      agentUrl: "", // placeholder until we have the ID
      clerkId,
      handle,
      createdAt: Date.now(),
    });

    // Update agentUrl with the actual Convex ID
    await ctx.db.patch(userId, { agentUrl: `${baseUrl}/api/a2a/${userId}` });

    return userId;
  },
});

export const updatePersona = mutation({
  args: {
    userId: v.id("users"),
    agentName: v.string(),
    agentBio: v.string(),
    agentTone: v.string(),
  },
  handler: async (ctx: any, { userId, agentName, agentBio, agentTone }: any) => {
    await ctx.db.patch(userId, {
      agentName,
      agentBio,
      agentTone,
    });
  },
});

