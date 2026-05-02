"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, ArrowUpRight, UserCheck, TrendingUp, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";

interface Record {
  id: string;
  patient_id: string;
  ai_prediction: string | null;
  confidence_score: number | null;
  recommended_specialist: string | null;
  symptoms: string[];
  created_at: string | null;
}

interface Stats {
  total_patients: number;
  total_records: number;
  recent_records: Record[];
}

function PatientsContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);

  const filtered = stats?.recent_records.filter((r) =>
    search ? r.patient_id.toLowerCase().includes(search.toLowerCase()) ||
      (r.ai_prediction ?? "").toLowerCase().includes(search.toLowerCase()) : true
  ) ?? [];

  const rowVariants = {
    hidden: { opacity: 0, x: -12 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    }),
  };

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#0ea5e9" />

      <div className="relative z-10">
        <header className="flex justify-between items-center mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-sky-200 via-sky-400 to-violet-500 bg-clip-text text-transparent">
              Patient Registry
            </h1>
            <p className="text-zinc-500 mt-2 font-medium">
              Dr. {user?.email?.split("@")[0]} — managing {stats?.total_patients ?? "..."} patients
            </p>
          </motion.div>
          <div className="flex items-center glass-card px-4 py-2.5 rounded-2xl text-zinc-400 focus-within:text-[var(--foreground)] transition-colors">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by patient ID or condition..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none ml-3 text-sm w-64 font-medium"
              style={{ color: "var(--foreground)" }}
            />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: "Total Patients", value: String(stats?.total_patients ?? "..."), icon: Users, color: "sky", gradient: "from-sky-500 to-blue-600" },
            { label: "Total Records", value: String(stats?.total_records ?? "..."), icon: Stethoscope, color: "violet", gradient: "from-violet-500 to-purple-600" },
            { label: "Active Cases", value: String(stats?.recent_records.length ?? "..."), icon: TrendingUp, color: "emerald", gradient: "from-emerald-500 to-teal-600" },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-[2rem] p-6 glass-card border border-white/[0.08] hover:border-white/[0.15] transition-colors"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              <div className={`p-3 rounded-2xl w-fit mb-4 bg-${card.color}-500/10 group-hover:bg-${card.color}-500/20 transition-colors relative z-10`}>
                <card.icon size={22} className={`text-${card.color}-400 group-hover:text-${card.color}-300 transition-colors`} />
              </div>
              <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] relative z-10">{card.label}</p>
              <motion.h3
                className="text-4xl font-black mt-2 tracking-tight relative z-10"
                style={{ color: "var(--foreground)" }}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
              >
                {card.value}
              </motion.h3>
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${card.gradient} rounded-full opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500 -z-10`} />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-[2rem] p-8 border border-white/[0.08]"
        >
          <h2 className="text-xl font-black mb-8 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
              <UserCheck size={20} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-sky-200 to-blue-300 bg-clip-text text-transparent">
              Recent Patient Records
            </span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="text-left pb-4 font-semibold">Patient ID</th>
                  <th className="text-left pb-4 font-semibold">Diagnosis</th>
                  <th className="text-left pb-4 font-semibold">Confidence</th>
                  <th className="text-left pb-4 font-semibold">Specialist</th>
                  <th className="text-left pb-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="text-zinc-600 font-medium">No records found</div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, idx) => (
                    <motion.tr
                      key={r.id}
                      custom={idx}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover={{ backgroundColor: "rgba(14,165,233,0.05)" }}
                      className="transition-all duration-200 cursor-default"
                    >
                      <td className="py-4 font-mono text-xs text-zinc-400">{r.patient_id.slice(0, 12)}…</td>
                      <td className="py-4 font-semibold" style={{ color: "var(--foreground)" }}>{r.ai_prediction ?? "—"}</td>
                      <td className="py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          (r.confidence_score ?? 0) > 80
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {r.confidence_score != null ? `${r.confidence_score.toFixed(1)}%` : "—"}
                        </span>
                      </td>
                      <td className="py-4 text-zinc-400 text-xs">{r.recommended_specialist ?? "—"}</td>
                      <td className="py-4 text-zinc-500 text-xs">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function PatientsPage() {
  return (
    <ProtectedRoute requiredRole="DOCTOR">
      <PatientsContent />
    </ProtectedRoute>
  );
}
