"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#050505] text-white flex">
        <Sidebar />
        <main className="flex-1 p-8 lg:p-12 overflow-y-auto">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
