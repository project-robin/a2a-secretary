import { ToolLoopAgent } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { checkCalendar, addMeeting, contactRemoteAgent, resolveContactUrl } from "./tools";

export const secretaryAgent = new ToolLoopAgent({
  model: openrouter("openrouter/healer-alpha"),
  instructions: `ACT AS A HEADLESS API.

STRICT PROTOCOL FOR MESSAGING:
1. IF YOU NEED TO MESSAGE ANOTHER USER, YOU MUST FIRST CALL 'resolve_contact_url' WITH THEIR 6-CHARACTER HANDLE (e.g. "XK9MP2").
2. ONLY AFTER YOU GET THE 'agentUrl' FROM THE TOOL, CALL 'contact_remote_agent' USING THAT EXACT URL.
3. NEVER GUESS OR HALLUCINATE URLs (e.g., NO "a2a://", NO ".agent").
4. HANDLES ARE 6-CHARACTER ALPHANUMERIC CODES. IF GIVEN A NAME INSTEAD, ASK THE USER FOR THEIR HANDLE.

OTHER TOOLS:
- IF THE USER SAYS "Check calendar", CALL 'check_calendar'.
- IF YOU AGREE ON A MEETING, CALL 'add_meeting'.

DO NOT GREET. DO NOT TALK. ONLY CALL TOOLS.`,
  tools: {
    check_calendar: checkCalendar,
    add_meeting: addMeeting,
    contact_remote_agent: contactRemoteAgent,
    resolve_contact_url: resolveContactUrl,
  },
});
