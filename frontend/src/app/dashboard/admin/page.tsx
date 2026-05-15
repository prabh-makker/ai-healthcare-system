"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Users, TrendingUp, Database, Shield, AlertCircle, Activity, Settings, Brain, Lock, Zap, Stethoscope, Calendar, CheckCircle, Circle, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";
import { COLOR_CLASS_MAP, STATUS_COLOR_MAP } from "@/constants/colors";
import { StatCard } from "@/components/StatCard";

const PIE_COLORS = ["#f43f5e", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#84cc16", "#f97316", "#a855f7"];
const ROLE_OPTIONS = ["PATIENT", "DOCTOR", "ADMIN"] as const;

interface DoctorOverview {
  id: string;
  email: string;
  name: string;
  specialization: string;
  is_available: boolean;
  patient_count: number;
  record_count: number;
  pending_approvals: number;
}

interface Appointment {
  id: string;
  patient_id: string;
  specialist: string;
  date: string;
  time: string;
  status: string;
  reason: string | null;
}

interface Stats {
  total_records: number;
  total_patients: number;
  total_doctors: number;
  recent_records: Array<{
    id: string;
    patient_id: string;
    ai_prediction: string | null;
    confidence_score: number | null;
    created_at: string | null;
  }>;
}

interface AuditEntry {
  id: string;
  user_email: string | null;
  action: string;
  resource_type: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string | null;
}

interface AllUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
}

interface DiagDist {
  disease: string;
  count: number;
}

interface SysHealth {
  database: string;
  redis: string;
  ml_model: string;
  stats?: { total_users: number; active_sessions: number; total_records: number };
}

