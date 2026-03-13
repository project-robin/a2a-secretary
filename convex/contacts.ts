/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { now } from "./utils";

// Helper to ensure proper 6-char uppercase handles
function normalizeHandle(handle: string): string {
  return handle.toUpperCase().trim().slice(0, 6);
}

export const addContact = mutation({
  args: {
    ownerId: v.id("users"),
    targetHandle: v.string(), // 6-char handle of the contact to add
  },
  handler: async (ctx: any, args: any) => {
    const ownerId = args.ownerId;
    const handle = normalizeHandle(args.targetHandle);
    if (!handle.match(/^[A-Z0-9]{6}$/)) {
      throw new Error("Invalid handle format");
    }

    // Find target user by handle
    const target = await ctx.db
      .query("users")
      .withIndex("by_handle", (q: any) => q.eq("handle", handle))
      .unique();
    if (!target) throw new Error("No agent found with this code");
    if (target._id === ownerId) throw new Error("Cannot add yourself as a contact");

    // Check existing contact row
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_owner_contact", (q: any) => q.eq("ownerId", ownerId).eq("contactUserId", target._id))
      .unique();

    const nowTs = Date.now();
    if (existing) {
      // If already exists, ensure status is upgraded if reciprocal exists
      if (existing.status !== "connected") {
        // Check reciprocal
        const reciprocal = await ctx.db
          .query("contacts")
          .withIndex("by_owner_contact", (q: any) => q.eq("ownerId", target._id).eq("contactUserId", ownerId))
          .unique();
        if (reciprocal) {
          await ctx.db.patch(existing._id, { status: "connected", createdAt: existing.createdAt || nowTs });
          if (reciprocal && reciprocal.status !== "connected") {
            await ctx.db.patch(reciprocal._id, { status: "connected", createdAt: reciprocal.createdAt || nowTs });
          }
        } else {
          // still pending
          await ctx.db.patch(existing._id, { createdAt: existing.createdAt || nowTs });
        }
      }
      return existing;
    }

    // Create new pending contact
    const contactId = await ctx.db.insert("contacts", {
      ownerId,
      contactUserId: target._id,
      status: "pending",
      createdAt: nowTs,
    });

    // If reciprocal exists, mark both as connected
    const reciprocal = await ctx.db
      .query("contacts")
      .withIndex("by_owner_contact", (q: any) => q.eq("ownerId", target._id).eq("contactUserId", ownerId))
      .unique();
    if (reciprocal) {
      await ctx.db.patch(contactId, { status: "connected" });
      if (reciprocal.status !== "connected") {
        await ctx.db.patch(reciprocal._id, { status: "connected" });
      }
    }
    return { _id: contactId, ownerId, contactUserId: target._id, status: reciprocal ? "connected" : "pending", createdAt: nowTs };
  },
});

export const getContacts = query({
  args: { ownerId: v.id("users") },
  handler: async (ctx: any, args: any) => {
    const ownerId = args.ownerId;
    const items = await ctx.db
      .query("contacts")
      .withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId))
      .collect();
    // Populate contact user data
    const enriched = await Promise.all(
      items.map(async (c: any) => {
        const user = await ctx.db.get(c.contactUserId);
        return {
          ...c,
          contactName: user?.name,
          contactHandle: user?.handle,
          agentUrl: user?.agentUrl,
        };
      })
    );
    return enriched;
  },
});

export const removeContact = mutation({
  args: { ownerId: v.id("users"), contactUserId: v.id("users") },
  handler: async (ctx: any, args: any) => {
    const { ownerId, contactUserId } = args;
    // Remove both directions if present
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_owner_contact", (q: any) => q.eq("ownerId", ownerId).eq("contactUserId", contactUserId))
      .unique();
    if (existing) await ctx.db.delete("contacts", existing._id);

    const reciprocal = await ctx.db
      .query("contacts")
      .withIndex("by_owner_contact", (q: any) => q.eq("ownerId", contactUserId).eq("contactUserId", ownerId))
      .unique();
    if (reciprocal) {
      // Do not delete reciprocal; just downgrade if needed
      await ctx.db.patch(reciprocal._id, { status: "pending" });
    }
    return { ok: true };
  },
});

