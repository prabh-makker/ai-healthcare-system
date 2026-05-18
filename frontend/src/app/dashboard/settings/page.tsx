"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, Bell, Palette, LogOut, ChevronRight, Sun, Moon, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, accent, font, setTheme, setAccent, setFont } = useTheme();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("profile");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: "", new: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess(false);

    if (!passwordForm.old) {
      setPasswordError("Current password is required");
      return;
    }
    if (!passwordForm.new) {
      setPasswordError("New password is required");
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (passwordForm.new.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      await api.changePassword(passwordForm.old, passwordForm.new);
      setPasswordSuccess(true);
      setPasswordForm({ old: "", new: "", confirm: "" });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Animated bg orbs */}
      <motion.div
        className="absolute pointer-events-none -z-10"
        style={{
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)",
          left: "-15%", top: "-10%",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute pointer-events-none -z-10"
        style={{
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.12), transparent 70%)",
          right: "-10%", top: "30%",
        }}
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8 sm:mb-12"
      >
        <motion.h1
          className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-br from-indigo-200 via-purple-400 to-pink-500 bg-clip-text text-transparent"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          Settings
        </motion.h1>
        <motion.p
          className="text-zinc-500 mt-2 text-sm sm:text-base font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Manage account preferences
        </motion.p>
      </motion.header>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
        <motion.aside
          className="w-full lg:w-64 shrink-0"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-[2rem] p-3 sm:p-4 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible border border-white/20 shadow-2xl">
            {sections.map((s, i) => (
              <motion.button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.97 }}
                className={`shrink-0 lg:w-full flex items-center justify-between px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm font-bold transition-all relative ${
                  activeSection === s.id
                    ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <s.icon size={18} />
                  <span className="whitespace-nowrap">{s.label}</span>
                </div>
                <ChevronRight size={14} className="opacity-50 hidden lg:block" />
                {activeSection === s.id && (
                  <motion.div
                    layoutId="settings-active-pill"
                    className="absolute inset-0 rounded-xl sm:rounded-2xl ring-2 ring-sky-400/50 pointer-events-none"
                  />
                )}
              </motion.button>
            ))}
            <div className="hidden lg:block pt-2 border-t border-white/5 mt-2">
              <motion.button
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold text-zinc-500 hover:text-rose-400 hover:bg-rose-400/5 transition-all"
              >
                <LogOut size={18} />
                Logout
              </motion.button>
            </div>
          </div>
        </motion.aside>

        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
          {activeSection === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -20, rotateX: 10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ perspective: 1000, transformStyle: "preserve-3d" }}
              className="bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-white/20 shadow-2xl"
            >
              <h2 className="text-lg font-bold mb-8">Profile Information</h2>
              <div className="flex items-center gap-6 mb-10">
                <div className="w-20 h-20 bg-sky-500/10 border border-sky-500/20 rounded-3xl flex items-center justify-center text-3xl font-black text-sky-400">
                  {user?.email?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="font-bold text-lg">{user?.email?.split("@")[0] ?? "Loading..."}</p>
                  <p className="text-zinc-500 text-sm">{user?.email ?? "—"}</p>
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
              key="security"
              initial={{ opacity: 0, y: 20, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -20, rotateX: 10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ perspective: 1000, transformStyle: "preserve-3d" }}
              className="bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-white/20 shadow-2xl"
            >
              <h2 className="text-lg font-bold mb-8">Security</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-4 border-b border-white/5">
                  <div>
                    <p className="font-semibold text-sm">Password</p>
                    <p className="text-zinc-500 text-xs mt-0.5">Keep your account secure</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="text-sky-400 text-sm font-bold hover:text-sky-300 transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>

              {showPasswordModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
                  onClick={() => !passwordLoading && setShowPasswordModal(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="bg-white/15 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-white/30"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-xl font-bold mb-6">Change Password</h3>

                    {passwordSuccess && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm"
                      >
                        ✓ Password changed successfully
                      </motion.div>
                    )}

                    {passwordError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm"
                      >
                        <AlertCircle size={16} />
                        {passwordError}
                      </motion.div>
                    )}

                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showOld ? "text" : "password"}
                            value={passwordForm.old}
                            onChange={(e) => setPasswordForm({ ...passwordForm, old: e.target.value })}
                            placeholder="Enter current password"
                            disabled={passwordLoading || passwordSuccess}
                            className="w-full px-4 py-2.5 pr-11 bg-zinc-900 border border-white/20 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-all disabled:opacity-50"
                            style={{ color: "#fff", fontSize: "15px", fontWeight: 500, letterSpacing: "0.05em" }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowOld(!showOld)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
                            tabIndex={-1}
                          >
                            {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNew ? "text" : "password"}
                            value={passwordForm.new}
                            onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                            placeholder="Enter new password (min 8 chars)"
                            disabled={passwordLoading || passwordSuccess}
                            className="w-full px-4 py-2.5 pr-11 bg-zinc-900 border border-white/20 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-all disabled:opacity-50"
                            style={{ color: "#fff", fontSize: "15px", fontWeight: 500, letterSpacing: "0.05em" }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
                            tabIndex={-1}
                          >
                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-2">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirm ? "text" : "password"}
                            value={passwordForm.confirm}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                            placeholder="Confirm new password"
                            disabled={passwordLoading || passwordSuccess}
                            className="w-full px-4 py-2.5 pr-11 bg-zinc-900 border border-white/20 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-all disabled:opacity-50"
                            style={{ color: "#fff", fontSize: "15px", fontWeight: 500, letterSpacing: "0.05em" }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
                            tabIndex={-1}
                          >
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowPasswordModal(false)}
                        disabled={passwordLoading}
                        className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePasswordChange}
                        disabled={passwordLoading || passwordSuccess}
                        className="flex-1 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {passwordLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Changing...
                          </>
                        ) : (
                          "Change Password"
                        )}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeSection === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 20, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -20, rotateX: 10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ perspective: 1000, transformStyle: "preserve-3d" }}
              className="bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-white/20 shadow-2xl"
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
              key="appearance"
              initial={{ opacity: 0, y: 20, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -20, rotateX: 10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ perspective: 1000, transformStyle: "preserve-3d" }}
              className="bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-white/20 shadow-2xl"
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
                  <div className="flex gap-3 flex-wrap">
                    {(["sky", "violet", "rose", "emerald", "amber", "cyan", "pink", "orange", "teal", "indigo"] as const).map((color) => (
                      <button
                        key={color}
                        onClick={() => setAccent(color)}
                        className={`w-12 h-12 rounded-2xl transition-all hover:scale-110 active:scale-95 shadow-lg ${
                          {
                            sky: "bg-sky-500",
                            violet: "bg-violet-500",
                            rose: "bg-rose-500",
                            emerald: "bg-emerald-500",
                            amber: "bg-amber-500",
                            cyan: "bg-cyan-500",
                            pink: "bg-pink-500",
                            orange: "bg-orange-500",
                            teal: "bg-teal-500",
                            indigo: "bg-indigo-500",
                          }[color]
                        } ${
                          accent === color
                            ? "ring-2 ring-white ring-offset-2 ring-offset-[#080808]"
                            : ""
                        }`}
                        title={`${color.charAt(0).toUpperCase() + color.slice(1)} accent`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-zinc-500 text-sm font-medium mb-4">Font Family</p>
                  <div className="flex gap-3 flex-wrap">
                    {(["geist", "inter", "mono", "serif", "sans"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFont(f)}
                        className={`px-4 py-2 rounded-2xl font-medium transition-all ${
                          font === f
                            ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                            : "text-zinc-500 hover:text-white hover:bg-white/5 border border-white/10"
                        }`}
                        style={
                          f === "mono"
                            ? { fontFamily: "'Courier New', monospace" }
                            : f === "serif"
                            ? { fontFamily: "'Georgia', serif" }
                            : f === "inter"
                            ? { fontFamily: "'Inter', sans-serif" }
                            : f === "sans"
                            ? { fontFamily: "'Trebuchet MS', sans-serif" }
                            : {}
                        }
                      >
                        {f === "geist" ? "Geist" : f === "inter" ? "Inter" : f === "mono" ? "Mono" : f === "serif" ? "Serif" : "Sans"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
