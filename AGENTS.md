# Personal Secretary A2A - Project Context

## Project Overview

**Personal Secretary A2A** is a fullstack Next.js application implementing an AI-powered personal secretary agent capable of autonomous scheduling negotiations with other agents over the A2A (Agent-to-Agent) protocol. The system features a zero-trust architecture where each user has their own isolated AI agent that can:

- Manage personal calendar events
- Negotiate meeting times with other users' agents
- Resolve contacts via 6-character alphanumeric handles
- Operate as a headless API for inter-agent communication

### Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   Chat UI   │  │  Calendar UI │  │  User Switcher   │    │
│  └──────┬──────┘  └──────────────┘  └──────────────────┘    │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              /api/chat (POST)                        │    │
│  │   Authenticates via Clerk → Executes Agent           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent Layer                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           ToolLoopAgent (nemotron-3-super-120b)      │    │
│  │   Tools: check_calendar, add_meeting,                │    │
│  │          contact_remote_agent, resolve_contact_url   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌───────────┐ ┌───────────────────────────┐
│ Convex Database │ │  Clerk    │ │  A2A Protocol Endpoints   │
│  - users        │ │  (Auth)   │ │  /.well-known/agent.json  │
│  - calendarEvents│ │           │ │  /jsonrpc                 │
└─────────────────┘ └───────────┘ └───────────────────────────┘
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| Frontend | React 19.2.3 |
| Styling | Tailwind CSS v4 |
| Database | Convex |
| Authentication | Clerk |
| AI/LLM | AI SDK v6 + OpenRouter (nvidia/nemotron-3-super-120b-a12b:free) |
| Agent Protocol | @a2a-js/sdk |
| Type Safety | TypeScript 5 |

## Key Commands

```bash
# Development
npm run dev          # Start Next.js dev server (localhost:3000)

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
```

### Convex Development

```bash
npx convex dev       # Sync Convex schema and functions (required for type generation)
npx convex deploy    # Deploy to production
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── a2a/[userId]/[...route]/   # A2A protocol endpoints (agent.json, jsonrpc)
│   │   ├── chat/route.ts              # Main chat API for frontend
│   │   └── webhooks/clerk/route.ts    # Clerk user.created webhook
│   ├── layout.tsx                     # Root layout with Clerk + Convex providers
│   ├── page.tsx                       # Main UI (chat + calendar)
│   └── main.css                       # Global styles + Tailwind
├── components/
│   ├── ConvexClientProvider.tsx       # Convex + Clerk auth integration
│   └── UserSwitcher.tsx               # User identity display + sync
└── lib/
    ├── a2a/
    │   └── executor.ts                # Agent execution wrapper
    └── agent/
        ├── definition.ts              # ToolLoopAgent configuration
        ├── plugin-types.ts            # Interfaces for plugins and autonomy
        └── plugins/                   # Modular agent capabilities
            ├── index.ts               # Plugin registration
            ├── a2a.ts                 # A2A protocol tools
            ├── calendar.ts            # Calendar management
            ├── tasks.ts               # Task management
            ├── memory.ts              # Personal memory tools
            └── autonomy.ts            # Permissions & User approval

convex/
├── schema.ts                          # Database schema (users, calendarEvents)
├── calendar.ts                        # Queries/mutations for calendar + users
├── auth.config.ts                     # Convex auth provider (Clerk)
└── _generated/                        # Auto-generated types (via npx convex dev)
```

## Development Conventions

### Path Aliases

- `@/*` maps to `./src/*`

### React Compiler

- Enabled via `next.config.ts` (`reactCompiler: true`)
- Avoid manual memoization where compiler handles it

### Client/Server Boundary

- Use `"use client"` directive for interactive components
- API routes are server-side by default
- `ConvexClientProvider` wraps client-side Convex + Clerk integration

### Convex Patterns

```typescript
// Query
export const getEvents = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => { ... }
});

// Mutation
export const addEvent = mutation({
  args: { userId: v.id("users"), title: v.string(), ... },
  handler: async (ctx, args) => { ... }
});
```

### AI Agent Tool Pattern

```typescript
export const toolName = tool({
  description: "What the tool does",
  inputSchema: z.object({ ... }),
  execute: async (input, { experimental_context }) => {
    const userId = experimental_context?.userId;
    // Tool logic
  },
});
```

### A2A Protocol

