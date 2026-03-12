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
    newMessage: { role: "user", parts: [{ text: message }] },
    stateDelta: { userId },
  });

  for await (const event of generator) {
    const text = stringifyContent(event);
    if (text) {
      finalText += (finalText ? "\n" : "") + text;
    }

    if (event.errorCode || event.errorMessage) {
      console.error(`[ADK Error] ${event.errorCode}: ${event.errorMessage}`);
    }
  }

  return finalText || "No response generated.";
}
