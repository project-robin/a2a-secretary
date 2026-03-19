"use client";

const statusIcons = {
  waiting: "⏳",
  responded: "✓",
  confirmed: "✅",
  declined: "✗",
};

interface StatusItem {
  agent: string;
  status: "waiting" | "responded" | "confirmed" | "declined";
  message?: string;
}

interface StatusUpdateProps {
  title: string;
  items: StatusItem[];
}

export function StatusUpdate({ title, items }: StatusUpdateProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 my-2 shadow-sm">
      <h3 className="font-display font-bold text-stone-800 text-sm mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span className="text-base">{statusIcons[item.status]}</span>
            <div>
              <span className="font-bold text-stone-800">{item.agent}</span>
              {item.message && (
                <p className="text-stone-500 text-xs">{item.message}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
