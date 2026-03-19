"use client";

import React from "react";
import { ConfirmationCard } from "./components/ConfirmationCard";
import { TaskCard } from "./components/TaskCard";
import { TimeProposal } from "./components/TimeProposal";
import { StatusUpdate } from "./components/StatusUpdate";
import { ContactCard } from "./components/ContactCard";
import { MemoryCard } from "./components/MemoryCard";

export const agentRegistry = {
  ConfirmationCard,
  TaskCard,
  TimeProposal,
  StatusUpdate,
  ContactCard,
  MemoryCard,
};

interface AgentRendererProps {
  spec: any;
  onAction?: (action: string, data?: any) => void;
}

export function AgentRenderer({ spec, onAction }: AgentRendererProps) {
  if (!spec) return null;

  // Handle both string and object spec
  let data;
  try {
    data = typeof spec === "string" ? JSON.parse(spec) : spec;
  } catch (e) {
    console.error("Failed to parse spec", e);
    return (
      <div className="p-3 border border-red-200 rounded-lg bg-red-50 text-xs text-red-600">
        Error: Invalid JSON spec
      </div>
    );
  }

  const type = data.type || data.kind;
  const Component = (agentRegistry as any)[type];

  if (!Component) {
    return (
      <div className="p-3 border border-dashed border-stone-300 rounded-2xl bg-stone-50 text-[10px] text-stone-400 font-mono">
        Unknown component: {type}
      </div>
    );
  }

  // Extract props and map actions
  const props = data.props || data.data || data;
  const actionProps: any = {};

  if (type === "ConfirmationCard") {
    actionProps.onConfirm = (payload: any) => onAction?.("onConfirm", payload);
  } else if (type === "TaskCard") {
    actionProps.onComplete = () => onAction?.("onComplete");
  } else if (type === "TimeProposal") {
    actionProps.onSelect = (payload: any) => onAction?.("onSelect", payload);
  } else if (type === "ContactCard") {
    actionProps.onConnect = () => onAction?.("onConnect");
  } else if (type === "MemoryCard") {
    actionProps.onForget = (payload: any) => onAction?.("onForget", payload);
  }

  return <Component {...props} {...actionProps} />;
}
