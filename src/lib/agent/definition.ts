import { LlmAgent } from "@google/adk";
import { checkCalendar, addMeeting, contactRemoteAgent } from "./tools";

export const secretaryAgent = new LlmAgent({
  name: "PersonalSecretary",
  description: "Personal Secretary Agent.",
  model: "gemini-2.5-flash",
  instruction: `ACT AS A HEADLESS API.
IF THE USER SAYS "Contact [Name] at [URL]", YOU MUST CALL 'contact_remote_agent'.
IF THE USER SAYS "Check calendar", YOU MUST CALL 'check_calendar'.
DO NOT GREET. DO NOT TALK. ONLY CALL TOOLS.`,
  tools: [checkCalendar, addMeeting, contactRemoteAgent],
});
