"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { ShieldCheck, Mail, Lock, ArrowRight, Activity, Fingerprint, Scan } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// Floating particles component
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 1,
            height: Math.random() * 4 + 1,
            background: `rgba(14, 165, 233, ${Math.random() * 0.3 + 0.1})`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: Math.random() * 4 + 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}

// Animated grid background
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(14, 165, 233, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14, 165, 233, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.15), transparent 70%)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// Pulse ring animation around icon
function PulseRings() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-[1.5rem] border border-sky-500/30"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
            delay: i * 0.6,
          }}
        />
      ))}
    </>
  );
}

// DNA Helix decoration
function DNAHelix({ side }: { side: "left" | "right" }) {
  return (
    <div className={`absolute top-0 ${side === "left" ? "-left-20" : "-right-20"} h-full pointer-events-none opacity-20`}>
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full bg-sky-500"
          style={{ top: `${i * 13}%` }}
          animate={{
            x: side === "left"
              ? [0, 15, 0, -15, 0]
              : [0, -15, 0, 15, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={`b-${i}`}
          className="absolute w-2 h-2 rounded-full bg-violet-500"
          style={{ top: `${i * 13 + 6}%` }}
          animate={{
            x: side === "left"
              ? [0, -15, 0, 15, 0]
              : [0, 15, 0, -15, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

// Scanning line effect
function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-[1px] pointer-events-none"
      style={{
        background: "linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.5), transparent)",
      }}
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
    />
  );
}

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const { login, user, isAuthenticated, logout } = useAuth();

  // Mouse tracking for card tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [5, -5]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-5, 5]), { stiffness: 150, damping: 20 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Clear any existing session when visiting login page
  useEffect(() => {
    logout();
  }, [logout]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.username || !formData.password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.username)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      await login(formData.username, formData.password);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Authentication failed. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Staggered container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient background effects */}
      <GridBackground />
      <Particles />

      {/* Animated gradient orbs */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(14, 165, 233, 0.08), transparent 70%)",
          left: "10%",
          top: "20%",
        }}
        animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.06), transparent 70%)",
          right: "10%",
          bottom: "20%",
        }}
        animate={{ x: [0, -40, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating medical icons */}
      <motion.div
        className="absolute pointer-events-none text-sky-500/10"
        style={{ left: "8%", top: "15%" }}
        animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Activity size={40} />
      </motion.div>
      <motion.div
        className="absolute pointer-events-none text-violet-500/10"
        style={{ right: "12%", top: "25%" }}
        animate={{ y: [0, 15, 0], rotate: [0, -15, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <Scan size={36} />
      </motion.div>
      <motion.div
        className="absolute pointer-events-none text-sky-500/10"
        style={{ left: "15%", bottom: "20%" }}
        animate={{ y: [0, -15, 0], rotate: [0, 12, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <Fingerprint size={44} />
      </motion.div>

      {/* Main card with 3D tilt */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ rotateX, rotateY, perspective: 1000 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full max-w-md relative z-10"
      >
        <DNAHelix side="left" />
        <DNAHelix side="right" />

        <div className="glass-card p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl shadow-sky-500/5 relative overflow-hidden border border-white/[0.08]">
          <ScanLine />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Header with animated icon */}
            <motion.div variants={itemVariants} className="flex flex-col items-center mb-8 sm:mb-10">
              <div className="relative mb-6">
                <PulseRings />
                <motion.div
                  className="w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-sky-500 to-sky-600 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-sky-500/30 relative z-10"
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <ShieldCheck size={36} className="text-white drop-shadow-lg" />
                </motion.div>
              </div>

              <motion.h2
                className="text-3xl sm:text-4xl font-black tracking-tight text-center"
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #0ea5e9 50%, #8b5cf6 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Login Portal
              </motion.h2>
              <motion.p className="text-zinc-500 mt-2 font-medium text-sm sm:text-base">
                Secure biometric verification required.
              </motion.p>

              {/* Animated typing indicator dots */}
              <div className="flex space-x-1.5 mt-3">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-sky-500"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Error message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium backdrop-blur-sm"
                >
                  <div className="flex items-center space-x-2">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <ShieldCheck size={16} className="text-rose-400" />
                    </motion.div>
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <motion.form variants={itemVariants} onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                {/* Email field */}
                <motion.div
                  className="relative group"
                  whileFocus={{ scale: 1.01 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"
                    style={{
                      background: "linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(139, 92, 246, 0.05))",
                      filter: "blur(8px)",
                    }}
                  />
                  <Mail
                    className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                      focusedField === "email" ? "text-sky-500" : "text-zinc-500"
                    }`}
                    size={20}
                  />
                  <motion.input
                    type="email"
                    placeholder="Secure Email Access"
                    className="w-full bg-white/5 border border-white/[0.08] rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-sky-500/50 focus:bg-white/[0.07] transition-all font-medium text-white placeholder:text-zinc-600"
                    value={formData.username}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                  />
                  {focusedField === "email" && (
                    <motion.div
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                    >
                      <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    </motion.div>
                  )}
                </motion.div>

                {/* Password field */}
                <motion.div
                  className="relative group"
                  whileFocus={{ scale: 1.01 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"
                    style={{
                      background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(14, 165, 233, 0.05))",
                      filter: "blur(8px)",
                    }}
                  />
                  <Lock
                    className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                      focusedField === "password" ? "text-sky-500" : "text-zinc-500"
                    }`}
                    size={20}
                  />
                  <motion.input
                    type="password"
                    placeholder="Access Secret"
                    className="w-full bg-white/5 border border-white/[0.08] rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-sky-500/50 focus:bg-white/[0.07] transition-all font-medium text-white placeholder:text-zinc-600"
                    value={formData.password}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                  {focusedField === "password" && (
                    <motion.div
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                    >
                      <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {/* Login button */}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(14, 165, 233, 0.3)" }}
                whileTap={{ scale: 0.97 }}
                disabled={loading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-xl shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                  }}
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <span className="relative z-10 flex items-center space-x-2">
                  {loading ? (
                    <>
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Establish Connection</span>
                      <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowRight size={20} />
                      </motion.span>
                    </>
                  )}
                </span>
              </motion.button>
            </motion.form>

            {/* Footer */}
            <motion.div variants={itemVariants} className="mt-8 sm:mt-10 text-center">
              <p className="text-zinc-500 font-medium text-sm sm:text-base">
                New to HealthAI?{" "}
                <Link
                  href="/register"
                  className="text-sky-500 font-bold hover:text-sky-400 transition-colors relative group"
                >
                  <span>Register</span>
                  <motion.span
                    className="absolute -bottom-0.5 left-0 right-0 h-px bg-sky-500"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </Link>
              </p>
            </motion.div>

            {/* Status bar */}
            <motion.div
              variants={itemVariants}
              className="mt-6 flex items-center justify-center space-x-4 text-[10px] sm:text-xs text-zinc-600 font-mono"
            >
              <div className="flex items-center space-x-1.5">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span>SYSTEM ONLINE</span>
              </div>
              <span className="text-zinc-700">|</span>
              <span>AES-256</span>
              <span className="text-zinc-700">|</span>
              <span>TLS 1.3</span>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
