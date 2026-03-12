# Personal Secretary A2A Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-user personal secretary using Next.js 16, Google ADK, and A2A protocol, where agents negotiate meetings via Convex.

**Architecture:** Single-instance, multi-tenant Next.js app. Each user has a unique A2A endpoint `/api/a2a/[userId]`. Convex stores calendar events as the source of truth for both local and remote agent actions.

**Tech Stack:** Next.js 16, React 19, Google ADK (@google/adk), A2A SDK (@a2a-js/sdk), Convex, Gemini 2.0 Flash.

---

### Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`

**Step 1: Initialize Next.js 16 project**
Run: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes`
Expected: Next.js 16 project structure created in `src/`.

**Step 2: Install dependencies**
Run: `npm install @google/adk @a2a-js/sdk@0.3.0 convex lucide-react google-auth-library zod`
Expected: Dependencies installed successfully.

**Step 3: Initialize Convex**
Run: `npx convex dev --until-success`
Expected: Convex project initialized and local development server running.

**Step 4: Commit**
```bash
git add .
git commit -m "chore: initialize next.js 16 project with convex and adk"
```

---

### Task 2: Database Schema (Convex)

**Files:**
- Create: `convex/schema.ts`
- Create: `convex/calendar.ts`

**Step 1: Define schema**
```typescript
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
```

**Step 2: Create calendar mutations and queries**
In `convex/calendar.ts`:
- `getEvents`: Query to fetch events by `userId`.
- `addEvent`: Mutation to insert a new event.
- `getUsers`: Query to list all virtual users.

**Step 3: Commit**
```bash
git add convex/
git commit -m "feat: add convex schema and calendar operations"
```

---

### Task 3: Agent Core & Tools (ADK)

**Files:**
- Create: `src/lib/agent/tools.ts`
- Create: `src/lib/agent/definition.ts`

**Step 1: Implement Agent Tools**
Create `src/lib/agent/tools.ts` with:
- `checkCalendar`: Uses `ConvexHttpClient` to fetch events.
- `addMeeting`: Uses `ConvexHttpClient` to insert events.
- `contactRemoteAgent`: Uses A2A `ClientFactory` to message other agents.

**Step 2: Define LlmAgent**
In `src/lib/agent/definition.ts`:
- Instantiate `LlmAgent` with `gemini-2.0-flash`.
- Bind the tools from `tools.ts`.

**Step 3: Commit**
```bash
git add src/lib/agent/
git commit -m "feat: implement adk agent and calendar tools"
```

---

### Task 4: A2A Server Implementation

**Files:**
- Create: `src/app/api/a2a/[userId]/[...route]/route.ts`
- Create: `src/lib/a2a/executor.ts`

**Step 1: Implement AgentExecutor**
In `src/lib/a2a/executor.ts`:
- Connect incoming A2A JSON-RPC calls to the ADK `Runner`.
- Ensure the `userId` from the URL is passed into the agent's context.

**Step 2: Create Dynamic A2A Route**
In `src/app/api/a2a/[userId]/[...route]/route.ts`:
- Handle `GET /.well-known/agent-card.json`.
- Handle `POST /jsonrpc`.

**Step 3: Commit**
```bash
git add src/app/api/a2a/ src/lib/a2a/
git commit -m "feat: implement dynamic a2a server routes"
```

---

### Task 5: Chat API & Frontend

**Files:**
- Create: `src/app/api/chat/route.ts`
- Modify: `src/app/page.tsx`
- Create: `src/components/UserSwitcher.tsx`

**Step 1: Implement Chat API**
In `src/app/api/chat/route.ts`:
- Initialize ADK `Runner` for the local user.
- Stream agent response back to the UI.

**Step 2: Build Main UI**
In `src/app/page.tsx`:
- Add `UserSwitcher` to toggle between Alice and Bob.
- Add `ChatInterface` and `CalendarView`.

**Step 3: Commit**
```bash
git add src/app/ src/components/
git commit -m "feat: add chat api and frontend ui with user switching"
```

---

### Task 6: Final Verification

**Step 1: Seed Users**
Run a script or use Convex dashboard to create "Alice" and "Bob".

**Step 2: Test Local Booking**
Ask Alice's agent: "Book a meeting for tomorrow at 10am."
Verify: Event appears in Alice's calendar in the UI.

**Step 3: Test A2A Negotiation**
Ask Alice's agent: "Schedule a meeting with Bob (http://localhost:3000/api/a2a/bob) for Friday at 3pm."
Verify: Alice's agent contacts Bob's, both agree, and both calendars update in the UI.

**Step 4: Commit**
```bash
git commit -m "docs: finalize implementation and verification"
```
