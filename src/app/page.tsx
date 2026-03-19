"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserSwitcher, User } from "@/components/UserSwitcher";
import { OnboardingModal } from "@/components/OnboardingModal";
import { AgentProfileBar } from "@/components/AgentProfileBar";
import { ContactsSidebar } from "@/components/ContactsSidebar";
import { ContextPanel } from "@/components/ContextPanel";
import { ChatStream } from "@/components/ChatStream";
import { ActivityFeed } from "@/components/ActivityFeed";
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
  const [loading, setLoading] = useState(false);
  const chatMessages: any[] = []; // Not used anymore but kept for type compatibility in JSX if needed


  const messages = useQuery(api.messages.list, currentUser ? { userId: currentUser._id } : "skip") || [];
  const sendMessage = useMutation(api.messages.send);

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

  const handleSendMessage = async (customMessage?: string, approvedTools?: string[]) => {
    const userMessage = customMessage || input;
    if (!userMessage.trim() || !currentUser) return;

    if (!customMessage) setInput("");
    setShowMentions(false);

    try {
      // 1. Persist user message to Convex immediately for history
      await sendMessage({ userId: currentUser._id, role: "user", text: userMessage });

      // 2. Identify mentions for the agent context
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

      // 3. Trigger chat response
      setLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser._id,
            message: userMessage,
            mentionedContacts,
            approvedTools,
          }),
        });
        if (!res.ok) throw new Error("Chat request failed");
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error("Chat error:", error);
      await sendMessage({ userId: currentUser._id, role: "assistant", text: "Communication failure. Check your API quota or network." });
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
    // 1. Update state
    const value = e.target.value;
    setInput(value);

    // 2. Custom mention detection logic
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

  const onMentionSelect = useCallback((contact: any) => {
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
  }, [input, setInput]);

  const onAction = useCallback((action: string, params: any) => {
    if (action === "onConfirm") {
      const label = params.label || params.value;
      const status = params.value === "approved" ? "approved" : "rejected";

      // If there's a confirmationId, resolve it in Convex too
      if (params.confirmationId) {
        resolveConfirmation({
          confirmationId: params.confirmationId,
          status
        });
      }

      // If this is an approval for a specific tool, pass it through
      const approvedTools = params.tool && status === "approved" ? [params.tool] : [];

      handleSendMessage(`I choose: ${label}`, approvedTools);
    } else if (action === "onSelect") {
      handleSendMessage(`I select: ${params.date} at ${params.time}`);
    } else if (action === "onComplete") {
      handleSendMessage("I have marked the task as completed.");
    } else if (action === "onForget") {
      handleSendMessage(`Please forget the following memory: ${params.key}`);
    } else if (action === "onConnect") {
      handleSendMessage("I approve the connection request. Please establish the link.");
    }
  }, [handleSendMessage]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#fafaf9]">
      <div className="noise" />

      <Authenticated>
        <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">
          {currentUser && <AgentProfileBar user={currentUser as any} />}

          {currentUser && !currentUser.agentBio && (
            <OnboardingModal
              userId={currentUser._id}
              initialName={currentUser.name}
              onComplete={() => {
                // The Convex query in UserSwitcher will automatically update
                // and propagate the new user data via onUserChange.
              }}
            />
          )}

          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar: Contacts & Activity */}
            <div className="flex flex-col border-r border-stone-200">
              <ContactsSidebar userId={currentUser?._id || ""} />
              <ActivityFeed
                userId={currentUser?._id || ""}
                onResolve={handleResolveConfirmation}
              />

              {/* User Switcher at the bottom of sidebar for easy access during dev */}
              <div className="mt-auto p-4 border-t border-stone-200">
                <UserSwitcher onUserChange={handleUserChange} />
              </div>
            </div>

            {/* Main Chat Stream */}
            <ChatStream
              messages={messages}
              chatMessages={chatMessages}
              isLoading={loading}
              input={input}
              handleInputChange={handleInputChange}
              handleKeyDown={handleKeyDown}
              handleSendMessage={handleSendMessage}
              showMentions={showMentions}
              filteredContacts={filteredContacts}
              selectedMentionIndex={selectedMentionIndex}
              onMentionSelect={onMentionSelect}
              onAction={onAction}
              inputRef={inputRef}
            />

            {/* Right Panel: Context & Memory */}
            <ContextPanel userId={currentUser?._id || ""} />
          </div>
        </div>
      </Authenticated>

      <Unauthenticated>
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-stone-200/50 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-amber-100/30 blur-[100px] rounded-full" />

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 lg:py-20">
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
          </header>

          {clerkLoaded && clerkSignedIn ? (
            <div className="glass rounded-[2.5rem] p-12 flex flex-col items-center text-center shadow-2xl shadow-stone-200/50 border border-white max-w-2xl mx-auto animate-in fade-in duration-500">
              <Loader2 className="w-10 h-10 text-stone-400 animate-spin mb-4" />
              <h2 className="font-display text-2xl font-bold text-stone-900 mb-2">Syncing with Convex</h2>
              <p className="text-stone-500 text-sm">
                Establishing your secure workspace in Convex...
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
        </main>
      </Unauthenticated>

      <AuthLoading>
        <div className="fixed inset-0 flex items-center justify-center bg-[#fafaf9] z-50">
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-stone-400 animate-spin mb-4" />
            <p className="font-display font-bold uppercase tracking-widest text-xs text-stone-400">
              Verifying Secure Session
            </p>
          </div>
        </div>
      </AuthLoading>
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
