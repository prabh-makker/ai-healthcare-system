"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, ArrowUpRight, FileSearch, BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
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

export default function RecordsPage() {
  const { user } = useAuth();
  const isDoctor = user?.role === "DOCTOR";
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRecords()
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    }),
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
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-violet-200 via-violet-400 to-indigo-500 bg-clip-text text-transparent">
            {isDoctor ? "Medical Records" : "Health History"}
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            {isDoctor
              ? `${records.length} records • All patients`
              : `${records.length} diagnoses • Your health`}
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-[2rem] p-8 border border-white/[0.08]"
        >
          <h2 className="text-xl font-black mb-8 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
              <BarChart3 size={20} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-violet-200 to-purple-300 bg-clip-text text-transparent">
              {isDoctor ? "Patient Records" : "My Diagnosis Records"}
            </span>
          </h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16">
              <FileSearch size={40} className="text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 font-medium">No records found</p>
              <p className="text-zinc-600 text-sm mt-1">
                {isDoctor ? "No patients have been diagnosed yet." : "Run a symptom check to create your first record."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5">
                    {isDoctor && <th className="text-left pb-4 font-semibold">Patient ID</th>}
                    <th className="text-left pb-4 font-semibold">Symptoms</th>
                    <th className="text-left pb-4 font-semibold">Diagnosis</th>
                    <th className="text-left pb-4 font-semibold">Confidence</th>
                    <th className="text-left pb-4 font-semibold">Specialist</th>
                    <th className="text-left pb-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {records.map((r, idx) => (
                    <motion.tr
                      key={r.id}
                      custom={idx}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover={{ backgroundColor: "rgba(139,92,246,0.06)" }}
                      className="transition-colors cursor-default"
                    >
                      {isDoctor && (
                        <td className="py-4 font-mono text-xs text-zinc-400">{r.patient_id.slice(0, 12)}…</td>
                      )}
                      <td className="py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {r.symptoms.slice(0, 3).map((s) => (
                            <span key={s} className="text-[10px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded-lg">
                              {s.replace(/_/g, " ")}
                            </span>
                          ))}
                          {r.symptoms.length > 3 && (
                            <span className="text-[10px] text-zinc-600">+{r.symptoms.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 font-semibold" style={{ color: "var(--foreground)" }}>{r.ai_prediction ?? "—"}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${r.confidence_score ?? 0}%` }}
                              transition={{ duration: 0.8, delay: idx * 0.06 + 0.3 }}
                              className="h-full rounded-full"
                              style={{ background: "linear-gradient(90deg, #8b5cf6, #a78bfa)" }}
                            />
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 w-fit ${
                            (r.confidence_score ?? 0) > 80
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {r.confidence_score != null ? `${r.confidence_score.toFixed(1)}%` : "—"}
                            <ArrowUpRight size={10} />
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-zinc-400 text-xs">{r.recommended_specialist ?? "—"}</td>
                      <td className="py-4 text-zinc-500 text-xs">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
