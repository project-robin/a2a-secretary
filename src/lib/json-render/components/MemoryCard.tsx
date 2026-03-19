"use client";

const sourceLabels: Record<string, string> = {
  user_stated: "You told me",
  agent_inferred: "I inferred",
  a2a_learned: "Learned via A2A",
};

interface MemoryCardProps {
  key: string;
  value: string;
  source: string;
  onForget?: (data: { key: string }) => void;
}

export function MemoryCard({ key: memKey, value, source, onForget }: MemoryCardProps) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 my-1 flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">
          {sourceLabels[source] || source}
        </p>
        <p className="text-stone-700 text-xs font-medium">
          <span className="font-bold">{memKey}:</span> {value}
        </p>
      </div>
      {onForget && (
        <button
          onClick={() => onForget({ key: memKey })}
          className="text-stone-400 hover:text-red-500 text-xs transition-colors"
          title="Forget this"
        >
          ✕
        </button>
      )}
    </div>
  );
}
