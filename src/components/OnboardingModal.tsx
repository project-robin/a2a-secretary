"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Bot,
  Sparkles,
  Zap,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  Loader2
} from "lucide-react";

interface OnboardingModalProps {
  userId: Id<"users">;
  initialName: string;
  onComplete: () => void;
}

export function OnboardingModal({ userId, initialName, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [agentName, setAgentName] = useState(initialName);
  const [agentBio, setAgentBio] = useState("");
  const [agentTone, setAgentTone] = useState("casual");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updatePersona = useMutation(api.calendar.updatePersona);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await updatePersona({
        userId,
        agentName,
        agentBio,
        agentTone,
      });
      onComplete();
    } catch (error) {
      console.error("Onboarding error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tones = [
    { id: "casual", label: "Casual", icon: MessageSquare, desc: "Relaxed and conversational" },
    { id: "formal", label: "Formal", icon: ShieldCheck, desc: "Professional and precise" },
    { id: "friendly", label: "Friendly", icon: Sparkles, desc: "Warm and encouraging" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white relative">
        <div className="noise opacity-[0.03]" />

        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-stone-100 flex">
          <div
            className="h-full bg-stone-900 transition-all duration-500 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-10 md:p-12">
          {step === 1 && (
            <div className="animate-in slide-in-from-right-8 duration-500">
              <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-stone-900/20">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-display text-4xl font-bold text-stone-900 mb-4 tracking-tight">
                Name your Secretary<span className="text-stone-300">.</span>
              </h2>
              <p className="text-stone-500 text-lg mb-10 leading-relaxed font-medium">
                This is how your agent will identify itself to you and other agents on the network.
              </p>

              <div className="space-y-6">
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="e.g. Jarvis, Alfred, Samantha..."
                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-6 py-5 text-lg font-bold text-stone-800 focus:border-stone-900 focus:ring-0 transition-all outline-none"
                    onKeyDown={(e) => e.key === "Enter" && agentName && setStep(2)}
                  />
                </div>

                <button
                  disabled={!agentName.trim()}
                  onClick={() => setStep(2)}
                  className="w-full bg-stone-900 text-white py-5 rounded-2xl font-display font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-stone-800 transition-all disabled:opacity-20 shadow-xl shadow-stone-900/10 active:scale-[0.98]"
                >
                  Define Persona
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in slide-in-from-right-8 duration-500">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-amber-100/50">
                <Zap className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="font-display text-4xl font-bold text-stone-900 mb-4 tracking-tight">
                Brief your agent<span className="text-stone-300">.</span>
              </h2>
              <p className="text-stone-500 text-lg mb-10 leading-relaxed font-medium">
                Describe your agent&apos;s role and how it should represent you. What are its core responsibilities?
              </p>

              <div className="space-y-6">
                <textarea
                  autoFocus
                  value={agentBio}
                  onChange={(e) => setAgentBio(e.target.value)}
                  placeholder="e.g. You are a high-performance scheduling assistant. You prioritize deep work blocks and never schedule meetings before 10 AM..."
                  rows={4}
                  className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-6 py-5 text-sm font-medium text-stone-800 focus:border-stone-900 focus:ring-0 transition-all outline-none resize-none"
                />

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 bg-stone-100 text-stone-600 py-5 rounded-2xl font-display font-bold uppercase tracking-widest hover:bg-stone-200 transition-all"
                  >
                    Back
                  </button>
                  <button
                    disabled={!agentBio.trim()}
                    onClick={() => setStep(3)}
                    className="flex-[2] bg-stone-900 text-white py-5 rounded-2xl font-display font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-stone-800 transition-all disabled:opacity-20 shadow-xl shadow-stone-900/10 active:scale-[0.98]"
                  >
                    Select Tone
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in slide-in-from-right-8 duration-500">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-100/50">
                <Sparkles className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="font-display text-4xl font-bold text-stone-900 mb-4 tracking-tight">
                Set the vibe<span className="text-stone-300">.</span>
              </h2>
              <p className="text-stone-500 text-lg mb-10 leading-relaxed font-medium">
                Choose the communication style for your agent.
              </p>

              <div className="grid grid-cols-1 gap-4 mb-10">
                {tones.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setAgentTone(tone.id)}
                    className={`
                      flex items-center gap-5 p-5 rounded-2xl border-2 transition-all text-left
                      ${agentTone === tone.id
                        ? 'border-stone-900 bg-stone-900 text-white shadow-lg shadow-stone-900/20'
                        : 'border-stone-100 bg-stone-50 text-stone-600 hover:border-stone-300'
                      }
                    `}
                  >
                    <div className={`
                      w-12 h-12 rounded-xl flex items-center justify-center
                      ${agentTone === tone.id ? 'bg-white/10' : 'bg-white'}
                    `}>
                      <tone.icon className={`w-6 h-6 ${agentTone === tone.id ? 'text-white' : 'text-stone-400'}`} />
                    </div>
                    <div>
                      <p className="font-bold">{tone.label}</p>
                      <p className={`text-xs opacity-60 font-medium ${agentTone === tone.id ? 'text-white' : 'text-stone-500'}`}>
                        {tone.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-stone-100 text-stone-600 py-5 rounded-2xl font-display font-bold uppercase tracking-widest hover:bg-stone-200 transition-all"
                >
                  Back
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="flex-[2] bg-stone-900 text-white py-5 rounded-2xl font-display font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/10 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      Initialize Agent
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
