"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  Users,
  ClipboardList,
  Calendar,
  Settings,
  LogOut,
  HeartPulse,
  Search,
  BarChart3
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

const SidebarItem = ({ 
  href, 
  icon: Icon, 
  label, 
  isActive 
}: { 
  href: string; 
  icon: any; 
  label: string; 
  isActive: boolean 
}) => (
  <Link href={href}>
    <motion.div
      whileHover={{ x: 5 }}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
        isActive 
          ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
          : "text-zinc-500 hover:text-[var(--foreground)] hover:bg-black/5"
      }`}
    >
      <Icon size={22} className={isActive ? "text-white" : "transition-colors"} style={isActive ? {} : { color: "inherit" }} />
      <span className="font-bold tracking-tight">{label}</span>
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
        />
      )}
    </motion.div>
  </Link>
);

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isDoctor = user?.role === "DOCTOR";

  const isAdmin = user?.role === "ADMIN";

  const menuItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
    { href: "/dashboard/symptoms", icon: HeartPulse, label: "Diagnostics" },
    ...(isAdmin ? [
      { href: "/dashboard/admin", icon: BarChart3, label: "Admin" },
    ] : isDoctor ? [
      { href: "/dashboard/patients", icon: Users, label: "Patients" },
      { href: "/dashboard/records", icon: ClipboardList, label: "Records" },
    ] : [
      { href: "/dashboard/records", icon: ClipboardList, label: "My History" },
      { href: "/dashboard/appointments", icon: Calendar, label: "Appointments" },
    ]),
    { href: "/dashboard/search", icon: Search, label: "Search" },
  ];

  return (
    <aside className="w-80 h-screen sticky top-0 border-r p-8 flex flex-col glass-nav" style={{ color: "var(--foreground)" }}>
      <div className="flex items-center space-x-3 px-2 mb-12">
        <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Activity size={24} className="text-white" strokeWidth={3} />
        </div>
        <span className="text-xl font-black tracking-tighter uppercase">HealthAI</span>
      </div>

      <nav className="flex-1 space-y-2">
        <p className="px-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4">Main Menu</p>
        {menuItems.map((item) => (
          <SidebarItem
            key={item.href}
            {...item}
            isActive={pathname === item.href}
          />
        ))}
      </nav>

      <div className="pt-8 mt-auto border-t border-white/5 space-y-2">
        <SidebarItem
          href="/dashboard/settings"
          icon={Settings}
          label="Settings"
          isActive={pathname === "/dashboard/settings"}
        />
        <button
          onClick={logout}
          className="w-full flex items-center space-x-4 px-6 py-4 rounded-2xl text-zinc-500 hover:text-rose-400 hover:bg-rose-400/5 transition-all duration-300 group"
        >
          <LogOut size={22} className="group-hover:text-rose-400 transition-colors" />
          <span className="font-bold tracking-tight">Logout</span>
        </button>
      </div>
    </aside>
  );
}
