import { Runner } from "@google/adk";
import { secretaryAgent } from "../agent/definition";

export async function executeAgent(userId: string, message: string) {
  const runner = new Runner(secretaryAgent);

  // We pass the userId into the tool context via the input if needed,
  // or handle it by wrapping tools. For this implementation, we'll
  // assume the agent is instructed to use the provided userId.

  const result = await runner.run(`User context: ${userId}. Message: ${message}`);
  return result.text;
}
