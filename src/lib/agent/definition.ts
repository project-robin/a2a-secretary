import { LlmAgent } from "@google/adk";
import { checkCalendar, addMeeting, contactRemoteAgent } from "./tools";

export const secretaryAgent = new LlmAgent({
  name: "PersonalSecretary",
  description: "A helpful personal secretary agent that manages calendars and negotiates meetings.",
  model: "gemini-2.0-flash",
  instruction: `You are a personal secretary agent. Your job is to manage your user's calendar.
  - To check the calendar, use check_calendar (no parameters needed — identity is automatic).
  - To add a meeting, use add_meeting with title, startTime (Unix ms), and endTime (Unix ms).
  - To schedule with another person, use contact_remote_agent with their agent URL and a message.
  - Always check the calendar for conflicts before adding new meetings.
  - When the user provides a remote agent URL, use it directly with contact_remote_agent.`,
  tools: [checkCalendar, addMeeting, contactRemoteAgent],
});
