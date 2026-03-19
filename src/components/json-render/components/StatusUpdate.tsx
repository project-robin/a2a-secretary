"use client";

import React from "react";
import { User, CheckCircle2, Clock, XCircle, HelpCircle } from "lucide-react";

interface StatusUpdateProps {
  title: string;
  items: Array<{
    agent: string;
    status: "waiting" | "responded" | "confirmed" | "declined";
    message?: string;
  }>;
}

export const StatusUpdate: React.FC<StatusUpdateProps> = ({ title, items }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "declined":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "responded":
        return <CheckCircle2 className="w-4 h-4 text-blue-500" opacity={0.6} />;
      case "waiting":
      default:
        return <Clock className="w-4 h-4 text-amber-500 animate-pulse" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-50/50 border-green-100";
      case "declined":
        return "bg-red-50/50 border-red-100";
      case "responded":
        return "bg-blue-50/50 border-blue-100";
      case "waiting":
      default:
        return "bg-amber-50/50 border-amber-100 animate-pulse-slow";
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm overflow-hidden">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
        {title}
      </h3>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${getStatusBg(
              item.status
            )}`}
          >
            <div className="bg-white p-2 rounded-full border border-gray-100 shadow-sm text-gray-400">
              <User size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-gray-800 truncate text-sm">
                  {item.agent}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {getStatusIcon(item.status)}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {item.status}
                  </span>
                </div>
              </div>
              {item.message && (
                <p className="text-xs text-gray-600 mt-1 italic line-clamp-2">
                  "{item.message}"
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
