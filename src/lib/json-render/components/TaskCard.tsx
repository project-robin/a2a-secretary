"use client";

const statusColors = {
  pending: "bg-stone-100 text-stone-600",
  in_progress: "bg-blue-50 text-blue-700 border border-blue-200",
  done: "bg-green-50 text-green-700 border border-green-200",
};

const statusLabels = { pending: "Pending", in_progress: "In Progress", done: "Done" };

interface TaskCardProps {
  title: string;
  status: "pending" | "in_progress" | "done";
  description?: string;
  participants?: string[];
  onComplete?: () => void;
}

export function TaskCard({ title, status, description, participants, onComplete }: TaskCardProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 my-2 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-bold text-stone-800 text-sm">{title}</h3>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
      </div>
      {description && <p className="text-stone-500 text-xs mb-2">{description}</p>}
      {participants && participants.length > 0 && (
        <p className="text-[10px] text-stone-400 mb-2">With: {participants.join(", ")}</p>
      )}
      {status !== "done" && onComplete && (
        <button
          onClick={onComplete}
          className="text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors"
        >
          Mark as done →
        </button>
      )}
    </div>
  );
}
