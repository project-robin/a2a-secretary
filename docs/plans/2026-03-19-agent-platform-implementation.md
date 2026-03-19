# Agent Platform Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the calendar-centric secretary into a general-purpose personal agent platform with plugin architecture, json-render rich UI, and semi-autonomous behavior.

**Architecture:** Conversation-centric hub with pluggable tool system. Agent responses use json-render for interactive components. Semi-autonomous engine classifies incoming A2A actions as auto/confirm/deny. Convex backend extended with tasks, memory, and confirmations tables.

**Tech Stack:** Next.js 16, React 19, Convex, AI SDK v6 (`ai`), `@json-render/core` + `@json-render/react`, `@a2a-js/sdk`, Clerk, OpenRouter, Tailwind v4, Zod v4

---

## Phase 1: Dependencies & Schema Foundation

### Task 1: Install new dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install json-render packages**

Run: `npm install @json-render/core @json-render/react`

**Step 2: Verify installation**

Run: `npm ls @json-render/core @json-render/react`
Expected: Both packages listed without errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add json-render dependencies"
```

---

### Task 2: Extend Convex schema with new tables

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Update the schema**

Replace the entire `convex/schema.ts` with:

```typescript
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
```

**Step 2: Update existing user creation to include new fields**

Modify `convex/calendar.ts` — the `createUserForClerk` mutation. Add `agentName` field (defaulting to the Clerk display name) and `createdAt`:

In `convex/calendar.ts:130-135`, change the `ctx.db.insert` call:

```typescript
const userId = await ctx.db.insert("users", {
  agentName: name, // default agent name = user's display name
  agentUrl: "", // placeholder until we have the ID
  clerkId,
  handle,
  createdAt: Date.now(),
});
```

Note: Remove the `name` field from the insert since we're replacing it with `agentName`. The `name` field is removed from the schema.

**Step 3: Run `npx convex dev` to verify schema pushes**

Run: `npx convex dev --once`
Expected: Schema successfully pushed, no errors

**Step 4: Commit**

```bash
git add convex/schema.ts convex/calendar.ts
git commit -m "feat: extend schema with tasks, memory, confirmations tables and agent persona fields"
```

---

### Task 3: Create Convex functions for tasks

**Files:**
- Create: `convex/tasks.ts`

**Step 1: Write the tasks module**

```typescript
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
```

**Step 2: Verify it compiles**

Run: `npx convex dev --once`
Expected: No errors

**Step 3: Commit**

```bash
git add convex/tasks.ts
git commit -m "feat: add Convex tasks CRUD functions"
```

---

### Task 4: Create Convex functions for agent memory

**Files:**
- Create: `convex/memory.ts`

**Step 1: Write the memory module**

```typescript
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
```

**Step 2: Verify**

Run: `npx convex dev --once`
Expected: No errors

**Step 3: Commit**

```bash
git add convex/memory.ts
git commit -m "feat: add Convex agent memory CRUD functions"
```

---

### Task 5: Create Convex functions for pending confirmations

**Files:**
- Create: `convex/confirmations.ts`

**Step 1: Write the confirmations module**

```typescript
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
```

**Step 2: Verify**

Run: `npx convex dev --once`

**Step 3: Commit**

```bash
git add convex/confirmations.ts
git commit -m "feat: add Convex pending confirmations functions"
```

---

### Task 6: Update messages to support rich content

**Files:**
- Modify: `convex/messages.ts`

**Step 1: Read current messages.ts**

Read `convex/messages.ts` to understand the current structure.

**Step 2: Update the send mutation to accept optional richContent and metadata**

Add optional `richContent` and `metadata` string fields to the `send` mutation args. Add optional `createdAt` that defaults to `Date.now()`.

**Step 3: Verify**

Run: `npx convex dev --once`

**Step 4: Commit**

```bash
git add convex/messages.ts
git commit -m "feat: extend messages with richContent and metadata fields"
```

---

## Phase 2: Plugin System & Agent Core

### Task 7: Create the plugin type system

**Files:**
- Create: `src/lib/agent/plugin-types.ts`

**Step 1: Write the plugin interface**

```typescript
import { CoreTool } from "ai";

export interface AutonomyRules {
  autoHandle: string[];        // tool names agent can use without asking
  requireConfirmation: string[]; // tool names that need owner approval
}

export interface AgentPlugin {
  name: string;
  description: string;
  tools: Record<string, CoreTool>;
  autonomyRules: AutonomyRules;
}

export interface AgentPersona {
  agentName: string;
  agentBio: string;
  agentTone: "casual" | "formal" | "friendly";
}

export function mergePluginTools(
  plugins: AgentPlugin[]
): Record<string, CoreTool> {
  const tools: Record<string, CoreTool> = {};
  for (const plugin of plugins) {
    for (const [name, tool] of Object.entries(plugin.tools)) {
      tools[name] = tool;
    }
  }
  return tools;
}

