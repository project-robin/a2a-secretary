"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../convex/_generated/api";
import { User, UserSwitcher } from "@/components/UserSwitcher";
import { SignInButton, useUser } from "@clerk/nextjs";
import {
  Calendar as CalendarIcon,
  MessageSquare,
  Clock,
  ShieldCheck,
  ArrowRight,
  Bot,
  Loader2
} from "lucide-react";

export default function Home() {
  const { isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useUser();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const events = useQuery(
    api.calendar.getEvents,
    currentUser ? { userId: currentUser._id as any } : "skip"
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSendMessage = async () => {
    if (!input.trim() || !currentUser) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser._id, message: userMessage }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.text }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: "assistant", text: "Communication failure. Check your API quota or network." }]);
    } finally {
      setLoading(false);
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
          <UserSwitcher onUserChange={(user) => {
            setCurrentUser(user);
            setMessages([]);
          }} />

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

                {messages.map((msg, i) => (
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
                    </div>
                  </div>
                ))}

                {loading && (
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
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Brief your secretary..."
                    className="w-full bg-stone-100 border-none rounded-2xl px-6 py-4 pr-14 text-sm font-medium focus:ring-2 focus:ring-stone-900/5 transition-all outline-none"
                    disabled={loading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={loading || !input.trim()}
                    className="absolute right-2 top-2 bottom-2 aspect-square bg-stone-900 text-white rounded-xl flex items-center justify-center hover:bg-stone-800 transition-all disabled:opacity-20 active:scale-90"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </section>

            {/* Calendar Pane */}
            <section className="lg:col-span-5 flex flex-col h-[700px] glass rounded-[2.5rem] shadow-2xl shadow-stone-200/50 overflow-hidden border border-white">
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
                    {events.map((event: any) => (
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
