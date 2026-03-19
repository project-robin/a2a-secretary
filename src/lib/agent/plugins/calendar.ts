/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { tool } from "ai";
import { z } from "zod";
import { AgentPlugin } from "../plugin-types";

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud";
  return new ConvexHttpClient(convexUrl);
}

export const calendarPlugin: AgentPlugin = {
  name: "calendar",
  description: "Manage user's calendar events and find availability.",
  autonomyRules: {
    autoHandle: ["check_calendar", "find_free_slots"],
    requireConfirmation: ["add_event"],
  },
  tools: {
    check_calendar: tool({
      description: "Check the current user's calendar for existing events. No parameters needed.",
      inputSchema: z.object({}),
      execute: async (_input, { experimental_context }) => {
        console.log("[Plugin:Calendar] check_calendar called");
        const context = experimental_context as { userId?: string } | undefined;
        const userId = context?.userId;
        if (!userId) throw new Error("userId not found in execution context");

        const convex = getConvexClient();
        const events = await convex.query(api.calendar.getEvents, { userId } as any);
        console.log(`[Plugin:Calendar] check_calendar found ${events.length} events`);
        return events;
      },
    }),

    add_event: tool({
      description: "Add a meeting to the current user's calendar.",
      inputSchema: z.object({
        title: z.string().describe("Title of the meeting."),
        startTime: z.number().describe("Start time as Unix timestamp in milliseconds."),
        endTime: z.number().describe("End time as Unix timestamp in milliseconds."),
      }),
      execute: async ({ title, startTime, endTime }, { experimental_context }) => {
        console.log(`[Plugin:Calendar] add_event called: "${title}" from ${startTime} to ${endTime}`);
        const context = experimental_context as { userId?: string } | undefined;
        const userId = context?.userId;
        if (!userId) throw new Error("userId not found in execution context");

        try {
          const convex = getConvexClient();
          await convex.mutation(api.calendar.addEvent, { userId, title, startTime, endTime } as any);
          return "Meeting added successfully.";
        } catch (error) {
          console.error("[Plugin:Calendar] add_event FAILED:", error);
          return `Failed to add meeting: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    find_free_slots: tool({
      description: "Find available free time slots in the user's calendar.",
      inputSchema: z.object({
        durationMinutes: z.number().default(30).describe("Duration of the slot needed in minutes."),
        searchDays: z.number().default(3).describe("How many days into the future to search."),
      }),
      execute: async ({ durationMinutes, searchDays }, { experimental_context }) => {
        console.log(`[Plugin:Calendar] find_free_slots called: ${durationMinutes}m for ${searchDays} days`);
        const context = experimental_context as { userId?: string } | undefined;
        const userId = context?.userId;
        if (!userId) throw new Error("userId not found in execution context");

        const convex = getConvexClient();
        const events = await convex.query(api.calendar.getEvents, { userId } as any);

        // Basic slot finding logic
        // 1. Sort events by start time
        const sortedEvents = [...events].sort((a, b) => a.startTime - b.startTime);

        const now = Date.now();
        const endSearch = now + searchDays * 24 * 60 * 60 * 1000;
        const slotMs = durationMinutes * 60 * 1000;
        const freeSlots: { startTime: number; endTime: number }[] = [];

        let lastEnd = now;

        // Simple gap checking (doesn't account for working hours yet)
        for (const event of sortedEvents) {
          if (event.startTime > lastEnd + slotMs) {
            freeSlots.push({ startTime: lastEnd, endTime: event.startTime });
          }
          lastEnd = Math.max(lastEnd, event.endTime);
          if (lastEnd > endSearch) break;
        }

        if (lastEnd + slotMs < endSearch) {
          freeSlots.push({ startTime: lastEnd, endTime: endSearch });
        }

        // Limit to 5 suggestions to avoid overwhelming the LLM
        return freeSlots.slice(0, 5).map(s => ({
          start: new Date(s.startTime).toISOString(),
          end: new Date(s.endTime).toISOString(),
          startUnix: s.startTime,
          endUnix: s.endTime
        }));
      },
    }),
  },
};
