"use client";

import { useEffect, useRef } from "react";
import { MessageSquare, Bot, ArrowRight, Loader2 } from "lucide-react";
import { AgentRenderer } from "@/lib/json-render/registry";

interface Message {
  role: string;
  text: string;
  richContent?: string;
}

interface ChatStreamProps {
  messages: Message[];
  chatMessages: any[]; // useChat messages
  isLoading: boolean;
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSendMessage: () => void;
  showMentions: boolean;
  filteredContacts: any[];
  selectedMentionIndex: number;
  onMentionSelect: (contact: any) => void;
  onAction?: (action: string, params: any) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChatStream({
  messages,
  chatMessages,
  isLoading,
  input,
  handleInputChange,
  handleKeyDown,
  handleSendMessage,
  showMentions,
  filteredContacts,
  selectedMentionIndex,
  onMentionSelect,
  onAction,
  inputRef
}: ChatStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatMessages, isLoading]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-stone-50/30 overflow-hidden relative">
      <div className="noise opacity-[0.03]" />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center grayscale">
            <MessageSquare className="w-12 h-12 mb-4 text-stone-300" />
            <p className="font-display font-bold uppercase tracking-widest text-xs text-stone-400">
              Awaiting Command
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`
                max-w-[85%] md:max-w-[70%] px-6 py-4 rounded-[2rem] text-sm font-medium leading-relaxed
                ${msg.role === "user"
                  ? "bg-stone-900 text-white shadow-xl shadow-stone-900/10 rounded-tr-none"
                  : "bg-white border border-stone-200 text-stone-800 shadow-sm rounded-tl-none"
                }
              `}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.richContent && (
                <div className="mt-4 text-stone-900 font-normal">
                  {(() => {
                    try {
                      const rich = JSON.parse(msg.richContent);
                      return (
                        <AgentRenderer
                          spec={rich}
                          onAction={(action, params) => {
                            if (onAction) {
                              onAction(action, params);
                            } else {
                              console.log("Rich action (unhandled):", action, params);
                            }
                          }}
                        />
                      );
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>
              )}
            </div>
          </div>
        ))}

        {chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === "assistant" && (
          <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
            <div className="max-w-[85%] md:max-w-[70%] px-6 py-4 rounded-[2rem] rounded-tl-none bg-white border border-stone-200 text-stone-800 shadow-sm">
              <div className="whitespace-pre-wrap">
                {chatMessages[chatMessages.length - 1].content.replace(/```json[\s\S]*?(?:```|$)/g, "").trim()}
              </div>
            </div>
          </div>
        )}

        {isLoading && chatMessages.length === 0 && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white border border-stone-200 px-6 py-4 rounded-[2rem] rounded-tl-none flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" />
              </div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Negotiating</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 md:p-8 bg-white/80 backdrop-blur-md border-t border-stone-200 sticky bottom-0">
        <div className="max-w-4xl mx-auto relative">
          {showMentions && filteredContacts.length > 0 && (
            <div className="absolute bottom-full left-0 w-64 mb-4 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {filteredContacts.map((contact, idx) => (
                <div
                  key={contact._id}
                  className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${
                    idx === selectedMentionIndex ? 'bg-stone-50' : 'hover:bg-stone-50/50'
                  }`}
                  onClick={() => onMentionSelect(contact)}
                >
                  <div className="font-bold text-sm text-stone-800">{contact.user?.agentName}</div>
                  <div className="text-[10px] text-stone-400 font-mono font-bold bg-stone-100 px-2 py-0.5 rounded-full">
                    {contact.user?.handle || 'EXT'}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="relative group">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Brief your secretary... (Type @ to mention contacts)"
              className="w-full bg-stone-100 border-none rounded-2xl px-8 py-5 pr-16 text-sm font-medium focus:ring-4 focus:ring-stone-900/5 transition-all outline-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="absolute right-2.5 top-2.5 bottom-2.5 aspect-square bg-stone-900 text-white rounded-xl flex items-center justify-center hover:bg-stone-800 transition-all disabled:opacity-20 active:scale-90 shadow-lg shadow-stone-900/20"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
