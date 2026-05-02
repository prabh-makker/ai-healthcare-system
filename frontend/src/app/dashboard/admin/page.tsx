"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, Database, Shield, AlertCircle, Activity } from "lucide-react";
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
              <div className={`p-3 rounded-2xl w-fit mb-4 bg-${card.color}-500/10 group-hover:bg-${card.color}-500/20 relative z-10 transition-colors`}>
                <card.icon size={22} className={`text-${card.color}-400`} />
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
                  <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-lg bg-${s.color}-500/10 text-${s.color}-400 capitalize`}>
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
