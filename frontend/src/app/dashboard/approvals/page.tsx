"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, X, AlertCircle, Check, Square, CheckSquare,
  Eye, FileCheck, MessageSquare, ChevronDown, RotateCcw,
} from "lucide-react";
import { api, APIError } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";

interface PendingRecord {
  id: string;
  patient_id: string;
  patient_email?: string;
  first_name?: string | null;
  last_name?: string | null;
  symptoms: string[];
  ai_prediction: string;
  confidence_score: number;
  recommended_specialist: string;
  status: string;
  created_at: string;
  doctor_notes?: string;
  accuracy_feedback?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; pill: string; border: string }> = {
  pending:  { label: "Pending",  pill: "bg-amber-500/10 text-amber-400",   border: "border-amber-500/30"  },
  approved: { label: "Approved", pill: "bg-emerald-500/10 text-emerald-400", border: "border-emerald-500/30" },
  reviewed: { label: "Reviewed", pill: "bg-violet-500/10 text-violet-400",  border: "border-violet-500/30"  },
  rejected: { label: "Rejected", pill: "bg-rose-500/10 text-rose-400",      border: "border-rose-500/30"    },
};

function ApprovalsContent() {
  const router = useRouter();
  const [allRecords, setAllRecords] = useState<PendingRecord[]>([]);
  const [patientMap, setPatientMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkNotes, setShowBulkNotes] = useState(false);
  const [bulkNotes, setBulkNotes] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "reviewed" | "rejected">("pending");

  // Per-card inline reject state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  // Per-card notes expansion
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const records = statusFilter === "all"
    ? allRecords
    : allRecords.filter((r) => r.status === statusFilter);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const [data, patients] = await Promise.all([
        api.getRecords(0, 100),
        api.getMyPatients(0, 100).catch(() => [] as Array<{ id: string; email: string }>),
      ]);
      setAllRecords(data);
      const map: Record<string, string> = {};
      (patients as Array<{ id: string; email: string }>).forEach((p) => { map[p.id] = p.email; });
      setPatientMap(map);
      setError(null);
    } catch (err: any) {
      setError(err instanceof APIError ? err.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const counts = {
    all: allRecords.length,
    pending: allRecords.filter((r) => r.status === "pending").length,
    approved: allRecords.filter((r) => r.status === "approved").length,
    reviewed: allRecords.filter((r) => r.status === "reviewed").length,
    rejected: allRecords.filter((r) => r.status === "rejected").length,
  };

  useEffect(() => { fetchRecords(); }, []);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const toggleSelect = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.size === records.length ? new Set() : new Set(records.map((r) => r.id)));

  const handleApprove = async (id: string) => {
    try {
      await api.patchRecord(id, { status: "approved" });
      flash("Record approved — patient can now see this status.");
      fetchRecords();
    } catch (err: any) { setError(err.message || "Failed to approve"); }
  };

  const handleMarkReviewed = async (id: string) => {
    try {
      await api.patchRecord(id, { status: "reviewed" });
      flash("Marked as reviewed.");
      fetchRecords();
    } catch (err: any) { setError(err.message || "Failed to update"); }
  };

  const handleReject = async (id: string) => {
    if (!rejectNote.trim()) { setError("Please add a reason for rejection."); return; }
    setRejectLoading(true);
    try {
      await api.patchRecord(id, { status: "rejected", doctor_notes: rejectNote.trim() });
      flash("Record rejected — patient will see rejection reason.");
      setRejectingId(null);
      setRejectNote("");
      fetchRecords();
    } catch (err: any) { setError(err.message || "Failed to reject"); }
    finally { setRejectLoading(false); }
  };

  const handleFeedback = async (id: string, feedback: "correct" | "incorrect" | "partial") => {
    try {
      await api.patchRecord(id, { accuracy_feedback: feedback });
      flash(`AI accuracy feedback saved: ${feedback}`);
      fetchRecords();
    } catch (err: any) { setError(err.message || "Failed to submit feedback"); }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const result = await api.bulkApproveRecords(Array.from(selectedIds), bulkNotes || undefined, "approved");
      flash(`Approved ${result.approved_count} of ${result.total_processed} records`);
      setSelectedIds(new Set()); setBulkNotes(""); setShowBulkNotes(false);
      fetchRecords();
    } catch (err: any) { setError(err.message || "Failed to bulk approve"); }
    finally { setBulkLoading(false); }
  };

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#10b981" />
      <div className="relative z-10 p-12">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-br from-emerald-200 via-green-400 to-teal-500 bg-clip-text text-transparent">
            Approval Queue
          </h1>
          <p className="text-zinc-500 mt-2 text-sm font-medium">
            {records.length} {statusFilter === "all" ? "total" : statusFilter} record{records.length !== 1 ? "s" : ""}
            {statusFilter === "pending" && records.length > 0 && " require your review"}
          </p>
        </motion.div>

        {/* Status Filter Pills */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-2 mb-8 flex-wrap">
          {(["all", "pending", "approved", "reviewed", "rejected"] as const).map((f) => {
            const isActive = statusFilter === f;
            const colorMap: Record<string, { active: string; idle: string }> = {
              all:      { active: "bg-sky-500 text-white shadow-lg shadow-sky-500/30",     idle: "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10" },
              pending:  { active: "bg-amber-500 text-white shadow-lg shadow-amber-500/30", idle: "bg-amber-500/5 text-amber-400 hover:bg-amber-500/15" },
              approved: { active: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30", idle: "bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15" },
              reviewed: { active: "bg-violet-500 text-white shadow-lg shadow-violet-500/30", idle: "bg-violet-500/5 text-violet-400 hover:bg-violet-500/15" },
              rejected: { active: "bg-rose-500 text-white shadow-lg shadow-rose-500/30",   idle: "bg-rose-500/5 text-rose-400 hover:bg-rose-500/15" },
            };
            return (
              <motion.button key={f} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}
                onClick={() => { setStatusFilter(f); setSelectedIds(new Set()); }}
                className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold capitalize transition-all flex items-center gap-2 ${isActive ? colorMap[f].active : colorMap[f].idle}`}>
                <span>{f}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${isActive ? "bg-white/25" : "bg-white/10"}`}>{counts[f]}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Success / Error Banners */}
        <AnimatePresence>
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-6">
              <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-400 font-semibold text-sm">{successMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
            <p className="text-red-400 font-semibold text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
          </motion.div>
        )}

        {loading && <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" /></div>}

        {/* Bulk action bar */}
        {!loading && selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3 border border-emerald-500/20">
            <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{selectedIds.size} selected</p>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setSelectedIds(new Set())} className="text-sm px-4 py-2 text-zinc-400 hover:text-white transition-colors">Clear</button>
              <button onClick={() => setShowBulkNotes(!showBulkNotes)} className="text-sm px-4 py-2 bg-white/5 hover:bg-white/10 font-semibold rounded-lg transition-all" style={{ color: "var(--foreground)" }}>{showBulkNotes ? "Hide" : "Add"} Notes</button>
              <button onClick={handleBulkApprove} disabled={bulkLoading} className="text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-2">
                {bulkLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                Approve Selected
              </button>
            </div>
          </motion.div>
        )}
        {showBulkNotes && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-card rounded-2xl p-4 mb-6">
            <label className="block text-sm font-semibold text-zinc-400 mb-2">Notes (applied to all selected records)</label>
            <textarea value={bulkNotes} onChange={(e) => setBulkNotes(e.target.value)} placeholder="e.g., Reviewed and approved. Standard treatment protocol." rows={3}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all resize-none" style={{ color: "var(--foreground)" }} />
          </motion.div>
        )}

        {/* Records List */}
        {!loading && records.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 glass-card rounded-xl">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                {selectedIds.size === records.length ? <CheckSquare size={20} className="text-emerald-400" /> : <Square size={20} />}
                <span className="font-semibold">{selectedIds.size === records.length ? "Deselect All" : "Select All"}</span>
              </button>
              <p className="text-xs text-zinc-500 ml-auto">Sorted by confidence (highest first)</p>
            </div>

            {records.map((record, idx) => {
              const sc = STATUS_CONFIG[record.status] ?? STATUS_CONFIG.pending;
              const patientName = record.first_name && record.last_name
                ? `${record.first_name} ${record.last_name}`
                : patientMap[record.patient_id] || record.patient_email || "Unknown Patient";
              const isRejecting = rejectingId === record.id;
              const notesExpanded = expandedNotes.has(record.id);

              return (
                <motion.div key={record.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                  className={`glass-card rounded-2xl p-6 border transition-all ${selectedIds.has(record.id) ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/[0.08]"}`}>
                  <div className="flex items-start gap-4">
                    <button onClick={() => toggleSelect(record.id)} className="mt-1 flex-shrink-0">
                      {selectedIds.has(record.id) ? <CheckSquare size={20} className="text-emerald-400" /> : <Square size={20} className="text-zinc-500 hover:text-zinc-300 transition-colors" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Top row: title + status badge */}
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold truncate" style={{ color: "var(--foreground)" }}>{record.ai_prediction}</h3>
                          <p className="text-xs font-semibold text-sky-400 mt-0.5">Patient: {patientName}</p>
                          <p className="text-sm text-zinc-400 mt-0.5">{record.recommended_specialist}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className={`px-3 py-1 text-xs font-bold rounded-lg ${sc.pill}`}>{sc.label}</span>
                          <span className="text-xs text-zinc-500">{new Date(record.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Symptoms */}
                      <div className="mb-4">
                        <p className="text-xs text-zinc-500 font-semibold mb-2 uppercase tracking-wider">Symptoms</p>
                        <div className="flex flex-wrap gap-2">
                          {record.symptoms.map((s, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 bg-white/5 text-zinc-300 rounded-lg">{s}</span>
                          ))}
                        </div>
                      </div>

                      {/* Confidence Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                          <span>AI Confidence</span>
                          <span className="font-semibold">{(record.confidence_score ?? 0).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, record.confidence_score ?? 0)}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }} className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                        </div>
                      </div>

                      {/* Doctor Notes (if any) */}
                      {record.doctor_notes && (
                        <div className={`mb-4 p-3 rounded-xl text-sm border ${record.status === "rejected" ? "bg-rose-500/5 border-rose-500/20" : "bg-emerald-500/5 border-emerald-500/20"}`}>
                          <div className="flex items-center justify-between mb-1 cursor-pointer" onClick={() => {
                            const s = new Set(expandedNotes);
                            s.has(record.id) ? s.delete(record.id) : s.add(record.id);
                            setExpandedNotes(s);
                          }}>
                            <span className={`text-xs font-bold uppercase tracking-wider ${record.status === "rejected" ? "text-rose-400" : "text-emerald-400"}`}>
                              {record.status === "rejected" ? "Rejection Reason" : "Doctor Notes"}
                            </span>
                            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${notesExpanded ? "rotate-180" : ""}`} />
                          </div>
                          <AnimatePresence>
                            {notesExpanded && (
                              <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="text-zinc-400 text-sm leading-relaxed overflow-hidden">
                                {record.doctor_notes}
                              </motion.p>
                            )}
                          </AnimatePresence>
                          {!notesExpanded && <p className="text-zinc-500 text-xs truncate">{record.doctor_notes}</p>}
                        </div>
                      )}

                      {/* Inline Reject Panel */}
                      <AnimatePresence>
                        {isRejecting && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            className="mb-4 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-3">
                            <p className="text-sm font-bold text-rose-400">Reason for rejection <span className="text-rose-500">*</span></p>
                            <p className="text-xs text-zinc-500">This note will be visible to the patient explaining why their record was rejected.</p>
                            <textarea
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                              placeholder="e.g., Insufficient symptom data. Please provide more details about duration and severity..."
                              rows={3}
                              autoFocus
                              className="w-full px-3 py-2.5 bg-white/5 border border-rose-500/30 rounded-lg text-sm placeholder-zinc-600 focus:outline-none focus:border-rose-500 resize-none transition-all"
                              style={{ color: "var(--foreground)" }}
                            />
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleReject(record.id)} disabled={rejectLoading || !rejectNote.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-all">
                                {rejectLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <X size={15} />}
                                Confirm Reject
                              </button>
                              <button onClick={() => { setRejectingId(null); setRejectNote(""); }}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold rounded-lg text-sm transition-all">
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => handleApprove(record.id)} disabled={record.status === "approved"}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-all">
                            <Check size={15} />Approve
                          </button>
                          <button
                            onClick={() => { setRejectingId(isRejecting ? null : record.id); setRejectNote(record.doctor_notes || ""); }}
                            disabled={record.status === "rejected"}
                            className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-lg text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isRejecting ? "bg-rose-500/30 text-rose-300 border border-rose-500/50" : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"}`}>
                            <X size={15} />Reject{isRejecting ? " (cancel)" : ""}
                          </button>
                          <button onClick={() => handleMarkReviewed(record.id)} disabled={record.status === "reviewed"}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-violet-400 font-semibold rounded-lg text-sm border border-violet-500/20 transition-all">
                            <RotateCcw size={15} />Mark Reviewed
                          </button>
                          <button onClick={() => router.push(`/dashboard/records/${record.id}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold rounded-lg text-sm transition-all">
                            <Eye size={15} />View Details
                          </button>
                        </div>

                        {/* AI Accuracy Feedback */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/10 flex-wrap">
                          <span className="text-xs text-zinc-500 font-semibold">AI Accuracy:</span>
                          {(["correct", "partial", "incorrect"] as const).map((fb) => {
                            const active = record.accuracy_feedback === fb;
                            const colors = {
                              correct:   { base: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20", active: "bg-emerald-500/30 text-emerald-300 border-emerald-500/50" },
                              partial:   { base: "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",    active: "bg-amber-500/30 text-amber-300 border-amber-500/50" },
                              incorrect: { base: "bg-red-500/10 text-red-400 hover:bg-red-500/20",          active: "bg-red-500/30 text-red-300 border-red-500/50" },
                            };
                            return (
                              <button key={fb} onClick={() => handleFeedback(record.id, fb)}
                                className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all capitalize ${active ? colors[fb].active + " border" : colors[fb].base + " border-transparent"}`}>
                                {fb}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {!loading && records.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-16 text-center border border-white/[0.08]">
            <FileCheck size={56} className="mx-auto text-emerald-500/40 mb-4" />
            <p className="text-lg font-bold" style={{ color: "var(--foreground)" }}>All caught up!</p>
            <p className="text-zinc-500 text-sm mt-2">{statusFilter === "all" ? "No records found" : `No ${statusFilter} records`}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <ProtectedRoute requiredRole="DOCTOR">
      <ApprovalsContent />
    </ProtectedRoute>
  );
}
