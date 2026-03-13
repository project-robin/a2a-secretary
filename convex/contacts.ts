import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addContact = mutation({
  args: {
    ownerId: v.id("users"),
    handle: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Look up target user by handle
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", args.handle))
      .first();

    if (!targetUser) {
      throw new Error("No agent found with this code");
    }

    if (targetUser._id === args.ownerId) {
      throw new Error("Cannot add yourself as a contact");
    }

    // 2. Check if contact already exists
    const existingContact = await ctx.db
      .query("contacts")
      .withIndex("by_owner_contact", (q) =>
        q.eq("ownerId", args.ownerId).eq("contactUserId", targetUser._id)
      )
      .first();

    if (existingContact) {
      return existingContact;
    }

    // 3. Check if reciprocal exists
    const reciprocalContact = await ctx.db
      .query("contacts")
      .withIndex("by_owner_contact", (q) =>
        q.eq("ownerId", targetUser._id).eq("contactUserId", args.ownerId)
      )
      .first();

    const isMutual = !!reciprocalContact;
    const status = isMutual ? "connected" : "pending";

    // 4. Insert contact record
    const newContactId = await ctx.db.insert("contacts", {
      ownerId: args.ownerId,
      contactUserId: targetUser._id,
      status,
      createdAt: Date.now(),
    });

    // 5. Update reciprocal to connected if it exists
    if (isMutual) {
      await ctx.db.patch(reciprocalContact._id, { status: "connected" });
    }

    return await ctx.db.get(newContactId);
  },
});

export const getContacts = query({
  args: { ownerId: v.id("users") },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    // Join with user data
    const contactsWithUsers = await Promise.all(
      contacts.map(async (contact) => {
        const user = await ctx.db.get(contact.contactUserId);
        return {
          ...contact,
          user,
        };
      })
    );

    // Filter out orphaned contacts (if a user was deleted)
    return contactsWithUsers.filter((c) => c.user !== null);
  },
});

export const removeContact = mutation({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) return;

    // Delete this contact
    await ctx.db.delete(args.contactId);

    // If reciprocal exists, downgrade to pending
    const reciprocalContact = await ctx.db
      .query("contacts")
      .withIndex("by_owner_contact", (q) =>
        q.eq("ownerId", contact.contactUserId).eq("contactUserId", contact.ownerId)
      )
      .first();

    if (reciprocalContact && reciprocalContact.status === "connected") {
      await ctx.db.patch(reciprocalContact._id, { status: "pending" });
    }
  },
});
