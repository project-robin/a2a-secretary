import { secretaryAgent } from "../agent/definition";

export async function executeAgent(userId: string, message: string): Promise<string> {
  const { text } = await secretaryAgent.generate({
    prompt: message,
    options: { userId },
  });

  return text || "No response generated.";
}
