import { ToolLoopAgent } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { checkCalendar, addMeeting, contactRemoteAgent, resolveContactUrl } from "./tools";

// Define call options type for dynamic context injection
interface SecretaryCallOptions {
  userId: string;
}

export const secretaryAgent = new ToolLoopAgent<SecretaryCallOptions>({
  model: openrouter("openrouter/healer-alpha"),
  instructions: `ACT AS A HEADLESS API.

STRICT PROTOCOL FOR MESSAGING:
1. IF YOU NEED TO MESSAGE ANOTHER USER, YOU MUST FIRST CALL 'resolve_contact_url' WITH THEIR 6-CHARACTER HANDLE (e.g. "XK9MP2").
2. EXAMINE THE RESPONSE. IF 'connected' IS FALSE, YOU MUST NOT SEND A MESSAGE. INSTEAD, TELL THE USER "I cannot send a message because the connection with this user is pending or not established. Both of you must add each other's handles."
3. ONLY IF 'connected' IS TRUE AND YOU GOT THE 'agentUrl', CALL 'contact_remote_agent' USING THAT EXACT URL.
4. NEVER GUESS OR HALLUCINATE URLs (e.g., NO "a2a://", NO ".agent").
5. HANDLES ARE 6-CHARACTER ALPHANUMERIC CODES. IF GIVEN A NAME INSTEAD, ASK THE USER FOR THEIR HANDLE.

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
  // Inject userId from options into experimental_context for tool access
  prepareCall: ({ options, ...rest }) => ({
    ...rest,
    experimental_context: { userId: options.userId },
  }),
});
