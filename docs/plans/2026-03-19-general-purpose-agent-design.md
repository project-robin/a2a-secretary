# General-Purpose Personal Agent Design

## Objective
Shift the application from a basic character agent centered on a calendar to a general-purpose personal assistant (Jarvis-style). The agent will communicate on behalf of the user, possess its own personality, and coordinate complex multi-agent tasks (like planning a picnic). It natively integrates user confirmation for actions.

## 1. Architecture & General Vision
- **Identity & Provisioning**: Users create agent-backed identities (e.g., via Clerk). Each gets a unique A2A handle and dedicated Agent URL. The calendar becomes an optional tool, not the core identity.
- **Asynchronous Task Engine (Convex)**: Multi-agent coordination can take hours. We introduce a `tasks` (or `agent_threads`) table in Convex to store long-running execution state, allowing the agent to terminate its run and wake up when replies arrive.
- **A2A Protocol**: The `@a2a-js/sdk` protocol and `/api/a2a/[userId]/jsonrpc` endpoints remain unchanged. The agent uses `contact_remote_agent` within the asynchronous task engine.

## 2. Components & UI/UX
- **Dual Chat Interface**: The primary interface is the chat. The right-hand pane becomes a dynamic Task/Context Pane showing active agent operations (e.g., "Picnic Coordination" progress).
- **Generative UI with json-render**: We use `vercel-labs/json-render` to build dynamic UI elements. The AI outputs structured specs based on a predefined `catalog` (e.g., `ApprovalCard`, `TaskProgress`).
- **Blocking Tool Interaction**: When the agent calls `ask_user_permission`, it emits a JSON spec for an `ApprovalCard`. The UI renders this inline. The user can click an action button (Accept/Reject) or type a conversational reply to resolve the pending tool call.

## 3. Data Flow & State Machine (The Picnic Use Case)
1. **Initiation**: User asks to coordinate a picnic. The agent creates a `Task` in Convex (`status: "in_progress"`), sends A2A messages to friends, calls `wait_for_replies()`, and terminates.
2. **Asynchronous Waiting**: Friends' agents process requests and eventually reply via our `/api/a2a` endpoint. A webhook or background action wakes our agent once all replies are gathered.
3. **User Confirmation**: The woken-up agent processes replies and decides on a time. It yields a `json-render` spec using `ask_user_permission` to get final approval. The backend terminates again, storing the pending tool call ID.
4. **Resolution**: The user interacts with the `ApprovalCard` in the UI or chats a reply. The frontend sends the `tool_result` to the backend, resuming the agent. The agent sends the final A2A confirmation and completes the task.

## 4. Error Handling & Testing
- **Remote Agent Unresponsive**: Implement timeouts and retries for `contact_remote_agent`. If an agent fails, log it in the `Task` state and ask the user how to proceed.
- **Invalid json-render Specs**: Strictly enforce `zod` schema validation before returning UI specs to the frontend.
- **Unexpected User Interactions**: If a user ignores an `ApprovalCard` to start a new topic, the agent handles the new context concurrently without dropping the pending task.
- **Testing**:
  - Unit Tests: Convex state machine (`tasks` mutations) and `json-render` catalog schemas.
  - Integration Tests: Mock A2A endpoints to simulate asynchronous remote agent replies.
  - E2E Tests: Verify the full flow from user request -> mock replies -> UI card render -> user approval -> final confirmation.
