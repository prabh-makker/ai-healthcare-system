"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Heart, TrendingUp, Calendar, User, AlertCircle, CheckCircle, Trash2, Edit3 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import DashboardBg from "@/components/DashboardBg";

interface ReportDetail {
  id: string;
  patient_id: string;
  doctor_id?: string | null;
  ai_prediction: string | null;
  confidence_score: number | null;
  recommended_specialist: string | null;
  symptoms: string[];
  created_at: string | null;
  status?: string;
  doctor_notes?: string | null;
}

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const recordId = params.id as string;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDoctor] = useState(user?.role === "DOCTOR");
  const [notesText, setNotesText] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!recordId) return;

    api.getRecord(recordId)
      .then((data) => {
        setReport(data as ReportDetail);
        setNotesText((data as ReportDetail).doctor_notes || "");
        setError(null);
      })
      .catch((err) => {
        setError("Failed to load report details");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [recordId]);

  const handleApprove = async () => {
    if (!report) return;
    setActionLoading(true);
    try {
      const updated = await api.patchRecord(report.id, { status: "approved" });
      setReport(updated);
    } catch (err) {
      console.error(err);
    }
    setActionLoading(false);
  };

  const handleSaveNotes = async () => {
    if (!report) return;
    setActionLoading(true);
    try {
      const updated = await api.patchRecord(report.id, { doctor_notes: notesText });
      setReport(updated);
      setEditingNotes(false);
    } catch (err) {
      console.error(err);
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!report) return;
    setActionLoading(true);
    try {
      await api.deleteRecord(report.id);
      router.back();
    } catch (err) {
      console.error(err);
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="relative min-h-full">
        <DashboardBg accentColor="#8b5cf6" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="relative min-h-full">
        <DashboardBg accentColor="#8b5cf6" />
        <div className="relative z-10 p-8">
          <motion.button
            whileHover={{ x: -4 }}
            onClick={() => router.back()}
            className="flex items-center gap-2 text-violet-400 hover:text-violet-300 mb-8 font-medium"
          >
            <ArrowLeft size={20} />
            Back to Records
          </motion.button>
          <div className="glass-card rounded-[2rem] p-8 border border-white/[0.08] text-center">
            <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
            <p className="text-zinc-300 font-semibold">{error || "Report not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const confidenceLevel = (report.confidence_score ?? 0) > 80 ? "High" : "Moderate";
  const confidenceColor = (report.confidence_score ?? 0) > 80 ? "emerald" : "amber";

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#8b5cf6" />

      <div className="relative z-10 p-8">
        <motion.button
          whileHover={{ x: -4 }}
          onClick={() => router.back()}
          className="flex items-center gap-2 text-violet-400 hover:text-violet-300 mb-8 font-medium"
        >
          <ArrowLeft size={20} />
          Back to Records
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="glass-card rounded-[2rem] p-8 border border-white/[0.08] mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-br from-violet-200 via-violet-400 to-indigo-500 bg-clip-text text-transparent mb-2">
                  {report.ai_prediction || "Diagnostic Report"}
                </h1>
                <p className="text-zinc-500 font-medium">Report ID: {report.id.slice(0, 12)}…</p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
                  <FileText size={32} className="text-white" />
                </div>
                <div className="flex items-center gap-2">
                  {report.status === "approved" && (
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/40">
                      <CheckCircle size={14} /> Approved
                    </span>
                  )}
                  {report.status === "pending" && (
                    <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/40">
                      Pending Review
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Doctor Actions */}
            {isDoctor && (
              <div className="flex gap-3 mb-6 pb-6 border-b border-white/5">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleApprove}
                  disabled={actionLoading || report.status === "approved"}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-50 font-semibold text-sm"
                >
                  <CheckCircle size={16} />
                  Approve
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setEditingNotes(!editingNotes)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30 font-semibold text-sm"
                >
                  <Edit3 size={16} />
                  Add Notes
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDeletingRecord(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 font-semibold text-sm"
                >
                  <Trash2 size={16} />
                  Delete
                </motion.button>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Confidence Score */}
              <div className={`bg-${confidenceColor}-500/10 border border-${confidenceColor}-500/20 rounded-xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className={`text-${confidenceColor}-400`} />
                  <span className={`text-${confidenceColor}-400 text-sm font-semibold`}>Confidence</span>
                </div>
                <div className="text-3xl font-black text-white">
                  {report.confidence_score != null ? `${report.confidence_score.toFixed(1)}%` : "—"}
                </div>
                <p className={`text-${confidenceColor}-400/70 text-xs mt-1`}>{confidenceLevel} confidence</p>
              </div>

              {/* Recommended Specialist */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User size={16} className="text-blue-400" />
                  <span className="text-blue-400 text-sm font-semibold">Specialist</span>
                </div>
                <div className="text-xl font-black text-white">
                  {report.recommended_specialist || "General"}
                </div>
                <p className="text-blue-400/70 text-xs mt-1">Recommended specialist</p>
              </div>

              {/* Date */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} className="text-purple-400" />
                  <span className="text-purple-400 text-sm font-semibold">Date</span>
                </div>
                <div className="text-lg font-black text-white">
                  {report.created_at ? new Date(report.created_at).toLocaleDateString() : "—"}
                </div>
                <p className="text-purple-400/70 text-xs mt-1">Diagnosis date</p>
              </div>
            </div>
          </div>

          {/* Doctor Notes */}
          {(isDoctor || report.doctor_notes) && (
            <div className="glass-card rounded-[2rem] p-8 border border-white/[0.08] mb-6">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                <Edit3 size={20} className="text-blue-400" />
                <span className="text-white">Doctor Notes</span>
              </h2>
              {editingNotes ? (
                <div className="space-y-3">
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Add clinical notes..."
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 resize-none h-32"
                  />
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSaveNotes}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-50"
                    >
                      Save Notes
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setEditingNotes(false);
                        setNotesText(report?.doctor_notes || "");
                      }}
                      className="px-4 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-300 leading-relaxed">
                  {report.doctor_notes || <span className="text-zinc-500 italic">No notes added yet</span>}
                </p>
              )}
            </div>
          )}

          {/* Patient Delete Button */}
          {!isDoctor && (
            <div className="mb-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDeletingRecord(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 font-semibold text-sm"
              >
                <Trash2 size={16} />
                Delete Record
              </motion.button>
            </div>
          )}

          {/* Symptoms */}
          <div className="glass-card rounded-[2rem] p-8 border border-white/[0.08] mb-6">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/20">
                <Heart size={20} className="text-white" />
              </div>
              <span className="bg-gradient-to-r from-pink-200 to-rose-300 bg-clip-text text-transparent">
                Reported Symptoms
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {report.symptoms.length > 0 ? (
                report.symptoms.map((symptom, idx) => (
                  <motion.div
                    key={symptom}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.08 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.08] transition-colors"
                  >
                    <p className="text-white font-semibold capitalize">
                      {symptom.replace(/_/g, " ")}
                    </p>
                  </motion.div>
                ))
              ) : (
                <p className="text-zinc-500 col-span-full text-center py-8">No symptoms recorded</p>
              )}
            </div>
          </div>

          {/* Diagnosis Details */}
          <div className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
                <AlertCircle size={20} className="text-white" />
              </div>
              <span className="bg-gradient-to-r from-violet-200 to-purple-300 bg-clip-text text-transparent">
                Diagnosis Details
              </span>
            </h2>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm uppercase tracking-widest text-zinc-500 font-semibold mb-2">
                  Primary Diagnosis
                </h3>
                <p className="text-2xl font-black text-white">
                  {report.ai_prediction || "Pending Review"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-sm uppercase tracking-widest text-zinc-500 font-semibold mb-2">
                    Confidence Level
                  </h3>
                  <div className="flex items-end gap-3">
                    <div className="text-3xl font-black text-white">
                      {report.confidence_score != null ? report.confidence_score.toFixed(1) : "—"}
                      <span className="text-lg text-zinc-500">%</span>
                    </div>
                    <div className="flex-1 h-20 bg-zinc-800 rounded-lg overflow-hidden mb-1">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${report.confidence_score ?? 0}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="w-full rounded-lg"
                        style={{
                          background: `linear-gradient(180deg, #8b5cf6, #a78bfa)`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-sm uppercase tracking-widest text-zinc-500 font-semibold mb-2">
                    Recommended Specialist
                  </h3>
                  <p className="text-2xl font-black text-white">
                    {report.recommended_specialist || "General"}
                  </p>
                  <p className="text-zinc-500 text-xs mt-2">Consult this specialist for further evaluation</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Delete Confirmation Modal */}
        {deletingRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card rounded-[2rem] p-8 border border-white/[0.08] max-w-md w-full mx-4"
            >
              <h3 className="text-2xl font-black text-white mb-3">Delete Record?</h3>
              <p className="text-zinc-400 mb-6">
                This action cannot be undone. The diagnostic record will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 disabled:opacity-50"
                >
                  {actionLoading ? "Deleting..." : "Delete"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDeletingRecord(false)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 disabled:opacity-50"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
