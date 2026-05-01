"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Shield, Bell, Palette, LogOut, ChevronRight, Sun, Moon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, accent, setTheme, setAccent } = useTheme();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("profile");

  const sections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div>
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-indigo-200 via-purple-400 to-pink-500 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-zinc-500 mt-2 font-medium">Manage account preferences</p>
      </motion.header>

      <div className="flex gap-8">
        <aside className="w-64 shrink-0">
          <div className="glass-card rounded-[2rem] p-4 space-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  activeSection === s.id
                    ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <s.icon size={18} />
                  {s.label}
                </div>
                <ChevronRight size={14} className="opacity-50" />
              </button>
            ))}
            <div className="pt-2 border-t border-white/5 mt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold text-zinc-500 hover:text-rose-400 hover:bg-rose-400/5 transition-all"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          {activeSection === "profile" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-[2rem] p-8"
            >
              <h2 className="text-lg font-bold mb-8">Profile Information</h2>
              <div className="flex items-center gap-6 mb-10">
                <div className="w-20 h-20 bg-sky-500/10 border border-sky-500/20 rounded-3xl flex items-center justify-center text-3xl font-black text-sky-400">
                  {user?.email?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-lg">{user?.email?.split("@")[0]}</p>
                  <p className="text-zinc-500 text-sm">{user?.email}</p>
                  <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-lg ${
                    user?.role === "DOCTOR"
                      ? "bg-sky-500/10 text-sky-400"
                      : user?.role === "ADMIN"
                      ? "bg-violet-500/10 text-violet-400"
                      : "bg-rose-500/10 text-rose-400"
                  }`}>
                    {user?.role}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Email Address", value: user?.email ?? "" },
                  { label: "Account Status", value: user?.is_active ? "Active" : "Inactive" },
                  { label: "Member Since", value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—" },
                ].map((field) => (
                  <div key={field.label} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
                    <span className="text-zinc-500 text-sm font-medium">{field.label}</span>
                    <span className="font-semibold text-sm">{field.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection === "security" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-[2rem] p-8"
            >
              <h2 className="text-lg font-bold mb-8">Security</h2>
              <div className="space-y-4">
                {[
                  { label: "Password", value: "Last changed: never", action: "Change" },
                  { label: "Two-Factor Auth", value: "Not enabled", action: "Enable" },
                  { label: "Active Sessions", value: "1 session", action: "View" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
                    <div>
                      <p className="font-semibold text-sm">{item.label}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{item.value}</p>
                    </div>
                    <button className="text-sky-400 text-sm font-bold hover:text-sky-300 transition-colors">
                      {item.action}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection === "notifications" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-[2rem] p-8"
            >
              <h2 className="text-lg font-bold mb-8">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { label: "Diagnosis Results", desc: "Get notified when AI analysis is complete" },
                  { label: "Appointment Reminders", desc: "Reminders before scheduled appointments" },
                  { label: "System Updates", desc: "Updates about new features and changes" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
                    <div>
                      <p className="font-semibold text-sm">{item.label}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{item.desc}</p>
                    </div>
                    <div className="w-10 h-6 bg-sky-500 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection === "appearance" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-[2rem] p-8"
            >
              <h2 className="text-lg font-bold mb-8">Appearance</h2>

              <div className="space-y-8">
                <div>
                  <p className="text-zinc-500 text-sm font-medium mb-4">Theme</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all ${
                        theme === "light"
                          ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                          : "text-zinc-500 hover:text-white hover:bg-white/5 border border-white/10"
                      }`}
                    >
                      <Sun size={18} />
                      Light
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all ${
                        theme === "dark"
                          ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                          : "text-zinc-500 hover:text-white hover:bg-white/5 border border-white/10"
                      }`}
                    >
                      <Moon size={18} />
                      Dark
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-zinc-500 text-sm font-medium mb-4">Accent Color</p>
                  <div className="flex gap-3">
                    {(["sky", "violet", "rose", "emerald", "amber"] as const).map((color) => (
                      <button
                        key={color}
                        onClick={() => setAccent(color)}
                        className={`w-12 h-12 rounded-2xl transition-all hover:scale-110 active:scale-95 ${
                          {
                            sky: "bg-sky-500",
                            violet: "bg-violet-500",
                            rose: "bg-rose-500",
                            emerald: "bg-emerald-500",
                            amber: "bg-amber-500",
                          }[color]
                        } shadow-lg ${
                          accent === color
                            ? "ring-2 ring-white ring-offset-2 ring-offset-[#080808]"
                            : ""
                        }`}
                        title={`${color.charAt(0).toUpperCase() + color.slice(1)} accent`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
