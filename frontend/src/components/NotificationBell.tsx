"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Pill, Calendar, CheckCircle, FileText, MessageSquare, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  is_read: boolean;
  related_id?: string;
  related_url?: string;
  created_at: string;
}

const TYPE_ICONS = {
  prescription: Pill,
  appointment: Calendar,
  approval: CheckCircle,
  record: FileText,
  message: MessageSquare,
};

const TYPE_COLORS = {
  prescription: "text-amber-400 bg-amber-500/10",
  appointment: "text-rose-400 bg-rose-500/10",
  approval: "text-emerald-400 bg-emerald-500/10",
  record: "text-sky-400 bg-sky-500/10",
  message: "text-purple-400 bg-purple-500/10",
};

export default function NotificationBell() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const fetchUnreadCount = async () => {
    try {
      const data = await api.getUnreadCount();
      setUnreadCount(data.unread_count);
    } catch (err: any) {
      // Silently ignore expected transient errors (401 session expired, 404 cached path)
      if (err?.status !== 401 && err?.status !== 404) console.error("Error fetching unread count:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications(0, 10, false);
      setNotifications(data);
    } catch (err: any) {
      if (err?.status !== 401 && err?.status !== 404) console.error("Error fetching notifications:", err);
    }
  };

  // Initial fetch + permanent polling - ONLY when authenticated
  useEffect(() => {
    if (loading || !isAuthenticated) return;

    fetchUnreadCount();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchUnreadCount();
      if (isOpenRef.current) {
        fetchNotifications();
      }
    }, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, [isAuthenticated, loading]);

  // Close on outside click (must be BEFORE early return - Rules of Hooks)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await api.markNotificationRead(notification.id);
        fetchUnreadCount();
        fetchNotifications();
      } catch (err) {
        console.error("Error marking as read:", err);
      }
    }

    if (notification.related_url) {
      router.push(notification.related_url);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchUnreadCount();
      fetchNotifications();
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // After all hooks: don't render if not authenticated
  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-96 max-h-[500px] overflow-hidden bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => {
                  const Icon = TYPE_ICONS[notification.type as keyof typeof TYPE_ICONS] || Bell;
                  const colorClass = TYPE_COLORS[notification.type as keyof typeof TYPE_COLORS] || "text-zinc-400 bg-zinc-500/10";

                  return (
                    <motion.button
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 ${
                        !notification.is_read ? "bg-sky-500/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-zinc-500 mt-1">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </motion.button>
                  );
                })
              ) : (
                <div className="px-4 py-12 text-center">
                  <Bell size={32} className="mx-auto text-zinc-700 mb-3" />
                  <p className="text-zinc-500 text-sm">No notifications yet</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-white/5 bg-black/20">
                <button
                  onClick={() => {
                    router.push("/dashboard/notifications");
                    setIsOpen(false);
                  }}
                  className="w-full text-center text-xs text-sky-400 hover:text-sky-300 font-semibold transition-colors py-1.5"
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
