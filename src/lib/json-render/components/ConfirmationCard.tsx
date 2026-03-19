"use client";

interface ConfirmationCardProps {
  title: string;
  description: string;
  confirmationId: string;
  options: Array<{ label: string; value: string }>;
  onConfirm?: (data: { value: string }) => void;
}

export function ConfirmationCard({ title, description, options, onConfirm }: ConfirmationCardProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 my-2 shadow-sm">
      <h3 className="font-display font-bold text-stone-800 text-sm mb-1">{title}</h3>
      <p className="text-stone-600 text-sm mb-3">{description}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onConfirm?.({ value: opt.value })}
            className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-colors"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
