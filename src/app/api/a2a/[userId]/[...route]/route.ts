import { NextRequest, NextResponse } from "next/server";
import { executeAgent } from "@/lib/a2a/executor";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; route: string[] }> }
) {
  const { userId, route } = await params;

    const path = route.join("/");
    if (path === ".well-known/agent-card.json" || path === ".well-known/agent.json") {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const jsonrpcUrl = `${baseUrl}/api/a2a/${userId}/jsonrpc`;
        return NextResponse.json({
            name: `${userId}'s Secretary`,
            description: `A2A Personal Secretary for ${userId}`,
            url: jsonrpcUrl, // Top-level url for A2A SDK compatibility
            endpoints: {
                jsonrpc: jsonrpcUrl
            },
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
    const body = await request.json();

    if (body.method === "message/send") {
      const incomingMessage = body.params.message;
      const text = incomingMessage.parts
        .map((p: any) => p.text || "")
        .join("\n")
        .trim();

      console.log(`[A2A] Incoming message for ${userId}: "${text}"`);

      const result = await executeAgent(userId, text);

      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          kind: "message",
          role: "agent",
          messageId: crypto.randomUUID(),
          parts: [{ kind: "text", text: result }],
        },
        id: body.id,
      });
    }
  }

  return new NextResponse("Not Found", { status: 404 });
}
