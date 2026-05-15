"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex relative" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <Sidebar />
        <main className="flex-1 p-8 lg:p-12 overflow-y-auto relative">
          {/* Floating Notification Bell */}
          <div className="absolute top-4 right-8 z-30">
            <NotificationBell />
          </div>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </ProtectedRoute>
  );
}