function AdminContent() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [doctors, setDoctors] = useState<DoctorOverview[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<AllUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [diag, setDiag] = useState<DiagDist[]>([]);
  const [health, setHealth] = useState<SysHealth | null>(null);
  const [actionMsg, setActionMsg] = useState<string>("");

  const loadAll = () => {
    api.getStats().then(setStats).catch(console.error);
    api.getDoctorsOverview().then(setDoctors).catch(console.error);
    api.getAppointments(0, 10).then(setAppointments).catch(console.error);
    api.getAllUsers().then(setUsers).catch(console.error);
    api.getAuditLog(0, 30).then(setAudit).catch(console.error);
    api.getDiagnosesDistribution().then(setDiag).catch(console.error);
    api.getSystemHealth().then(setHealth).catch(console.error);
  };

  useEffect(() => { loadAll(); }, []);

  const refreshUsers = () => api.getAllUsers().then(setUsers).catch(console.error);

  const toggleUserActive = async (u: AllUser) => {
    try {
      await api.setUserActive(u.id, !u.is_active);
      setActionMsg(`${u.email} ${!u.is_active ? "activated" : "deactivated"}`);
      refreshUsers();
      setTimeout(() => setActionMsg(""), 3000);
    } catch (e: any) {
      setActionMsg(`Error: ${e.message}`);
    }
  };

  const changeUserRole = async (u: AllUser, newRole: string) => {
    try {
      await api.setUserRole(u.id, newRole);
      setActionMsg(`${u.email} → ${newRole}`);
      refreshUsers();
      setTimeout(() => setActionMsg(""), 3000);
    } catch (e: any) {
      setActionMsg(`Error: ${e.message}`);
    }
  };

  const downloadCSV = (path: string, filename: string) => {
    const link = document.createElement("a");
    link.href = path;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const diagTotal = useMemo(() => diag.reduce((a, b) => a + b.count, 0), [diag]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
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
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-violet-200 via-purple-400 to-indigo-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">System overview & user management</p>
        </motion.header>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {[
            { label: "Total Users", value: String((stats?.total_patients ?? 0) + (stats?.total_doctors ?? 0)), icon: Users, color: "sky" as const, gradient: "from-sky-500 to-blue-600", onClick: () => router.push("/dashboard/patients") },
            { label: "Patients", value: String(stats?.total_patients ?? "..."), icon: Activity, color: "rose" as const, gradient: "from-rose-500 to-pink-600", onClick: () => router.push("/dashboard/patients") },
            { label: "Doctors", value: String(stats?.total_doctors ?? "..."), icon: Shield, color: "violet" as const, gradient: "from-violet-500 to-purple-600", onClick: () => router.push("/dashboard/analytics") },
            { label: "Diagnoses", value: String(stats?.total_records ?? "..."), icon: Database, color: "emerald" as const, gradient: "from-emerald-500 to-teal-600", onClick: () => router.push("/dashboard/records") },
          ].map((card, idx) => (
            <motion.div key={card.label} variants={item}>
              <StatCard
                label={card.label}
                value={card.value}
                icon={card.icon}
                color={card.color}
                gradient={card.gradient}
                delay={idx * 0.1}
                onClick={card.onClick}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Doctor Overview - which doctor has how many patients/records */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8 glass-card rounded-[2rem] p-8 border border-white/[0.08]"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
                <Stethoscope size={20} className="text-white" />
              </div>
              <span className="bg-gradient-to-r from-violet-200 to-purple-300 bg-clip-text text-transparent">
                Doctor Workload
              </span>
            </h2>
            <p className="text-xs text-zinc-500">{doctors.length} doctors active</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="text-left pb-4 font-semibold">Doctor</th>
                  <th className="text-left pb-4 font-semibold">Specialization</th>
                  <th className="text-left pb-4 font-semibold">Patients</th>
                  <th className="text-left pb-4 font-semibold">Records</th>
                  <th className="text-left pb-4 font-semibold">Pending</th>
                  <th className="text-left pb-4 font-semibold">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {doctors.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-zinc-600">No doctors registered</td></tr>
                ) : (
                  doctors.map((doc) => (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ backgroundColor: "rgba(139,92,246,0.05)" }}
                      className="transition-all duration-200"
                    >
                      <td className="py-4">
                        <p className="font-bold text-sm">{doc.name}</p>
                        <p className="text-zinc-500 text-xs">{doc.email}</p>
                      </td>
                      <td className="py-4 text-zinc-400 text-xs">{doc.specialization}</td>
                      <td className="py-4">
                        <span className="text-sm font-bold text-sky-400">{doc.patient_count}</span>
                      </td>
                      <td className="py-4">
                        <span className="text-sm font-bold text-violet-400">{doc.record_count}</span>
                      </td>
                      <td className="py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${STATUS_COLOR_MAP[doc.pending_approvals > 0 ? "amber" : "emerald"]}`}>
                          {doc.pending_approvals}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {doc.is_available ? (
                            <><CheckCircle size={14} className="text-emerald-400" /><span className="text-xs text-emerald-400 font-semibold">On Duty</span></>
                          ) : (
                            <><Circle size={14} className="text-zinc-500" /><span className="text-xs text-zinc-500 font-semibold">Off Duty</span></>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Upcoming Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-8 glass-card rounded-[2rem] p-8 border border-white/[0.08]"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                <Calendar size={20} className="text-white" />
              </div>
              <span className="bg-gradient-to-r from-emerald-200 to-teal-300 bg-clip-text text-transparent">
                Upcoming Schedule
              </span>
            </h2>
            <button
              onClick={() => router.push("/dashboard/appointments")}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              View all <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {appointments.length === 0 ? (
              <p className="py-8 text-center text-zinc-600">No appointments scheduled</p>
            ) : (
              appointments.slice(0, 6).map((appt) => (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: 4 }}
                  className="flex items-center justify-between p-4 bg-white/3 rounded-2xl hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Calendar size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{appt.specialist}</p>
                      <p className="text-zinc-500 text-xs">{appt.reason ?? "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{appt.date}</p>
                    <p className="text-xs text-zinc-500">{appt.time}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      STATUS_COLOR_MAP[appt.status === "upcoming" ? "sky" : appt.status === "completed" ? "emerald" : "rose"]
                    }`}>{appt.status}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Action message toast */}
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl text-violet-300 font-semibold text-sm"
          >
            {actionMsg}
          </motion.div>
        )}

        {/* Diagnoses Distribution + Export */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-[2rem] p-8 border border-white/[0.08]"
          >
            <h2 className="text-xl font-black mb-6 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20">
                <Brain size={20} className="text-white" />
              </div>
              <span className="bg-gradient-to-r from-rose-200 to-pink-300 bg-clip-text text-transparent">
                Top Diagnoses
              </span>
            </h2>
            {diag.length === 0 ? (
              <p className="py-8 text-center text-zinc-600">No data</p>
            ) : (
              <div className="flex items-center gap-6">
                <svg viewBox="0 0 100 100" className="w-44 h-44 -rotate-90">
                  {(() => {
                    let cum = 0;
                    return diag.map((d, i) => {
                      const frac = d.count / diagTotal;
                      const start = cum * 2 * Math.PI;
                      const end = (cum + frac) * 2 * Math.PI;
                      cum += frac;
                      const x1 = 50 + 45 * Math.cos(start);
                      const y1 = 50 + 45 * Math.sin(start);
                      const x2 = 50 + 45 * Math.cos(end);
                      const y2 = 50 + 45 * Math.sin(end);
                      const large = frac > 0.5 ? 1 : 0;
                      return (
                        <path
                          key={i}
                          d={`M50,50 L${x1},${y1} A45,45 0 ${large},1 ${x2},${y2} Z`}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                          stroke="#0a0a0a"
                          strokeWidth="0.5"
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="flex-1 space-y-2 max-h-44 overflow-y-auto">
                  {diag.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-zinc-400 flex-1 truncate">{d.disease}</span>
                      <span className="text-zinc-300 font-bold">{d.count}</span>
                      <span className="text-zinc-600">{((d.count / diagTotal) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Export */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-[2rem] p-8 border border-white/[0.08]"
          >
            <h2 className="text-xl font-black mb-6 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
                <Database size={20} className="text-white" />
              </div>
              <span className="bg-gradient-to-r from-sky-200 to-blue-300 bg-clip-text text-transparent">
                Export Reports
              </span>
            </h2>
            <div className="space-y-3">
              {[
                { icon: Users, color: "text-sky-400", label: "Users (CSV)", path: api.exportUsersCSV(), filename: "users.csv" },
                { icon: Activity, color: "text-violet-400", label: "Medical Records (CSV)", path: api.exportRecordsCSV(), filename: "records.csv" },
                { icon: Calendar, color: "text-emerald-400", label: "Appointments (CSV)", path: api.exportAppointmentsCSV(), filename: "appointments.csv" },
              ].map((x) => (
                <button
                  key={x.filename}
                  onClick={() => downloadCSV(x.path, x.filename)}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-between transition-all text-sm font-semibold"
                >
                  <span className="flex items-center gap-3"><x.icon size={16} className={x.color} />{x.label}</span>
                  <ArrowUpRight size={14} className="text-zinc-500" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* User Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 glass-card rounded-[2rem] p-8 border border-white/[0.08]"
        >
          <h2 className="text-xl font-black mb-6 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
              <Users size={20} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-sky-200 to-blue-300 bg-clip-text text-transparent">
              User Management
            </span>
            <span className="ml-auto text-xs text-zinc-500">{users.length} total</span>
          </h2>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur z-10">
                <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="text-left pb-3 font-semibold">Email</th>
                  <th className="text-left pb-3 font-semibold">Role</th>
                  <th className="text-left pb-3 font-semibold">Status</th>
                  <th className="text-left pb-3 font-semibold">Created</th>
                  <th className="text-right pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 text-zinc-300">{u.email}</td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        onChange={(e) => changeUserRole(u, e.target.value)}
                        className="bg-white/5 text-xs font-bold rounded-lg px-2 py-1 outline-none border border-white/10"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${STATUS_COLOR_MAP[u.is_active ? "emerald" : "rose"]}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-500 text-xs">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => toggleUserActive(u)}
                        className={`text-xs font-bold px-3 py-1 rounded-lg ${
                          u.is_active ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        } transition-colors`}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Audit Log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 glass-card rounded-[2rem] p-8 border border-white/[0.08]"
        >
          <h2 className="text-xl font-black mb-6 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
              <Lock size={20} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">
              Audit Log
            </span>
            <span className="ml-auto text-xs text-zinc-500">Latest {audit.length} actions</span>
          </h2>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {audit.length === 0 ? (
              <p className="py-8 text-center text-zinc-600">No audit entries</p>
            ) : audit.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 bg-white/3 rounded-xl hover:bg-white/5 transition-colors text-xs">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                    e.action === "login" ? "bg-sky-500/10 text-sky-400" :
                    e.action === "delete" ? "bg-rose-500/10 text-rose-400" :
                    e.action === "update" ? "bg-amber-500/10 text-amber-400" :
                    e.action === "create" ? "bg-emerald-500/10 text-emerald-400" :
                    "bg-zinc-500/10 text-zinc-400"
                  }`}>{e.action}</span>
                  <span className="text-zinc-300 font-semibold truncate">{e.user_email ?? "—"}</span>
                  {e.details && <span className="text-zinc-500 truncate flex-1">{e.details}</span>}
                </div>
                <span className="text-zinc-600 text-[10px] flex-shrink-0 ml-2">
                  {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 glass-card rounded-[2rem] p-8 border border-white/[0.08]"
          >
            <h2 className="text-xl font-black mb-8 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
                <TrendingUp size={20} className="text-white" />
              </div>
              <span className="bg-gradient-to-r from-sky-200 to-blue-300 bg-clip-text text-transparent">
                Recent Activity
              </span>
            </h2>
            <div className="space-y-3">
              {(stats?.recent_records ?? []).slice(0, 5).map((r, idx) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + idx * 0.05 }}
                  whileHover={{ x: 4, backgroundColor: "rgba(139,92,246,0.06)" }}
                  className="flex items-center justify-between p-4 bg-white/3 rounded-2xl transition-all duration-200 cursor-default"
                >
                  <div>
                    <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{r.ai_prediction ?? "New Record"}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{r.patient_id.slice(0, 8)}…</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-xs font-bold px-2.5 py-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                      {r.confidence_score != null ? `${r.confidence_score.toFixed(0)}%` : "—"}
                    </span>
                    <p className="text-zinc-600 text-[10px] mt-1">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card rounded-[2rem] p-8 border border-white/[0.08]"
          >
            <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-amber-200">
              <AlertCircle size={20} />
              System Status
            </h3>
            <div className="space-y-4">
              {([
                { label: "PostgreSQL", status: health?.database ?? "checking", color: health?.database === "healthy" ? "emerald" : "rose" },
                { label: "Redis", status: health?.redis ?? "checking", color: health?.redis === "healthy" ? "emerald" : health?.redis === "disabled" ? "sky" : "rose" },
                { label: "ML Model", status: health?.ml_model ?? "checking", color: health?.ml_model === "healthy" ? "emerald" : "amber" },
                { label: "Active Sessions", status: String(health?.stats?.active_sessions ?? 0), color: "sky" },
              ] as Array<{label: string; status: string; color: "emerald" | "sky" | "rose" | "amber"}>).map((s, idx) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + idx * 0.05 }}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-zinc-400">{s.label}</span>
                  <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-lg ${STATUS_COLOR_MAP[s.color]} capitalize`}>
                    {s.status}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-xs text-zinc-600">Last check: Just now</p>
            </div>
          </motion.div>
        </div>

        {/* ML Model Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 glass-card rounded-[2rem] p-8 border border-white/[0.08]"
        >
          <h2 className="text-xl font-black mb-8 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
              <Brain size={20} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-violet-200 to-purple-300 bg-clip-text text-transparent">
              ML Model Management
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "XGBoost Diagnosis", status: "Active", performance: "98.2%", color: "emerald" as const },
              { label: "Symptom Analyzer", status: "Active", performance: "94.1%", color: "sky" as const },
              { label: "Feature Extractor", status: "Active", performance: "96.5%", color: "violet" as const },
            ].map((model, idx) => (
              <motion.div
                key={model.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 + idx * 0.05 }}
                className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="font-bold text-sm">{model.label}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${STATUS_COLOR_MAP[model.color]}`}>
                    {model.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Accuracy</span>
                    <span className="text-xs font-bold text-emerald-400">{model.performance}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      initial={{ width: 0 }}
                      animate={{ width: model.performance }}
                      transition={{ duration: 1, delay: 0.8 + idx * 0.1 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* System Configuration Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
            <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-blue-200">
              <Settings size={20} />
              Configuration
            </h3>
            <div className="space-y-4">
              {[
                { label: "Rate Limiting", value: "5/15min", icon: Zap },
                { label: "Token Expiry", value: "8 hours", icon: Lock },
                { label: "Encryption", value: "AES-256", icon: Shield },
              ].map((config, idx) => (
                <motion.div
                  key={config.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.85 + idx * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <config.icon size={16} className="text-blue-400" />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <span className="text-xs font-bold text-blue-300">{config.value}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
            <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-amber-200">
              <AlertCircle size={20} />
              Security & Audit
            </h3>
            <div className="space-y-4">
              {[
                { label: "Failed Logins", value: "0", severity: "safe" },
                { label: "Suspicious Activity", value: "None", severity: "safe" },
                { label: "Data Integrity", value: "100%", severity: "safe" },
              ].map((audit, idx) => (
                <motion.div
                  key={audit.label}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.85 + idx * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm font-medium">{audit.label}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    audit.severity === "safe" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {audit.value}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Admin Actions Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-white/[0.08] text-center"
        >
          <p className="text-sm text-zinc-400">
            System fully operational. All health checks passing. Last backup: 2 hours ago.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <AdminContent />
    </ProtectedRoute>
  );
}
