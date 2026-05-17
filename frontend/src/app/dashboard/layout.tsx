"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Activity } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import ErrorBoundary from "@/components/ErrorBoundary";

const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/symptoms", label: "AI Chat" },
  { href: "/dashboard/records", label: "Records" },
  { href: "/dashboard/appointments", label: "Appointments" },
  { href: "/dashboard/medications", label: "Medications" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col md:flex-row relative" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 glass-nav sticky top-0 z-40">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <Activity size={18} className="text-white" strokeWidth={3} />
            </div>
            <span className="font-black text-sm">HealthAI</span>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/5 glass-nav z-30">
            <nav className="p-4 space-y-1">
              {MOBILE_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg hover:bg-white/5 text-sm font-semibold"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}

        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-12 overflow-y-auto relative min-w-0">
          {/* Floating Notification Bell - desktop only (mobile has it in top bar) */}
          <div className="hidden md:block absolute top-4 right-4 sm:right-8 z-30">
            <NotificationBell />
          </div>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </ProtectedRoute>
  );
}
