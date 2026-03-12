"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { User, UserSwitcher } from "@/components/UserSwitcher";
import { Calendar, MessageSquare, Send, User as UserIcon } from "lucide-react";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const events = useQuery(
    api.calendar.getEvents,
    currentUser ? { userId: currentUser._id as any } : "skip"
  );

  const seed = useMutation(api.calendar.seedUsers);

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
      setMessages((prev) => [...prev, { role: "assistant", text: "Error: Failed to get response from agent." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UserIcon className="w-8 h-8" /> Personal Secretary
        </h1>
        <button
          onClick={() => seed()}
          className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
        >
          Seed Data (Alice & Bob)
        </button>
      </header>

      <UserSwitcher onUserChange={setCurrentUser} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Chat Interface */}
        <section className="bg-white border rounded-xl flex flex-col h-[600px] shadow-sm">
          <div className="p-4 border-b bg-gray-50 rounded-t-xl flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-700">Agent Chat</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 mt-10">
                Ask your secretary to schedule a meeting or check your calendar.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg max-w-[80%] animate-pulse">
                Secretary is thinking...
              </div>
            )}
          </div>

          <div className="p-4 border-t flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Message your secretary..."
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || !currentUser}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !currentUser}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* Calendar View */}
        <section className="bg-white border rounded-xl flex flex-col h-[600px] shadow-sm">
          <div className="p-4 border-b bg-gray-50 rounded-t-xl flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-700">Calendar</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {events && events.length > 0 ? (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event._id} className="p-4 border rounded-lg bg-green-50 border-green-100 shadow-sm">
                    <h3 className="font-bold text-green-900">{event.title}</h3>
                    <p className="text-sm text-green-700">
                      {new Date(event.startTime).toLocaleString()} - {new Date(event.endTime).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 mt-10">No events scheduled.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
