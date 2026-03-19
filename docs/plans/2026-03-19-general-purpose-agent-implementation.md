# General-Purpose Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the foundational architecture for the Jarvis-style general-purpose agent, including asynchronous task tracking in Convex and `json-render` for interactive Approval Cards.

**Architecture:** Combine Vercel AI SDK tool pausing (Approach 1) for local user confirmation with an asynchronous Convex state machine (Approach 2) for long-running A2A coordination tasks.

**Tech Stack:** Next.js App Router, Convex, Vercel AI SDK, `json-render`, Tailwind CSS.

---

### Task 1: Update Convex Schema for Tasks

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/tasks.ts`

**Step 1: Write the failing test / define the query**
We won't write a full test for schema changes, but we define the schema extension.

**Step 2: Write minimal implementation**
In `convex/schema.ts`, add the `tasks` table:
```typescript
  tasks: defineTable({
    userId: v.id("users"),
    status: v.string(), // "in_progress", "waiting_for_user", "completed", "failed"
    description: v.string(),
    pendingToolCallId: v.optional(v.string()), // For Approach 1 UI blocking
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
```

In `convex/tasks.ts`, create `createTask`, `updateTaskStatus`, `getPendingTasks`.

**Step 3: Run schema validation**
Run: `npx convex dev --once`
Expected: PASS

**Step 4: Commit**
```bash
git add convex/schema.ts convex/tasks.ts
git commit -m "feat: add tasks table for asynchronous agent coordination"
```

### Task 2: Implement `ask_user_permission` Tool

**Files:**
- Modify: `src/lib/agent/tools.ts`
- Modify: `src/lib/agent/definition.ts`

**Step 1: Write minimal implementation**
Add `ask_user_permission` tool to `tools.ts` that returns a `json-render` spec format:
```typescript
export const askUserPermission = tool({
  description: "Ask the user for permission or confirmation before proceeding with an action (like finalizing a meeting time).",
  inputSchema: z.object({
    taskId: z.string().describe("The active task ID being coordinated."),
    proposal: z.string().describe("What is being proposed (e.g., 'Picnic at 2 PM')."),
  }),
  execute: async ({ taskId, proposal }, { experimental_context }) => {
    // In Vercel AI SDK, returning this object yields it to the client.
    // The client will render an ApprovalCard.
    return {
      type: "approval_card",
      taskId,
      proposal,
      status: "pending_user_action"
    };
  },
});
```

Add it to `definition.ts` `secretaryAgent.tools`.

**Step 2: Commit**
```bash
git add src/lib/agent/tools.ts src/lib/agent/definition.ts
git commit -m "feat: add ask_user_permission tool for json-render Approval Cards"
```

### Task 3: Update Chat API for Tool Pausing

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: Write minimal implementation**
Update the `/api/chat` route to support `maxSteps` and sending tool calls to the client using `streamText` from `ai`.
```typescript
import { streamText } from 'ai';
// Use the agent to stream text, enabling tool calls to be sent to the client
// Handle the tool results when the user submits them back.
```

**Step 2: Commit**
```bash
git add src/app/api/chat/route.ts
git commit -m "feat: update chat API to stream tool calls for client-side rendering"
```

### Task 4: Integrate `json-render` in UI

**Files:**
- Create: `src/components/ApprovalCard.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Write minimal implementation**
Create a simple `ApprovalCard` React component that takes `proposal` and calls a `onRespond(result)` prop when Accept/Reject is clicked.
Update `page.tsx` chat mapping to detect `toolInvocations` where `toolName === 'ask_user_permission'` and render `<ApprovalCard />`.
When clicked, call `addToolResult` (from `useChat`) with the user's choice.

**Step 2: Commit**
```bash
git add src/components/ApprovalCard.tsx src/app/page.tsx
git commit -m "feat: render Approval Cards in chat UI for pending agent actions"
```