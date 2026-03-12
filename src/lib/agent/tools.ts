import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { ClientFactory } from "@a2a-js/sdk";
import { Tool } from "@google/adk";
import { z } from "zod";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const checkCalendar = new Tool({
  name: "check_calendar",
  description: "Check the user's calendar for events.",
  inputSchema: z.object({
    userId: z.string().describe("The Convex ID of the user."),
  }),
  async run({ userId }) {
    // @ts-ignore - userId type mismatch with Convex ID string representation
    return await convex.query(api.calendar.getEvents, { userId });
  },
});

export const addMeeting = new Tool({
  name: "add_meeting",
  description: "Add a meeting to the user's calendar.",
  inputSchema: z.object({
    userId: z.string().describe("The Convex ID of the user."),
    title: z.string().describe("Title of the meeting."),
    startTime: z.number().describe("Start time as a Unix timestamp."),
    endTime: z.number().describe("End time as a Unix timestamp."),
  }),
  async run({ userId, title, startTime, endTime }) {
    // @ts-ignore
    await convex.mutation(api.calendar.addEvent, { userId, title, startTime, endTime });
    return "Meeting added successfully.";
  },
});

export const contactRemoteAgent = new Tool({
  name: "contact_remote_agent",
  description: "Contact another user's agent to propose or negotiate a meeting.",
  inputSchema: z.object({
    remoteAgentUrl: z.string().describe("The A2A endpoint URL of the remote agent."),
    message: z.string().describe("The message to send to the remote agent."),
  }),
  async run({ remoteAgentUrl, message }) {
    const client = ClientFactory.create(remoteAgentUrl);
    const response = await client.request("process_message", { message });
    return response;
  },
});
