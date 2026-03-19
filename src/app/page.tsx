"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../convex/_generated/api";
import { User, UserSwitcher } from "@/components/UserSwitcher";
import ContactsPanel from "@/components/ContactsPanel";
import { AgentRenderer } from "@/lib/json-render/registry";
import { SignInButton, useUser } from "@clerk/nextjs";
import {
  Calendar as CalendarIcon,
  MessageSquare,
  Clock,
  ShieldCheck,
  ArrowRight,
  Bot,
  Loader2,
  Check,
  X,
  AlertCircle
} from "lucide-react";

import { Id } from "../../convex/_generated/dataModel";

type CalendarEvent = {
  _id: Id<"calendarEvents">;
  _creationTime: number;
  userId: Id<"users">;
  title: string;
  startTime: number;
  endTime: number;
};

export default function Home() {
  const { isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useUser();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [input, setInput] = useState("");
  const messages = useQuery(api.messages.list, currentUser ? { userId: currentUser._id } : "skip") || [];
  const sendMessage = useMutation(api.messages.send);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const handleUserChange = useCallback((user: User) => {
    setCurrentUser((prev) => prev?._id === user._id ? prev : user);
  }, []);


  const events = useQuery(
    api.calendar.getEvents,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  const contacts = useQuery(
    api.contacts.getContacts,
    currentUser ? { ownerId: currentUser._id } : "skip"
  );

  const pendingConfirmations = useQuery(
    api.confirmations.listPending,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  const resolveConfirmation = useMutation(api.confirmations.resolve);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);

  const handleSendMessage = async (customMessage?: string, approvedTools?: string[]) => {
    const userMessage = customMessage || input;
    if (!userMessage.trim() || !currentUser) return;

    if (!customMessage) setInput("");
    setShowMentions(false);
    setLoading(true);

    try {
      await sendMessage({ userId: currentUser._id, role: "user", text: userMessage });

      // Extract mentioned contacts from the message
      const mentionedContacts = [];
      if (contacts) {
        for (const contact of contacts) {
          const name = contact.user?.agentName;
          if (name && userMessage.includes(`@${name}`)) {
            mentionedContacts.push({
              name,
              handle: contact.user?.handle || "External Agent",
              agentUrl: contact.user?.agentUrl
            });
          }
        }
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser._id,
          message: userMessage,
          mentionedContacts,
          approvedTools
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let assistantText = "";
      setStreamingMessage("");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // The Vercel AI SDK Data Stream format uses prefixes like 0: for text
        // This is a simple parser for the text parts (0:"...")
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const content = JSON.parse(line.slice(2));
              assistantText += content;

              // Hide JSON block from streaming text for a cleaner UI
              const cleanStreamingText = assistantText.replace(/```json[\s\S]*?(?:```|$)/g, "").trim();
              setStreamingMessage(cleanStreamingText);
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      await sendMessage({ userId: currentUser._id, role: "assistant", text: "Communication failure. Check your API quota or network." });
    } finally {
      setLoading(false);
      setStreamingMessage(null);
    }
  };

  const handleResolveConfirmation = async (conf: any, status: "approved" | "rejected") => {
    if (!currentUser) return;

    await resolveConfirmation({
      confirmationId: conf._id,
      status
    });

    if (status === "approved") {
      // Parse context to get the tool name
      try {
        const context = JSON.parse(conf.context);
        const toolName = context.tool;
        await handleSendMessage(`I approve the call to ${toolName}. Please proceed.`, [toolName]);
      } catch (e) {
        await handleSendMessage("I approve the requested action. Please proceed.");
      }
    } else {
      await handleSendMessage("I have rejected the requested action. Do not proceed.");
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    // Simple mention detection logic
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const words = textBeforeCursor.split(" ");
    const currentWord = words[words.length - 1];

    if (currentWord.startsWith("@")) {
      setShowMentions(true);
      setMentionFilter(currentWord.slice(1));
      setSelectedMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const filteredContacts = (contacts || []).filter(c =>
    c.user?.agentName && c.user.agentName.toLowerCase().startsWith(mentionFilter.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentions && filteredContacts.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredContacts.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredContacts.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const contact = filteredContacts[selectedMentionIndex];
        if (contact && contact.user?.agentName) {
          const cursorPosition = inputRef.current?.selectionStart || 0;
          const textBeforeCursor = input.slice(0, cursorPosition);
          const textAfterCursor = input.slice(cursorPosition);
          const words = textBeforeCursor.split(" ");
          words.pop(); // Remove the typed @mention part
          const newTextBeforeCursor = words.join(" ") + (words.length > 0 ? " " : "") + `@${contact.user.agentName} `;

          setInput(newTextBeforeCursor + textAfterCursor);
          setShowMentions(false);

          // Focus back to input
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
              const newPos = newTextBeforeCursor.length;
              inputRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
        }
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#fafaf9]">
      <div className="noise" />

      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-stone-200/50 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-amber-100/30 blur-[100px] rounded-full" />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 lg:py-20">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8 animate-in fade-in slide-in-from-top-8 duration-1000">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-stone-900 rounded-xl shadow-lg shadow-stone-900/20">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <span className="font-display font-bold text-[10px] uppercase tracking-[0.4em] text-stone-400">
                Zero-Trust A2A Agent
              </span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-black text-stone-900 tracking-tighter leading-none mb-2">
              Secretary<span className="text-stone-300">.</span>
            </h1>
            <p className="text-stone-500 font-medium tracking-tight text-lg">
              Autonomous scheduling for the hyper-efficient.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-stone-200/50">
             <div className="px-4 py-2">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Status</p>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-sm font-bold text-stone-700">Live Network</span>
                </div>
             </div>
          </div>
        </header>

        <AuthLoading>
          <div className="glass rounded-[2.5rem] p-12 flex flex-col items-center text-center shadow-2xl shadow-stone-200/50 border border-white max-w-2xl mx-auto animate-pulse">
            <Loader2 className="w-10 h-10 text-stone-400 animate-spin mb-4" />
            <p className="font-display font-bold uppercase tracking-widest text-xs text-stone-400">
              Verifying Secure Session
            </p>
          </div>
        </AuthLoading>

        <Unauthenticated>
          {clerkLoaded && clerkSignedIn ? (
            <div className="glass rounded-[2.5rem] p-12 flex flex-col items-center text-center shadow-2xl shadow-stone-200/50 border border-white max-w-2xl mx-auto animate-in fade-in duration-500">
              <Loader2 className="w-10 h-10 text-stone-400 animate-spin mb-4" />
              <h2 className="font-display text-2xl font-bold text-stone-900 mb-2">Syncing with Convex</h2>
              <p className="text-stone-500 text-sm">
                Your Clerk session is active. We are establishing your secure workspace in Convex...
              </p>
            </div>
          ) : (
            <div className="glass rounded-[2.5rem] p-12 flex flex-col items-center text-center shadow-2xl shadow-stone-200/50 border border-white max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-stone-900 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-stone-900/20">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              <h2 className="font-display text-4xl font-bold text-stone-900 mb-4">Initialize Identity</h2>
              <p className="text-stone-500 text-lg mb-10 max-w-lg leading-relaxed">
                Create your Zero-Trust Agent identity to participate in autonomous scheduling negotiations on the A2A network.
              </p>
              <SignInButton mode="modal">
                <button className="group relative bg-stone-900 text-white px-10 py-5 rounded-full font-display font-bold tracking-wider uppercase transition-all hover:bg-stone-800 hover:scale-105 active:scale-95 shadow-xl shadow-stone-900/20 flex items-center gap-3">
                  Authenticate
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </SignInButton>
            </div>
          )}
        </Unauthenticated>

        <Authenticated>
          <UserSwitcher onUserChange={handleUserChange} />

          {currentUser && (
            <div className="max-w-md mb-8">
              <ContactsPanel userId={currentUser._id} initialContacts={contacts || undefined} />
            </div>
          )}

          {currentUser && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in zoom-in-95 duration-700">
            {/* Chat Pane */}
            <section className="lg:col-span-7 flex flex-col h-[700px] glass rounded-[2.5rem] shadow-2xl shadow-stone-200/50 overflow-hidden border border-white">
              <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-white/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-stone-600" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-stone-800 text-sm uppercase tracking-wider">Agent Context</h2>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest italic">Encrypted AI Session</p>
                  </div>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth"
              >
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center grayscale">
                    <MessageSquare className="w-12 h-12 mb-4" />
                    <p className="font-display font-bold uppercase tracking-widest text-xs">
                      Awaiting Command
                    </p>
                  </div>
                )}

                {messages.map((msg: any, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div
                      className={`
                        max-w-[85%] px-6 py-4 rounded-3xl text-sm font-medium leading-relaxed
                        ${msg.role === "user"
                          ? "bg-stone-900 text-white shadow-xl shadow-stone-900/10 rounded-tr-none"
                          : "bg-white border border-stone-100 text-stone-700 shadow-sm rounded-tl-none"
                        }
                      `}
                    >
                      {msg.text}
                      {msg.richContent && (
                        <div className="mt-4 text-stone-900 font-normal">
                          {(() => {
                            try {
                              const rich = JSON.parse(msg.richContent);
                              return (
                                <AgentRenderer
                                  spec={rich}
                                  onAction={(action, params) => {
                                    if (action === "onConfirm") {
                                      handleSendMessage(`I choose: ${params.value}`);
                                    } else if (action === "onSelect") {
                                      handleSendMessage(`I select: ${params.date} at ${params.time}`);
                                    } else if (action === "onComplete") {
                                      handleSendMessage("Task completed.");
                                    } else if (action === "onForget") {
                                      handleSendMessage(`Forget the memory: ${params.key}`);
                                    } else if (action === "onConnect") {
                                      handleSendMessage("Connect with this contact.");
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

                {streamingMessage && (
                  <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                    <div className="max-w-[85%] px-6 py-4 rounded-3xl rounded-tl-none bg-white border border-stone-100 text-stone-700 shadow-sm">
                      {streamingMessage}
                    </div>
                  </div>
                )}

                {loading && !streamingMessage && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-white border border-stone-100 px-6 py-4 rounded-3xl rounded-tl-none flex items-center gap-3">
                      <LoaderDot />
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Negotiating</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white/80 border-t border-stone-100">
                <div className="relative group">
                  {showMentions && filteredContacts.length > 0 && (
                    <div className="absolute bottom-full left-0 w-64 mb-2 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden z-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      {filteredContacts.map((contact, idx) => (
                        <div
                          key={contact._id}
                          className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${
                            idx === selectedMentionIndex ? 'bg-stone-100' : 'hover:bg-stone-50'
                          }`}
                          onClick={() => {
                            if (contact.user?.agentName) {
                              const cursorPosition = inputRef.current?.selectionStart || 0;
                              const textBeforeCursor = input.slice(0, cursorPosition);
                              const textAfterCursor = input.slice(cursorPosition);
                              const words = textBeforeCursor.split(" ");
                              words.pop();
                              const newTextBeforeCursor = words.join(" ") + (words.length > 0 ? " " : "") + `@${contact.user.agentName} `;

                              setInput(newTextBeforeCursor + textAfterCursor);
                              setShowMentions(false);

                              setTimeout(() => {
                                if (inputRef.current) {
                                  inputRef.current.focus();
                                  const newPos = newTextBeforeCursor.length;
                                  inputRef.current.setSelectionRange(newPos, newPos);
                                }
                              }, 0);
                            }
                          }}
                        >
                          <div className="font-medium text-sm text-stone-800">{contact.user?.agentName}</div>
                          <div className="text-xs text-stone-400 font-mono">{contact.user?.handle || 'External'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Brief your secretary... (Type @ to mention contacts)"
                    className="w-full bg-stone-100 border-none rounded-2xl px-6 py-4 pr-14 text-sm font-medium focus:ring-2 focus:ring-stone-900/5 transition-all outline-none"
                    disabled={loading}
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={loading || !input.trim()}
                    className="absolute right-2 top-2 bottom-2 aspect-square bg-stone-900 text-white rounded-xl flex items-center justify-center hover:bg-stone-800 transition-all disabled:opacity-20 active:scale-90"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </section>

            {/* Calendar & Confirmations Pane */}
            <section className="lg:col-span-5 flex flex-col h-[700px] gap-6">
              {/* Confirmations Section */}
              {pendingConfirmations && pendingConfirmations.length > 0 && (
                <div className="glass rounded-[2.5rem] shadow-2xl shadow-amber-200/20 overflow-hidden border border-amber-100 flex-shrink-0 animate-in slide-in-from-right-8 duration-500">
                  <div className="px-8 py-4 border-b border-amber-50 flex items-center gap-3 bg-amber-50/50">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                    </div>
                    <h2 className="font-display font-bold text-amber-800 text-xs uppercase tracking-widest">Action Required</h2>
                  </div>
                  <div className="p-6 space-y-4 max-h-[300px] overflow-y-auto">
                    {pendingConfirmations.map((conf: any) => (
                      <div key={conf._id} className="p-4 bg-white rounded-2xl border border-amber-100 shadow-sm">
                        <p className="text-sm font-medium text-stone-700 mb-3 leading-relaxed">{conf.description}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolveConfirmation(conf, "approved")}
                            className="flex-1 bg-stone-900 text-white py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-stone-800 transition-all active:scale-95"
                          >
                            <Check className="w-3 h-3" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleResolveConfirmation(conf, "rejected")}
                            className="flex-1 bg-white text-stone-900 border border-stone-200 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-stone-50 transition-all active:scale-95"
                          >
                            <X className="w-3 h-3" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calendar Section */}
              <div className="flex-1 glass rounded-[2.5rem] shadow-2xl shadow-stone-200/50 overflow-hidden border border-white flex flex-col">
                <div className="px-8 py-6 border-b border-stone-100 flex items-center gap-3 bg-white/50">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-stone-800 text-sm uppercase tracking-wider">Schedule</h2>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Verified Events</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                  {events && events.length > 0 ? (
                    <div className="space-y-4">
                      {events.map((event: CalendarEvent) => (
                        <div
                          key={event._id}
                          className="group p-6 bg-white border border-stone-100 rounded-[2rem] hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-500 hover:-translate-y-1"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="font-display font-bold text-stone-800 text-lg leading-tight group-hover:text-stone-950 transition-colors">
                              {event.title}
                            </h3>
                            <div className="p-2 bg-stone-50 rounded-lg">
                              <Clock className="w-4 h-4 text-stone-400" />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className="text-xs font-black text-stone-400 uppercase tracking-widest">
                              {new Date(event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-sm font-bold text-stone-600">
                              {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              <span className="mx-2 text-stone-300">→</span>
                              {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center grayscale">
                      <Clock className="w-12 h-12 mb-4" />
                      <p className="font-display font-bold uppercase tracking-widest text-xs">
                        Cleared Schedule
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
          )}
        </Authenticated>
      </main>
    </div>
  );
}

function LoaderDot() {
  return (
    <div className="flex gap-1">
      <div className="w-1 h-1 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-1 h-1 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-1 h-1 bg-stone-400 rounded-full animate-bounce" />
    </div>
  );
}
