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
      const text = incomingMessage.parts
        .map((p: { text?: string }) => p.text || "")
        .join("\n")
        .trim();

      console.log(`[A2A] Incoming message for ${user.agentName} (${user._id}): "${text}"`);

      // Store the incoming message from the remote agent
      await convex.mutation(api.messages.send, {
        userId: user._id,
        role: "remote_agent",
        text: `[Remote Agent]: ${text}`,
      });

      const persona = {
        agentName: (user as any).agentName || "Assistant",
        agentBio: (user as any).agentBio || "A helpful personal agent",
        agentTone: ((user as any).agentTone || "casual") as "casual" | "formal" | "friendly",
      };

      const result = await executeAgent(user._id, text, undefined, undefined, persona);

      // Store our agent's reply
      await convex.mutation(api.messages.send, {
        userId: user._id,
        role: "assistant",
        text: result,
      });

      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          message: {
            kind: "message",
            role: "agent",
            messageId: crypto.randomUUID(),
            parts: [{ kind: "text", text: result }],
          }
        },
        id: body.id,
      });
    }
  }

  return new NextResponse("Not Found", { status: 404 });
}
