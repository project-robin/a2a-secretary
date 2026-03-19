"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Users, Plus, Loader2, Link as LinkIcon } from "lucide-react";

interface ContactsSidebarProps {
  userId: string;
}

export function ContactsSidebar({ userId }: ContactsSidebarProps) {
  const contacts = useQuery(api.contacts.getContacts, userId ? { ownerId: userId as any } : "skip");
  const [isAdding, setIsAdding] = useState(false);
  const [handle, setHandle] = useState("");

  return (
    <div className="w-72 border-r border-stone-200 bg-stone-50/50 flex flex-col">
      <div className="p-6 border-b border-stone-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-stone-400" />
            <h2 className="font-display font-bold text-xs uppercase tracking-widest text-stone-400">
              Contacts
            </h2>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {isAdding && (
          <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
            <input
              type="text"
              placeholder="Enter handle (e.g. XK9MP2)"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toUpperCase())}
              className="w-full text-xs font-medium bg-stone-100 border-none rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-stone-900/5 transition-all"
            />
            <button className="w-full bg-stone-900 text-white text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg hover:bg-stone-800 transition-colors">
              Request Connection
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {!contacts ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-5 h-5 text-stone-300 animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest leading-relaxed">
              No contacts yet
            </p>
          </div>
        ) : (
          contacts.map((contact: any) => (
            <button
              key={contact._id}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white hover:shadow-sm transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-stone-200 flex items-center justify-center text-stone-500 font-bold text-sm">
                {(contact.user?.agentName || "A")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-stone-800 text-sm truncate">
                    {contact.user?.agentName}
                  </span>
                  {contact.status === "connected" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                </div>
                <p className="text-[10px] font-mono text-stone-400 truncate">
                  {contact.user?.handle}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="p-4 mt-auto border-t border-stone-200 bg-stone-100/30">
        <div className="flex items-center gap-3 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
          <LinkIcon className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            A2A Explorer
          </span>
        </div>
      </div>
    </div>
  );
}
