import { personalAgent } from "../agent/definition";
import { AgentPersona } from "../agent/plugin-types";
import { Part } from "@a2a-js/sdk";

function formatMessage(message: string | Part[]): string {
  if (Array.isArray(message)) {
    return message
      .map((part) => {
        if (part.kind === "text") {
          return part.text;
        } else if (part.kind === "data") {
          const data = part.data as any;
          if (data?.kind === "sender_metadata") {
            return `SENDER INFO:\nName: ${data.name}\nHandle: ${data.handle}\nURL: ${data.agentUrl}`;
          }
          return `[Structured Data]: ${JSON.stringify(part.data, null, 2)}`;
        } else if (part.kind === "file") {
          return `[File]: ${part.file.name || "unnamed file"} (${part.file.mimeType || "unknown type"})`;
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  try {
    const parsed = JSON.parse(message);
    if (parsed.kind === "coordination_request") {
      return `COORDINATION REQUEST from another agent:
Type: ${parsed.type}
Data: ${JSON.stringify(parsed.data)}

Please handle this request appropriately based on your rules and memory.`;
    }
  } catch (e) {
    // Not a JSON message, use as is
  }
  return message;
}

export async function executeAgent(
  userId: string,
  message: string | Part[],
  mentionedContacts?: Array<{ name: string; handle: string; agentUrl: string }>,
  approvedTools?: string[],
  persona?: AgentPersona
): Promise<{ text: string; richContent?: string }> {
  const formattedMessage = formatMessage(message);

  const { text } = await personalAgent.generate({
    prompt: formattedMessage,
    options: { userId, mentionedContacts, approvedTools, persona },
  });

  if (!text) return { text: "No response generated." };

  // Extract JSON block for richContent if it exists
  let richContent = undefined;
  let cleanText = text;
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);

  if (jsonMatch) {
    try {
      // Verify it's valid JSON
      JSON.parse(jsonMatch[1]);
      richContent = jsonMatch[1];
      // Remove the JSON block from the text for the standard message display
      cleanText = text.replace(jsonMatch[0], "").trim();
    } catch (e) {
      console.error("Failed to parse rich content JSON in non-streaming mode:", e);
    }
  }

  return { text: cleanText, richContent };
}

export function streamAgent(
  userId: string,
  message: string | Part[],
  mentionedContacts?: Array<{ name: string; handle: string; agentUrl: string }>,
  approvedTools?: string[],
  persona?: AgentPersona
) {
  const formattedMessage = formatMessage(message);

  return personalAgent.stream({
    prompt: formattedMessage,
    options: { userId, mentionedContacts, approvedTools, persona },
  });
}
