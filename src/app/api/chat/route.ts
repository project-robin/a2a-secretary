import { NextRequest, NextResponse } from "next/server";
import { executeAgent } from "@/lib/a2a/executor";

export async function POST(request: NextRequest) {
  const { userId, message } = await request.json();
  if (!userId || !message) {
    return NextResponse.json({ error: "userId and message are required" }, { status: 400 });
  }
  const text = await executeAgent(userId, message);
  return NextResponse.json({ text });
}
