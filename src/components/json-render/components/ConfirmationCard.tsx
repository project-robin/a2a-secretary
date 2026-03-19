"use client";

import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface ConfirmationCardProps {
  title: string;
  description: string;
  confirmationId: string;
  options: Array<{ label: string; value: string }>;
  onConfirm?: (data: { value: string }) => void;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  title,
  description,
  options,
  onConfirm,
}) => {
  return (
    <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm border-l-4 border-l-blue-500">
      <div className="flex items-start gap-3">
        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
          <CheckCircle2 size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
          <p className="text-gray-600 mt-1 text-sm leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onConfirm?.({ value: option.value })}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};
