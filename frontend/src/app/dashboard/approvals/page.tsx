"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X, AlertCircle, Check, Square, CheckSquare, Eye, FileCheck } from "lucide-react";
import { api, APIError } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";

interface PendingRecord {
  id: string;
  patient_id: string;
  symptoms: string[];
  ai_prediction: string;
  confidence_score: number;
  recommended_specialist: string;
  status: string;
  created_at: string;
  doctor_notes?: string;
}

function ApprovalsContent() {
  const router = useRouter();
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkNotes, setShowBulkNotes] = useState(false);
  const [bulkNotes, setBulkNotes] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchPendingRecords = async () => {
    try {
      setLoading(true);
      const data = await api.getPendingRecords(0, 100);
      setRecords(data);
      setError(null);
    } catch (err: any) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError("Failed to load pending records");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRecords();
  }, []);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map((r) => r.id)));
    }
  };

  const handleQuickApprove = async (id: string) => {
    try {
      await api.patchRecord(id, { status: "approved" });
      setSuccessMsg("Record approved successfully");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchPendingRecords();
    } catch (err: any) {
      setError(err.message || "Failed to approve");
    }
  };

  const handleQuickReject = async (id: string) => {
    try {
      await api.patchRecord(id, { status: "reviewed" });
      setSuccessMsg("Record marked as reviewed");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchPendingRecords();
    } catch (err: any) {
      setError(err.message || "Failed to update");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    setBulkLoading(true);
    try {
      const result = await api.bulkApproveRecords(
        Array.from(selectedIds),
        bulkNotes || undefined,
        "approved"
      );
      setSuccessMsg(`Approved ${result.approved_count} of ${result.total_processed} records`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setSelectedIds(new Set());
      setBulkNotes("");
      setShowBulkNotes(false);
      fetchPendingRecords();
    } catch (err: any) {
      setError(err.message || "Failed to bulk approve");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#10b981" />

      <div className="relative z-10 p-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-emerald-200 via-green-400 to-teal-500 bg-clip-text text-transparent">
            Approval Queue
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            {records.length} pending record{records.length !== 1 ? "s" : ""} require your review
          </p>
        </motion.div>

        {/* Success Message */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-8"
            >
              <CheckCircle size={20} className="text-emerald-400" />
              <p className="text-emerald-400 font-semibold">{successMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl mb-8"
          >
            <AlertCircle size={24} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-semibold">Error</p>
              <p className="text-red-400/80 text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Action Bar (when items selected) */}
        {!loading && records.length > 0 && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 mb-8 flex items-center justify-between border border-emerald-500/20"
          >
            <p className="text-white font-semibold">
              {selectedIds.size} record{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowBulkNotes(!showBulkNotes)}
                className="text-sm px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition-all"
              >
                {showBulkNotes ? "Hide" : "Add"} Notes
              </button>
              <button
                onClick={handleBulkApprove}
                disabled={bulkLoading}
                className="text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
              >
                {bulkLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                Approve Selected
              </button>
            </div>
          </motion.div>
        )}

        {/* Bulk Notes */}
        {showBulkNotes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="glass-card rounded-2xl p-4 mb-8"
          >
            <label className="block text-sm font-semibold text-zinc-400 mb-2">
              Notes (applied to all selected records)
            </label>
            <textarea
              value={bulkNotes}
              onChange={(e) => setBulkNotes(e.target.value)}
              placeholder="e.g., Reviewed and approved. Standard treatment protocol."
              rows={3}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all resize-none"
            />
          </motion.div>
        )}

        {/* Records List */}
        {!loading && records.length > 0 && (
          <div className="space-y-4">
            {/* Select All Header */}
            <div className="flex items-center gap-3 px-4 py-3 glass-card rounded-xl">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {selectedIds.size === records.length ? (
                  <CheckSquare size={20} className="text-emerald-400" />
                ) : (
                  <Square size={20} />
                )}
                <span className="font-semibold">
                  {selectedIds.size === records.length ? "Deselect All" : "Select All"}
                </span>
              </button>
              <p className="text-xs text-zinc-500 ml-auto">
                Sorted by confidence (highest first)
              </p>
            </div>

            {records.map((record, idx) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`glass-card rounded-2xl p-6 border transition-all ${
                  selectedIds.has(record.id)
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-white/[0.08]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(record.id)}
                    className="mt-1 flex-shrink-0"
                  >
                    {selectedIds.has(record.id) ? (
                      <CheckSquare size={20} className="text-emerald-400" />
                    ) : (
                      <Square size={20} className="text-zinc-500 hover:text-zinc-300 transition-colors" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {record.ai_prediction}
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">
                          {record.recommended_specialist}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-400">
                          Pending
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(record.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Symptoms */}
                    <div className="mb-4">
                      <p className="text-xs text-zinc-500 font-semibold mb-2">
                        SYMPTOMS
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {record.symptoms.map((symptom, i) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 bg-white/5 text-zinc-300 rounded-lg"
                          >
                            {symptom}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Confidence Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                        <span>AI Confidence</span>
                        <span className="font-semibold">
                          {(record.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${record.confidence_score * 100}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleQuickApprove(record.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all text-sm"
                      >
                        <Check size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleQuickReject(record.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold rounded-lg transition-all text-sm"
                      >
                        <X size={16} />
                        Mark Reviewed
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/records/${record.id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold rounded-lg transition-all text-sm"
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && records.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-16 text-center border border-white/[0.08]"
          >
            <FileCheck size={56} className="mx-auto text-emerald-500/40 mb-4" />
            <p className="text-zinc-300 text-lg font-bold">All caught up!</p>
            <p className="text-zinc-500 text-sm mt-2">
              No pending records require your review at this time
            </p>
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
