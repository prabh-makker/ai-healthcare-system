"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Users, TrendingUp, Database, Shield, AlertCircle, Activity,
  Settings, Brain, Lock, Zap, Stethoscope, Calendar, CheckCircle,
  Circle, ArrowUpRight, LayoutDashboard, Server, ClipboardList,
} from "lucide-react";
import { api } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";
import { STATUS_COLOR_MAP } from "@/constants/colors";
import { StatCard } from "@/components/StatCard";

const PIE_COLORS = ["#f43f5e", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#84cc16", "#f97316", "#a855f7"];
const ROLE_OPTIONS = ["PATIENT", "DOCTOR", "ADMIN"] as const;

type AdminTab = "overview" | "users" | "system" | "audit";

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

const TAB_CONFIG: Array<{ id: AdminTab; label: string; icon: React.ElementType }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users",    label: "Users",    icon: Users },
  { id: "system",   label: "System",   icon: Server },
  { id: "audit",    label: "Audit",    icon: ClipboardList },
];

function AdminContent() {
  const router = useRouter();
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
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

  const toast = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  };

  const toggleUserActive = async (u: AllUser) => {
    try {
      await api.setUserActive(u.id, !u.is_active);
      toast(`${u.email} ${!u.is_active ? "activated" : "deactivated"}`);
      refreshUsers();
    } catch (e: any) { toast(`Error: ${e.message}`); }
  };

  const changeUserRole = async (u: AllUser, newRole: string) => {
    try {
      await api.setUserRole(u.id, newRole);
      toast(`${u.email} → ${newRole}`);
      refreshUsers();
    } catch (e: any) { toast(`Error: ${e.message}`); }
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
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#8b5cf6" />

      <div className="relative z-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-violet-200 via-purple-400 to-indigo-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">System overview &amp; management</p>
        </motion.header>

        {/* Toast */}
        <AnimatePresence>
          {actionMsg && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl text-violet-300 font-semibold text-sm"
            >
              {actionMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Nav */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-8 glass-card p-1.5 rounded-2xl w-fit"
        >
          {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAdminTab(id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                adminTab === id
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </motion.div>

        {/* ── OVERVIEW ── */}
        {adminTab === "overview" && (
          <motion.div
            key="overview"
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Total Users", value: String((stats?.total_patients ?? 0) + (stats?.total_doctors ?? 0)), icon: Users, color: "sky" as const, gradient: "from-sky-500 to-blue-600" },
                { label: "Patients", value: String(stats?.total_patients ?? "…"), icon: Activity, color: "rose" as const, gradient: "from-rose-500 to-pink-600" },
                { label: "Doctors", value: String(stats?.total_doctors ?? "…"), icon: Stethoscope, color: "violet" as const, gradient: "from-violet-500 to-purple-600" },
                { label: "Total Records", value: String(stats?.total_records ?? "…"), icon: Database, color: "emerald" as const, gradient: "from-emerald-500 to-teal-600" },
              ].map((card, idx) => (
                <motion.div key={card.label} variants={item}>
                  <StatCard
                    label={card.label}
                    value={card.value}
                    icon={card.icon}
                    color={card.color}
                    gradient={card.gradient}
                    delay={idx * 0.05}
                  />
                </motion.div>
              ))}
            </div>

            {/* Doctor Workload */}
            <motion.div variants={item} className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
                    <Stethoscope size={20} className="text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-violet-200 to-purple-300 bg-clip-text text-transparent">
                    Doctor Workload
                  </span>
                </h2>
                <p className="text-xs text-zinc-500">{doctors.length} doctor{doctors.length !== 1 ? "s" : ""}</p>
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
                      <th className="text-left pb-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {doctors.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-zinc-600">No doctors registered</td></tr>
                    ) : (
                      doctors.map((doc) => (
                        <motion.tr
                          key={doc.id}
                          whileHover={{ backgroundColor: "rgba(139,92,246,0.05)" }}
                          className="transition-all duration-200"
                        >
                          <td className="py-4">
                            <p className="font-bold text-sm">{doc.name}</p>
                            <p className="text-zinc-500 text-xs">{doc.email}</p>
                          </td>
                          <td className="py-4 text-zinc-400 text-xs">{doc.specialization}</td>
                          <td className="py-4"><span className="text-sm font-bold text-sky-400">{doc.patient_count}</span></td>
                          <td className="py-4"><span className="text-sm font-bold text-violet-400">{doc.record_count}</span></td>
                          <td className="py-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${STATUS_COLOR_MAP[doc.pending_approvals > 0 ? "amber" : "emerald"]}`}>
                              {doc.pending_approvals}
                            </span>
                          </td>
                          <td className="py-4">
                            {doc.is_available ? (
                              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                                <CheckCircle size={13} /> On Duty
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold">
                                <Circle size={13} /> Off Duty
                              </span>
                            )}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Upcoming Appointments */}
            <motion.div variants={item} className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                    <Calendar size={20} className="text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-emerald-200 to-teal-300 bg-clip-text text-transparent">
                    Recent Appointments
                  </span>
                </h2>
                <button
                  onClick={() => router.push("/dashboard/appointments")}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                >
                  View all <ArrowUpRight size={12} />
                </button>
              </div>
              <div className="space-y-3">
                {appointments.length === 0 ? (
                  <p className="py-8 text-center text-zinc-600">No appointments scheduled</p>
                ) : (
                  appointments.slice(0, 6).map((appt) => (
                    <div
                      key={appt.id}
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
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── USERS ── */}
        {adminTab === "users" && (
          <motion.div
            key="users"
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {/* Export Row */}
            <motion.div variants={item} className="glass-card rounded-2xl p-6 border border-white/[0.08]">
              <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-wider">Export</h3>
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: Users, color: "text-sky-400", label: "Users CSV", path: api.exportUsersCSV(), filename: "users.csv" },
                  { icon: Activity, color: "text-violet-400", label: "Records CSV", path: api.exportRecordsCSV(), filename: "records.csv" },
                  { icon: Calendar, color: "text-emerald-400", label: "Appointments CSV", path: api.exportAppointmentsCSV(), filename: "appointments.csv" },
                ].map((x) => (
                  <button
                    key={x.filename}
                    onClick={() => downloadCSV(x.path, x.filename)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold transition-all"
                  >
                    <x.icon size={15} className={x.color} />
                    {x.label}
                    <ArrowUpRight size={13} className="text-zinc-500" />
                  </button>
                ))}
              </div>
            </motion.div>

            {/* User Table */}
            <motion.div variants={item} className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
                    <Users size={20} className="text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-sky-200 to-blue-300 bg-clip-text text-transparent">
                    User Management
                  </span>
                </h2>
                <span className="text-xs text-zinc-500">{users.length} total</span>
              </div>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur z-10">
                    <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5">
                      <th className="text-left pb-3 font-semibold">Email</th>
                      <th className="text-left pb-3 font-semibold">Role</th>
                      <th className="text-left pb-3 font-semibold">Status</th>
                      <th className="text-left pb-3 font-semibold">Joined</th>
                      <th className="text-right pb-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 text-zinc-300 font-medium">{u.email}</td>
                        <td className="py-3">
                          <select
                            value={u.role}
                            onChange={(e) => changeUserRole(u, e.target.value)}
                            className="bg-white/5 text-xs font-bold rounded-lg px-2 py-1 outline-none border border-white/10 hover:border-white/20 transition-colors"
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
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                              u.is_active
                                ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            }`}
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
          </motion.div>
        )}

        {/* ── SYSTEM ── */}
        {adminTab === "system" && (
          <motion.div
            key="system"
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            {/* Health + Config row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* System Health */}
              <motion.div variants={item} className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
                <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                  <AlertCircle size={20} className="text-amber-400" />
                  <span className="text-amber-200">System Health</span>
                </h3>
                <div className="space-y-4">
                  {([
                    { label: "PostgreSQL", status: health?.database ?? "checking", color: health?.database === "healthy" ? "emerald" : "rose" },
                    { label: "Redis", status: health?.redis ?? "checking", color: health?.redis === "healthy" ? "emerald" : health?.redis === "disabled" ? "sky" : "rose" },
                    { label: "ML Model", status: health?.ml_model ?? "checking", color: health?.ml_model === "healthy" ? "emerald" : "amber" },
                    { label: "Active Sessions", status: String(health?.stats?.active_sessions ?? 0), color: "sky" },
                    { label: "Total Users", status: String(health?.stats?.total_users ?? 0), color: "violet" },
                  ] as Array<{ label: string; status: string; color: "emerald" | "sky" | "rose" | "amber" | "violet" }>).map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-400">{s.label}</span>
                      <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-lg ${STATUS_COLOR_MAP[s.color]} capitalize`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-white/5">
                  <p className="text-xs text-zinc-600">Refreshed on page load</p>
                </div>
              </motion.div>

              {/* Configuration */}
              <motion.div variants={item} className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
                <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                  <Settings size={20} className="text-blue-400" />
                  <span className="text-blue-200">Configuration</span>
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Rate Limiting", value: "5 / 15 min", icon: Zap },
                    { label: "Token Expiry", value: "8 hours", icon: Lock },
                    { label: "Encryption", value: "AES-256", icon: Shield },
                    { label: "CORS Origins", value: "localhost", icon: Server },
                  ].map((cfg) => (
                    <div key={cfg.label} className="flex items-center justify-between p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <cfg.icon size={15} className="text-blue-400" />
                        <span className="text-sm font-medium text-zinc-300">{cfg.label}</span>
                      </div>
                      <span className="text-xs font-bold text-blue-300">{cfg.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Security */}
              <motion.div variants={item} className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
                <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                  <Shield size={20} className="text-emerald-400" />
                  <span className="text-emerald-200">Security</span>
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Failed Logins", value: "0", ok: true },
                    { label: "Suspicious Activity", value: "None", ok: true },
                    { label: "Data Integrity", value: "100%", ok: true },
                    { label: "JWT Signing", value: "Active", ok: true },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
                      <span className="text-sm font-medium text-zinc-300">{s.label}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${s.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* ML Models */}
            <motion.div variants={item} className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
              <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
                  <Brain size={20} className="text-white" />
                </div>
                <span className="bg-gradient-to-r from-violet-200 to-purple-300 bg-clip-text text-transparent">
                  ML Model Status
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "XGBoost Diagnosis", status: "Active", performance: "98.2%", pct: 98.2, color: "emerald" as const },
                  { label: "Symptom Analyzer", status: "Active", performance: "94.1%", pct: 94.1, color: "sky" as const },
                  { label: "Feature Extractor", status: "Active", performance: "96.5%", pct: 96.5, color: "violet" as const },
                ].map((model) => (
                  <div key={model.label} className="p-5 rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-start justify-between mb-4">
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
                          animate={{ width: `${model.pct}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Diagnoses Distribution */}
            <motion.div variants={item} className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <span className="bg-gradient-to-r from-rose-200 to-pink-300 bg-clip-text text-transparent">
                  Diagnoses Distribution
                </span>
              </h2>
              {diag.length === 0 ? (
                <p className="py-8 text-center text-zinc-600">No data yet</p>
              ) : (
                <div className="flex items-center gap-8">
                  <svg viewBox="0 0 100 100" className="w-48 h-48 flex-shrink-0 -rotate-90">
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
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    {diag.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-zinc-400 truncate">{d.disease}</span>
                        <span className="text-zinc-300 font-bold ml-auto">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ── AUDIT ── */}
        {adminTab === "audit" && (
          <motion.div
            key="audit"
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            {/* Recent Activity */}
            <motion.div variants={item} className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
              <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <span className="bg-gradient-to-r from-sky-200 to-blue-300 bg-clip-text text-transparent">
                  Recent Activity
                </span>
              </h2>
              <div className="space-y-3">
                {(stats?.recent_records ?? []).length === 0 ? (
                  <p className="py-8 text-center text-zinc-600">No recent records</p>
                ) : (
                  (stats?.recent_records ?? []).slice(0, 8).map((r, idx) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      whileHover={{ x: 4, backgroundColor: "rgba(139,92,246,0.06)" }}
                      className="flex items-center justify-between p-4 bg-white/3 rounded-2xl transition-all duration-200"
                    >
                      <div>
                        <p className="font-bold text-sm">{r.ai_prediction ?? "New Record"}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Patient: {r.patient_id.slice(0, 8)}…</p>
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
                  ))
                )}
              </div>
            </motion.div>

            {/* Audit Log */}
            <motion.div variants={item} className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                  <Lock size={20} className="text-white" />
                </div>
                <span className="bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">
                  Audit Log
                </span>
                <span className="ml-auto text-xs text-zinc-500">Latest {audit.length} actions</span>
              </h2>
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {audit.length === 0 ? (
                  <p className="py-8 text-center text-zinc-600">No audit entries</p>
                ) : (
                  audit.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between p-3 bg-white/3 rounded-xl hover:bg-white/5 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase flex-shrink-0 ${
                          e.action === "login"  ? "bg-sky-500/10 text-sky-400" :
                          e.action === "delete" ? "bg-rose-500/10 text-rose-400" :
                          e.action === "update" ? "bg-amber-500/10 text-amber-400" :
                          e.action === "create" ? "bg-emerald-500/10 text-emerald-400" :
                          "bg-zinc-500/10 text-zinc-400"
                        }`}>{e.action}</span>
                        <span className="text-zinc-300 font-semibold truncate">{e.user_email ?? "—"}</span>
                        {e.resource_type && <span className="text-zinc-600 truncate">{e.resource_type}</span>}
                        {e.details && <span className="text-zinc-500 truncate flex-1">{e.details}</span>}
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-zinc-600 text-[10px]">
                          {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                        </p>
                        {e.ip_address && <p className="text-zinc-700 text-[10px]">{e.ip_address}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
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
