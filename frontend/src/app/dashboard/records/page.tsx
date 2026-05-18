"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, ArrowUpRight, FileSearch, BarChart3, Search, Users, ChevronRight, ArrowLeft, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import DashboardBg from "@/components/DashboardBg";

interface Record {
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

export default function RecordsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isDoctor = user?.role === "DOCTOR";
  const isAdmin = user?.role === "ADMIN";
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>("ALL");
  const pageSize = 50;

  // Group records by patient for doctor's default view
  const patientGroups = useMemo(() => {
    if (!isDoctor) return [];
    const groups: Record[][] = [];
    const byPatient = new Map<string, Record[]>();
    for (const r of records) {
      if (!byPatient.has(r.patient_id)) byPatient.set(r.patient_id, []);
      byPatient.get(r.patient_id)!.push(r);
    }
    return Array.from(byPatient.entries()).map(([patient_id, recs]) => ({
      patient_id,
      patient_email: recs[0]?.patient_email || null,
      patient_first_name: recs[0]?.first_name || null,
      patient_last_name: recs[0]?.last_name || null,
      records: recs.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
      total: recs.length,
      pending: recs.filter((r) => r.status === "pending").length,
      latestDate: recs[0]?.created_at,
    })).sort((a, b) => (b.latestDate || "").localeCompare(a.latestDate || ""));
  }, [records, isDoctor]);

  // Filter for either current view
  const filteredPatientGroups = useMemo(() => {
    if (!searchQuery.trim()) return patientGroups;
    const q = searchQuery.toLowerCase();
    return patientGroups.filter((g) =>
      (g.patient_email || "").toLowerCase().includes(q) ||
      g.records.some((r) => r.ai_prediction?.toLowerCase().includes(q))
    );
  }, [patientGroups, searchQuery]);

  const filteredRecords = useMemo(() => {
    // Doctor with selected patient → show that patient's records
    let pool = records;
    if (isDoctor && selectedPatientId) {
      pool = records.filter((r) => r.patient_id === selectedPatientId);
    }
    // Admin status filter
    if (isAdmin && adminStatusFilter !== "ALL") {
      pool = pool.filter((r) => r.status === adminStatusFilter.toLowerCase());
    }
    if (!searchQuery.trim()) return pool;
    const query = searchQuery.toLowerCase();
    return pool.filter(
      (r) =>
        r.ai_prediction?.toLowerCase().includes(query) ||
        r.symptoms?.some((s) => s.toLowerCase().includes(query)) ||
        r.recommended_specialist?.toLowerCase().includes(query) ||
        (r.first_name && (`${r.first_name} ${r.last_name || ""}`.toLowerCase().includes(query))) ||
        (r.patient_email && r.patient_email.toLowerCase().includes(query))
    );
  }, [records, searchQuery, isDoctor, isAdmin, selectedPatientId, adminStatusFilter]);

  // Admin stats summary
  const adminRecordStats = useMemo(() => {
    if (!isAdmin) return null;
    return {
      total: records.length,
      pending: records.filter(r => r.status === "pending").length,
      approved: records.filter(r => r.status === "approved").length,
      rejected: records.filter(r => r.status === "rejected").length,
    };
  }, [records, isAdmin]);

  // For doctor: showing patient list (when no patient selected)
  const showingPatientList = isDoctor && !selectedPatientId;
  const selectedPatientInfo = selectedPatientId
    ? patientGroups.find((g) => g.patient_id === selectedPatientId)
    : null;

