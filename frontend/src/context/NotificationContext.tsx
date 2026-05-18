"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string;
  is_read: boolean;
  related_id?: string;
  related_url?: string;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL_MS = 30_000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const unmountedRef = useRef(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    unmountedRef.current = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    let activeWs: WebSocket | null = null;

    const stopPing = () => {
      if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
    };

    const startPing = () => {
      stopPing();
      pingInterval = setInterval(() => {
        if (activeWs?.readyState === WebSocket.OPEN) {
          activeWs.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL_MS);
    };

    const scheduleReconnect = () => {
      if (unmountedRef.current || reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) return;
      const jitter = 0.75 + Math.random() * 0.5;
      const delay = Math.min(BASE_DELAY_MS * 2 ** reconnectAttempt, MAX_DELAY_MS) * jitter;
      reconnectTimer = setTimeout(() => {
        reconnectAttempt++;
        connect();
      }, delay);
    };

    const connect = async () => {
      if (unmountedRef.current) return;
      try {
        const { token } = await api.getWsToken();
        if (unmountedRef.current) return;

        const ws = new WebSocket(`${WS_BASE}/api/v1/ws?token=${token}`);
        activeWs = ws;

        ws.onopen = () => {
          reconnectAttempt = 0;
          setIsConnected(true);
          startPing();
        };

        ws.onmessage = (event: MessageEvent) => {
          try {
            const msg = JSON.parse(event.data as string);
            if (msg.type === "notification") {
              setNotifications((prev) => [msg.data as Notification, ...prev].slice(0, 50));
            }
          } catch { /* ignore malformed frames */ }
        };

        ws.onclose = (event: CloseEvent) => {
          setIsConnected(false);
          stopPing();
          activeWs = null;
          // 1000 = clean logout, 4001 = auth failure — don't retry either
          if (event.code !== 1000 && event.code !== 4001) {
            scheduleReconnect();
          }
        };

        ws.onerror = () => { /* onclose always fires after onerror */ };
      } catch {
        // getWsToken HTTP call failed (e.g. session expired)
        scheduleReconnect();
      }
    };

    // Seed the list immediately so the bell isn't empty before the first WS push
    api.getNotifications(0, 20)
      .then((data: Notification[]) => { if (!unmountedRef.current) setNotifications(data); })
      .catch(() => {});

    connect();

    return () => {
      unmountedRef.current = true;
      stopPing();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (activeWs) {
        activeWs.onclose = null; // prevent reconnect loop on intentional close
        activeWs.close(1000);
        activeWs = null;
      }
      setIsConnected(false);
    };
  }, [isAuthenticated, loading]);

  const markRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: string) => {
    await api.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, isConnected, markRead, markAllRead, deleteNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
