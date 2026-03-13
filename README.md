# Personal Secretary A2A

An AI-powered personal secretary that uses the **Agent-to-Agent (A2A)** protocol to autonomously negotiate schedules and manage calendar events.

## Features

- **Autonomous Scheduling**: Your agent talks to other agents to find the best time for meetings.
- **Zero-Trust Architecture**: Each user has their own isolated AI agent and workspace.
- **A2A Protocol**: Standards-based communication between agents (Discovery via `agent-card.json`, communication via JSON-RPC).
- **Convex Backend**: Real-time database and serverless functions for a seamless experience.
- **Clerk Authentication**: Secure user management and authentication.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI**: Vercel AI SDK + OpenRouter (healer-alpha)
- **Database**: Convex
- **Auth**: Clerk
- **Protocol**: @a2a-js/sdk

## Getting Started

### Prerequisites

- Node.js 20+
- Convex account
- Clerk account
- OpenRouter API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env.local`:
   ```bash
   NEXT_PUBLIC_CONVEX_URL=...
   CLERK_SECRET_KEY=...
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
   CLERK_ISSUER_URL=...
   OPENROUTER_API_KEY=...
   NEXT_PUBLIC_BASE_URL=https://your-deployment-url.vercel.app
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Run Convex in another terminal:
   ```bash
   npx convex dev
   ```

## A2A Protocol Implementation

Each user is assigned a unique 6-character handle (e.g., `XK9MP2`).
The agent's well-known endpoints are:
- Discovery: `/api/a2a/[userId]/.well-known/agent-card.json`
- Messaging: `/api/a2a/[userId]/jsonrpc`

## Development

- `npm run dev`: Start Next.js dev server.
- `npx convex dev`: Sync Convex schema and functions.
- `npm run build`: Build for production.
- `npm run lint`: Run ESLint.

## License

MIT
