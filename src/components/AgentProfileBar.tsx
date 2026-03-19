"use client";

import { ShieldCheck, Settings, Link as LinkIcon } from "lucide-react";

interface User {
  _id: string;
  agentName: string;
  handle?: string;
  agentBio?: string;
  agentTone?: string;
  agentUrl: string;
}

interface AgentProfileBarProps {
  user: User;
}

export function AgentProfileBar({ user }: AgentProfileBarProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(user.agentUrl);
    alert("Agent URL copied to clipboard!");
  };

  return (
    <div className="h-20 border-b border-stone-200 bg-white/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
        <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-stone-900 rounded-2xl flex items-center justify-center shadow-lg shadow-stone-900/10">
          <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-lg md:text-xl text-stone-900 tracking-tight truncate">
              {user.agentName}
            </h1>
            <span className="hidden sm:inline font-mono text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full font-bold">
              {user.handle || "NO-HANDLE"}
            </span>
          </div>
          <p className="text-stone-500 text-[10px] md:text-xs font-medium truncate">
            {user.agentBio || "Your personal AI agent"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end mr-4">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">
            Network Status
          </p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-stone-700 uppercase tracking-tight">
              A2A v0.3.0 Live
            </span>
          </div>
        </div>

        <button
          onClick={copyToClipboard}
          className="p-2.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all active:scale-95"
          title="Copy A2A URL"
        >
          <LinkIcon className="w-5 h-5" />
        </button>
        <button className="p-2.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all active:scale-95">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
