"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Calendar, ClipboardList, CheckCircle, TrendingUp, AlertCircle, Pill, Award,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";
import { StatCard } from "@/components/StatCard";

interface DoctorStats {
  total_patients: number;
  total_appointments: number;
  pending_approvals: number;
  completed_consultations: number;
  prescriptions_issued: number;
  records_reviewed: number;
}

function DoctorStatsContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Fetch patient count
        const patients = await api.getMyPatients(0, 1000);
        const appointments = await api.getAppointments(0, 1000);
        const records = await api.getRecords(0, 1000);
        const prescriptions = await api.getPrescriptions(0, 1000);

        // Calculate stats
        const pendingRecords = records.filter((r: any) => r.status === "pending");
        const completedRecords = records.filter((r: any) => r.status === "approved");
        const activePrescriptions = prescriptions.filter((p: any) => p.status === "active");
        const completedAppointments = appointments.filter((a: any) => a.status === "completed");

        setStats({
          total_patients: patients.length,
          total_appointments: appointments.length,
          pending_approvals: pendingRecords.length,
          completed_consultations: completedAppointments.length,
          prescriptions_issued: activePrescriptions.length,
          records_reviewed: completedRecords.length,
        });
      } catch (err: any) {
        console.error("Error fetching doctor stats:", err);
        setError("Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const successRate = stats && stats.total_appointments > 0
    ? Math.round((stats.completed_consultations / stats.total_appointments) * 100)
    : 0;

  const approvalRate = stats && stats.total_appointments > 0
    ? Math.round((stats.records_reviewed / (stats.records_reviewed + stats.pending_approvals)) * 100)
    : 0;

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#0ea5e9" />

      <div className="relative z-10 p-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 pt-8"
        >
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: 'white' }}>
            Doctor Dashboard
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            {user?.email} — Your performance metrics and patient overview
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
          >
            <AlertCircle size={20} className="text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : stats ? (
          <div className="space-y-8">
            {/* Stats Cards Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <StatCard
                label="Total Patients"
                value={stats.total_patients.toString()}
                icon={Users}
                color="sky"
                gradient="from-sky-500 to-blue-600"
                delay={0}
              />
              <StatCard
                label="Appointments"
                value={stats.total_appointments.toString()}
                icon={Calendar}
                color="rose"
                gradient="from-rose-500 to-pink-600"
                delay={0.1}
              />
              <StatCard
                label="Active Prescriptions"
                value={stats.prescriptions_issued.toString()}
                icon={Pill}
                color="violet"
                gradient="from-violet-500 to-purple-600"
                delay={0.2}
              />
              <StatCard
                label="Pending Approvals"
                value={stats.pending_approvals.toString()}
                icon={AlertCircle}
                color="rose"
                gradient="from-rose-500 to-pink-600"
                delay={0.3}
              />
              <StatCard
                label="Records Reviewed"
                value={stats.records_reviewed.toString()}
                icon={CheckCircle}
                color="emerald"
                gradient="from-emerald-500 to-teal-600"
                delay={0.4}
              />
              <StatCard
                label="Completed Consultations"
                value={stats.completed_consultations.toString()}
                icon={Award}
                color="cyan"
                gradient="from-cyan-500 to-blue-600"
                delay={0.5}
              />
            </motion.div>

            {/* Performance Report Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Success Rate Card */}
              <div className="glass-card rounded-2xl p-8 border border-white/[0.08]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
                      Success Rate
                    </p>
                    <h3 className="text-5xl font-black tracking-tight text-sky-400">
                      {successRate}%
                    </h3>
                    <p className="text-zinc-600 text-sm mt-2">
                      {stats.completed_consultations} of {stats.total_appointments} appointments completed
                    </p>
                  </div>
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center border border-sky-500/20">
                    <TrendingUp className="w-12 h-12 text-sky-400" />
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-zinc-600">
                    Keep up excellent work! Maintain or improve your success rate.
                  </p>
                </div>
              </div>

              {/* Approval Rate Card */}
              <div className="glass-card rounded-2xl p-8 border border-white/[0.08]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
                      Approval Rate
                    </p>
                    <h3 className="text-5xl font-black tracking-tight text-emerald-400">
                      {approvalRate}%
                    </h3>
                    <p className="text-zinc-600 text-sm mt-2">
                      {stats.records_reviewed} records approved, {stats.pending_approvals} pending
                    </p>
                  </div>
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle className="w-12 h-12 text-emerald-400" />
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-zinc-600">
                    {stats.pending_approvals === 0
                      ? "All records approved! 🎉"
                      : `Review ${stats.pending_approvals} pending records to improve your rate.`}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Summary Report */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="glass-card rounded-2xl p-8 border border-white/[0.08]"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Performance Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-zinc-400 text-sm mb-2">Patient Care Load</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-blue-500"
                          style={{ width: `${Math.min((stats.total_patients / 50) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-sky-400">{stats.total_patients} patients</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm mb-2">Active Prescriptions</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                          style={{ width: `${Math.min((stats.prescriptions_issued / 100) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-amber-400">{stats.prescriptions_issued}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-zinc-400 text-sm mb-2">Pending Work</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-rose-500"
                          style={{ width: `${Math.min((stats.pending_approvals / 20) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-red-400">{stats.pending_approvals} records</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm mb-2">Review Completion</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                          style={{ width: `${approvalRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-emerald-400">{approvalRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function DoctorStatsPage() {
  return (
    <ProtectedRoute requiredRole={["DOCTOR", "ADMIN"]}>
      <DoctorStatsContent />
    </ProtectedRoute>
  );
}
