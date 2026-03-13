# Personal Secretary ULTRATHINK Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the Personal Secretary to enforce strict `userId` isolation using the "Zero-Trust LLM" pattern — the LLM never receives or is trusted with internal user IDs; identity is injected into ADK State by the server layer and retrieved by tools via `tool_context`.

**Architecture:** Three independent layers: (1) Agent Logic & Tools — remove userId from tool schemas, read from context state instead; (2) Server/A2A Gateway — inject userId into Runner state from URL/request, not from model output; (3) Convex Data — tighten type safety and ensure all queries are userId-scoped. All use `gemini-2.5-flash`.

**Tech Stack:** Next.js 16 App Router, @google/adk (LlmAgent, InMemoryRunner, FunctionTool), @a2a-js/sdk v0.3.0 (A2AClient from @a2a-js/sdk/client), Convex (schema, queries, mutations), Gemini 2.0 Flash.

**Worktree:** `/home/map/project-z/agnet_handy_2/.worktrees/personal-secretary-impl`

---

### Task 1: Agent Logic & Tools — Zero-Trust LLM Pattern

**Context:** The current tools accept `userId` as a Zod schema parameter, meaning the LLM provides the userId in its function call arguments. This is a security anti-pattern — the LLM could hallucinate or be prompted to use a different userId. We must remove userId from all tool parameter schemas and retrieve it from `tool_context.state` instead.

**Files:**
- Modify: `src/lib/agent/tools.ts`
- Modify: `src/lib/agent/definition.ts`

**Step 1: Understand the ADK Context API**

The ADK `FunctionTool`'s `execute` function signature is:
```typescript
execute(input: TParameters, tool_context?: Context): Promise<unknown> | unknown
```

The `Context` type (from `@google/adk`) has a `state` property that is a `State` object with `get(key)` and `set(key, value)` methods. The userId will be pre-set in the state before the runner is invoked.

**Step 2: Refactor `checkCalendar` tool**

Remove `userId` from `parameters`. Read it from context:

```typescript
export const checkCalendar = new FunctionTool({
  name: "check_calendar",
  description: "Check the current user's calendar for existing events. No parameters needed — the user identity is handled automatically.",
  async execute(_input: Record<string, never>, tool_context?: Context) {
    const userId = tool_context?.state?.get("userId") as string;
    if (!userId) throw new Error("userId not found in execution context");
    return await convex.query(api.calendar.getEvents, { userId } as any);
  },
});
```

**Step 3: Refactor `addMeeting` tool**

Remove `userId` from `parameters`. Keep `title`, `startTime`, `endTime`:

```typescript
export const addMeeting = new FunctionTool({
  name: "add_meeting",
  description: "Add a meeting to the current user's calendar.",
  parameters: z.object({
    title: z.string().describe("Title of the meeting."),
    startTime: z.number().describe("Start time as Unix timestamp (ms)."),
    endTime: z.number().describe("End time as Unix timestamp (ms)."),
  }),
  async execute({ title, startTime, endTime }, tool_context?: Context) {
    const userId = tool_context?.state?.get("userId") as string;
    if (!userId) throw new Error("userId not found in execution context");
    await convex.mutation(api.calendar.addEvent, { userId, title, startTime, endTime } as any);
    return "Meeting added successfully.";
  },
});
```

**Step 4: Refactor `contactRemoteAgent` tool**

Keep parameters (remoteAgentUrl, message) — these are legitimate model-provided values:

```typescript
export const contactRemoteAgent = new FunctionTool({
  name: "contact_remote_agent",
  description: "Contact another user's AI secretary agent to negotiate a meeting on your behalf.",
  parameters: z.object({
    remoteAgentUrl: z.string().describe("Base URL of the remote agent, e.g. http://localhost:3000/api/a2a/bob"),
    message: z.string().describe("The message to send to the remote agent."),
  }),
  async execute({ remoteAgentUrl, message }) {
    const client = new A2AClient(remoteAgentUrl);
    const response = await client.sendMessage({
      message: {
        kind: "message",
        role: "user",
        messageId: crypto.randomUUID(),
        parts: [{ kind: "text", text: message } as any],
      },
    });
    return response;
  },
});
```

**Step 5: Update agent definition**

In `src/lib/agent/definition.ts`, update the instruction to remove any mention of userId:

```typescript
instruction: `You are a personal secretary agent. Your job is to manage your user's calendar.
- To check the calendar, use check_calendar (no parameters needed).
- To add a meeting, use add_meeting with title, startTime, and endTime.
- To schedule with another person, use contact_remote_agent with their agent URL and a natural language message.
- Always check the calendar for conflicts before adding new meetings.
- When the user provides a remote agent URL, use it directly with contact_remote_agent.`,
```

Also import `Context` type:
```typescript
import { LlmAgent, FunctionTool, Context } from "@google/adk";
```

**Step 6: Verify build still passes**
```bash
cd /home/map/project-z/agnet_handy_2/.worktrees/personal-secretary-impl
npm run build
```
Expected: Build succeeds with no TypeScript errors.

**Step 7: Commit**
```bash
git add src/lib/agent/
git commit -m "refactor: Zero-Trust LLM — userId injected via context, removed from tool schemas"
```

