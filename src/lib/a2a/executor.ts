import { InMemoryRunner, stringifyContent, isFinalResponse } from "@google/adk";
import { secretaryAgent } from "../agent/definition";

export async function executeAgent(userId: string, message: string): Promise<string> {
  const runner = new InMemoryRunner({
    agent: secretaryAgent,
    appName: "PersonalSecretary",
  });

  let finalText = "";
  const generator = runner.runEphemeral({
    userId,
    newMessage: { parts: [{ text: message }] },
    stateDelta: { userId },
  });

  for await (const event of generator) {
    if (isFinalResponse(event)) {
      finalText = stringifyContent(event);
    }
  }

  return finalText || "No response generated.";
}
