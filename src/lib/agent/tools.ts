import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { A2AClient } from "@a2a-js/sdk/client";
import { FunctionTool } from "@google/adk";
import { z } from "zod";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud";
const convex = new ConvexHttpClient(convexUrl);

export const checkCalendar = new FunctionTool({
  name: "check_calendar",
  description: "Check the current user's calendar for existing events. The user identity is handled automatically — no parameters needed.",
  async execute(_input: any, tool_context?: any) {
    const userId = tool_context?.state?.get("userId") as string;
    if (!userId) throw new Error("userId not found in execution context");
    return await convex.query(api.calendar.getEvents, { userId } as any);
  },
});

export const addMeeting = new FunctionTool({
  name: "add_meeting",
  description: "Add a meeting to the current user's calendar.",
  parameters: z.object({
    title: z.string().describe("Title of the meeting."),
    startTime: z.number().describe("Start time as Unix timestamp in milliseconds."),
    endTime: z.number().describe("End time as Unix timestamp in milliseconds."),
  }),
  async execute({ title, startTime, endTime }, tool_context?: any) {
    const userId = tool_context?.state?.get("userId") as string;
    if (!userId) throw new Error("userId not found in execution context");
    await convex.mutation(api.calendar.addEvent, { userId, title, startTime, endTime } as any);
    return "Meeting added successfully.";
  },
});

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
