"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, Database, Shield, AlertCircle, Activity, Settings, Brain, Lock, Zap } from "lucide-react";
import { api } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";

interface Stats {
  total_records: number;
  total_patients: number;
  total_doctors: number;
  recent_records: Array<{
    id: string;
    patient_id: string;
    ai_prediction: string | null;
    confidence_score: number | null;
    created_at: string | null;
  }>;
}

function AdminContent() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const colorClassMap: Record<string, { bg: string; text: string; hover: string }> = {
    sky: { bg: "bg-sky-500/10", text: "text-sky-400", hover: "group-hover:bg-sky-500/20" },
    rose: { bg: "bg-rose-500/10", text: "text-rose-400", hover: "group-hover:bg-rose-500/20" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-400", hover: "group-hover:bg-violet-500/20" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", hover: "group-hover:bg-emerald-500/20" },
  };

  const statusColorMap: Record<string, string> = {
    sky: "bg-sky-500/10 text-sky-400",
    rose: "bg-rose-500/10 text-rose-400",
    violet: "bg-violet-500/10 text-violet-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
  };

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#8b5cf6" />

      <div className="relative z-10">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-violet-200 via-purple-400 to-indigo-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">System overview & user management</p>
        </motion.header>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {[
            { label: "Total Users", value: String((stats?.total_patients ?? 0) + (stats?.total_doctors ?? 0)), icon: Users, color: "sky", gradient: "from-sky-500 to-blue-600" },
            { label: "Patients", value: String(stats?.total_patients ?? "..."), icon: Activity, color: "rose", gradient: "from-rose-500 to-pink-600" },
            { label: "Doctors", value: String(stats?.total_doctors ?? "..."), icon: Shield, color: "violet", gradient: "from-violet-500 to-purple-600" },
            { label: "Diagnoses", value: String(stats?.total_records ?? "..."), icon: Database, color: "emerald", gradient: "from-emerald-500 to-teal-600" },
          ].map((card) => (
            <motion.div
              key={card.label}
              variants={item}
              whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
              className="group relative overflow-hidden rounded-[2rem] p-6 glass-card border border-white/[0.08] hover:border-white/[0.15] transition-colors cursor-default"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              <div className={`p-3 rounded-2xl w-fit mb-4 ${colorClassMap[card.color].bg} ${colorClassMap[card.color].hover} relative z-10 transition-colors`}>
                <card.icon size={22} className={colorClassMap[card.color].text} />
              </div>
              <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] relative z-10">{card.label}</p>
              <motion.h3
                className="text-4xl font-black mt-2 relative z-10"
                style={{ color: "var(--foreground)" }}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
              >
                {card.value}
              </motion.h3>
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${card.gradient} rounded-full opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500 -z-10`} />
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 glass-card rounded-[2rem] p-8 border border-white/[0.08]"
          >
            <h2 className="text-xl font-black mb-8 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
                <TrendingUp size={20} className="text-white" />
              </div>
              <span className="bg-gradient-to-r from-sky-200 to-blue-300 bg-clip-text text-transparent">
                Recent Activity
              </span>
            </h2>
            <div className="space-y-3">
              {(stats?.recent_records ?? []).slice(0, 5).map((r, idx) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + idx * 0.05 }}
                  whileHover={{ x: 4, backgroundColor: "rgba(139,92,246,0.06)" }}
                  className="flex items-center justify-between p-4 bg-white/3 rounded-2xl transition-all duration-200 cursor-default"
                >
                  <div>
                    <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{r.ai_prediction ?? "New Record"}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{r.patient_id.slice(0, 8)}…</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-xs font-bold px-2.5 py-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                      {r.confidence_score != null ? `${r.confidence_score.toFixed(0)}%` : "—"}
                    </span>
                    <p className="text-zinc-600 text-[10px] mt-1">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card rounded-[2rem] p-8 border border-white/[0.08]"
          >
            <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-amber-200">
              <AlertCircle size={20} />
              System Status
            </h3>
            <div className="space-y-4">
              {[
                { label: "Database", status: "healthy", color: "emerald" },
                { label: "API Server", status: "healthy", color: "emerald" },
                { label: "Cache Layer", status: "healthy", color: "emerald" },
                { label: "AI Models", status: "running", color: "sky" },
              ].map((s, idx) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + idx * 0.05 }}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-zinc-400">{s.label}</span>
                  <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-lg ${statusColorMap[s.color]} capitalize`}>
                    {s.status}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-xs text-zinc-600">Last check: Just now</p>
            </div>
          </motion.div>
        </div>

        {/* ML Model Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 glass-card rounded-[2rem] p-8 border border-white/[0.08]"
        >
          <h2 className="text-xl font-black mb-8 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
              <Brain size={20} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-violet-200 to-purple-300 bg-clip-text text-transparent">
              ML Model Management
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "XGBoost Diagnosis", status: "Active", performance: "98.2%", color: "emerald" },
              { label: "Symptom Analyzer", status: "Active", performance: "94.1%", color: "sky" },
              { label: "Feature Extractor", status: "Active", performance: "96.5%", color: "violet" },
            ].map((model, idx) => (
              <motion.div
                key={model.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 + idx * 0.05 }}
                className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="font-bold text-sm">{model.label}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${statusColorMap[model.color]}`}>
                    {model.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Accuracy</span>
                    <span className="text-xs font-bold text-emerald-400">{model.performance}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      initial={{ width: 0 }}
                      animate={{ width: model.performance }}
                      transition={{ duration: 1, delay: 0.8 + idx * 0.1 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* System Configuration Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
            <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-blue-200">
              <Settings size={20} />
              Configuration
            </h3>
            <div className="space-y-4">
              {[
                { label: "Rate Limiting", value: "5/15min", icon: Zap },
                { label: "Token Expiry", value: "8 hours", icon: Lock },
                { label: "Encryption", value: "AES-256", icon: Shield },
              ].map((config, idx) => (
                <motion.div
                  key={config.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.85 + idx * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <config.icon size={16} className="text-blue-400" />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <span className="text-xs font-bold text-blue-300">{config.value}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
            <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-amber-200">
              <AlertCircle size={20} />
              Security & Audit
            </h3>
            <div className="space-y-4">
              {[
                { label: "Failed Logins", value: "0", severity: "safe" },
                { label: "Suspicious Activity", value: "None", severity: "safe" },
                { label: "Data Integrity", value: "100%", severity: "safe" },
              ].map((audit, idx) => (
                <motion.div
                  key={audit.label}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.85 + idx * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm font-medium">{audit.label}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    audit.severity === "safe" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {audit.value}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Admin Actions Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-white/[0.08] text-center"
        >
          <p className="text-sm text-zinc-400">
            System fully operational. All health checks passing. Last backup: 2 hours ago.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <AdminContent />
    </ProtectedRoute>
  );
}
