"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Pill, Calendar, CheckCircle, FileText, MessageSquare, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";

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

function NotificationsContent() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.getNotifications(0, 100, filter === "unread");
      setNotifications(data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const handleClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await api.markNotificationRead(notification.id);
        // Locally mark as read so list updates immediately + count syncs
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.error("Error:", err);
      }
    }
    if (notification.related_url) {
      router.push(notification.related_url);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this notification?")) return;
    try {
      await api.deleteNotification(id);
      fetchNotifications();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchNotifications();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#8b5cf6" />

      <div className="relative z-10 p-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex justify-between items-center"
        >
          <div>
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-purple-200 via-violet-400 to-fuchsia-500 bg-clip-text text-transparent">
              Notifications
            </h1>
            <p className="text-zinc-500 mt-2 font-medium">
              {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-all"
          >
            Mark All Read
          </button>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                filter === f
                  ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                  : "text-zinc-500 hover:text-[var(--foreground)] bg-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = TYPE_ICONS[notification.type as keyof typeof TYPE_ICONS] || Bell;
              const colorClass = TYPE_COLORS[notification.type as keyof typeof TYPE_COLORS] || "text-zinc-400 bg-zinc-500/10";

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => handleClick(notification)}
                  className={`glass-card rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-all flex items-center gap-4 ${
                    !notification.is_read ? "border-l-4 border-purple-500" : "border border-white/5"
                  }`}
                >
                  <div className={`p-3 rounded-lg ${colorClass}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{notification.title}</p>
                    {notification.message && (
                      <p className="text-sm text-zinc-400 mt-1">{notification.message}</p>
                    )}
                    <p className="text-xs text-zinc-500 mt-2">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                  )}
                  <button
                    onClick={(e) => handleDelete(notification.id, e)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="glass-card rounded-2xl p-16 text-center border border-white/[0.08]">
            <Bell size={56} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-400 text-lg font-bold">No notifications</p>
            <p className="text-zinc-500 text-sm mt-2">
              You're all caught up!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}
