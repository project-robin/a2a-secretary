import { ToolLoopAgent } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { checkCalendar, addMeeting, contactRemoteAgent, resolveContactUrl, getContacts, getAgentCard } from "./tools";

// Define call options type for dynamic context injection
interface SecretaryCallOptions {
  userId: string;
  mentionedContacts?: Array<{name: string, handle: string, agentUrl: string}>;
}

export const secretaryAgent = new ToolLoopAgent<SecretaryCallOptions>({
  model: openrouter("openrouter/healer-alpha"),
  tools: {
    check_calendar: checkCalendar,
    add_meeting: addMeeting,
    contact_remote_agent: contactRemoteAgent,
    resolve_contact_url: resolveContactUrl,
    get_contacts: getContacts,
    get_agent_card: getAgentCard,
  },
  // Inject userId from options into experimental_context for tool access
  prepareCall: ({ options, ...rest }) => {
    const contactsContext = options.mentionedContacts?.length
      ? `\n\nMENTIONED CONTACTS (You have access to the user's explicit contact mentions for this task):\n${options.mentionedContacts.map(c => `- ${c.name} (Handle: ${c.handle}, URL: ${c.agentUrl})`).join('\n')}\n\nWhen the user mentions a name (e.g., '@Alice'), look up their details in the 'MENTIONED CONTACTS' list above and use their specific A2A URL or handle with your tools. Do not guess URLs.`
      : '';

    return {
      ...rest,
      experimental_context: { userId: options.userId },
      instructions: `ACT AS A HEADLESS API.

STRICT PROTOCOL FOR MESSAGING:
1. IF YOU NEED TO MESSAGE ANOTHER USER AND YOU DO NOT HAVE THEIR A2A URL, YOU MUST FIRST CALL 'resolve_contact_url' WITH THEIR 6-CHARACTER HANDLE (e.g. "XK9MP2").
2. EXAMINE THE RESPONSE. IF 'connected' IS FALSE, YOU MUST NOT SEND A MESSAGE. INSTEAD, TELL THE USER "I cannot send a message because the connection with this user is pending or not established. Both of you must add each other's handles."
3. ONLY IF 'connected' IS TRUE AND YOU GOT THE 'agentUrl' (OR IF YOU ALREADY HAVE THEIR agentUrl FROM THE MENTIONED CONTACTS), CALL 'contact_remote_agent' USING THAT EXACT URL.
4. NEVER GUESS OR HALLUCINATE URLs (e.g., NO "a2a://", NO ".agent").
5. HANDLES ARE 6-CHARACTER ALPHANUMERIC CODES. IF GIVEN A NAME INSTEAD, ASK THE USER FOR THEIR HANDLE UNLESS THEY ARE IN THE MENTIONED CONTACTS LIST.${contactsContext}

OTHER TOOLS:
- IF THE USER SAYS "Check calendar", CALL 'check_calendar'.
- IF YOU AGREE ON A MEETING, CALL 'add_meeting'.

DO NOT GREET. DO NOT TALK. ONLY CALL TOOLS.`,
    };
  },
});
