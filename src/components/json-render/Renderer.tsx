"use client";

import React from "react";
import { EventCard } from "./components/EventCard";
import { TaskCard } from "./components/TaskCard";
import { ConfirmationCard } from "./components/ConfirmationCard";
import { TimeProposal } from "./components/TimeProposal";
import { StatusUpdate } from "./components/StatusUpdate";
import { ContactCard } from "./components/ContactCard";
import { MemoryCard } from "./components/MemoryCard";

interface JSONRendererProps {
  kind: string;
  data: any;
  onAction?: (actionName: string, params: any) => void;
}

export const JSONRenderer: React.FC<JSONRendererProps> = ({ kind, data, onAction }) => {
  if (!data) {
    return (
      <div className="p-3 border border-red-200 rounded-lg bg-red-50 text-xs text-red-600">
        Error: No data provided for renderer
      </div>
    );
  }

  switch (kind) {
    case "calendar_event":
    case "event":
      return (
        <EventCard
          title={data.title || "Untitled Event"}
          startTime={data.startTime}
          endTime={data.endTime}
          location={data.location}
          description={data.description}
        />
      );
    case "task":
    case "TaskCard":
      return (
        <TaskCard
          title={data.title || "Untitled Task"}
          status={data.status || "pending"}
          description={data.description}
          participants={data.participants}
          onComplete={() => onAction?.("onComplete", {})}
        />
      );
    case "ConfirmationCard":
      return (
        <ConfirmationCard
          title={data.title}
          description={data.description}
          confirmationId={data.confirmationId}
          options={data.options || []}
          onConfirm={(params) => onAction?.("onConfirm", params)}
        />
      );
    case "TimeProposal":
      return (
        <TimeProposal
          title={data.title}
          options={data.options || []}
          onSelect={(params) => onAction?.("onSelect", params)}
        />
      );
    case "StatusUpdate":
      return (
        <StatusUpdate
          title={data.title}
          items={data.items || []}
        />
      );
    case "ContactCard":
      return (
        <ContactCard
          name={data.name}
          handle={data.handle}
          bio={data.bio}
          agentUrl={data.agentUrl}
          onConnect={() => onAction?.("onConnect", {})}
        />
      );
    case "MemoryCard":
      return (
        <MemoryCard
          key={data.key}
          value={data.value}
          source={data.source}
          onForget={(params) => onAction?.("onForget", params)}
        />
      );
    default:
      return (
        <div className="p-3 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-xs text-gray-500 font-mono">
          Unknown component kind: {kind}
          <pre className="mt-2 overflow-auto max-h-40">{JSON.stringify(data, null, 2)}</pre>
        </div>
      );
  }
};
