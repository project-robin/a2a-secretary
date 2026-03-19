import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Helper mutation to upsert an external user and create a contact link
export const upsertExternalContact = internalMutation({
  args: {
    ownerId: v.id("users"),
    name: v.string(),
    agentUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Check if external user already exists
    let targetUser = await ctx.db
      .query("users")
      .withIndex("by_agentUrl", (q) => q.eq("agentUrl", args.agentUrl))
      .first();

    if (!targetUser) {
      // Create stub user for the external agent
      const newUserId = await ctx.db.insert("users", {
        agentName: args.name,
        agentUrl: args.agentUrl,
        // No clerkId or handle for external users
      });
      targetUser = await ctx.db.get(newUserId);
    }

    if (!targetUser) {
      throw new Error("Failed to create external user");
    }

    if (targetUser._id === args.ownerId) {
      throw new Error("Cannot add yourself as a contact");
    }

    // 2. Check if contact already exists
    const existingContact = await ctx.db
      .query("contacts")
      .withIndex("by_owner_contact", (q) =>
        q.eq("ownerId", args.ownerId).eq("contactUserId", targetUser!._id)
      )
      .first();

    if (existingContact) {
      return existingContact;
    }

    // For external contacts, we set them directly to "connected" since
    // we don't currently have a cross-server handshake protocol
    const newContactId = await ctx.db.insert("contacts", {
      ownerId: args.ownerId,
      contactUserId: targetUser._id,
      status: "connected",
      createdAt: Date.now(),
    });

    // Auto-create reciprocal contact so targetUser sees the connection too
    const reciprocalContact = await ctx.db
      .query("contacts")
      .withIndex("by_owner_contact", (q) =>
        q.eq("ownerId", targetUser!._id).eq("contactUserId", args.ownerId)
      )
      .first();

    if (!reciprocalContact) {
      await ctx.db.insert("contacts", {
        ownerId: targetUser._id,
        contactUserId: args.ownerId,
        status: "connected",
        createdAt: Date.now(),
      });
    } else if (reciprocalContact.status !== "connected") {
      await ctx.db.patch(reciprocalContact._id, { status: "connected" });
    }

    return await ctx.db.get(newContactId);
  },
});

export const addExternalContact = action({
  args: {
    ownerId: v.id("users"),
    agentUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      let baseUrl = args.agentUrl.trim().replace(/\/+$/, "");

      // Try to fetch the agent card to verify it's a real A2A agent
      let cardUrl = `${baseUrl}/.well-known/agent-card.json`;

      // If the user pasted the direct card URL, use that
      if (baseUrl.endsWith("/.well-known/agent-card.json") || baseUrl.endsWith("/.well-known/agent.json")) {
        cardUrl = baseUrl;
        baseUrl = baseUrl.replace(/\/\.well-known\/agent(-card)?\.json$/, "");
      }

      const response = await fetch(cardUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch agent card: ${response.statusText}`);
      }

      const agentCard = await response.json();

      if (!agentCard.name || !agentCard.url) {
        throw new Error("Invalid agent card format: missing name or url");
      }

      // Upsert the user and create the contact
      await ctx.runMutation(internal.contacts.upsertExternalContact, {
        ownerId: args.ownerId,
        name: agentCard.name,
        agentUrl: agentCard.url,
      });
      return null;
    } catch (error) {
      console.error("Error adding external contact:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to add external contact");
    }
  },
});

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

    // Auto-accept request: status is always "connected"
    const status = "connected";

    // 4. Insert contact record
    const newContactId = await ctx.db.insert("contacts", {
      ownerId: args.ownerId,
      contactUserId: targetUser._id,
      status,
      createdAt: Date.now(),
    });

    // 5. Update or create reciprocal as connected
    if (reciprocalContact) {
      if (reciprocalContact.status !== "connected") {
        await ctx.db.patch(reciprocalContact._id, { status: "connected" });
      }
    } else {
      await ctx.db.insert("contacts", {
        ownerId: targetUser._id,
        contactUserId: args.ownerId,
        status: "connected",
        createdAt: Date.now(),
      });
    }

    return await ctx.db.get(newContactId);
  },
});

export const getContacts = query({
  args: { ownerId: v.id("users") },
  handler: async (ctx, args) => {
    // 1. Outbound contacts (added by the user)
    const outbound = await ctx.db
      .query("contacts")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    // 2. Inbound pending contacts (added by others, but user hasn't added back)
    const inbound = await ctx.db
      .query("contacts")
      .withIndex("by_contact", (q) => q.eq("contactUserId", args.ownerId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Join with user data for outbound
    const outboundWithUsers = await Promise.all(
      outbound.map(async (contact) => {
        const user = await ctx.db.get(contact.contactUserId);
        return {
          ...contact,
          isIncoming: false,
          user,
        };
      })
    );

    // Join with user data for inbound
    const inboundWithUsers = await Promise.all(
      inbound.map(async (contact) => {
        const user = await ctx.db.get(contact.ownerId);
        return {
          ...contact,
          isIncoming: true,
          user,
        };
      })
    );

    // Combine and filter out orphaned contacts
    return [...outboundWithUsers, ...inboundWithUsers]
      .filter((c) => c.user !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
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
