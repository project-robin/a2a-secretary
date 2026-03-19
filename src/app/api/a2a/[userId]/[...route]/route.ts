import { NextRequest, NextResponse } from "next/server";
import { executeAgent } from "@/lib/a2a/executor";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; route: string[] }> }
) {
  const { userId, route } = await params;

  const path = route.join("/");
  if (path === ".well-known/agent-card.json" || path === ".well-known/agent.json") {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://fake-url.convex.cloud";
    const convex = new ConvexHttpClient(convexUrl);

    const user = await convex.query(api.calendar.getById, { userId });
    if (!user) return new NextResponse("Not Found", { status: 404 });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://a2a-secretary.vercel.app";
    const jsonrpcUrl = `${baseUrl}/api/a2a/${userId}/jsonrpc`;
    return NextResponse.json({
      name: (user as any).agentName || (user as any).name || "Agent",
      description: (user as any).agentBio || `Personal AI agent for ${(user as any).agentName || (user as any).name}`,
      url: jsonrpcUrl,
      endpoints: {
        jsonrpc: jsonrpcUrl,
      },
      skills: [
        { id: "calendar", name: "Calendar Management" },
        { id: "tasks", name: "Task Management" },
        { id: "memory", name: "Memory & Preferences" },
        { id: "coordination", name: "Group Coordination" },
      ],
    });
  }

  return new NextResponse("Not Found", { status: 404 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; route: string[] }> }
) {
  const { userId, route } = await params;

  if (route.join("/") === "jsonrpc") {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://fake-url.convex.cloud";
    const convex = new ConvexHttpClient(convexUrl);

    // userId in the URL IS the Convex ID — no name resolution needed
    const user = await convex.query(api.calendar.getById, { userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();

    if (body.method === "message/send") {
      const incomingMessage = body.params.message;

      // Extract sender info from DataParts to pass as mentioned contacts
      const senderMetadata = incomingMessage.parts.find((p: any) => p.kind === "data" && p.data?.kind === "sender_metadata")?.data;
      const mentionedContacts = senderMetadata ? [{
        name: senderMetadata.name,
        handle: senderMetadata.handle,
        agentUrl: senderMetadata.agentUrl
      }] : undefined;

      // Use the full parts array for the agent to process
      const { text: resultText, richContent } = await executeAgent(
        user._id,
        incomingMessage.parts,
        mentionedContacts,
        undefined,
        {
          agentName: (user as any).agentName || "Assistant",
          agentBio: (user as any).agentBio || "A helpful personal agent",
          agentTone: ((user as any).agentTone || "casual") as "casual" | "formal" | "friendly",
        }
      );

      // For display in the local UI, we still want a text representation of what the remote agent sent
      let incomingRichContent = undefined;
      const incomingText = incomingMessage.parts
        .map((p: any) => {
          if (p.kind === "text") return p.text;
          if (p.kind === "data") {
            // If it's not sender_metadata, treat it as richContent for the UI
            if (p.data?.kind !== "sender_metadata") {
              incomingRichContent = JSON.stringify(p.data);
            }
            return `[Data]: ${JSON.stringify(p.data)}`;
          }
          return `[${p.kind}]`;
        })
        .join("\n")
        .trim();

      console.log(`[A2A] Incoming message for ${user.agentName} (${user._id}): "${incomingText}"`);

      // Store the incoming message from the remote agent
      await convex.mutation(api.messages.send, {
        userId: user._id,
        role: "remote_agent",
        text: `[Remote Agent]: ${incomingText}`,
        richContent: incomingRichContent,
      });

      // Store our agent's reply in Convex (for the local UI)
      await convex.mutation(api.messages.send, {
        userId: user._id,
        role: "assistant",
        text: resultText,
        richContent,
      });

      const parts: any[] = [{ kind: "text", text: resultText }];
      if (richContent) {
        try {
          const parsed = JSON.parse(richContent);
          // Don't leak internal confirmation requests to the remote agent
          if (parsed.kind !== "ConfirmationCard") {
            parts.push({
              kind: "data",
              data: parsed
            });
          }
        } catch (e) {
          console.error("Failed to parse richContent for A2A DataPart:", e);
        }
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          message: {
            kind: "message",
            role: "agent",
            messageId: crypto.randomUUID(),
            parts,
          }
        },
        id: body.id,
      });
    }
  }

  return new NextResponse("Not Found", { status: 404 });
}
