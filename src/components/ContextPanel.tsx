"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ListTodo, Calendar as CalendarIcon, Brain, Clock, Loader2 } from "lucide-react";

interface ContextPanelProps {
  userId: string;
}

export function ContextPanel({ userId }: ContextPanelProps) {
  const tasks = useQuery(api.tasks.list, { userId: userId as any });
  const events = useQuery(api.calendar.getEvents, { userId: userId as any });
  const memories = useQuery(api.memory.list, { userId: userId as any });

  return (
    <div className="w-80 border-l border-stone-200 bg-white flex flex-col h-full">
      {/* Tasks Section */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-stone-100">
        <div className="px-6 py-4 flex items-center gap-2 border-b border-stone-50">
          <ListTodo className="w-4 h-4 text-stone-400" />
          <h3 className="font-display font-bold text-[10px] uppercase tracking-[0.2em] text-stone-400">
            Active Tasks
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!tasks ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-4 h-4 text-stone-200 animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-center text-[10px] text-stone-300 italic py-4">No active tasks</p>
          ) : (
            tasks.map((task: any) => (
              <div key={task._id} className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-bold text-stone-800 leading-tight">{task.title}</p>
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                    task.priority === "high" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                  }`}>
                    {task.priority}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    task.status === "done" ? "bg-green-500" : "bg-amber-500"
                  }`} />
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">
                    {task.status.replace("_", " ")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Memory Section */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-stone-100">
        <div className="px-6 py-4 flex items-center gap-2 border-b border-stone-50">
          <Brain className="w-4 h-4 text-stone-400" />
          <h3 className="font-display font-bold text-[10px] uppercase tracking-[0.2em] text-stone-400">
            Agent Memory
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!memories ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-4 h-4 text-stone-200 animate-spin" />
            </div>
          ) : memories.length === 0 ? (
            <p className="text-center text-[10px] text-stone-300 italic py-4">Knowledge base empty</p>
          ) : (
            memories.map((mem: any) => (
              <div key={mem._id} className="group p-2 hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-100">
                <p className="text-[9px] font-bold text-stone-400 uppercase mb-0.5">{mem.key}</p>
                <p className="text-[11px] font-medium text-stone-600 leading-tight">{mem.value}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mini Calendar Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 py-4 flex items-center gap-2 border-b border-stone-50">
          <CalendarIcon className="w-4 h-4 text-stone-400" />
          <h3 className="font-display font-bold text-[10px] uppercase tracking-[0.2em] text-stone-400">
            Schedule
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!events ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-4 h-4 text-stone-200 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-center text-[10px] text-stone-300 italic py-4">Schedule clear</p>
          ) : (
            events.slice(0, 3).map((event: any) => (
              <div key={event._id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-stone-800">
                    {new Date(event.startTime).getDate()}
                  </span>
                  <span className="text-[8px] font-bold text-stone-400 uppercase">
                    {new Date(event.startTime).toLocaleDateString(undefined, { month: 'short' })}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-stone-800 leading-tight mb-0.5">{event.title}</p>
                  <div className="flex items-center gap-1 text-stone-400">
                    <Clock className="w-2.5 h-2.5" />
                    <p className="text-[10px] font-medium">
                      {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
