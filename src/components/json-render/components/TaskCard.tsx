"use client";

import React from "react";
import { CheckCircle2, Circle, ListTodo, Users } from "lucide-react";

interface TaskCardProps {
  title: string;
  status: "pending" | "in_progress" | "done";
  description?: string;
  participants?: string[];
  onComplete?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  title,
  status,
  description,
  participants,
  onComplete,
}) => {
  const isDone = status === "done";

  return (
    <div className={`bg-white border rounded-xl p-5 shadow-sm transition-all group border-l-4 ${
      isDone ? "border-green-100 border-l-green-500 bg-green-50/10" : "border-amber-100 border-l-amber-500"
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ListTodo size={14} className={isDone ? "text-green-500" : "text-amber-500"} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              isDone ? "text-green-600" : "text-amber-600"
            }`}>
              {status}
            </span>
          </div>
          <h3 className={`font-bold text-lg leading-tight truncate ${
            isDone ? "text-gray-400 line-through decoration-2" : "text-gray-900"
          }`}>
            {title}
          </h3>
        </div>

        {!isDone && (
          <button
            onClick={onComplete}
            className="p-2 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-200 hover:bg-green-50 transition-all shadow-sm active:scale-90"
            title="Mark as complete"
          >
            <Circle size={20} className="group-hover:hidden" />
            <CheckCircle2 size={20} className="hidden group-hover:block" />
          </button>
        )}
      </div>

      {description && (
        <p className={`mt-3 text-sm leading-relaxed ${
          isDone ? "text-gray-400" : "text-gray-600"
        }`}>
          {description}
        </p>
      )}

      {(participants && participants.length > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
          <div className="flex -space-x-2">
            {participants.map((p, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600 shadow-sm"
                title={p}
              >
                {p.charAt(0)}
              </div>
            ))}
          </div>
          <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
            <Users size={12} />
            {participants.length} involved
          </span>
        </div>
      )}
    </div>
  );
};
