import { NextRequest, NextResponse } from "next/server";
import { executeAgent } from "@/lib/a2a/executor";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; route: string[] }> }
) {
  const { userId, route } = await params;

  if (route.join("/") === ".well-known/agent-card.json") {
    return NextResponse.json({
      name: `${userId}'s Secretary`,
      description: `A2A Personal Secretary for ${userId}`,
      endpoints: {
        jsonrpc: `/api/a2a/${userId}/jsonrpc`,
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

    if (body.method === "process_message") {
      const result = await executeAgent(userId, body.params.message);
      return NextResponse.json({
        jsonrpc: "2.0",
        result,
        id: body.id,
      });
    }
  }

  return new NextResponse("Not Found", { status: 404 });
}