  const loadRecords = (page: number) => {
    setLoading(true);
    api.getRecords((page - 1) * pageSize, pageSize)
      .then((data) => {
        setRecords(Array.isArray(data) ? data : []);
        setCurrentPage(page);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRecords(1);
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
          className="mb-8 flex justify-between items-start"
        >
          <div className="flex items-center gap-4">
            {isDoctor && selectedPatientId && (
              <motion.button
                whileHover={{ x: -4 }}
                onClick={() => setSelectedPatientId(null)}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                aria-label="Back to patient list"
              >
                <ArrowLeft size={20} />
              </motion.button>
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-br from-violet-200 via-violet-400 to-indigo-500 bg-clip-text text-transparent">
                {isAdmin
                  ? "All Medical Records"
                  : isDoctor
                  ? (selectedPatientInfo ? (selectedPatientInfo.patient_email || "Patient Records") : "Medical Records")
                  : "Health History"}
              </h1>
              <p className="text-zinc-500 mt-2 text-sm sm:text-base font-medium">
                {isAdmin
                  ? `${records.length} records system-wide • Audit view`
                  : isDoctor && !selectedPatientId
                  ? `${patientGroups.length} patients • ${records.length} total records`
                  : isDoctor && selectedPatientId
                  ? `${selectedPatientInfo?.total || 0} records for this patient`
                  : `${records.length} diagnoses • Your health`}
              </p>
            </div>
          </div>
          <div className="flex items-center glass-card px-4 py-2.5 rounded-2xl text-zinc-400 focus-within:text-[var(--foreground)] transition-colors">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none ml-3 text-sm w-48 font-medium"
              style={{ color: "var(--foreground)" }}
            />
          </div>
        </motion.header>

        {/* Admin Stats + Filter Row */}
        {isAdmin && adminRecordStats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total", value: adminRecordStats.total, color: "violet", bgGrad: "from-violet-500 to-purple-600" },
              { label: "Pending", value: adminRecordStats.pending, color: "amber", bgGrad: "from-amber-500 to-orange-600" },
              { label: "Approved", value: adminRecordStats.approved, color: "emerald", bgGrad: "from-emerald-500 to-teal-600" },
              { label: "Rejected", value: adminRecordStats.rejected, color: "rose", bgGrad: "from-rose-500 to-pink-600" },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => setAdminStatusFilter(s.label.toUpperCase() === "TOTAL" ? "ALL" : s.label.toUpperCase())}
                className={`glass-card rounded-2xl p-4 border text-left transition-all hover:scale-105 ${
                  (adminStatusFilter === "ALL" && s.label === "Total") || adminStatusFilter === s.label.toUpperCase()
                    ? `border-${s.color}-500/60 shadow-lg shadow-${s.color}-500/20`
                    : "border-white/[0.08]"
                }`}
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${s.bgGrad} w-fit mb-2`}>
                  <BarChart3 size={14} className="text-white" />
                </div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-black mt-1" style={{ color: "var(--foreground)" }}>{s.value}</p>
              </button>
            ))}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-[2rem] p-8 border border-white/[0.08]"
        >
          <h2 className="text-xl font-black mb-8 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
              {showingPatientList ? <Users size={20} className="text-white" /> : <BarChart3 size={20} className="text-white" />}
            </div>
            <span className="bg-gradient-to-r from-violet-200 to-purple-300 bg-clip-text text-transparent">
              {isAdmin
                ? `${adminStatusFilter === "ALL" ? "All" : adminStatusFilter} Records`
                : isDoctor
                ? (showingPatientList ? "Patients" : "Records")
                : "My Diagnosis Records"}
            </span>
          </h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : showingPatientList ? (
            // ── Doctor: Patient list view (default) ──
            filteredPatientGroups.length === 0 ? (
              <div className="text-center py-16">
                <Users size={40} className="text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 font-medium">
                  {searchQuery ? "No patients match your search" : "No patients yet"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPatientGroups.map((g, idx) => (
                  <motion.div
                    key={g.patient_id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    onClick={() => setSelectedPatientId(g.patient_id)}
                    className="relative cursor-pointer rounded-2xl p-5 glass-premium border border-white/10 hover:border-violet-500/30 transition-all group"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-violet-500/30 shrink-0">
                        {(g.patient_first_name || g.patient_email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color: "var(--foreground)" }}>
                          {g.patient_first_name && g.patient_last_name
                            ? `${g.patient_first_name} ${g.patient_last_name}`
                            : g.patient_email?.split("@")[0] || `Patient ${g.patient_id.slice(0, 6)}`}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{g.patient_email || g.patient_id.slice(0, 12) + "…"}</p>
                      </div>
                      <ChevronRight size={18} className="text-zinc-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-300">
                        {g.total} {g.total === 1 ? "record" : "records"}
                      </span>
                      {g.pending > 0 && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400">
                          {g.pending} pending
                        </span>
                      )}
                      {g.latestDate && (
                        <span className="text-[10px] text-zinc-500 ml-auto">
                          Last: {new Date(g.latestDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-16">
              <FileSearch size={40} className="text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 font-medium">
                {searchQuery ? "No records match your search" : "No records found"}
              </p>
              <p className="text-zinc-600 text-sm mt-1">
                {!searchQuery && (isDoctor ? "This patient has no records yet." : "Run a symptom check to create your first record.")}
              </p>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5">
                      {(isDoctor && !selectedPatientId) || isAdmin ? <th className="text-left pb-4 font-semibold">Patient</th> : null}
                      <th className="text-left pb-4 font-semibold">Symptoms</th>
                      <th className="text-left pb-4 font-semibold">Diagnosis</th>
                      <th className="text-left pb-4 font-semibold">Confidence</th>
                      <th className="text-left pb-4 font-semibold">Specialist</th>
                      {isAdmin && <th className="text-left pb-4 font-semibold">Status</th>}
                      <th className="text-left pb-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRecords.map((r, idx) => (
                      <motion.tr
                        key={r.id}
                        custom={idx}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ backgroundColor: "rgba(139,92,246,0.1)" }}
                        onClick={() => router.push(`/dashboard/records/${r.id}`)}
                        className="transition-colors cursor-pointer hover:shadow-lg hover:shadow-violet-500/10"
                      >
                        {((isDoctor && !selectedPatientId) || isAdmin) && (
                          <td className="py-4 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                            <div>
                              <p>{r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : r.patient_email?.split("@")[0] || "Unknown Patient"}</p>
                              {isAdmin && r.patient_email && <p className="text-xs text-zinc-500 font-normal">{r.patient_email}</p>}
                            </div>
                          </td>
                        )}
                        <td className="py-4">
                          <div className="flex flex-wrap gap-1">
                            {r.symptoms.map((s) => (
                              <span key={s} className="text-[10px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded-lg">
                                {s.replace(/_/g, " ")}
                              </span>
                            ))}
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
                        {isAdmin && (
                          <td className="py-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                              r.status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
                              r.status === "rejected" ? "bg-rose-500/10 text-rose-400" :
                              "bg-amber-500/10 text-amber-400"
                            }`}>
                              {r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : "Pending"}
                            </span>
                          </td>
                        )}
                        <td className="py-4 text-zinc-500 text-xs">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {records.length > 0 && (
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="text-sm text-zinc-500">
                    Page <span className="font-bold text-white">{currentPage}</span>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => loadRecords(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                      className="px-4 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      ← Previous
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => loadRecords(currentPage + 1)}
                      disabled={records.length < pageSize || loading}
                      className="px-4 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Next →
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