export function buildAutonomyPrompt(plugins: AgentPlugin[]): string {
  const sections = plugins.map((p) => {
    const auto = p.autonomyRules.autoHandle.join(", ") || "none";
    const confirm = p.autonomyRules.requireConfirmation.join(", ") || "none";
    return `[${p.name}] Auto: ${auto} | Confirm: ${confirm}`;
  });
  return `AUTONOMY RULES:\n${sections.join("\n")}`;
}
```

**Step 2: Commit**

```bash
git add src/lib/agent/plugin-types.ts
git commit -m "feat: add agent plugin type system"
```

---

### Task 8: Create calendar plugin

**Files:**
- Create: `src/lib/agent/plugins/calendar.ts`

**Step 1: Write the calendar plugin**

Extract `checkCalendar` and `addMeeting` from `src/lib/agent/tools.ts` into a plugin module. Also add a `find_free_slots` tool.

```typescript
import { tool } from "ai";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { AgentPlugin } from "../plugin-types";

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud";
  return new ConvexHttpClient(convexUrl);
}

const checkCalendar = tool({
  description: "Check the current user's calendar for existing events.",
  inputSchema: z.object({}),
  execute: async (_input, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");
    const convex = getConvexClient();
    const events = await convex.query(api.calendar.getEvents, { userId } as any);
    return events;
  },
});

const addEvent = tool({
  description: "Add an event to the current user's calendar.",
  inputSchema: z.object({
    title: z.string().describe("Title of the event."),
    startTime: z.number().describe("Start time as Unix timestamp in ms."),
    endTime: z.number().describe("End time as Unix timestamp in ms."),
  }),
  execute: async ({ title, startTime, endTime }, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");
    const convex = getConvexClient();
    await convex.mutation(api.calendar.addEvent, { userId, title, startTime, endTime } as any);
    return "Event added successfully.";
  },
});

export const calendarPlugin: AgentPlugin = {
  name: "calendar",
  description: "Manage calendar events — check availability and create events.",
  tools: {
    check_calendar: checkCalendar,
    add_event: addEvent,
  },
  autonomyRules: {
    autoHandle: ["check_calendar"],
    requireConfirmation: ["add_event"],
  },
};
```

**Step 2: Commit**

```bash
git add src/lib/agent/plugins/calendar.ts
git commit -m "feat: extract calendar tools into plugin module"
```

---

### Task 9: Create tasks plugin

**Files:**
- Create: `src/lib/agent/plugins/tasks.ts`

**Step 1: Write the tasks plugin**

```typescript
import { tool } from "ai";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { AgentPlugin } from "../plugin-types";

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud";
  return new ConvexHttpClient(convexUrl);
}

const createTask = tool({
  description: "Create a new task for the user.",
  inputSchema: z.object({
    title: z.string().describe("Task title."),
    description: z.string().optional().describe("Detailed description."),
    priority: z.enum(["low", "medium", "high"]).optional().describe("Priority level."),
    assignedVia: z.enum(["user", "agent", "a2a"]).optional().describe("How this task was assigned."),
    relatedAgentHandle: z.string().optional().describe("Handle of related agent."),
  }),
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");
    const convex = getConvexClient();
    const id = await convex.mutation(api.tasks.create, { userId, ...input } as any);
    return { success: true, taskId: id };
  },
});

const listTasks = tool({
  description: "List the user's tasks. Optionally filter by status.",
  inputSchema: z.object({
    status: z.enum(["pending", "in_progress", "done"]).optional().describe("Filter by status."),
  }),
  execute: async ({ status }, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");
    const convex = getConvexClient();
    if (status) {
      return await convex.query(api.tasks.listByStatus, { userId, status } as any);
    }
    return await convex.query(api.tasks.list, { userId } as any);
  },
});

const updateTask = tool({
  description: "Update a task's status, title, description, or priority.",
  inputSchema: z.object({
    taskId: z.string().describe("The task ID to update."),
    status: z.enum(["pending", "in_progress", "done"]).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
  }),
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    if (!context?.userId) throw new Error("userId not found in execution context");
    const convex = getConvexClient();
    await convex.mutation(api.tasks.update, input as any);
    return { success: true };
  },
});

export const tasksPlugin: AgentPlugin = {
  name: "tasks",
  description: "Create, list, and manage tasks.",
  tools: {
    create_task: createTask,
    list_tasks: listTasks,
    update_task: updateTask,
  },
  autonomyRules: {
    autoHandle: ["list_tasks"],
    requireConfirmation: ["create_task", "update_task"],
  },
};
```

**Step 2: Commit**

```bash
git add src/lib/agent/plugins/tasks.ts
git commit -m "feat: add tasks plugin with CRUD tools"
```

---

### Task 10: Create memory plugin

**Files:**
- Create: `src/lib/agent/plugins/memory.ts`

**Step 1: Write the memory plugin**

```typescript
import { tool } from "ai";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { AgentPlugin } from "../plugin-types";

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud";
  return new ConvexHttpClient(convexUrl);
}

