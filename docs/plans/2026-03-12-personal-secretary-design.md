# Design Document: Personal Secretary A2A Agent (ULTRATHINK Refactor)

**Date:** 2026-03-12
**Status:** Approved
**Goal:** Refactor the existing Personal Secretary implementation to ensure strict `userId` isolation using the "Zero-Trust LLM" pattern, update to `gemini-2.5-flash`, and improve library usage.

## 1. Architectural Principles

- **Zero-Trust LLM**: The LLM (Gemini) must never provide or be trusted with the `userId`. All identity data must be injected into the execution context (ADK `State`) by the server and retrieved by tools via `tool_context`.
- **Single-Instance Multi-Tenancy**: A single Next.js app on port 3000 handles multiple "Virtual Users" (Alice, Bob) via path parameters (`/api/a2a/[userId]`).
- **Parallel Domain Execution**: Implementation is split into three independent layers (Agent Logic, Server/A2A, Convex Data) to be executed by parallel agents.

## 2. Layered Design & Parallel Assignments

### Layer 1: Agent Logic & Tools (Specialist Agent)
- **Files**: `src/lib/agent/tools.ts`, `src/lib/agent/definition.ts`.
- **Design**:
    - Refactor `FunctionTool` definitions to remove `userId` from `parameters`.
    - In the `execute` handler, retrieve `userId` using `tool_context.state.get("userId")`.
    - Update `LlmAgent` to use `gemini-2.5-flash`.
    - Ensure instructions guide the agent to coordinate but not expose internal IDs.

### Layer 2: Server & A2A Gateway (Gatekeeper Agent)
- **Files**: `src/lib/a2a/executor.ts`, `src/app/api/a2a/[userId]/[...route]/route.ts`, `src/app/api/chat/route.ts`.
- **Design**:
    - Refactor `executeAgent` to take `userId` and explicitly set it in the `InMemoryRunner` state before running.
    - Ensure `A2AClient` (from `@a2a-js/sdk/client`) is correctly used with the `sendMessage` pattern.
    - Validate that the `userId` from the URL path is the only source of identity for the A2A server routes.

### Layer 3: Convex Data Scoping (Architect Agent)
- **Files**: `convex/calendar.ts`, `convex/schema.ts`.
- **Design**:
    - Update schema if necessary to support strict filtering.
    - Refactor all queries and mutations to use explicit type assertions for `userId`.
    - Ensure `seedUsers` creates Alice and Bob with standard URIs: `http://localhost:3000/api/a2a/[userId]`.

## 3. Data Flow

1.  **Request Arrival**: A request hits `/api/chat` (local) or `/api/a2a/[userId]` (remote).
2.  **Identity Extraction**: The server extracts the `userId`.
3.  **Runner Initialization**: An `InMemoryRunner` is created. The `userId` is saved to its `State`.
4.  **Agent Execution**: The LLM processes the message.
5.  **Tool Execution**: When a tool (e.g., `check_calendar`) is called, it reads the `userId` from its context state and queries Convex.

## 4. Verification Plan

- **Static Analysis**: Run `npm run build` to verify TypeScript integrity and library imports.
- **Identity Isolation Test**: Manually verify that Alice's agent cannot see or modify Bob's calendar even if the prompt tries to "trick" it.
- **A2A Loopback Test**: Alice's agent schedules a meeting with Bob's agent on the same server.

## 5. Implementation Phase

- Use `superpowers:writing-plans` to generate a detailed task list for the parallel agents.
- Use `superpowers:dispatching-parallel-agents` to execute the refactor.
