"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen text-white flex relative" style={{ background: "#050505" }}>
        <Sidebar />
        <main className="flex-1 p-8 lg:p-12 overflow-y-auto relative">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
