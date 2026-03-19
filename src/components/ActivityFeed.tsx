"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Activity, ShieldCheck, Bell, MessageCircle, Loader2, Check, X } from "lucide-react";

interface ActivityFeedProps {
  userId: string;
  onResolve?: (conf: any, status: "approved" | "rejected") => void;
}

export function ActivityFeed({ userId, onResolve }: ActivityFeedProps) {
  const pendingConfirmations = useQuery(api.confirmations.listPending, userId ? { userId: userId as any } : "skip");
  const recentMessages = useQuery(api.messages.list, userId ? { userId: userId as any } : "skip");

  // Filter for system or A2A messages
  const notifications = recentMessages?.filter(m =>
    m.role === "remote_agent" || m.role === "system"
  ).slice(-5).reverse() || [];

  return (
    <div className="w-72 border-r border-stone-200 bg-stone-50/30 flex flex-col h-1/2">
      <div className="p-6 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-stone-400" />
          <h2 className="font-display font-bold text-xs uppercase tracking-widest text-stone-400">
            Activity Feed
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Pending Confirmations (Priority) */}
        {pendingConfirmations && pendingConfirmations.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest px-2">
              Action Required
            </p>
            {pendingConfirmations.map((conf: any) => (
              <div key={conf._id} className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-3 h-3 text-amber-600" />
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">
                    Security Check
                  </span>
                </div>
                <p className="text-[11px] font-medium text-stone-700 leading-snug mb-3">
                  {conf.description}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onResolve?.(conf, "approved")}
                    className="flex-1 bg-stone-900 text-white py-1.5 rounded-lg flex items-center justify-center hover:bg-stone-800 transition-all shadow-md shadow-stone-900/10"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onResolve?.(conf, "rejected")}
                    className="flex-1 bg-white border border-stone-200 text-stone-400 py-1.5 rounded-lg flex items-center justify-center hover:bg-stone-50 hover:text-stone-600 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* System/A2A Notifications */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-2">
            System Events
          </p>
          {!recentMessages ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-4 h-4 text-stone-200 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-[10px] text-stone-300 italic py-4">No recent activity</p>
          ) : (
            notifications.map((notif: any) => (
              <div key={notif._id} className="bg-white border border-stone-100 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  {notif.role === "remote_agent" ? (
                    <MessageCircle className="w-3 h-3 text-blue-500" />
                  ) : (
                    <Bell className="w-3 h-3 text-stone-400" />
                  )}
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight">
                    {notif.role === "remote_agent" ? "External Agent" : "System"}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-stone-600 leading-snug line-clamp-2">
                  {notif.text}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
