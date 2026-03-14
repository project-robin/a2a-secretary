import { secretaryAgent } from "../agent/definition";

export async function executeAgent(
  userId: string,
  message: string,
  mentionedContacts?: Array<{name: string, handle: string, agentUrl: string}>
): Promise<string> {
  const { text } = await secretaryAgent.generate({
    prompt: message,
    options: { userId, mentionedContacts },
  });

  return text || "No response generated.";
}
