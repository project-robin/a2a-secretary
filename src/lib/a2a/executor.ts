import { personalAgent } from "../agent/definition";
import { AgentPersona } from "../agent/plugin-types";

export async function executeAgent(
  userId: string,
  message: string,
  mentionedContacts?: Array<{ name: string; handle: string; agentUrl: string }>,
  approvedTools?: string[],
  persona?: AgentPersona
): Promise<string> {
  // Check if message is a coordination request from another agent
  let formattedMessage = message;
  try {
    const parsed = JSON.parse(message);
    if (parsed.kind === "coordination_request") {
      formattedMessage = `COORDINATION REQUEST from another agent:
Type: ${parsed.type}
Data: ${JSON.stringify(parsed.data)}

Please handle this request appropriately based on your rules and memory.`;
    }
  } catch (e) {
    // Not a JSON message, use as is
  }

  const { text } = await personalAgent.generate({
    prompt: formattedMessage,
    options: { userId, mentionedContacts, approvedTools, persona },
  });

  return text || "No response generated.";
}
