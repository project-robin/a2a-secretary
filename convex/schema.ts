import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    agentUrl: v.string(),
    clerkId: v.optional(v.string()),
    handle: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_clerkId", ["clerkId"])
    .index("by_handle", ["handle"]),
  calendarEvents: defineTable({
    userId: v.id("users"),
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  }).index("by_user", ["userId"]),
});
