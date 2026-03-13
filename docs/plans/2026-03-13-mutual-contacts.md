# Mutual Contacts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a mutual opt-in contacts system where users can add each other via their 6-character agent code (handle) and gate A2A communication behind mutual connection.

**Architecture:** We will add a `contacts` table to Convex to track relationships between users. A new `ContactsPanel` UI will allow adding contacts via short codes. The agent's `resolveContactUrl` tool will verify the mutual connection before permitting the `contact_remote_agent` tool.

**Tech Stack:** Next.js, React, Convex, Tailwind CSS

---

### Task 1: Update Convex Schema

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Write the schema update**
We need to add the `contacts` table with indexes for fast lookups.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    agentUrl: v.string(),
    clerkId: v.optional(v.string()),
    handle: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_clerkId", ["clerkId"])
    .index("by_handle", ["handle"]),

  calendarEvents: defineTable({
    userId: v.id("users"),
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  }).index("by_user", ["userId"]),

  contacts: defineTable({
    ownerId: v.id("users"),       // The user who added the contact
    contactUserId: v.id("users"), // The user being added
    status: v.string(),           // "pending" | "connected"
    createdAt: v.number(),        // Timestamp
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_contact", ["ownerId", "contactUserId"])
    .index("by_contact", ["contactUserId"])
});
```

**Step 2: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add contacts table to schema"
```

---

### Task 2: Implement Convex Contact Logic

**Files:**
- Create: `convex/contacts.ts`

**Step 1: Write the mutation and queries**
Create `convex/contacts.ts` to implement `addContact`, `getContacts`, and `removeContact`.

```typescript
// convex/contacts.ts
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
```

**Step 2: Commit**

```bash
git add convex/contacts.ts
git commit -m "feat: implement addContact, getContacts, and removeContact in convex"
```

---

### Task 3: Create ContactsPanel Component

**Files:**
- Create/Modify: `src/components/ContactsPanel.tsx`

**Step 1: Write the component**
Create the component for adding and displaying contacts.

```tsx
// src/components/ContactsPanel.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export default function ContactsPanel({ userId }: { userId: Id<"users"> }) {
  const [handleCode, setHandleCode] = useState("");
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const contacts = useQuery(api.contacts.getContacts, { ownerId: userId });
  const addContact = useMutation(api.contacts.addContact);
  const removeContact = useMutation(api.contacts.removeContact);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = handleCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setError("Handle must be exactly 6 alphanumeric characters.");
      return;
    }

    setIsAdding(true);
    try {
      await addContact({ ownerId: userId, handle: code });
      setHandleCode("");
    } catch (err: any) {
      setError(err.message || "Failed to add contact.");
    } finally {
      setIsAdding(false);
    }
  };

  if (!contacts) {
    return <div className="p-4 bg-gray-50 rounded-lg animate-pulse h-32"></div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>

        <form onSubmit={handleAdd} className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <input
              type="text"
              placeholder="Enter 6-char code"
              value={handleCode}
              onChange={(e) => setHandleCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
              maxLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || handleCode.length === 0}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {isAdding ? "Adding..." : "Add"}
          </button>
        </form>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm border-b border-red-100">
          {error}
        </div>
      )}

      <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No contacts yet. Add someone's 6-character code above to connect!
          </div>
        ) : (
          contacts.map((contact) => (
            <div key={contact._id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
              <div>
                <div className="font-medium text-gray-900">{contact.user!.name}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">{contact.user!.handle}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${
                  contact.status === 'connected'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }\`}>
                  {contact.status === 'connected' ? 'Connected ✓' : 'Pending ⏳'}
                </span>
                <button
                  onClick={() => removeContact({ contactId: contact._id })}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Remove contact"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ContactsPanel.tsx
git commit -m "feat: create ContactsPanel component"
```

---

### Task 4: Integrate ContactsPanel into main page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Write the integration code**
Edit `src/app/page.tsx` to include the `ContactsPanel` under `UserSwitcher`.

```tsx
// Edit src/app/page.tsx
// Find imports, add:
import ContactsPanel from "@/components/ContactsPanel";

// Then find where UserSwitcher is rendered (inside <main className="...">)
// And insert ContactsPanel right below it
```

*Note: You'll need to use `Edit` tool to modify the real `src/app/page.tsx` directly.*

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate ContactsPanel into page"
```

---

### Task 5: Agent Security & Tool Integration

**Files:**
- Modify: `src/lib/agent/tools.ts`
- Modify: `src/lib/agent/definition.ts`

**Step 1: Update `resolveContactUrl` in `tools.ts`**
Add mutual connection check to `resolveContactUrl`.

```typescript
// Edit src/lib/agent/tools.ts
// Add context to execute args
// Replace resolveContactUrl with:
export const resolveContactUrl = tool({
  description: "Resolve a user's 6-character short code (handle) to their official A2A agent URL. YOU MUST CALL THIS before 'contact_remote_agent' if you don't have a valid HTTP URL.",
  inputSchema: z.object({
    handle: z.string().describe("The 6-character code shared by the user (e.g. XK9MP2)."),
  }),
  execute: async ({ handle }, { experimental_context }) => {
    console.log(`[Tool] resolve_contact_url called for handle: ${handle}`);

    const context = experimental_context as { userId?: string } | undefined;
    const userId = context?.userId;
    if (!userId) throw new Error("userId not found in execution context");

    const targetUser = await convex.query(api.calendar.getByHandle, { handle });
    if (!targetUser) return { error: `No user found with code ${handle}` };

    // Check mutual connection
    const contacts = await convex.query(api.contacts.getContacts, { ownerId: userId as any });
    const contact = contacts.find((c: any) => c.contactUserId === targetUser._id);

    const isConnected = contact?.status === "connected";

    // Zero-Trust: Strip internal IDs before returning to LLM
    return {
      name: (targetUser as any).name,
      agentUrl: (targetUser as any).agentUrl,
      connected: isConnected
    };
  },
});
```

**Step 2: Update agent instructions in `definition.ts`**

```typescript
// Edit src/lib/agent/definition.ts
// Replace instructions string with:
  instructions: `ACT AS A HEADLESS API.

STRICT PROTOCOL FOR MESSAGING:
1. IF YOU NEED TO MESSAGE ANOTHER USER, YOU MUST FIRST CALL 'resolve_contact_url' WITH THEIR 6-CHARACTER HANDLE (e.g. "XK9MP2").
2. EXAMINE THE RESPONSE. IF 'connected' IS FALSE, YOU MUST NOT SEND A MESSAGE. INSTEAD, TELL THE USER "I cannot send a message because the connection with this user is pending or not established. Both of you must add each other's handles."
3. ONLY IF 'connected' IS TRUE AND YOU GOT THE 'agentUrl', CALL 'contact_remote_agent' USING THAT EXACT URL.
4. NEVER GUESS OR HALLUCINATE URLs (e.g., NO "a2a://", NO ".agent").
5. HANDLES ARE 6-CHARACTER ALPHANUMERIC CODES. IF GIVEN A NAME INSTEAD, ASK THE USER FOR THEIR HANDLE.

OTHER TOOLS:
- IF THE USER SAYS "Check calendar", CALL 'check_calendar'.
- IF YOU AGREE ON A MEETING, CALL 'add_meeting'.

DO NOT GREET. DO NOT TALK. ONLY CALL TOOLS.`,
```

**Step 3: Commit**

```bash
git add src/lib/agent/tools.ts src/lib/agent/definition.ts
git commit -m "feat: gate agent communication behind mutual contact verification"
```