---

### Task 2: Server & A2A Gateway — Identity Injection

**Context:** The `executeAgent` function in `executor.ts` currently embeds userId in the prompt text string (`User context: ${userId}. Message: ${message}`). This leaks the userId into the conversation history and relies on the LLM to "remember" it. Instead, we must set userId in the ADK Runner's State before execution so tools can retrieve it via `tool_context.state`.

**Files:**
- Modify: `src/lib/a2a/executor.ts`
- Modify: `src/app/api/a2a/[userId]/[...route]/route.ts`
- Create: `src/app/api/chat/route.ts`

**Step 1: Check how InMemoryRunner state works**

The ADK `InMemoryRunner` (from `@google/adk`) uses `InMemorySessionService` internally. The `runEphemeral` method creates a temporary session. To inject state, we must use `stateDelta` parameter:

```typescript
const generator = runner.runEphemeral({
  userId,
  newMessage: { parts: [{ text: message }] },
  stateDelta: { userId },
});
```

The `stateDelta` merges key-value pairs into the session state, making `userId` available via `tool_context.state.get("userId")` in any tool.

**Step 2: Refactor `executor.ts`**

```typescript
import { InMemoryRunner, stringifyContent, isFinalResponse } from "@google/adk";
import { secretaryAgent } from "../agent/definition";

export async function executeAgent(userId: string, message: string): Promise<string> {
  const runner = new InMemoryRunner({
    agent: secretaryAgent,
    appName: "PersonalSecretary",
  });

  let finalText = "";
  const generator = runner.runEphemeral({
    userId,
    newMessage: { parts: [{ text: message }] },
    stateDelta: { userId },  // <-- Identity injection, not prompt injection
  });

  for await (const event of generator) {
    if (isFinalResponse(event)) {
      finalText = stringifyContent(event);
    }
  }

  return finalText;
}
```

**Step 3: Create `src/app/api/chat/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { executeAgent } from "@/lib/a2a/executor";

export async function POST(request: NextRequest) {
  const { userId, message } = await request.json();
  if (!userId || !message) {
    return NextResponse.json({ error: "userId and message are required" }, { status: 400 });
  }
  const text = await executeAgent(userId, message);
  return NextResponse.json({ text });
}
```

**Step 4: Verify the A2A route still correctly extracts userId from path**

In `src/app/api/a2a/[userId]/[...route]/route.ts`, the POST handler must pass `userId` from the URL params to `executeAgent`. Verify the existing route handler does this correctly and update if needed.

**Step 5: Run build**
```bash
cd /home/map/project-z/agnet_handy_2/.worktrees/personal-secretary-impl
npm run build
```

**Step 6: Commit**
```bash
git add src/lib/a2a/ src/app/api/
git commit -m "refactor: inject userId via stateDelta, remove prompt-embedded identity"
```

---

### Task 3: Convex Data — Type Safety & Scoping

**Context:** All Convex handler functions use `(ctx: any, args: any)` which bypasses TypeScript safety. We need to tighten these with proper Convex types from `@/convex/_generated/server`. Also verify that every query/mutation is scoped by userId with no possible cross-user data access.

**Files:**
- Modify: `convex/calendar.ts`
- Verify: `convex/schema.ts`

**Step 1: Check available generated types**
```bash
ls /home/map/project-z/agnet_handy_2/.worktrees/personal-secretary-impl/convex/_generated/
```

**Step 2: Refactor with proper Convex types**

Import `QueryCtx`, `MutationCtx` from the generated server types:

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";

export const getEvents = query({
  args: { userId: v.id("users") },
  handler: async (ctx: QueryCtx, args) => {
    return await ctx.db
      .query("calendarEvents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
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
  handler: async (ctx: MutationCtx, args) => {
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
  handler: async (ctx: QueryCtx) => {
    return await ctx.db.query("users").collect();
  },
});

export const seedUsers = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
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
```

**Note:** If `QueryCtx`/`MutationCtx` cause TypeScript errors because the real Convex types haven't been generated (no live Convex connection), fall back to explicit inline types or keep `any` with a comment explaining it requires live Convex to generate proper types.

**Step 3: Verify build**
```bash
cd /home/map/project-z/agnet_handy_2/.worktrees/personal-secretary-impl
npm run build
```

**Step 4: Commit**
```bash
git add convex/
git commit -m "refactor: strengthen Convex type safety and ensure userId scoping"
```

---

### Task 4: Final Integration & Build Verification

**Step 1: Run full build**
```bash
cd /home/map/project-z/agnet_handy_2/.worktrees/personal-secretary-impl
npm run build
```
Expected: `Route (app)` table shows all routes including `/api/chat` and `/api/a2a/[userId]/[...route]`.

**Step 2: Verify key invariants**

Check that:
- `src/lib/agent/tools.ts` has NO `userId` in any Zod `parameters` schema
- `src/lib/a2a/executor.ts` passes `stateDelta: { userId }` to `runEphemeral`
- `src/app/api/a2a/[userId]/[...route]/route.ts` uses URL `userId`, not request body userId

**Step 3: Final commit**
```bash
git add .
git commit -m "chore: final ULTRATHINK refactor — Zero-Trust LLM userId isolation complete"
```
