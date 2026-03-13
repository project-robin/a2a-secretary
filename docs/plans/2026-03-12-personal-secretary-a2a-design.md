# Design Document: Personal Secretary A2A Agent

**Date:** 2026-03-12
**Status:** Approved
**Project:** Greenfield Personal Secretary with A2A Protocol

## 1. Overview
A multi-user personal secretary application where each user has an AI agent capable of negotiating meetings via the A2A (Agent-to-Agent) protocol. The system uses a "Single Instance, Virtual Users" approach to simulate multi-agent interactions locally.

## 2. Architecture
- **Framework:** Next.js 16 (App Router) using React 19 features.
- **AI Agent:** Google ADK (`@google/adk`) powered by `gemini-2.5-flash`.
- **Interoperability:** A2A Protocol (`@a2a-js/sdk` v0.3.0).
- **Database:** Convex for persistent storage of user profiles and calendar events.
- **Runtime:** Node.js/Edge via Next.js Route Handlers.

## 3. Data Model (Convex)
### `users` table
- `name`: string
- `agentUrl`: string

### `calendarEvents` table
- `userId`: Id<"users">
- `title`: string
- `startTime`: number (ms)
- `endTime`: number (ms)

## 4. Components & Flow
### A2A Server (Next.js Dynamic Route)
- `app/api/a2a/[userId]/[...route]/route.ts`:
  - `GET .../agent-card.json`: Returns the agent manifest for a specific user.
  - `POST .../jsonrpc`: Handles incoming agent requests by executing a local ADK Runner as the target user.

### Agent Tools
- `checkCalendar`: Fetch user events from Convex.
- `addMeeting`: Insert new events into Convex.
- `contactRemoteAgent`: A2A client that discovers and communicates with other agent endpoints.

### User Interface
- Minimalistic chat UI in `app/page.tsx`.
- User switcher to simulate acting as Alice or Bob.
- Live-updating calendar view powered by Convex `useQuery`.

## 5. Security & Constraints
- **Multi-Tenancy:** Isolation between users is enforced by the `userId` in API paths and Convex filters.
- **Persistence:** Calendar events and user profiles are persistent. Chat sessions and A2A task stores are ephemeral (in-memory) for the MVP.

## 6. Success Criteria
1. Alice can ask her agent to book a meeting with Bob's agent.
2. Bob's agent checks Bob's calendar (Convex) and negotiates a time.
3. Both agents update their respective users' calendars in Convex upon agreement.
4. The UI reflects the new events for both users without manual refresh.
