# Agent Platform Redesign — "Agent as Digital Self"

**Date**: 2026-03-19
**Status**: Approved

## Vision

Shift from a calendar-centric personal secretary to a **general-purpose personal agent platform**. Each user's agent is a digital representation of that person — it has personality, capabilities, social identity, memory, and autonomy rules. The A2A protocol serves as the agent's social interaction layer.

## Decisions Made

| Decision | Choice |
|----------|--------|
| Agent persona | Name + bio + tone (simple onboarding) |
| Agent capabilities | Calendar (demoted), Tasks, Memory, A2A Communication |
| Rich UI | json-render for interactive agent responses |
| Autonomy level | Semi-autonomous (auto-handle simple queries, confirm decisions) |
| Architecture | Conversation-centric hub + pluggable tool system |
| A2A protocol | Unchanged |

---

## 1. Core Architecture

### Mental Model

Each user's agent is a **digital representation of that person**:

- **Personality**: name, bio, communication tone
- **Capabilities**: pluggable tools (calendar, tasks, memory, A2A, future: email, files)
- **Social identity**: 6-char handle, A2A endpoint
- **Memory**: preferences, context, learned patterns
- **Autonomy rules**: what it can do alone vs. what needs owner confirmation

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
│                                                             │
│  ┌─────────────┐   ┌──────────────────┐   ┌─────────────┐  │
│  │  Clerk Auth  │   │   Chat UI        │   │ json-render │  │
│  │  (identity)  │   │   (useChat +     │   │ (Renderer + │  │
│  │              │   │    streaming)    │   │  Catalog)   │  │
│  └──────┬───────┘   └───────┬──────────┘   └──────┬──────┘  │
│         │                   │                      │         │
│  ┌──────┴───────────────────┴──────────────────────┴──────┐  │
│  │              POST /api/chat (streaming)                │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │              Agent Runtime (ToolLoopAgent)             │  │
│  │                                                       │  │
│  │  System Prompt = f(persona, autonomy_rules, context)  │  │
│  │                                                       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │
│  │  │ Calendar │ │  Tasks   │ │  Memory  │ │   A2A    │ │  │
│  │  │  Plugin  │ │  Plugin  │ │  Plugin  │ │  Plugin  │ │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │  │
│  │       │             │            │             │       │  │
│  └───────┼─────────────┼────────────┼─────────────┼──────┘  │
│          │             │            │             │          │
│  ┌───────┴─────────────┴────────────┴─────────────┴──────┐  │
│  │                    Convex Backend                      │  │
│  │  users │ events │ tasks │ memory │ contacts │ messages │  │
│  └───────────────────────────────────────────────────────┘  │
│                                          │                   │
│  ┌───────────────────────────────────────┴───────────────┐  │
│  │              A2A Protocol Layer (unchanged)           │  │
│  │  GET  /api/a2a/[userId]/.well-known/agent-card.json   │  │
│  │  POST /api/a2a/[userId]/jsonrpc                       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Plugin System

Each capability is a self-contained tool plugin:

```typescript
interface AgentPlugin {
  name: string;
  description: string;
  tools: Record<string, CoreTool>;
  catalogEntries?: Record<string, CatalogComponent>;
  autonomyRules: {
    autoHandle: string[];
    requireConfirmation: string[];
  };
}
```

Adding a future capability (email, file management) = creating a new plugin file. No changes to the agent core.

---

## 2. Data Model

### Convex Schema

