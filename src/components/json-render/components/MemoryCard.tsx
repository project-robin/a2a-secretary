"use client";

import React from "react";
import { Brain, Trash2, Database, Quote } from "lucide-react";

interface MemoryCardProps {
  key: string;
  value: string;
  source: string;
  onForget?: (data: { key: string }) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  key: memoryKey,
  value,
  source,
  onForget,
}) => {
  return (
    <div className="bg-gradient-to-br from-white to-purple-50/20 border border-purple-100 rounded-2xl p-6 shadow-sm group">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2.5 rounded-xl text-purple-600 shadow-sm border-2 border-white">
            <Brain size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-bold text-gray-900 text-lg leading-tight uppercase tracking-wide tracking-tight">
              {memoryKey}
            </h3>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-500 uppercase tracking-wider">
              <Database size={12} />
              <span>{source}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => onForget?.({ key: memoryKey })}
          className="p-2.5 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100 active:scale-90"
          title="Forget this memory"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="relative p-4 rounded-xl bg-white border border-purple-50/50 shadow-inner">
        <Quote className="absolute top-2 left-2 text-purple-100 -scale-x-100" size={32} />
        <p className="relative z-10 text-gray-700 leading-relaxed font-medium italic text-sm pl-4">
          {value}
        </p>
      </div>
    </div>
  );
};