- Each user gets a unique 6-character handle (e.g., `XK9MP2`)
- Agent URL format: `{baseUrl}/api/a2a/{convexUserId}`
- Well-known endpoint: `.well-known/agent.json`
- JSON-RPC endpoint: `/jsonrpc` (handles `message/send` method)

## Environment Variables

Required for full functionality:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `CLERK_WEBHOOK_SECRET` | Svix webhook secret for Clerk events |
| `CLERK_ISSUER_URL` | Clerk issuer URL for Convex auth |
| `NEXT_PUBLIC_BASE_URL` | Public base URL for A2A agent URLs |

## Authentication Flow

1. User signs in via Clerk
2. Clerk webhook (`user.created`) triggers Convex user creation
3. Convex user gets unique `handle` and `agentUrl`
4. Frontend syncs Clerk user with Convex via `getByClerkId` query
5. JWT template "convex" in Clerk dashboard required for Convex auth

## Key Dependencies

- **AI SDK**: `ai` package with `ToolLoopAgent` for agentic workflows
- **A2A SDK**: `@a2a-js/sdk` for agent-to-agent communication protocol
- **Clerk**: `@clerk/nextjs` for authentication and user management
- **Convex**: `convex` for real-time database and server functions
- **OpenRouter**: `@openrouter/ai-sdk-provider` for LLM access
- **Zod**: `zod` for schema validation in AI tools

## A2A Protocol Reference

The `refrence/` folder contains the complete A2A protocol documentation and samples. **Always consult this folder when working with A2A protocol implementation.**

### Reference Folder Structure

```
refrence/
├── a2a-js/                    # Official A2A JavaScript SDK (THIS IS THE ONE WE USE)
│   ├── README.md              # Full SDK docs, quickstart, API reference
│   ├── AGENTS.md              # SDK architecture and conventions
│   ├── src/
│   │   ├── client/            # ClientFactory, transports, interceptors
│   │   ├── server/            # AgentExecutor, DefaultRequestHandler, task store
│   │   │   └── express/       # Express integration handlers
│   │   ├── samples/           # Working examples (agents, auth, CLI)
│   │   └── types.ts           # Core protocol types (Message, Task, AgentCard)
│   └── test/                  # SDK test suite
└── a2a-samples/               # Multi-language samples
    └── samples/js/            # JavaScript samples (USE THIS ONLY)
```

### Important: We Use JavaScript/TypeScript Only

- **DO NOT** reference Python, Go, Java, or .NET samples from `a2a-samples/`
- **DO NOT** use Python A2A SDK patterns or APIs
- The `a2a-js` SDK (`@a2a-js/sdk`) is the **only** A2A implementation for this project
- SDK implements A2A Protocol Spec **v0.3.0**

### Key A2A JS SDK Concepts

| Concept | Source | Description |
|---------|--------|-------------|
| `AgentCard` | `a2a-js/src/types.ts` | Agent identity and capabilities declaration |
| `AgentExecutor` | `a2a-js/src/server/` | Interface to implement agent logic (`execute`, `cancelTask`) |
| `ClientFactory` | `a2a-js/src/client/` | Creates clients to communicate with remote agents |
| `ExecutionEventBus` | `a2a-js/src/server/` | Publishes `Message`, `Task`, `Artifact` events |
| `DefaultRequestHandler` | `a2a-js/src/server/` | Orchestrates request processing and task management |
| Transports | `a2a-js/src/client/` | JSON-RPC, HTTP+JSON/REST, gRPC |

### When to Consult Reference

- Implementing A2A server endpoints → `refrence/a2a-js/README.md` (Server section)
- Creating A2A clients for agent-to-agent calls → `refrence/a2a-js/README.md` (Client section)
- Understanding protocol types → `refrence/a2a-js/src/types.ts`
- Streaming responses → `refrence/a2a-js/README.md` (Streaming section)
- Task cancellation → `refrence/a2a-js/README.md` (Handling Task Cancellation)
- Push notifications → `refrence/a2a-js/README.md` (Push Notifications section)
- Working agent examples → `refrence/a2a-js/src/samples/`

## Notes

- React Compiler is enabled - avoid unnecessary `useMemo`/`useCallback`
- Convex types in `_generated/` are auto-generated; run `npx convex dev` when schema changes
- A2A communication requires valid HTTP URLs - never use `a2a://` or `.agent` pseudo-URLs
- Agent handles are uppercase 6-character alphanumeric codes
