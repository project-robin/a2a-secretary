"use client";

interface ContactCardProps {
  name: string;
  handle: string;
  bio?: string;
  agentUrl: string;
  onConnect?: () => void;
}

export function ContactCard({ name, handle, bio, onConnect }: ContactCardProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 my-2 shadow-sm flex items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display font-bold text-stone-800 text-sm">{name}</span>
          <span className="font-mono text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
            {handle}
          </span>
        </div>
        {bio && <p className="text-stone-500 text-xs">{bio}</p>}
      </div>
      {onConnect && (
        <button
          onClick={onConnect}
          className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-colors whitespace-nowrap"
        >
          Connect
        </button>
      )}
    </div>
  );
}
