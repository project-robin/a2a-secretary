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

  contacts: defineTable({
    ownerId: v.id("users"),       // The user who added the contact
    contactUserId: v.id("users"), // The user being added
    status: v.string(),           // "pending" | "connected"
    createdAt: v.number(),        // Timestamp
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_contact", ["ownerId", "contactUserId"])
    .index("by_contact", ["contactUserId"])
});