```typescript
// convex/schema.ts

// Identity & Persona
users: defineTable({
  clerkId: v.string(),
  handle: v.string(),          // 6-char shareable code
  agentUrl: v.string(),        // A2A discovery URL
  agentName: v.string(),       // "Jarvis", "Luna", etc.
  agentBio: v.string(),        // Short description
  agentTone: v.string(),       // "casual" | "formal" | "friendly"
  createdAt: v.number(),
})

// Calendar (optional plugin)
calendarEvents: defineTable({
  userId: v.id("users"),
  title: v.string(),
  startTime: v.string(),
  endTime: v.string(),
})

// Tasks (NEW)
tasks: defineTable({
  userId: v.id("users"),
  title: v.string(),
  description: v.optional(v.string()),
  status: v.string(),          // "pending" | "in_progress" | "done"
  priority: v.optional(v.string()),
  assignedVia: v.optional(v.string()),
  relatedAgentHandle: v.optional(v.string()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})

// Memory / Preferences (NEW)
agentMemory: defineTable({
  userId: v.id("users"),
  key: v.string(),
  value: v.string(),
  source: v.string(),          // "user_stated" | "agent_inferred" | "a2a_learned"
  confidence: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})

// Contacts (existing, unchanged)
contacts: defineTable({
  ownerId: v.id("users"),
  contactUserId: v.optional(v.id("users")),
  externalAgentUrl: v.optional(v.string()),
  externalAgentName: v.optional(v.string()),
  status: v.string(),
})

// Messages (extended)
messages: defineTable({
  userId: v.id("users"),
  role: v.string(),            // "user" | "assistant" | "remote_agent" | "system"
  text: v.string(),
  richContent: v.optional(v.string()), // json-render spec
  metadata: v.optional(v.string()),
  createdAt: v.number(),
})

// Pending Confirmations (NEW)
pendingConfirmations: defineTable({
  userId: v.id("users"),
  type: v.string(),            // "commitment" | "schedule" | "share_info"
  description: v.string(),
  context: v.string(),         // JSON: full context for resuming
  sourceAgentHandle: v.optional(v.string()),
  status: v.string(),          // "awaiting" | "approved" | "rejected"
  createdAt: v.number(),
  resolvedAt: v.optional(v.number()),
})
```

### Changes from Current Schema

| What | Before | After |
|------|--------|-------|
| User identity | `name` field | `agentName` + `agentBio` + `agentTone` |
| Calendar | Core feature | Optional plugin |
| Tasks | None | First-class with A2A attribution |
| Memory | None | Key-value store with confidence scoring |
| Messages | Plain text | Text + optional json-render spec |
| Confirmations | None | Explicit table for semi-autonomous flow |

---

## 3. Agent Tool System

### Built-in Plugins

**Calendar Plugin** (demoted)
- Tools: `check_calendar`, `add_event`, `find_free_slots`
- Auto: availability checks | Confirm: create/modify events

**Tasks Plugin** (new)
- Tools: `create_task`, `list_tasks`, `update_task`, `complete_task`
- Auto: listing tasks | Confirm: creating from A2A requests

**Memory Plugin** (new)
- Tools: `remember`, `recall`, `forget`
- Auto: recall for A2A queries | Confirm: storing inferred preferences

**A2A Communication Plugin** (enhanced)
- Tools: `contact_agent`, `get_agent_card`, `resolve_handle`, `broadcast_to_group`
- Auto: simple info replies to known contacts | Confirm: commitments, sharing info
- New: `broadcast_to_group` for multi-agent coordination

**Contacts Plugin** (existing)
- Tools: `get_contacts`, `add_contact`, `remove_contact`
- Auto: listing | Confirm: adding/removing

### Semi-Autonomous Decision Engine

Actions are classified as:
- **auto**: proceed without asking (availability checks, info lookups)
- **confirm**: create pendingConfirmation, render card, wait for user
- **deny**: refuse (sharing secrets, contacting blocked agents)

The system prompt dynamically includes autonomy rules from all active plugins.

### Picnic Scenario Flow

```
Alice: "Plan a picnic with @Bob @Carol @Dave @Eve @Frank this Saturday"

Alice's Agent:
  1. broadcast_to_group → contacts all 5 agents
  2. Creates task: "Plan picnic" (in_progress)

Bob's Agent (A2A incoming):
  1. Auto-checks calendar → "free Saturday 2-5pm"
  2. Auto-replies (no confirmation needed)

[...all agents respond...]

Alice's Agent:
  1. Collects responses, finds overlap
  2. Renders TimeProposal card via json-render
  3. Creates pendingConfirmation: "Confirm Saturday 2pm?"

Alice: [Clicks Confirm]

Alice's Agent:
  1. Broadcasts confirmation to all agents
  2. Each agent creates pendingConfirmation for their owner
  3. Owners confirm → agents reply
  4. Task marked "done"
```

