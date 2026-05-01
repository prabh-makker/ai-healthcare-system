"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Users,
  ShieldCheck,
  TrendingUp,
  Search,
  Bell,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Clock,
  ClipboardList,
  HeartPulse,
  Pill,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface Stats {
  total_records: number;
  total_patients: number;
  total_doctors: number;
  recent_records: Array<{
    id: string;
    patient_id: string;
    ai_prediction: string | null;
    confidence_score: number | null;
    recommended_specialist: string | null;
    symptoms: string[];
    created_at: string | null;
  }>;
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  trend,
  color,
  delay,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend: string;
  color: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    whileHover={{ y: -8, scale: 1.02 }}
    transition={{ type: "spring", stiffness: 100, damping: 15, delay: delay || 0 }}
    className="group relative overflow-hidden rounded-[2rem] p-6 glass-card border border-white/[0.08] hover:border-white/[0.15]"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 -z-10`} />
    <div className="flex justify-between items-start mb-4">
      <motion.div
        className={`p-3 rounded-2xl ${color.replace("text-", "bg-")} bg-opacity-10 group-hover:bg-opacity-20 transition-all`}
        whileHover={{ rotate: 10, scale: 1.1 }}
      >
        <Icon size={26} className={color.replace("bg-", "text-")} />
      </motion.div>
      <motion.div
        className={`flex items-center space-x-1.5 text-xs font-black px-2 py-1 rounded-lg ${
          trend.startsWith("+") ? "bg-emerald-500/10 text-emerald-400" : "bg-sky-500/10 text-sky-400"
        }`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: (delay || 0) + 0.2, type: "spring" }}
      >
        <span>{trend}</span>
        <ArrowUpRight size={12} />
      </motion.div>
    </div>
    <p className="text-zinc-600 text-xs font-black uppercase tracking-[0.15em]">{label}</p>
    <motion.h3
      className="text-4xl font-black mt-2 tracking-tight"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (delay || 0) + 0.1 }}
    >
      {value}
    </motion.h3>
  </motion.div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const isDoctor = user?.role === "DOCTOR";
  const isPatient = user?.role === "PATIENT";

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);

  const DoctorDashboard = () => (
    <>
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-16"
      >
        <div>
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-sky-200 via-blue-400 to-cyan-500 bg-clip-text text-transparent">
            Clinical Dashboard
          </h1>
          <p className="text-zinc-500 mt-3 font-bold text-base">
            Welcome back, Dr. {user?.email?.split("@")[0] || "Physician"}
          </p>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center glass-card px-4 py-2.5 rounded-2xl text-zinc-400 focus-within:text-white transition-colors">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search patient ID..."
              className="bg-transparent border-none outline-none ml-3 text-sm w-48 font-medium"
            />
          </div>

          <div className="relative glass-card p-2.5 rounded-2xl text-zinc-400 hover:text-white cursor-pointer transition-all">
            <Bell size={20} />
            <div className="absolute top-2 right-2 w-2 h-2 bg-sky-500 rounded-full ring-4 ring-[#050505]" />
          </div>

          <Link
            href="/dashboard/symptoms"
            className="bg-sky-500 hover:bg-sky-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl shadow-sky-500/20 active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Initiate Triage</span>
          </Link>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <StatCard
          label="Total Patients"
          value={stats ? String(stats.total_patients) : "..."}
          icon={Users}
          trend="+active"
          color="bg-sky-500"
          delay={0}
        />
        <StatCard
          label="Medical Records"
          value={stats ? String(stats.total_records) : "..."}
          icon={Activity}
          trend="+records"
          color="bg-violet-500"
          delay={0.1}
        />
        <StatCard
          label="Model Precision"
          value="98.4%"
          icon={ShieldCheck}
          trend="+1.2%"
          color="bg-emerald-500"
          delay={0.2}
        />
        <StatCard
          label="Doctors Active"
          value={stats ? String(stats.total_doctors) : "..."}
          icon={TrendingUp}
          trend="+staff"
          color="bg-amber-500"
          delay={0.3}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-8"
      >
        <section className="xl:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-sky-200 to-blue-300 bg-clip-text text-transparent">
              Recent Diagnostic Records
            </h2>
            <Link
              href="/dashboard/records"
              className="text-sky-500 text-sm font-bold hover:text-sky-400 flex items-center space-x-1 group"
            >
              <span>View All Records</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="glass-card rounded-[2.5rem] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Diagnosis
                  </th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Symptoms
                  </th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Confidence
                  </th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats?.recent_records && stats.recent_records.length > 0 ? (
                  stats.recent_records.map((record) => (
                    <tr key={record.id} className="group hover:bg-white/[0.03] transition-colors">
                      <td className="px-8 py-6 font-bold text-zinc-200">
                        {record.ai_prediction || "Pending"}
                      </td>
                      <td className="px-8 py-6 text-zinc-400 font-medium text-sm">
                        {record.symptoms?.slice(0, 3).join(", ") || "-"}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${record.confidence_score || 0}%` }}
                              className="h-full bg-sky-500"
                            />
                          </div>
                          <span className="text-xs font-bold">
                            {record.confidence_score ? `${record.confidence_score}%` : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-zinc-500 text-sm">
                        {record.created_at
                          ? new Date(record.created_at).toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-zinc-500">
                      No diagnostic records yet. Start by running a symptom analysis.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-8">AI Insights</h2>
          <div className="glass-card rounded-[2.5rem] p-8 space-y-6">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
              <h4 className="font-bold mb-2">System Status</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                All diagnostic engines are online and operating at peak efficiency. ML model loaded
                and ready for inference.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
              <h4 className="font-bold mb-2">Quick Actions</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Use the sidebar to navigate to Diagnostics, Patient Registry, or Medical Records.
              </p>
            </div>
            <Link
              href="/dashboard/symptoms"
              className="w-full py-4 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 font-bold transition-all block text-center text-sky-400"
            >
              New Diagnostic Analysis
            </Link>
          </div>
        </section>
      </motion.div>
    </>
  );

  const PatientDashboard = () => (
    <>
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-16"
      >
        <div>
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-rose-200 via-pink-400 to-red-500 bg-clip-text text-transparent">
            My Health Portal
          </h1>
          <p className="text-zinc-500 mt-3 font-bold text-base">
            Welcome back, {user?.email?.split("@")[0] || "Patient"}
          </p>
        </div>

        <div className="flex items-center space-x-6">
          <div className="relative glass-card p-2.5 rounded-2xl text-zinc-400 hover:text-white cursor-pointer transition-all">
            <Bell size={20} />
            <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-4 ring-[#050505]" />
          </div>

          <Link
            href="/dashboard/symptoms"
            className="bg-rose-500 hover:bg-rose-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl shadow-rose-500/20 active:scale-95"
          >
            <Activity size={20} strokeWidth={3} />
            <span>Check Symptoms</span>
          </Link>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <StatCard
          label="My Health Score"
          value="Good"
          icon={HeartPulse}
          trend="+stable"
          color="bg-rose-500"
          delay={0}
        />
        <StatCard
          label="Medical Records"
          value={stats ? String(stats.recent_records.filter(r => r.patient_id === user?.id).length) : "..."}
          icon={ClipboardList}
          trend="+latest"
          color="bg-violet-500"
          delay={0.1}
        />
        <StatCard
          label="Appointments"
          value="1"
          icon={Clock}
          trend="tomorrow"
          color="bg-emerald-500"
          delay={0.2}
        />
        <StatCard
          label="Medications"
          value="2 Active"
          icon={Pill}
          trend="on track"
          color="bg-amber-500"
          delay={0.3}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-8"
      >
        <section className="xl:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-rose-200 to-pink-300 bg-clip-text text-transparent">
              Recent Diagnoses
            </h2>
            <Link
              href="/dashboard/records"
              className="text-rose-500 text-sm font-bold hover:text-rose-400 flex items-center space-x-1 group"
            >
              <span>View All Records</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="glass-card rounded-[2.5rem] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    AI Prediction
                  </th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Specialist Recommended
                  </th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Confidence
                  </th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats?.recent_records && stats.recent_records.some(r => r.patient_id === user?.id) ? (
                  stats.recent_records.filter(r => r.patient_id === user?.id).map((record) => (
                    <tr key={record.id} className="group hover:bg-white/[0.03] transition-colors">
                      <td className="px-8 py-6 font-bold text-zinc-200">
                        {record.ai_prediction || "Pending"}
                      </td>
                      <td className="px-8 py-6 text-zinc-400 font-medium text-sm">
                        {record.recommended_specialist || "General Physician"}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${record.confidence_score || 0}%` }}
                              className="h-full bg-rose-500"
                            />
                          </div>
                          <span className="text-xs font-bold">
                            {record.confidence_score ? `${record.confidence_score}%` : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-zinc-500 text-sm">
                        {record.created_at
                          ? new Date(record.created_at).toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-zinc-500">
                      No records found. Run a symptom check to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-8">Health Insights</h2>
          <div className="glass-card rounded-[2.5rem] p-8 space-y-6">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
              <h4 className="font-bold mb-2">AI Health Tip</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Based on your recent activity, maintaining regular hydration and monitoring your sleep
                patterns will further improve your health score.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
              <h4 className="font-bold mb-2">Next Steps</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Review your recent diagnoses and book an appointment with the recommended specialist
                if symptoms persist.
              </p>
            </div>
            <Link
              href="/dashboard/symptoms"
              className="w-full py-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 font-bold transition-all block text-center text-rose-400"
            >
              Analyze New Symptoms
            </Link>
          </div>
        </section>
      </motion.div>
    </>
  );

  return isDoctor ? <DoctorDashboard /> : <PatientDashboard />;
}
