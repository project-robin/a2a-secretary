import { NextRequest, NextResponse } from "next/server";
import { executeAgent } from "@/lib/a2a/executor";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, mentionedContacts } = await request.json();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://fake-url.convex.cloud";
  const convex = new ConvexHttpClient(convexUrl);

  const user = await convex.query(api.calendar.getByClerkId, { clerkId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const text = await executeAgent(user._id, message, mentionedContacts);

  // Save the assistant's reply to the database
  await convex.mutation(api.messages.send, {
    userId: user._id,
    role: "assistant",
    text,
  });

  return NextResponse.json({ text });
}
