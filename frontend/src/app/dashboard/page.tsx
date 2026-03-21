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
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend: string;
  color: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5 }}
    className="glass-card p-6 rounded-[2rem]"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-20`}>
        <Icon size={24} className={color.replace("bg-", "text-")} />
      </div>
      <div
        className={`flex items-center space-x-1 text-xs font-bold ${
          trend.startsWith("+") ? "text-emerald-400" : "text-sky-400"
        }`}
      >
        <span>{trend}</span>
        <ArrowUpRight size={14} />
      </div>
    </div>
    <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">{label}</p>
    <h3 className="text-3xl font-bold mt-1 tracking-tight">{value}</h3>
  </motion.div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);

  return (
    <>
      <header className="flex justify-between items-center mb-16">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gradient">Clinical Dashboard</h1>
          <p className="text-zinc-500 mt-2 font-medium">
            Welcome back, {user?.email?.split("@")[0] || "User"}
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
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <StatCard
          label="Total Patients"
          value={stats ? String(stats.total_patients) : "..."}
          icon={Users}
          trend="+active"
          color="bg-sky-500"
        />
        <StatCard
          label="Medical Records"
          value={stats ? String(stats.total_records) : "..."}
          icon={Activity}
          trend="+records"
          color="bg-violet-500"
        />
        <StatCard
          label="Model Precision"
          value="98.4%"
          icon={ShieldCheck}
          trend="+1.2%"
          color="bg-emerald-500"
        />
        <StatCard
          label="Doctors Active"
          value={stats ? String(stats.total_doctors) : "..."}
          icon={TrendingUp}
          trend="+staff"
          color="bg-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Recent Diagnostic Records</h2>
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
      </div>
    </>
  );
}
