"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const [formData, setFormData] = useState({ email: "", password: "", role: "PATIENT" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { register } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;  // Prevent double-submit
    setLoading(true);
    setError("");

    // Client-side validation
    if (!formData.email || !formData.password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    // Email validation
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    // Password strength validation
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      setError("Password must contain at least one uppercase letter.");
      setLoading(false);
      return;
    }

    if (!/\d/.test(formData.password)) {
      setError("Password must contain at least one number.");
      setLoading(false);
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};:'"",.<>?]/.test(formData.password)) {
      setError("Password must contain at least one special character.");
      setLoading(false);
      return;
    }

    try {
      await register(formData.email, formData.password, formData.role);
      router.push("/login");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md p-10 rounded-[3rem] shadow-2xl relative overflow-hidden"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-sky-500 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-sky-500/20 mb-6">
            <ShieldCheck size={36} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gradient">Create Account</h2>
          <p className="text-zinc-500 mt-2 font-medium">Join the next-gen clinical network.</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/20">
            <p className="text-xs text-sky-300 font-semibold">
              Patient Registration
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Doctor accounts can only be created by an administrator. Contact your admin for doctor access.
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-sky-500 transition-colors"
                size={20}
              />
              <input
                type="email"
                placeholder="Secure Email Access"
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-sky-500/50 transition-all font-medium text-white placeholder:text-zinc-600"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="relative group">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-sky-500 transition-colors"
                size={20}
              />
              <input
                type="password"
                placeholder="Access Secret"
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-sky-500/50 transition-all font-medium text-white placeholder:text-zinc-600"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
              />
            </div>

            {/* Live password strength feedback */}
            {formData.password.length > 0 && (
              <div className="space-y-1.5 px-1">
                {[
                  { ok: formData.password.length >= 8, label: "At least 8 characters" },
                  { ok: /[A-Z]/.test(formData.password), label: "One uppercase letter" },
                  { ok: /\d/.test(formData.password), label: "One number" },
                  { ok: /[!@#$%^&*()_+\-=\[\]{};:'"",.<>?]/.test(formData.password), label: "One special character" },
                ].map((req) => (
                  <div key={req.label} className="flex items-center gap-2 text-xs">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold ${req.ok ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-500"}`}>
                      {req.ok ? "✓" : "•"}
                    </span>
                    <span className={req.ok ? "text-emerald-400" : "text-zinc-500"}>{req.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-xl shadow-sky-500/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <>
                <span>Initialize Identity</span> <ArrowRight size={20} />
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-zinc-500 font-medium">
            Already indexed?{" "}
            <Link href="/login" className="text-sky-500 font-bold hover:text-sky-400 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
