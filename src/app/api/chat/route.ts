import { NextRequest, NextResponse } from "next/server";
import { executeAgent } from "@/lib/a2a/executor";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await request.json();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const user = await convex.query(api.calendar.getByClerkId, { clerkId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const text = await executeAgent(user._id, message);
  return NextResponse.json({ text });
}
