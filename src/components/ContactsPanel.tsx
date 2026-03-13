"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/Button";
import { Loader2 } from "lucide-react";

type Props = {
  ownerId: string;
};

export function ContactsPanel({ ownerId }: Props) {
  const [handle, setHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const addContact = useMutation(api.contacts.addContact);
  const contacts = useQuery(api.contacts.getContacts, { ownerId } as any);

  const onAdd = async () => {
    if (!handle || !ownerId) return;
    setSubmitting(true);
    try {
      await addContact({ ownerId, targetHandle: handle });
      setHandle("");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 p-4 bg-white/70 rounded-2xl shadow-md border border-stone-200">
      <h3 className="font-bold text-sm uppercase tracking-wider text-stone-700">My Contacts</h3>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Enter 6-char agent code (e.g. XK9MP2)"
          value={handle}
          onChange={(e) => setHandle(e.target.value.toUpperCase())}
        />
        <button onClick={onAdd} className="px-4 py-2 bg-stone-900 text-white rounded-lg" disabled={submitting || !handle}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2">
        {contacts && contacts.length > 0 ? (
          contacts.map((c: any) => (
            <div key={c._id ?? c.contactUserId} className="flex justify-between items-center p-2 border rounded-lg bg-white">
              <div>
                <div className="text-sm font-semibold">{c.contactName ?? "Unknown"}</div>
                <div className="text-xs text-stone-500">{c.contactHandle ?? "Unknown"}</div>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${c.status === "connected" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
              >
                {c.status}
              </span>
            </div>
          ))
        ) : (
          <div className="text-xs text-stone-500">No contacts yet. Add a code to start a mutual connection.</div>
        )}
      </div>
    </section>
  );
}

