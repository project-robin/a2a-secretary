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
      name: `${user.name}'s Secretary`,
      description: `A2A Personal Secretary for ${user.name}`,
      url: jsonrpcUrl,
      endpoints: {
        jsonrpc: jsonrpcUrl,
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

      console.log(`[A2A] Incoming message for ${user.name} (${user._id}): "${text}"`);

      const result = await executeAgent(user._id, text);

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
