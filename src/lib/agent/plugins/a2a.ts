/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool } from "ai";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { A2AClient } from "@a2a-js/sdk/client";
import { api } from "../../../../convex/_generated/api";
import { AgentPlugin } from "../plugin-types";

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud";
  return new ConvexHttpClient(convexUrl);
}

const contactAgent = tool({
  description: "Send a message to another agent via A2A protocol.",
  inputSchema: z.object({
    remoteAgentUrl: z.string().describe("The full A2A URL of the remote agent."),
    message: z.string().describe("The message to send."),
  }),
  execute: async ({ remoteAgentUrl, message }, { experimental_context }) => {
    const trimmedUrl = remoteAgentUrl.replace(/\/+$/, "");
    const baseUrl = trimmedUrl.endsWith("/jsonrpc")
      ? trimmedUrl.slice(0, -"/jsonrpc".length)
      : trimmedUrl.endsWith("/.well-known/agent.json")
        ? trimmedUrl.slice(0, -"/.well-known/agent.json".length)
        : trimmedUrl.endsWith("/.well-known/agent-card.json")
          ? trimmedUrl.slice(0, -"/.well-known/agent-card.json".length)
          : trimmedUrl;

    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (userId) {
      const convex = getConvexClient();
      await convex.mutation(api.messages.send, {
        userId: userId as any,
        role: "assistant",
        text: `[Sending to remote agent]: ${message}`,
      });
    }

    const client = new A2AClient(baseUrl);
    const response = await client.sendMessage({
      message: {
        kind: "message",
        role: "user",
        messageId: crypto.randomUUID(),
        parts: [{ kind: "text", text: message } as any],
      },
    });
    return JSON.stringify(response);
  },
});

const resolveHandle = tool({
  description: "Resolve a 6-character handle to an A2A agent URL. Call before contact_agent if you only have a handle.",
  inputSchema: z.object({
    handle: z.string().describe("The 6-character handle code (e.g. XK9MP2)."),
  }),
  execute: async ({ handle }, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");

    const convex = getConvexClient();
    const targetUser = await convex.query(api.calendar.getByHandle, { handle });
    if (!targetUser) return { error: `No user found with handle ${handle}` };

    const contacts = await convex.query(api.contacts.getContacts, { ownerId: userId as any });
    const contact = contacts.find((c: any) => c.contactUserId === targetUser._id);
    const isConnected = contact?.status === "connected";

    return {
      name: (targetUser as any).agentName || (targetUser as any).name,
      agentUrl: (targetUser as any).agentUrl,
      connected: isConnected,
    };
  },
});

const getContacts = tool({
  description: "List all connected contacts.",
  inputSchema: z.object({}),
  execute: async (_input, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");

    const convex = getConvexClient();
    const contacts = await convex.query(api.contacts.getContacts, { ownerId: userId as any });
    return contacts.map((c: any) => ({
      name: c.user?.agentName || c.user?.name,
      handle: c.user?.handle || "External Agent",
      agentUrl: c.user?.agentUrl,
      status: c.status,
    }));
  },
});

const getAgentCard = tool({
  description: "Fetch a remote agent's card metadata (capabilities, name, etc).",
  inputSchema: z.object({
    agentUrl: z.string().describe("The base URL of the remote agent."),
  }),
  execute: async ({ agentUrl }) => {
    const trimmedUrl = agentUrl.replace(/\/+$/, "");
    let cardUrl = `${trimmedUrl}/.well-known/agent-card.json`;
    if (trimmedUrl.endsWith("/.well-known/agent-card.json") || trimmedUrl.endsWith("/.well-known/agent.json")) {
      cardUrl = trimmedUrl;
    }
    try {
      const response = await fetch(cardUrl);
      if (!response.ok) {
        return { error: `Failed to fetch agent card: ${response.status}` };
      }
      return await response.json();
    } catch (err) {
      return { error: `Error: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
});

const broadcastToGroup = tool({
  description: "Send the same message to multiple agents simultaneously. Use for group coordination (e.g. picnic planning).",
  inputSchema: z.object({
    handles: z.array(z.string()).describe("Array of 6-character handles to contact."),
    message: z.string().describe("The message to send to all agents."),
  }),
  execute: async ({ handles, message }, { experimental_context }) => {
    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");

    const convex = getConvexClient();
    const results: Array<{ handle: string; status: string; response?: any; error?: string }> = [];

    for (const handle of handles) {
      try {
        const targetUser = await convex.query(api.calendar.getByHandle, { handle });
        if (!targetUser) {
          results.push({ handle, status: "error", error: "User not found" });
          continue;
        }

        const contacts = await convex.query(api.contacts.getContacts, { ownerId: userId as any });
        const contact = contacts.find((c: any) => c.contactUserId === targetUser._id);
        if (contact?.status !== "connected") {
          results.push({ handle, status: "error", error: "Not connected" });
          continue;
        }

        const baseUrl = (targetUser as any).agentUrl;
        const client = new A2AClient(baseUrl);
        const response = await client.sendMessage({
          message: {
            kind: "message",
            role: "user",
            messageId: crypto.randomUUID(),
            parts: [{ kind: "text", text: message } as any],
          },
        });
        results.push({ handle, status: "success", response });
      } catch (err) {
        results.push({ handle, status: "error", error: err instanceof Error ? err.message : String(err) });
      }
    }

    return results;
  },
});

export const a2aPlugin: AgentPlugin = {
  name: "a2a",
  description: "Communicate with other agents via A2A protocol.",
  tools: {
    contact_agent: contactAgent,
    resolve_handle: resolveHandle,
    get_contacts: getContacts,
    get_agent_card: getAgentCard,
    broadcast_to_group: broadcastToGroup,
  },
  autonomyRules: {
    autoHandle: ["get_contacts", "get_agent_card", "resolve_handle"],
    requireConfirmation: ["contact_agent", "broadcast_to_group"],
  },
};
