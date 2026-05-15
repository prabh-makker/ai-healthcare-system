"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Activity, Pill, FileText } from "lucide-react";
import { api } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";
import SimpleBarChart from "@/components/charts/SimpleBarChart";
import SimpleDonutChart from "@/components/charts/SimpleDonutChart";

function AnalyticsContent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    records: [],
    prescriptions: [],
    appointments: [],
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [records, prescriptions, appointments] = await Promise.all([
          api.getRecords(0, 100).catch(() => []),
          api.getPrescriptions(0, 100).catch(() => []),
          api.getAppointments(0, 100).catch(() => []),
        ]);
        setData({ records, prescriptions, appointments });
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Process: Records by status
  const recordsByStatus = {
    pending: data.records.filter((r: any) => r.status === "pending").length,
    approved: data.records.filter((r: any) => r.status === "approved").length,
    reviewed: data.records.filter((r: any) => r.status === "reviewed").length,
  };

  // Process: Prescriptions by status
  const prescriptionsByStatus = {
    active: data.prescriptions.filter((p: any) => p.status === "active").length,
    completed: data.prescriptions.filter((p: any) => p.status === "completed").length,
    discontinued: data.prescriptions.filter((p: any) => p.status === "discontinued").length,
  };

  // Process: Top diagnoses
  const diagnosesCounts: { [key: string]: number } = {};
  data.records.forEach((r: any) => {
    if (r.ai_prediction) {
      diagnosesCounts[r.ai_prediction] = (diagnosesCounts[r.ai_prediction] || 0) + 1;
    }
  });
  const topDiagnoses = Object.entries(diagnosesCounts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Process: Top medications
  const medsCounts: { [key: string]: number } = {};
  data.prescriptions.forEach((p: any) => {
    if (p.medication_name) {
      medsCounts[p.medication_name] = (medsCounts[p.medication_name] || 0) + 1;
    }
  });
  const topMeds = Object.entries(medsCounts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#8b5cf6" />

      <div className="relative z-10 p-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-purple-200 via-violet-400 to-fuchsia-500 bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            Insights into your healthcare data
          </p>
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && (
          <>
            {/* Stat Cards Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
            >
              <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/10">
                    <FileText size={20} className="text-sky-400" />
                  </div>
                </div>
                <p className="text-3xl font-black text-white">{data.records.length}</p>
                <p className="text-sm text-zinc-500 mt-1">Medical Records</p>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10">
                    <Pill size={20} className="text-amber-400" />
                  </div>
                </div>
                <p className="text-3xl font-black text-white">{data.prescriptions.length}</p>
                <p className="text-sm text-zinc-500 mt-1">Prescriptions</p>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10">
                    <Activity size={20} className="text-rose-400" />
                  </div>
                </div>
                <p className="text-3xl font-black text-white">{data.appointments.length}</p>
                <p className="text-sm text-zinc-500 mt-1">Appointments</p>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10">
                    <BarChart3 size={20} className="text-emerald-400" />
                  </div>
                </div>
                <p className="text-3xl font-black text-white">{prescriptionsByStatus.active}</p>
                <p className="text-sm text-zinc-500 mt-1">Active Meds</p>
              </div>
            </motion.div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <SimpleDonutChart
                  title="Records by Status"
                  centerLabel="Records"
                  data={[
                    { label: "Approved", value: recordsByStatus.approved, color: "#10b981" },
                    { label: "Pending", value: recordsByStatus.pending, color: "#f59e0b" },
                    { label: "Reviewed", value: recordsByStatus.reviewed, color: "#0ea5e9" },
                  ]}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <SimpleDonutChart
                  title="Prescription Status"
                  centerLabel="Prescriptions"
                  data={[
                    { label: "Active", value: prescriptionsByStatus.active, color: "#10b981" },
                    { label: "Completed", value: prescriptionsByStatus.completed, color: "#71717a" },
                    { label: "Discontinued", value: prescriptionsByStatus.discontinued, color: "#f43f5e" },
                  ]}
                />
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <SimpleBarChart
                  title="Top Diagnoses"
                  data={topDiagnoses.length > 0 ? topDiagnoses : [{ label: "No data yet", value: 0 }]}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <SimpleBarChart
                  title="Top Medications"
                  data={topMeds.length > 0 ? topMeds.map((m) => ({ ...m, color: "from-amber-500 to-orange-500" })) : [{ label: "No data yet", value: 0 }]}
                />
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}