const remember = tool({
  description: "Store a piece of information the user wants you to remember (preference, fact, etc).",
  inputSchema: z.object({
    key: z.string().describe("Short key describing what to remember (e.g. 'preferred_meeting_time')."),
    value: z.string().describe("The value to remember."),
    source: z.enum(["user_stated", "agent_inferred", "a2a_learned"]).describe("How this was learned."),
    confidence: z.number().min(0).max(1).describe("Confidence level (1.0 for user-stated)."),
  }),
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");
    const convex = getConvexClient();
    await convex.mutation(api.memory.upsert, { userId, ...input } as any);
    return { success: true, key: input.key };
  },
});

const recall = tool({
  description: "Recall everything the agent knows about the user, or a specific memory by key.",
  inputSchema: z.object({
    key: z.string().optional().describe("Specific key to recall, or omit for all memories."),
  }),
  execute: async ({ key }, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");
    const convex = getConvexClient();
    if (key) {
      const memory = await convex.query(api.memory.get, { userId, key } as any);
      return memory || { error: `No memory found for key '${key}'` };
    }
    return await convex.query(api.memory.list, { userId } as any);
  },
});

const forget = tool({
  description: "Remove a specific memory by key.",
  inputSchema: z.object({
    key: z.string().describe("The key of the memory to forget."),
  }),
  execute: async ({ key }, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");
    const convex = getConvexClient();
    await convex.mutation(api.memory.remove, { userId, key } as any);
    return { success: true, forgotten: key };
  },
});

export const memoryPlugin: AgentPlugin = {
  name: "memory",
  description: "Remember, recall, and forget user preferences and context.",
  tools: {
    remember: remember,
    recall: recall,
    forget: forget,
  },
  autonomyRules: {
    autoHandle: ["recall"],
    requireConfirmation: ["remember", "forget"],
  },
};
```

**Step 2: Commit**

```bash
git add src/lib/agent/plugins/memory.ts
git commit -m "feat: add memory plugin with remember/recall/forget tools"
```

---

### Task 11: Create A2A communication plugin

**Files:**
- Create: `src/lib/agent/plugins/a2a.ts`

**Step 1: Write the A2A plugin**

Extract and enhance `contactRemoteAgent`, `resolveContactUrl`, `getContacts`, and `getAgentCard` from `src/lib/agent/tools.ts`. Add `broadcast_to_group`.

```typescript
import { tool } from "ai";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { A2AClient } from "@a2a-js/sdk/client";
import { api } from "../../../../convex/_generated/api";
import { AgentPlugin } from "../plugin-types";

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud";
  return new ConvexHttpClient(convexUrl);
}

const contactAgent = tool({
  description: "Send a message to another agent via A2A protocol.",
  inputSchema: z.object({
    remoteAgentUrl: z.string().describe("The full A2A URL of the remote agent."),
    message: z.string().describe("The message to send."),
  }),
  execute: async ({ remoteAgentUrl, message }, { experimental_context }) => {
    const trimmedUrl = remoteAgentUrl.replace(/\/+$/, "");
    const baseUrl = trimmedUrl.endsWith("/jsonrpc")
      ? trimmedUrl.slice(0, -"/jsonrpc".length)
      : trimmedUrl.endsWith("/.well-known/agent.json")
        ? trimmedUrl.slice(0, -"/.well-known/agent.json".length)
        : trimmedUrl.endsWith("/.well-known/agent-card.json")
          ? trimmedUrl.slice(0, -"/.well-known/agent-card.json".length)
          : trimmedUrl;

    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (userId) {
      const convex = getConvexClient();
      await convex.mutation(api.messages.send, {
        userId: userId as any,
        role: "assistant",
        text: `[Sending to remote agent]: ${message}`,
      });
    }

    const client = new A2AClient(baseUrl);
    const response = await client.sendMessage({
      message: {
        kind: "message",
        role: "user",
        messageId: crypto.randomUUID(),
        parts: [{ kind: "text", text: message } as any],
      },
    });
    return JSON.stringify(response);
  },
});

const resolveHandle = tool({
  description: "Resolve a 6-character handle to an A2A agent URL. Call before contact_agent if you only have a handle.",
  inputSchema: z.object({
    handle: z.string().describe("The 6-character handle code (e.g. XK9MP2)."),
  }),
  execute: async ({ handle }, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");

    const convex = getConvexClient();
    const targetUser = await convex.query(api.calendar.getByHandle, { handle });
    if (!targetUser) return { error: `No user found with handle ${handle}` };

    const contacts = await convex.query(api.contacts.getContacts, { ownerId: userId as any });
    const contact = contacts.find((c: any) => c.contactUserId === targetUser._id);
    const isConnected = contact?.status === "connected";

    return {
      name: (targetUser as any).agentName || (targetUser as any).name,
      agentUrl: (targetUser as any).agentUrl,
      connected: isConnected,
    };
  },
});

