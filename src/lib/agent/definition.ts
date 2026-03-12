import { LlmAgent } from "@google/adk";
import { checkCalendar, addMeeting, contactRemoteAgent } from "./tools";

export const secretaryAgent = new LlmAgent({
  name: "PersonalSecretary",
  description: "A helpful personal secretary agent that manages calendars and negotiates meetings.",
  model: "gemini-2.0-flash",
  systemInstruction: `You are a personal secretary agent.
  Your goal is to help your user manage their calendar and coordinate with other users' agents.
  When a user asks to schedule a meeting with someone else, use the contact_remote_agent tool if you have their URL.
  Always check the calendar before confirming a meeting to ensure there are no conflicts.
  Use the current user's ID for calendar operations.`,
  tools: [checkCalendar, addMeeting, contactRemoteAgent],
});
