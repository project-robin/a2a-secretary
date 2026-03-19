"use client";
import { useState } from "react";

interface TimeOption {
  date: string;
  time: string;
  availability: number;
}

interface TimeProposalProps {
  title: string;
  options: TimeOption[];
  onSelect?: (data: { date: string; time: string }) => void;
}

export function TimeProposal({ title, options, onSelect }: TimeProposalProps) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 my-2 shadow-sm">
      <h3 className="font-display font-bold text-stone-800 text-sm mb-3">{title}</h3>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => {
              setSelected(i);
              onSelect?.({ date: opt.date, time: opt.time });
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
              selected === i
                ? "bg-stone-900 text-white"
                : "bg-stone-50 hover:bg-stone-100 text-stone-800"
            }`}
          >
            <span className="font-bold">{opt.date}</span>
            <span className="mx-2 opacity-50">·</span>
            <span>{opt.time}</span>
            <span className="ml-auto float-right text-xs opacity-60">
              {Math.round(opt.availability * 100)}% available
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
