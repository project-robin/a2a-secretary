import { NextRequest, NextResponse } from "next/server";
import { executeAgent } from "@/lib/a2a/executor";

export async function POST(request: NextRequest) {
  const { userId, message } = await request.json();

  if (!userId || !message) {
    return NextResponse.json({ error: "Missing userId or message" }, { status: 400 });
  }

  try {
    const result = await executeAgent(userId, message);
    return NextResponse.json({ text: result });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
