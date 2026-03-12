import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    agentUrl: v.string(),
  }).index("by_name", ["name"]),
  calendarEvents: defineTable({
    userId: v.id("users"),
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  }).index("by_user", ["userId"]),
});
