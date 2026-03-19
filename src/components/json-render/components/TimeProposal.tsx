"use client";

import React from "react";
import { Calendar, Clock, Check } from "lucide-react";

interface TimeProposalProps {
  title: string;
  options: Array<{
    date: string;
    time: string;
    availability: number;
  }>;
  onSelect?: (data: { date: string; time: string }) => void;
}

export const TimeProposal: React.FC<TimeProposalProps> = ({
  title,
  options,
  onSelect,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-purple-50 p-1.5 rounded-lg text-purple-600">
          <Calendar size={18} />
        </div>
        <h3 className="font-bold text-gray-900 leading-tight">{title}</h3>
      </div>

      <div className="space-y-3">
        {options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => onSelect?.({ date: option.date, time: option.time })}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-purple-50 hover:border-purple-100 transition-all text-left group active:scale-[0.98]"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-gray-800">{option.date}</span>
              <div className="flex items-center text-xs text-gray-500 gap-2">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {option.time}
                </span>
                <span className={`px-1.5 py-0.5 rounded font-medium ${
                  option.availability > 0.8 ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50"
                }`}>
                  {Math.round(option.availability * 100)}% Match
                </span>
              </div>
            </div>
            <div className="bg-white p-1 rounded border border-gray-200 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Check size={14} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
