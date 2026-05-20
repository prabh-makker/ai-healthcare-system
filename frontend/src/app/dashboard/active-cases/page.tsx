"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { AlertCircle, Search, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";

interface ActiveCase {
  id: string;
  patient_id: string;
  patient_email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  ai_prediction: string | null;
  confidence_score: number | null;
  recommended_specialist: string | null;
  symptoms: string[];
  created_at: string | null;
  status?: string;
}

function ActiveCasesContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [cases, setCases] = useState<ActiveCase[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Fetch all records and filter for active ones
    api.getRecords(0, 500)
      .then((records: any[]) => {
        const activeCases = records.filter(
          (r) => r.status === "pending" || r.status === "approved"
        );
        setCases(activeCases);
      })
      .catch((err) => {
        console.error("Failed to load active cases:", err);
        setCases([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search) return cases;
    const lower = search.toLowerCase();
    return cases.filter((c) =>
      (c.first_name?.toLowerCase() || "").includes(lower) ||
      (c.last_name?.toLowerCase() || "").includes(lower) ||
      (c.patient_email?.toLowerCase() || "").includes(lower) ||
      (c.ai_prediction?.toLowerCase() || "").includes(lower) ||
      (c.recommended_specialist?.toLowerCase() || "").includes(lower) ||
      (c.symptoms || []).some((s) => s?.toLowerCase().includes(lower))
    );
  }, [cases, search]);

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
      <DashboardBg accentColor="#06b6d4" />

      <div className="relative z-10 p-12">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex justify-between items-start"
        >
          <div>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: 'white' }}>
              Active Cases
            </h1>
            <p className="text-zinc-500 mt-2 font-medium">
              {filtered.length} active case{filtered.length !== 1 ? "s" : ""} requiring attention
            </p>
          </div>
          <div className="flex items-center glass-card px-4 py-2.5 rounded-2xl text-zinc-400 focus-within:text-[var(--foreground)] transition-colors">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by patient, diagnosis, specialist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none ml-3 text-sm w-80 font-medium"
              style={{ color: "var(--foreground)" }}
            />
          </div>
        </motion.header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-[2rem] p-8 border border-white/[0.08]"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                  <Zap size={20} className="text-white" />
                </div>
                <span className="bg-gradient-to-r from-cyan-200 to-blue-300 bg-clip-text text-transparent">
                  Pending & Approved Cases
                </span>
              </h2>
              <p className="text-xs text-zinc-500">{filtered.length} case{filtered.length !== 1 ? "s" : ""}</p>
            </div>

            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-600 font-medium">
                  {search ? "No active cases match your search" : "No active cases"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5">
                      <th className="text-left pb-4 font-semibold">Patient</th>
                      <th className="text-left pb-4 font-semibold">Diagnosis</th>
                      <th className="text-left pb-4 font-semibold">Confidence</th>
                      <th className="text-left pb-4 font-semibold">Specialist</th>
                      <th className="text-left pb-4 font-semibold">Symptoms</th>
                      <th className="text-left pb-4 font-semibold">Status</th>
                      <th className="text-left pb-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((c, idx) => (
                      <motion.tr
                        key={c.id}
                        custom={idx}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ backgroundColor: "rgba(6,182,212,0.05)" }}
                        className="transition-all duration-200 cursor-pointer"
                        onClick={() => router.push(`/dashboard/records/${c.id}`)}
                      >
                        <td className="py-4 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                          <div>
                            <p>
                              {c.first_name && c.last_name
                                ? `${c.first_name} ${c.last_name}`
                                : c.patient_email?.split("@")[0] || "Unknown"}
                            </p>
                            <p className="text-zinc-500 text-xs">{c.patient_email}</p>
                          </div>
                        </td>
                        <td className="py-4 font-semibold" style={{ color: "var(--foreground)" }}>
                          {c.ai_prediction ?? "—"}
                        </td>
                        <td className="py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            (c.confidence_score ?? 0) > 80
                              ? "bg-emerald-500/10 text-emerald-400"
                              : (c.confidence_score ?? 0) > 60
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {c.confidence_score != null ? `${c.confidence_score.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td className="py-4 text-zinc-400 text-xs">
                          {c.recommended_specialist ?? "—"}
                        </td>
                        <td className="py-4 text-xs text-zinc-500">
                          <div className="flex flex-wrap gap-1">
                            {(c.symptoms || []).slice(0, 2).map((s, idx) => (
                              <span key={idx} className="px-2 py-1 bg-white/5 rounded text-zinc-300">
                                {s}
                              </span>
                            ))}
                            {(c.symptoms || []).length > 2 && (
                              <span className="text-zinc-600">+{(c.symptoms || []).length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 text-xs">
                          <span className={`px-2 py-1 rounded-lg font-semibold ${
                            c.status === "pending"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-sky-500/10 text-sky-400"
                          }`}>
                            {c.status ? c.status.charAt(0).toUpperCase() + c.status.slice(1) : "—"}
                          </span>
                        </td>
                        <td className="py-4 text-xs text-zinc-500">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function ActiveCasesPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <ActiveCasesContent />
    </ProtectedRoute>
  );
}
