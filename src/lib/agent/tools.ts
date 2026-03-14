/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { A2AClient } from "@a2a-js/sdk/client";
import { tool } from "ai";
import { z } from "zod";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud";
const convex = new ConvexHttpClient(convexUrl);

export const checkCalendar = tool({
  description: "Check the current user's calendar for existing events. No parameters needed.",
  inputSchema: z.object({}),
  execute: async (_input, { experimental_context }) => {
    console.log("[Tool] check_calendar called");
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");
    const events = await convex.query(api.calendar.getEvents, { userId } as any);
    console.log(`[Tool] check_calendar found ${events.length} events`);
    return events;
  },
});

export const addMeeting = tool({
  description: "Add a meeting to the current user's calendar.",
  inputSchema: z.object({
    title: z.string().describe("Title of the meeting."),
    startTime: z.number().describe("Start time as Unix timestamp in milliseconds."),
    endTime: z.number().describe("End time as Unix timestamp in milliseconds."),
  }),
  execute: async ({ title, startTime, endTime }, { experimental_context }) => {
    console.log(`[Tool] add_meeting called: "${title}" from ${startTime} to ${endTime}`);
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) {
        console.error("[Tool] add_meeting FAILED: userId not found in context");
        throw new Error("userId not found in execution context");
    }

    try {
        console.log(`[Tool] Executing Convex mutation for user ${userId}...`);
        await convex.mutation(api.calendar.addEvent, { userId, title, startTime, endTime } as any);
        console.log("[Tool] Convex mutation SUCCESS");
        return "Meeting added successfully.";
    } catch (error) {
        console.error("[Tool] Convex mutation FAILED:", error);
        return `Failed to add meeting: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

export const contactRemoteAgent = tool({
  description: "Contact another user's AI agent. Use this for all A2A communication.",
  inputSchema: z.object({
    remoteAgentUrl: z.string().describe("The full A2A URL of the remote agent."),
    message: z.string().describe("The message to send to the remote agent."),
  }),
  execute: async ({ remoteAgentUrl, message }) => {
    const trimmedUrl = remoteAgentUrl.replace(/\/+$/, "");
    const baseUrl = trimmedUrl.endsWith("/jsonrpc")
      ? trimmedUrl.slice(0, -"/jsonrpc".length)
      : trimmedUrl.endsWith("/.well-known/agent.json")
        ? trimmedUrl.slice(0, -"/.well-known/agent.json".length)
        : trimmedUrl.endsWith("/.well-known/agent-card.json")
          ? trimmedUrl.slice(0, -"/.well-known/agent-card.json".length)
          : trimmedUrl;
    console.log(`[Tool] contact_remote_agent to ${baseUrl}: "${message}"`);
    const client = new A2AClient(baseUrl);
    const response = await client.sendMessage({
      message: {
        kind: "message",
        role: "user",
        messageId: crypto.randomUUID(),
        parts: [{ kind: "text", text: message } as any],
      },
    });
    console.log(`[Tool] Response from remote agent:`, JSON.stringify(response));
    return JSON.stringify(response);
  },
});

export const resolveContactUrl = tool({
  description: "Resolve a user's 6-character short code (handle) to their official A2A agent URL. YOU MUST CALL THIS before 'contact_remote_agent' if you don't have a valid HTTP URL.",
  inputSchema: z.object({
    handle: z.string().describe("The 6-character code shared by the user (e.g. XK9MP2)."),
  }),
  execute: async ({ handle }, { experimental_context }) => {
    console.log(`[Tool] resolve_contact_url called for handle: ${handle}`);

    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");

    const targetUser = await convex.query(api.calendar.getByHandle, { handle });
    if (!targetUser) return { error: `No user found with code ${handle}` };

    // Check mutual connection
    const contacts = await convex.query(api.contacts.getContacts, { ownerId: userId as any });
    const contact = contacts.find((c: any) => c.contactUserId === targetUser._id);

    const isConnected = contact?.status === "connected";

    // Zero-Trust: Strip internal IDs before returning to LLM
    return {
      name: (targetUser as any).name,
      agentUrl: (targetUser as any).agentUrl,
      connected: isConnected
    };
  },
});

export const getContacts = tool({
  description: "Get a list of all contacts connected to the current user. Use this to find out who you can talk to.",
  inputSchema: z.object({}),
  execute: async (_input, { experimental_context }) => {
    console.log("[Tool] get_contacts called");
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");

    const contacts = await convex.query(api.contacts.getContacts, { ownerId: userId as any });

    return contacts.map((c: any) => ({
      name: c.user?.name,
      handle: c.user?.handle || "External Agent",
      agentUrl: c.user?.agentUrl,
      status: c.status,
      isIncoming: c.isIncoming
    }));
  },
});

export const getAgentCard = tool({
  description: "Get the agent card metadata for a remote A2A agent URL. Use this to discover the remote agent's capabilities, descriptions, and endpoints.",
  inputSchema: z.object({
    agentUrl: z.string().describe("The base URL or agent card URL of the remote agent."),
  }),
  execute: async ({ agentUrl }) => {
    console.log(`[Tool] get_agent_card called for ${agentUrl}`);
    let trimmedUrl = agentUrl.replace(/\/+$/, "");
    let cardUrl = `${trimmedUrl}/.well-known/agent-card.json`;

    if (trimmedUrl.endsWith("/.well-known/agent-card.json") || trimmedUrl.endsWith("/.well-known/agent.json")) {
      cardUrl = trimmedUrl;
    }

    try {
      const response = await fetch(cardUrl);
      if (!response.ok) {
        return { error: `Failed to fetch agent card: ${response.status} ${response.statusText}` };
      }
      return await response.json();
    } catch (err) {
      return { error: `Error fetching agent card: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
});
