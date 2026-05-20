"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, MessageSquare, User as UserIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";

interface Conversation {
  user_id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  is_mine: boolean;
}

function MessagesContent() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const data = await api.getConversation(userId);
      // Guard against late response after user switched conversations
      setSelectedUserId((current) => {
        if (current === userId) setMessages(data);
        return current;
      });
      // Refresh conversations to update unread count
      fetchConversations();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  useEffect(() => {
    fetchConversations().finally(() => setLoading(false));
  }, []);

  // Auto-fetch messages when conversation selected
  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
      const interval = setInterval(() => fetchMessages(selectedUserId), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedUserId]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId) return;
    setSending(true);
    try {
      await api.sendMessage(selectedUserId, newMessage);
      setNewMessage("");
      fetchMessages(selectedUserId);
    } catch (err: any) {
      console.error("Error sending:", err);
    } finally {
      setSending(false);
    }
  };

  const selectedConversation = conversations.find((c) => c.user_id === selectedUserId);

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#a855f7" />

      <div className="relative z-10 p-12 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: 'white' }}>
            Messages
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            Communicate with your {user?.role === "DOCTOR" ? "patients" : "doctor"}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
          {/* Conversations List */}
          <div className="glass-card rounded-2xl border border-white/[0.08] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <h2 className="font-bold text-white">Conversations</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                </div>
              )}

              {!loading && conversations.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <MessageSquare size={32} className="mx-auto text-zinc-700 mb-3" />
                  <p className="text-zinc-500 text-sm">No conversations yet</p>
                </div>
              )}

              {conversations.map((conv) => (
                <motion.button
                  key={conv.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelectedUserId(conv.user_id)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 ${
                    selectedUserId === conv.user_id ? "bg-purple-500/10" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                      {(conv.user_name?.[0] || "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-white truncate">
                          {conv.user_name}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="w-5 h-5 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-1">
                        {conv.last_message}
                      </p>
                      <p className="text-xs text-zinc-600 mt-1 uppercase tracking-wider">
                        {conv.user_role}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Chat View */}
          <div className="lg:col-span-2 glass-card rounded-2xl border border-white/[0.08] flex flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                    {(selectedConversation.user_name?.[0] || "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white">{selectedConversation.user_name}</p>
                    <p className="text-xs text-zinc-500">{selectedConversation.user_role}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.is_mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                          msg.is_mine
                            ? "bg-purple-500 text-white"
                            : "bg-white/5 text-zinc-200"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.is_mine ? "text-purple-100" : "text-zinc-500"}`}>
                          {new Date(msg.created_at).toLocaleString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Send Form */}
                <div className="px-6 py-4 border-t border-white/5 flex items-center gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className="p-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg transition-all"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col p-8">
                <MessageSquare size={56} className="text-zinc-700 mb-4" />
                <p className="text-zinc-400 text-lg font-bold">Select a conversation</p>
                <p className="text-zinc-500 text-sm mt-2 text-center">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <MessagesContent />
    </ProtectedRoute>
  );
}
