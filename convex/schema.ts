import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.optional(v.string()),
    handle: v.optional(v.string()),
    agentUrl: v.string(),
    // Agent persona (new)
    agentName: v.string(),
    agentBio: v.optional(v.string()),
    agentTone: v.optional(v.string()), // "casual" | "formal" | "friendly"
    createdAt: v.optional(v.number()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_handle", ["handle"])
    .index("by_agentUrl", ["agentUrl"]),

  calendarEvents: defineTable({
    userId: v.id("users"),
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  }).index("by_user", ["userId"]),

  tasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(), // "pending" | "in_progress" | "done"
    priority: v.optional(v.string()), // "low" | "medium" | "high"
    assignedVia: v.optional(v.string()), // "user" | "agent" | "a2a"
    relatedAgentHandle: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  agentMemory: defineTable({
    userId: v.id("users"),
    key: v.string(),
    value: v.string(),
    source: v.string(), // "user_stated" | "agent_inferred" | "a2a_learned"
    confidence: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_key", ["userId", "key"]),

  contacts: defineTable({
    ownerId: v.id("users"),
    contactUserId: v.id("users"),
    status: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_contact", ["ownerId", "contactUserId"])
    .index("by_contact", ["contactUserId"]),

  messages: defineTable({
    userId: v.id("users"),
    role: v.string(), // "user" | "assistant" | "remote_agent" | "system"
    text: v.string(),
    richContent: v.optional(v.string()), // json-render spec (JSON string)
    metadata: v.optional(v.string()), // JSON: mentions, task refs, etc.
    createdAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  pendingConfirmations: defineTable({
    userId: v.id("users"),
    type: v.string(), // "commitment" | "schedule" | "share_info"
    description: v.string(),
    context: v.string(), // JSON: full context for resuming
    sourceAgentHandle: v.optional(v.string()),
    status: v.string(), // "awaiting" | "approved" | "rejected"
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),
});