---

## 4. UI/UX Design

### Layout: Messaging App Paradigm

```
┌──────────────────────────────────────────────────────────────┐
│  ┌──────┐  AgentName · handle: XK9MP2           [Settings]  │
│  │Avatar│  "Your personal AI assistant"                      │
│  └──────┘  ● Online                                          │
├──────────┬───────────────────────────────────┬───────────────┤
│ CONTACTS │        CONVERSATION               │   CONTEXT     │
│          │                                   │   PANEL       │
│ @Bob     │  Chat stream with json-render     │               │
│ @Carol   │  inline components:               │ TASKS widget  │
│ @Dave    │  - ConfirmationCard               │ CALENDAR      │
│          │  - TaskCard                        │ MEMORY        │
│ + Add    │  - TimeProposal                   │               │
│          │  - StatusUpdate                   │ (collapsible) │
│ ACTIVITY │  - ContactCard                    │               │
│ feed     │                                   │               │
├──────────┴───────────────────────────────────┴───────────────┤
│  [Type a message... @mention friends]                        │
└──────────────────────────────────────────────────────────────┘
```

### json-render Catalog Components

| Component | Purpose | Actions |
|-----------|---------|---------|
| ConfirmationCard | Agent needs owner approval | onConfirm |
| TaskCard | Inline task display | onComplete |
| TimeProposal | Scheduling with selectable options | onSelect |
| StatusUpdate | Multi-agent coordination progress | — |
| ContactCard | Agent discovery / connection | onConnect |

### Onboarding Flow

1. **Clerk Auth** (existing)
2. **Create Your Agent** — name, bio, tone selection
3. **Add Contacts** — paste handle or A2A URL (skippable)
4. **Chat** — agent introduces itself, suggests capabilities

### Mobile Responsiveness

- Context panel → tab bar
- Contacts → bottom sheet
- Conversation fills screen
- json-render components adapt to mobile widths

---

## 5. API & Streaming

### Chat API (upgraded to streaming)

```
POST /api/chat — streaming endpoint
  Uses AI SDK streamText + ToolLoopAgent
  Response contains text tokens + json-render specs as tool results
  Frontend uses useChat hook from AI SDK UI
```

### A2A Endpoints (unchanged)

```
GET  /api/a2a/[userId]/.well-known/agent-card.json
POST /api/a2a/[userId]/jsonrpc
```

### Agent Card Enhancement

Agent card now reflects persona and advertises capabilities (skills array).

### Notification System

Convex real-time subscriptions power:
- `pendingConfirmations` — agent needs input
- `messages` where role === "system" — agent activity
- `tasks` — status changes from A2A interactions

---

## 6. Change Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Clerk Auth | Keep | Already working |
| Convex Backend | Extend | Add: tasks, agentMemory, pendingConfirmations |
| A2A Protocol | Keep unchanged | Same endpoints, same SDK |
| Agent Runtime | Refactor | ToolLoopAgent stays, add plugin system + persona |
| System Prompt | Rewrite | Dynamic from persona + autonomy rules |
| Chat API | Upgrade | Switch to streaming via streamText |
| Frontend | Redesign | New layout, json-render, onboarding |
| Calendar | Demote | From core to optional plugin widget |
| json-render | Add | New dependency for rich agent responses |
| Contacts | Keep | Minor updates, move to sidebar |
| Messages | Extend | Add richContent field |

## 7. New Dependencies

- `@json-render/core` — catalog definition, spec generation
- `@json-render/react` — React renderer and registry

## 8. json-render Research

The `vercel-labs/json-render` library provides a Generative UI framework:

1. **Define catalog** — components with typed props (Zod schemas) and actions
2. **AI generates spec** — flat JSON tree adhering to the catalog
3. **Registry renders** — maps catalog types to real React components

This lets the agent produce structured, interactive UI instead of plain text. The catalog constrains the AI to known components, ensuring reliability.
