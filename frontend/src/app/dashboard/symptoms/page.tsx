"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare, Pill, AlertCircle, Save, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import DashboardBg from "@/components/DashboardBg";
import ProtectedRoute from "@/components/ProtectedRoute";

interface ChatMessageType {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface CurrentDiagnosis {
  disease?: string;
  confidence?: number;
  specialist?: string;
}

interface RecommendedDoctor {
  id: string;
  name: string;
  email: string;
  specialty: string;
}

const STATE_CONFIG: Record<string, { cls: string; label: string }> = {
  collecting_symptoms: { cls: "bg-sky-500/20 text-sky-400",     label: "Collecting Symptoms" },
  diagnosis_ready:    { cls: "bg-emerald-500/20 text-emerald-400", label: "Ready to Save" },
  saved:              { cls: "bg-purple-500/20 text-purple-400", label: "Saved" },
};

export default function DiagnosticsChat() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [currentDiagnosis, setCurrentDiagnosis] = useState<CurrentDiagnosis>({});
  const [recommendedDoctor, setRecommendedDoctor] = useState<RecommendedDoctor | null>(null);
  const [conversationState, setConversationState] = useState<"collecting_symptoms" | "diagnosis_ready" | "saved">(
    "collecting_symptoms"
  );
  const [askedSymptoms, setAskedSymptoms] = useState<string[]>([]);
  const [lastAskedSymptom, setLastAskedSymptom] = useState<string | undefined>(undefined);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [messageCounter, setMessageCounter] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    const greeting: ChatMessageType = {
      id: crypto.randomUUID(),
      type: "assistant",
      content: "Hello! 👋 I'm your AI diagnostic assistant. Tell me about your symptoms, or just say 'yes' or 'no' to my questions. What brings you in today?",
      timestamp: new Date(),
    };
    setMessages([greeting]);
  }, [sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || loading) return;  // Prevent double-submit

    setError(null);
    const userMessage = userInput.trim();
    setUserInput("");

    // Add user message to chat
    const userMsgId = crypto.randomUUID();
    const userMsg: ChatMessageType = {
      id: userMsgId,
      type: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Retry up to 2 times on network failures
    let attempt = 0;
    let stream;
    while (attempt < 2) {
      try {
        stream = await api.diagnosisChatStream(userMessage, selectedSymptoms, askedSymptoms, sessionId, lastAskedSymptom);
        break;
      } catch (err) {
        attempt++;
        if (attempt >= 2) {
          setLoading(false);
          setError(err instanceof Error ? err.message : "Failed to connect. Please try again.");
          return;
        }
        await new Promise(r => setTimeout(r, 500 * attempt));  // Backoff: 500ms, 1s
      }
    }

    try {
      if (!stream) throw new Error("No stream available");
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      let assistantText = "";
      let metadata: any = {};
      const assistantMsgId = crypto.randomUUID();
      let assistantAdded = false;

      // Process stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          let data;
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            // Skip malformed chunks (often happens at stream boundaries)
            continue;
          }

          if (data.type === "metadata") {
            metadata = data;
            setSelectedSymptoms(data.updated_symptoms);
            setCurrentDiagnosis(data.current_diagnosis);
            setRecommendedDoctor(data.recommended_doctor || null);
            setConversationState(data.conversation_state || "collecting_symptoms");
            if (data.next_symptom_to_ask && !askedSymptoms.includes(data.next_symptom_to_ask)) {
              setAskedSymptoms((prev) => [...prev, data.next_symptom_to_ask]);
              setLastAskedSymptom(data.next_symptom_to_ask);
            }
          } else if (data.type === "text") {
            assistantText += data.chunk;

            // Add assistant message on first text chunk
            if (!assistantAdded) {
              const assistantMsg: ChatMessageType = {
                id: assistantMsgId,
                type: "assistant",
                content: assistantText,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              assistantAdded = true;
              setMessageCounter((prev) => prev + 1);
            } else {
              // Update existing message with streamed text
              setMessages((prev) =>
                prev.map((msg) => (msg.id === assistantMsgId ? { ...msg, content: assistantText } : msg))
              );
            }
          } else if (data.type === "done") {
            // Stream complete
          }
        }
      }

      setLoading(false);
    } catch (err) {
      setLoading(false);
      // Show partial response message if stream broke mid-way
      setError(err instanceof Error
        ? `Connection interrupted: ${err.message}. Your message was sent — please retry if no response appeared.`
        : "Connection interrupted. Please try again.");
      return;
    }

    return;
  };

  // Placeholder for old code - remove when tested
  const handleSendMessageOld = async () => {
    if (!userInput.trim()) return;

    setError(null);
    const userMessage = userInput.trim();
    setUserInput("");

    // Add user message to chat
    const userMsgId = crypto.randomUUID();
    const userMsg: ChatMessageType = {
      id: userMsgId,
      type: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Call diagnosis chat endpoint
      const response = await api.diagnosisChat(userMessage, selectedSymptoms, askedSymptoms, sessionId, lastAskedSymptom);

      // Update state from response
      setSelectedSymptoms(response.updated_symptoms);
      setCurrentDiagnosis(response.current_diagnosis);
      setConversationState(response.conversation_state);
      if (response.next_symptom_to_ask) {
        setAskedSymptoms((prev) =>
          prev.includes(response.next_symptom_to_ask!) ? prev : [...prev, response.next_symptom_to_ask!]
        );
        setLastAskedSymptom(response.next_symptom_to_ask);
      } else {
        setLastAskedSymptom(undefined);
      }

      // Add assistant message
      const assistantMsgId = crypto.randomUUID();
      const assistantMsg: ChatMessageType = {
        id: assistantMsgId,
        type: "assistant",
        content: response.assistant_message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiagnosis = async () => {
    if (!currentDiagnosis.disease) {
      setError("No diagnosis to save.");
      return;
    }

    try {
      await api.createRecord({
        symptoms: selectedSymptoms,
        ai_prediction: currentDiagnosis.disease,
        confidence_score: currentDiagnosis.confidence || 0,
        recommended_specialist: currentDiagnosis.specialist || "General Physician",
      });

      setConversationState("saved");
      const savedMsg: ChatMessageType = {
        id: `${sessionId}-${messageCounter}`,
        type: "assistant",
        content: "✅ Your diagnosis has been saved to your medical records. You can view it anytime in your records section.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, savedMsg]);
      setMessageCounter((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save diagnosis");
    }
  };

  const handleNewDiagnosis = () => {
    const newSessionId = crypto.randomUUID();
    setSelectedSymptoms([]);
    setAskedSymptoms([]);
    setLastAskedSymptom(undefined);
    setCurrentDiagnosis({});
    setRecommendedDoctor(null);
    setConversationState("collecting_symptoms");
    setSessionId(newSessionId);
    setError(null);

    const greeting: ChatMessageType = {
      id: crypto.randomUUID(),
      type: "assistant",
      content: "Let's start over. What symptoms are you experiencing?",
      timestamp: new Date(),
    };
    setMessages([greeting]);
  };

  return (
    <ProtectedRoute>
      <div className="relative min-h-full">
        <DashboardBg accentColor="#0ea5e9" />

        <div className="relative z-10 p-12 max-w-5xl h-screen flex flex-col">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-sky-200 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              AI Diagnostics
            </h1>
            <p className="text-zinc-500 mt-2 font-medium">Chat with our AI to get personalized diagnosis insights</p>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
            >
              <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Main Chat Container */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-hidden">
            {/* Chat Messages */}
            <div className="lg:col-span-2 glass-card rounded-2xl border border-white/[0.08] flex flex-col overflow-hidden">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                          msg.type === "user"
                            ? "bg-sky-500 text-white"
                            : "bg-white/5 text-zinc-200 border border-white/10"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-1.5 ${msg.type === "user" ? "text-sky-100" : "text-zinc-500"}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="px-6 py-4 border-t border-white/5 flex items-center gap-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder={
                    conversationState === "saved"
                      ? "Diagnosis saved. Start new conversation..."
                      : "Type your symptoms or reply yes/no..."
                  }
                  disabled={conversationState === "saved"}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-all disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={loading || !userInput.trim() || conversationState === "saved"}
                  className="p-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>

            {/* Sidebar: Symptoms & Diagnosis */}
            <div className="flex flex-col gap-6">
              {/* Selected Symptoms */}
              <motion.div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Pill size={18} className="text-sky-400" />
                  Selected Symptoms
                </h3>
                <div className="space-y-2">
                  {selectedSymptoms.length === 0 ? (
                    <p className="text-xs text-zinc-500">No symptoms selected yet</p>
                  ) : (
                    selectedSymptoms.map((symptom) => (
                      <motion.div
                        key={symptom}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-3 py-1.5 bg-sky-500/10 border border-sky-500/20 rounded-lg text-xs font-semibold text-sky-300"
                      >
                        ✓ {symptom}
                      </motion.div>
                    ))
                  )}
                </div>
                <p className="text-[10px] text-zinc-600 mt-4">
                  {selectedSymptoms.length} symptom{selectedSymptoms.length !== 1 ? "s" : ""} recorded
                </p>
              </motion.div>

              {/* Current Diagnosis */}
              <motion.div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
                <h3 className="font-bold text-white mb-4">Current Diagnosis</h3>
                {currentDiagnosis.disease ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Disease/Condition</p>
                      <p className="text-lg font-bold text-sky-300">{currentDiagnosis.disease}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 to-blue-500"
                            style={{ width: `${currentDiagnosis.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-sky-300">{currentDiagnosis.confidence}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Recommended Specialist</p>
                      <p className="text-sm text-zinc-300">{currentDiagnosis.specialist}</p>
                    </div>

                    {conversationState === "diagnosis_ready" && (
                      <div className="pt-3 space-y-2">
                        {recommendedDoctor && (
                          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                            <p className="text-xs text-sky-300 font-semibold mb-1">Recommended Doctor</p>
                            <p className="text-sm font-bold text-white">Dr. {recommendedDoctor.name}</p>
                            <p className="text-xs text-zinc-400">{recommendedDoctor.specialty}</p>
                            <p className="text-xs text-zinc-500 mt-1">{recommendedDoctor.email}</p>
                          </div>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleSaveDiagnosis}
                          className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <Save size={16} />
                          Save Diagnosis
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            const spec = currentDiagnosis.specialist || "General Physician";
                            const reason = currentDiagnosis.disease
                              ? `Symptoms: ${selectedSymptoms.join(", ")}. Possible: ${currentDiagnosis.disease}`
                              : "";
                            router.push(`/dashboard/appointments?specialist=${encodeURIComponent(spec)}&reason=${encodeURIComponent(reason)}`);
                          }}
                          className="w-full px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <Calendar size={16} />
                          {recommendedDoctor ? `Book with Dr. ${recommendedDoctor.name}` : `Book with ${currentDiagnosis.specialist || "Specialist"}`}
                        </motion.button>
                        <button
                          onClick={handleNewDiagnosis}
                          className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold rounded-lg transition-all text-sm"
                        >
                          New Diagnosis
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-4">
                    <MessageSquare size={32} className="text-zinc-700" />
                    <p className="text-xs text-zinc-500">Share more symptoms to get a diagnosis</p>
                  </div>
                )}
              </motion.div>

              {/* State Indicator */}
              <div className="text-center text-xs text-zinc-600 py-2">
                <span className={`px-3 py-1 rounded-full inline-block ${STATE_CONFIG[conversationState]?.cls}`}>
                  {STATE_CONFIG[conversationState]?.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
