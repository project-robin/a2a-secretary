"use client";

import React from "react";
import { UserPlus, AtSign, Globe, Info } from "lucide-react";

interface ContactCardProps {
  name: string;
  handle: string;
  bio?: string;
  agentUrl: string;
  onConnect?: () => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  name,
  handle,
  bio,
  agentUrl,
  onConnect,
}) => {
  return (
    <div className="bg-gradient-to-br from-white to-blue-50/20 border border-blue-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-blue-600 shadow-sm shrink-0">
          <AtSign size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">{name}</h3>
          <p className="text-sm font-medium text-blue-600 flex items-center gap-1.5 mt-0.5">
            <AtSign size={12} strokeWidth={3} />
            {handle}
          </p>
        </div>
      </div>

      {bio && (
        <div className="mt-4 flex gap-2">
          <Info size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-600 leading-relaxed italic line-clamp-2">
            {bio}
          </p>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-blue-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <Globe size={14} />
          <span>A2A Endpoint</span>
        </div>
        <button
          onClick={onConnect}
          className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95"
        >
          <UserPlus size={16} />
          Connect
        </button>
      </div>
    </div>
  );
};