const getContacts = tool({
  description: "List all connected contacts.",
  inputSchema: z.object({}),
  execute: async (_input, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");

    const convex = getConvexClient();
    const contacts = await convex.query(api.contacts.getContacts, { ownerId: userId as any });
    return contacts.map((c: any) => ({
      name: c.user?.agentName || c.user?.name,
      handle: c.user?.handle || "External Agent",
      agentUrl: c.user?.agentUrl,
      status: c.status,
    }));
  },
});

const getAgentCard = tool({
  description: "Fetch a remote agent's card metadata (capabilities, name, etc).",
  inputSchema: z.object({
    agentUrl: z.string().describe("The base URL of the remote agent."),
  }),
  execute: async ({ agentUrl }) => {
    const trimmedUrl = agentUrl.replace(/\/+$/, "");
    let cardUrl = `${trimmedUrl}/.well-known/agent-card.json`;
    if (trimmedUrl.endsWith("/.well-known/agent-card.json") || trimmedUrl.endsWith("/.well-known/agent.json")) {
      cardUrl = trimmedUrl;
    }
    try {
      const response = await fetch(cardUrl);
      if (!response.ok) {
        return { error: `Failed to fetch agent card: ${response.status}` };
      }
      return await response.json();
    } catch (err) {
      return { error: `Error: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
});

const broadcastToGroup = tool({
  description: "Send the same message to multiple agents simultaneously. Use for group coordination (e.g. picnic planning).",
  inputSchema: z.object({
    handles: z.array(z.string()).describe("Array of 6-character handles to contact."),
    message: z.string().describe("The message to send to all agents."),
  }),
  execute: async ({ handles, message }, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");

    const convex = getConvexClient();
    const results: Array<{ handle: string; status: string; response?: any; error?: string }> = [];

    for (const handle of handles) {
      try {
        const targetUser = await convex.query(api.calendar.getByHandle, { handle });
        if (!targetUser) {
          results.push({ handle, status: "error", error: "User not found" });
          continue;
        }

        const contacts = await convex.query(api.contacts.getContacts, { ownerId: userId as any });
        const contact = contacts.find((c: any) => c.contactUserId === targetUser._id);
        if (contact?.status !== "connected") {
          results.push({ handle, status: "error", error: "Not connected" });
          continue;
        }

        const baseUrl = (targetUser as any).agentUrl;
        const client = new A2AClient(baseUrl);
        const response = await client.sendMessage({
          message: {
            kind: "message",
            role: "user",
            messageId: crypto.randomUUID(),
            parts: [{ kind: "text", text: message } as any],
          },
        });
        results.push({ handle, status: "success", response });
      } catch (err) {
        results.push({ handle, status: "error", error: err instanceof Error ? err.message : String(err) });
      }
    }

    return results;
  },
});

export const a2aPlugin: AgentPlugin = {
  name: "a2a",
  description: "Communicate with other agents via A2A protocol.",
  tools: {
    contact_agent: contactAgent,
    resolve_handle: resolveHandle,
    get_contacts: getContacts,
    get_agent_card: getAgentCard,
    broadcast_to_group: broadcastToGroup,
  },
  autonomyRules: {
    autoHandle: ["get_contacts", "get_agent_card", "resolve_handle"],
    requireConfirmation: ["contact_agent", "broadcast_to_group"],
  },
};
```

**Step 2: Commit**

```bash
git add src/lib/agent/plugins/a2a.ts
git commit -m "feat: add A2A communication plugin with broadcast_to_group"
```

---

### Task 12: Create plugin registry and rewrite agent definition

**Files:**
- Create: `src/lib/agent/plugins/index.ts`
- Modify: `src/lib/agent/definition.ts`

**Step 1: Create plugin registry**

```typescript
// src/lib/agent/plugins/index.ts
import { calendarPlugin } from "./calendar";
import { tasksPlugin } from "./tasks";
import { memoryPlugin } from "./memory";
import { a2aPlugin } from "./a2a";
import { AgentPlugin } from "../plugin-types";

export const defaultPlugins: AgentPlugin[] = [
  calendarPlugin,
  tasksPlugin,
  memoryPlugin,
  a2aPlugin,
];

export { calendarPlugin, tasksPlugin, memoryPlugin, a2aPlugin };
```

**Step 2: Rewrite `src/lib/agent/definition.ts`**

Replace the entire file with a persona-aware, plugin-based agent:

```typescript
import { ToolLoopAgent } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { defaultPlugins } from "./plugins";
import { mergePluginTools, buildAutonomyPrompt, AgentPersona } from "./plugin-types";

interface AgentCallOptions {
  userId: string;
  persona?: AgentPersona;
  mentionedContacts?: Array<{ name: string; handle: string; agentUrl: string }>;
}

const allTools = mergePluginTools(defaultPlugins);

export const personalAgent = new ToolLoopAgent<AgentCallOptions>({
  model: openrouter("nvidia/nemotron-3-super-120b-a12b:free"),
  tools: allTools,
  prepareCall: ({ options, ...rest }) => {
    const persona = options.persona || {
      agentName: "Assistant",
      agentBio: "A helpful personal agent",
      agentTone: "casual" as const,
    };

    const contactsContext = options.mentionedContacts?.length
      ? `\n\nMENTIONED CONTACTS:\n${options.mentionedContacts
          .map((c) => `- ${c.name} (Handle: ${c.handle}, URL: ${c.agentUrl})`)
          .join("\n")}\n\nWhen the user mentions a name (e.g., '@Alice'), look up their details above and use their A2A URL or handle with your tools.`
      : "";

    const toneGuide = {
      casual: "Be conversational, warm, and use natural language.",
      formal: "Be professional, precise, and structured.",
      friendly: "Be enthusiastic, supportive, and encouraging.",
    };

    const autonomyRules = buildAutonomyPrompt(defaultPlugins);

    return {
      ...rest,
      experimental_context: { userId: options.userId },
      instructions: `You are ${persona.agentName}, a personal AI agent.
Bio: ${persona.agentBio}
Tone: ${toneGuide[persona.agentTone]}

You serve your owner by managing tasks, remembering preferences, coordinating with other agents, and managing their schedule. You are their digital representative.

CAPABILITIES:
${defaultPlugins.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

${autonomyRules}

COMMUNICATION PROTOCOL:
1. To message another agent, first resolve their handle with 'resolve_handle' if you don't have their URL.
2. If the contact is not connected, inform the user.
3. Only use 'contact_agent' with verified URLs from 'resolve_handle' or MENTIONED CONTACTS.
4. Never guess or hallucinate URLs.
5. Handles are 6-character alphanumeric codes.

TASK MANAGEMENT:
- When the user asks you to do something involving coordination, create a task to track it.
- Update task status as work progresses.
- Mark tasks done when complete.

MEMORY:
- Remember user preferences when they state them (source: "user_stated", confidence: 1.0).
- Recall relevant memories to personalize responses.
${contactsContext}`,
    };
  },
});
```

**Step 3: Verify the build**

Run: `npm run build`
Expected: Build succeeds (or only pre-existing warnings)

**Step 4: Commit**

```bash
git add src/lib/agent/plugins/index.ts src/lib/agent/definition.ts
git commit -m "feat: rewrite agent definition with plugin system and persona support"
```

---

### Task 13: Update executor and chat API for persona

**Files:**
- Modify: `src/lib/a2a/executor.ts`
- Modify: `src/app/api/chat/route.ts`

**Step 1: Update executor to accept persona**

```typescript
// src/lib/a2a/executor.ts
import { personalAgent } from "../agent/definition";
import { AgentPersona } from "../agent/plugin-types";

export async function executeAgent(
  userId: string,
  message: string,
  mentionedContacts?: Array<{ name: string; handle: string; agentUrl: string }>,
  persona?: AgentPersona
): Promise<string> {
  const { text } = await personalAgent.generate({
    prompt: message,
    options: { userId, mentionedContacts, persona },
  });

  return text || "No response generated.";
}
```

**Step 2: Update chat API to fetch user persona from Convex**

In `src/app/api/chat/route.ts`, after fetching the user, extract persona fields and pass to `executeAgent`:

```typescript
// After line 23 (const user = await convex.query(...))
const persona = {
  agentName: user.agentName || user.name || "Assistant",
  agentBio: user.agentBio || "A helpful personal agent",
  agentTone: (user.agentTone || "casual") as "casual" | "formal" | "friendly",
};

// Update the executeAgent call
const text = await executeAgent(user._id, message, mentionedContacts, persona);
```

**Step 3: Update A2A route to also pass persona**

In `src/app/api/a2a/[userId]/[...route]/route.ts`, similarly extract persona when handling incoming A2A messages and pass to `executeAgent`.

**Step 4: Verify build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/lib/a2a/executor.ts src/app/api/chat/route.ts src/app/api/a2a/[userId]/[...route]/route.ts
git commit -m "feat: pass agent persona through executor to agent runtime"
```

---

### Task 14: Update A2A agent card to reflect persona

**Files:**
- Modify: `src/app/api/a2a/[userId]/[...route]/route.ts`

**Step 1: Enhance the agent card response**

In the GET handler, update the JSON response to use `agentName` and `agentBio`, and add a `skills` array:

```typescript
return NextResponse.json({
  name: user.agentName || user.name || "Agent",
  description: user.agentBio || `Personal AI agent for ${user.agentName || user.name}`,
  url: jsonrpcUrl,
  endpoints: {
    jsonrpc: jsonrpcUrl,
  },
  skills: [
    { id: "calendar", name: "Calendar Management" },
    { id: "tasks", name: "Task Management" },
    { id: "memory", name: "Memory & Preferences" },
    { id: "coordination", name: "Group Coordination" },
  ],
});
```

**Step 2: Commit**

```bash
git add src/app/api/a2a/[userId]/[...route]/route.ts
git commit -m "feat: enhance A2A agent card with persona and skills"
```

---

## Phase 3: json-render Integration

### Task 15: Set up json-render catalog

**Files:**
- Create: `src/lib/json-render/catalog.ts`

**Step 1: Define the agent UI component catalog**

```typescript
import { defineCatalog } from "@json-render/core";
import { z } from "zod";

export const agentCatalog = defineCatalog({
  ConfirmationCard: {
    props: z.object({
      title: z.string(),
      description: z.string(),
      confirmationId: z.string(),
      options: z.array(
        z.object({ label: z.string(), value: z.string() })
      ),
    }),
    actions: {
      onConfirm: z.object({ value: z.string() }),
    },
  },

  TaskCard: {
    props: z.object({
      title: z.string(),
      status: z.enum(["pending", "in_progress", "done"]),
      description: z.optional(z.string()),
      participants: z.optional(z.array(z.string())),
    }),
    actions: {
      onComplete: z.object({}),
    },
  },

  TimeProposal: {
    props: z.object({
      title: z.string(),
      options: z.array(
        z.object({
          date: z.string(),
          time: z.string(),
          availability: z.number(),
        })
      ),
    }),
    actions: {
      onSelect: z.object({ date: z.string(), time: z.string() }),
    },
  },

  StatusUpdate: {
    props: z.object({
      title: z.string(),
      items: z.array(
        z.object({
          agent: z.string(),
          status: z.enum(["waiting", "responded", "confirmed", "declined"]),
          message: z.optional(z.string()),
        })
      ),
    }),
  },

  ContactCard: {
    props: z.object({
      name: z.string(),
      handle: z.string(),
      bio: z.optional(z.string()),
      agentUrl: z.string(),
    }),
    actions: {
      onConnect: z.object({}),
    },
  },

  MemoryCard: {
    props: z.object({
      key: z.string(),
      value: z.string(),
      source: z.string(),
    }),
    actions: {
      onForget: z.object({ key: z.string() }),
    },
  },
});
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/lib/json-render/catalog.ts`
(If this fails due to module resolution, verify `@json-render/core` is installed correctly)

**Step 3: Commit**

```bash
git add src/lib/json-render/catalog.ts
git commit -m "feat: define json-render catalog with 6 agent UI components"
```

---

### Task 16: Create json-render React registry

**Files:**
- Create: `src/lib/json-render/registry.tsx`
- Create: `src/lib/json-render/components/ConfirmationCard.tsx`
- Create: `src/lib/json-render/components/TaskCard.tsx`
- Create: `src/lib/json-render/components/TimeProposal.tsx`
- Create: `src/lib/json-render/components/StatusUpdate.tsx`
- Create: `src/lib/json-render/components/ContactCard.tsx`
- Create: `src/lib/json-render/components/MemoryCard.tsx`

**Step 1: Create each component**

Each component receives typed props from the catalog and renders a styled card using Tailwind. Components with actions call the action handler when the user interacts.

This is a large step — create each component file individually, then create the registry that maps catalog entries to React components.

Example for ConfirmationCard:

```tsx
// src/lib/json-render/components/ConfirmationCard.tsx
"use client";

interface ConfirmationCardProps {
  title: string;
  description: string;
  confirmationId: string;
  options: Array<{ label: string; value: string }>;
  onConfirm?: (data: { value: string }) => void;
}

export function ConfirmationCard({ title, description, options, onConfirm }: ConfirmationCardProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 my-2">
      <h3 className="font-display font-bold text-stone-800 text-sm mb-1">{title}</h3>
      <p className="text-stone-600 text-sm mb-3">{description}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onConfirm?.({ value: opt.value })}
            className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-colors"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

Follow the same pattern for TaskCard, TimeProposal, StatusUpdate, ContactCard, and MemoryCard. Each uses the design language from the existing app (stone colors, rounded corners, font-display).

**Step 2: Create the registry**

```tsx
// src/lib/json-render/registry.tsx
"use client";

import { defineRegistry } from "@json-render/react";
import { agentCatalog } from "./catalog";
import { ConfirmationCard } from "./components/ConfirmationCard";
import { TaskCard } from "./components/TaskCard";
import { TimeProposal } from "./components/TimeProposal";
import { StatusUpdate } from "./components/StatusUpdate";
import { ContactCard } from "./components/ContactCard";
import { MemoryCard } from "./components/MemoryCard";

export const agentRegistry = defineRegistry(agentCatalog, {
  ConfirmationCard,
  TaskCard,
  TimeProposal,
  StatusUpdate,
  ContactCard,
  MemoryCard,
});
```

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/lib/json-render/
git commit -m "feat: add json-render React registry with 6 component implementations"
```

---

## Phase 4: Streaming Chat API

### Task 17: Upgrade chat API to streaming

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: Switch from `generate()` to `streamText` or equivalent streaming**

The current flow: `executeAgent → generate() → return { text }`. We need to stream the response.

Check if the AI SDK's `ToolLoopAgent` supports streaming. If yes, use `agent.stream()`. If not, use `streamText` directly with the same tools and system prompt.

The key change: instead of waiting for the full response and returning JSON, stream tokens back to the client.

```typescript
// Updated approach — use the agent's streaming capability
// The response should be a ReadableStream
export async function POST(request: NextRequest) {
  // ... auth and user lookup unchanged ...

  const stream = await personalAgent.stream({
    prompt: message,
    options: { userId: user._id, mentionedContacts, persona },
  });

  // Return as streaming response
  return new Response(stream.toReadableStream());
}
```

If `ToolLoopAgent` doesn't support `.stream()`, fall back to using `streamText` from the AI SDK directly with the merged tools.

**Step 2: Verify streaming works**

Test by sending a chat message and confirming tokens stream back.

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: upgrade chat API to streaming responses"
```

---

### Task 18: Update frontend to use useChat

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace manual fetch with AI SDK's `useChat` hook**

The current frontend manually calls `fetch("/api/chat", ...)` and saves messages via Convex mutations. Replace with `useChat` from `ai/react`:

```typescript
import { useChat } from "ai/react";

// Inside the component:
const { messages: chatMessages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: "/api/chat",
  body: { userId: currentUser?._id },
});
```

This gives us real-time streaming display of agent responses, built-in input handling, and loading state.

We still maintain the Convex `messages` subscription for historical messages and A2A-originated messages that come in outside the chat flow.

**Step 2: Verify streaming works in the UI**

Test by sending a message and seeing tokens appear progressively.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: switch frontend to useChat for streaming agent responses"
```

---

## Phase 5: Frontend Redesign

### Task 19: Create new layout structure

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/AgentProfileBar.tsx`
- Create: `src/components/ContactsSidebar.tsx`
- Create: `src/components/ContextPanel.tsx`
- Create: `src/components/ChatStream.tsx`
- Create: `src/components/ActivityFeed.tsx`

**Step 1: Create AgentProfileBar component**

Displays the agent's name, handle, bio, tone, and online status at the top. Settings link for persona editing. Shows A2A URL for sharing.

**Step 2: Create ContactsSidebar component**

Left panel showing connected agents with status. "Add by handle" input. Based on existing `ContactsPanel.tsx` but restyled for sidebar layout.

**Step 3: Create ChatStream component**

Central conversation panel. Uses `useChat` hook. Integrates json-render `Renderer` for rendering rich content from messages that have `richContent`. @mention autocomplete.

**Step 4: Create ContextPanel component**

Right collapsible panel with three widgets:
- Tasks widget (subscribes to `api.tasks.list`)
- Calendar widget (subscribes to `api.calendar.getEvents`) — smaller, demoted
- Memory widget (subscribes to `api.memory.list`)

**Step 5: Create ActivityFeed component**

Part of the left sidebar, below contacts. Shows real-time notifications from:
- `pendingConfirmations` (agent needs input)
- `messages` where role === "system" or "remote_agent"

**Step 6: Assemble in page.tsx**

```tsx
// New layout structure
<div className="h-screen flex flex-col">
  <AgentProfileBar user={currentUser} />
  <div className="flex-1 flex overflow-hidden">
    <ContactsSidebar userId={currentUser._id} />
    <ChatStream userId={currentUser._id} persona={persona} />
    <ContextPanel userId={currentUser._id} />
  </div>
</div>
```

**Step 7: Commit**

```bash
git add src/app/page.tsx src/components/
git commit -m "feat: redesign frontend with messaging-app layout"
```

---

### Task 20: Create onboarding flow

**Files:**
- Create: `src/components/Onboarding.tsx`
- Modify: `convex/calendar.ts` (update `createUserForClerk`)

**Step 1: Create Onboarding component**

A multi-step form that collects:
1. Agent name (text input, placeholder: "Jarvis")
2. Agent bio (textarea, placeholder: "My personal AI assistant")
3. Tone selection (3 buttons: Casual / Formal / Friendly)

Renders instead of the main app when the user exists in Clerk but doesn't have `agentName` set in Convex yet (or is a brand new user).

**Step 2: Update `createUserForClerk` mutation**

Accept optional `agentBio` and `agentTone` arguments. The `agentName` is already set from the `name` parameter.

**Step 3: Create update persona mutation**

Add a `updatePersona` mutation to `convex/calendar.ts`:

```typescript
export const updatePersona = mutation({
  args: {
    userId: v.id("users"),
    agentName: v.optional(v.string()),
    agentBio: v.optional(v.string()),
    agentTone: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const { userId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(userId, filtered);
  },
});
```

**Step 4: Commit**

```bash
git add src/components/Onboarding.tsx convex/calendar.ts
git commit -m "feat: add agent onboarding flow with persona setup"
```

---

### Task 21: Integrate json-render into chat messages

**Files:**
- Modify: `src/components/ChatStream.tsx`

**Step 1: Add json-render Renderer to message display**

When a message has `richContent`, parse it as a json-render spec and render using the `agentRegistry`:

```tsx
import { Renderer } from "@json-render/react";
import { agentRegistry } from "@/lib/json-render/registry";

// In message rendering:
{msg.richContent ? (
  <Renderer
    registry={agentRegistry}
    spec={JSON.parse(msg.richContent)}
    onAction={(action) => handleRichAction(action)}
  />
) : (
  <span>{msg.text}</span>
)}
```

**Step 2: Implement action handlers**

When a user clicks "Confirm" on a ConfirmationCard, call the Convex `confirmations.resolve` mutation and optionally send a follow-up message to the agent.

**Step 3: Commit**

```bash
git add src/components/ChatStream.tsx
git commit -m "feat: render json-render components inline in chat messages"
```

---

## Phase 6: Semi-Autonomous Behavior

### Task 22: Implement confirmation flow for incoming A2A messages

**Files:**
- Modify: `src/app/api/a2a/[userId]/[...route]/route.ts`

**Step 1: Add autonomy classification to A2A incoming handler**

When an A2A message comes in, the agent processes it. If the agent's response involves a confirmation-required action (detected by the tool calls), create a `pendingConfirmation` record instead of executing immediately.

For the initial implementation, keep it simple: the agent always responds to A2A messages (auto-handle availability checks), but any commitments or scheduling decisions get stored as pending confirmations visible in the user's chat.

**Step 2: Store confirmation context**

```typescript
// When agent determines it needs confirmation:
await convex.mutation(api.confirmations.create, {
  userId: user._id,
  type: "schedule",
  description: "Bob's agent proposed a picnic on Saturday at 2pm",
  context: JSON.stringify({
    sourceAgentUrl: "...",
    proposedTime: "...",
    originalMessage: text,
  }),
  sourceAgentHandle: "BOB001",
});
```

**Step 3: Return a "pending" response to the remote agent**

```typescript
return NextResponse.json({
  jsonrpc: "2.0",
  result: {
    message: {
      kind: "message",
      role: "agent",
      messageId: crypto.randomUUID(),
      parts: [{ kind: "text", text: "I'll check with my owner and get back to you." }],
    },
  },
  id: body.id,
});
```

**Step 4: Commit**

```bash
git add src/app/api/a2a/[userId]/[...route]/route.ts
git commit -m "feat: add semi-autonomous confirmation flow for A2A messages"
```

---

### Task 23: Add confirmation resolution UI

**Files:**
- Modify: `src/components/ContextPanel.tsx` or `src/components/ChatStream.tsx`

**Step 1: Subscribe to pending confirmations**

```typescript
const pendingConfirmations = useQuery(
  api.confirmations.listPending,
  currentUser ? { userId: currentUser._id } : "skip"
);
```

**Step 2: Render pending confirmations as json-render ConfirmationCards**

Display them prominently in the chat or as a notification banner. When the user clicks Approve/Reject, call `confirmations.resolve` mutation.

**Step 3: On approval, resume the A2A conversation**

After resolving, optionally trigger the agent to contact the remote agent with the decision.

**Step 4: Commit**

```bash
git add src/components/
git commit -m "feat: add confirmation resolution UI for semi-autonomous decisions"
```

---

## Phase 7: Cleanup & Migration

### Task 24: Remove old tools.ts and update references

**Files:**
- Delete: `src/lib/agent/tools.ts` (tools are now in plugins)
- Remove old `seedUsers` and `fixSeededUsers` from `convex/calendar.ts`

**Step 1: Delete `src/lib/agent/tools.ts`**

All tools are now in `src/lib/agent/plugins/`. The old file is dead code.

**Step 2: Clean up `convex/calendar.ts`**

Remove `seedUsers` and `fixSeededUsers` mutations — users are now created via Clerk onboarding. Remove the `by_name` index from the schema since we no longer have a `name` field.

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy tools, seed functions, and name field"
```

---

### Task 25: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update architecture description**

Reflect the new plugin system, json-render, streaming, persona, and semi-autonomous behavior. Update the data flow diagram, key modules list, and environment variables section.

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for agent platform redesign"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Foundation | 1-6 | Dependencies, schema, Convex functions |
| 2. Agent Core | 7-14 | Plugin system, persona, updated runtime |
| 3. json-render | 15-16 | Catalog, registry, React components |
| 4. Streaming | 17-18 | Streaming API + useChat |
| 5. Frontend | 19-21 | New layout, onboarding, rich messages |
| 6. Semi-Autonomy | 22-23 | Confirmation flow for A2A |
| 7. Cleanup | 24-25 | Remove dead code, update docs |

Total: **25 tasks**, approximately **25 commits**.
