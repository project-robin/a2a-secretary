"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Loader2, LogOut, Copy, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

export type User = {
  _id: Id<"users">;
  agentName: string;
  agentUrl: string;
  handle: string;
  agentBio?: string;
  agentTone?: string;
};

export function UserSwitcher({ onUserChange }: { onUserChange: (user: User) => void }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [copied, setCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const createUser = useMutation(api.calendar.createUserForClerk);

  // Load the current user from Convex via their clerkId
  const convexUser = useQuery(
    api.calendar.getByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Sync user if authenticated but not in Convex
  useEffect(() => {
    if (isLoaded && clerkUser && convexUser === null) {
      // Use the NEXT_PUBLIC_BASE_URL if available, otherwise fallback to window.location.origin
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      createUser({
        clerkId: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName || "Anonymous",
        baseUrl: baseUrl,
      });
    }
  }, [isLoaded, clerkUser, convexUser, createUser]);

  useEffect(() => {
    if (convexUser && typeof convexUser === "object" && "_id" in convexUser && "agentName" in convexUser && "agentUrl" in convexUser && "handle" in convexUser) {
      onUserChange(convexUser as User);
    }
  }, [convexUser, onUserChange]);

  if (!isLoaded || (clerkUser && convexUser === undefined)) {
    return (
      <div className="glass rounded-3xl p-12 flex flex-col items-center justify-center border-dashed border-2 border-stone-200 animate-in fade-in duration-700 max-w-2xl mx-auto">
        <Loader2 className="w-10 h-10 text-stone-900 animate-spin mb-6" />
        <h3 className="font-display font-bold text-xl text-stone-900 mb-2">Synchronizing Identity</h3>
        <p className="text-stone-500 text-center text-sm max-w-sm leading-relaxed mb-4">
          We&apos;re securely linking your Clerk account with your Zero-Trust Agent workspace in Convex.
        </p>
        <div className="bg-stone-100 p-4 rounded-xl w-full text-[10px] font-mono text-stone-400 break-all">
          <p className="font-bold uppercase mb-1">Troubleshooting Tip:</p>
          If this hangs, ensure you created a &quot;convex&quot; JWT Template in your Clerk Dashboard.
        </div>
      </div>
    );
  }

  if (clerkUser && !convexUser) {
    return (
      <div className="glass rounded-3xl p-12 flex flex-col items-center justify-center border-dashed border-2 border-amber-200 bg-amber-50/30 animate-in fade-in duration-700 max-w-2xl mx-auto">
        <Loader2 className="w-10 h-10 text-amber-600 animate-spin mb-6" />
        <h3 className="font-display font-bold text-xl text-stone-900 mb-2">Finalizing Workspace</h3>
        <p className="text-stone-500 text-center text-sm max-w-sm leading-relaxed">
          Your account is created, but your agent is still being provisioned in the background. Please stay on this page.
        </p>
      </div>
    );
  }

  if (!clerkUser) {
    return null;
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(convexUser.handle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(convexUser.agentUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div className="mb-12 animate-in slide-in-from-top-4 duration-700">
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="h-[1px] flex-1 bg-stone-200" />
        <span className="font-display font-bold text-[10px] text-stone-400 uppercase tracking-[0.3em]">
          Active Identity
        </span>
        <div className="h-[1px] flex-1 bg-stone-200" />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white border border-stone-200 p-6 rounded-3xl shadow-xl shadow-stone-200/50">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-stone-900 text-white flex items-center justify-center font-display font-bold text-xl shadow-inner">
            {(convexUser.agentName || "A").charAt(0)}
          </div>
          <div className="text-left">
            <p className="font-display font-bold tracking-tight text-lg text-stone-800">{convexUser.agentName}</p>
            <p className="text-xs font-medium text-stone-500">
              {clerkUser.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto overflow-hidden">
          <div className="flex flex-col gap-2 w-full lg:w-auto">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full">
              <div className="bg-stone-50 border border-stone-200 px-6 py-3 rounded-2xl flex flex-col items-center min-w-[200px] w-full md:w-auto shrink-0">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                  Your Agent Code
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-display font-black text-2xl tracking-[0.2em] text-stone-800">
                    {convexUser.handle}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 hover:bg-stone-200 rounded-lg transition-colors text-stone-500"
                    title="Copy code"
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-200 px-6 py-3 rounded-2xl flex flex-col items-center flex-1 w-full md:max-w-[300px] overflow-hidden">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                  A2A Discovery URL
                </span>
                <div className="flex items-center gap-2 w-full">
                  <span className="font-mono text-xs text-stone-600 truncate flex-1" title={convexUser.agentUrl}>
                    {convexUser.agentUrl}
                  </span>
                  <button
                    onClick={handleCopyUrl}
                    className="p-1.5 hover:bg-stone-200 rounded-lg transition-colors text-stone-500 flex-shrink-0"
                    title="Copy URL"
                  >
                    {urlCopied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-all h-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
