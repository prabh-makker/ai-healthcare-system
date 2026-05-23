"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Users, TrendingUp, Database, Shield, AlertCircle, Activity,
  Settings, Brain, Lock, Zap, Stethoscope, Calendar, CheckCircle,
  Circle, ArrowUpRight, LayoutDashboard, Server, ClipboardList, X,
} from "lucide-react";
import { api } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";
import { STATUS_COLOR_MAP } from "@/constants/colors";
import { StatCard } from "@/components/StatCard";
import { useTheme } from "@/context/ThemeContext";

const PIE_COLORS = ["#f43f5e", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#84cc16", "#f97316", "#a855f7"];
const ROLE_OPTIONS = ["PATIENT", "DOCTOR", "ADMIN"] as const;

type AdminTab = "overview" | "users" | "system" | "audit" | "attendance";

interface AttendanceEntry {
  user_email: string;
  user_id: string;
  role: string;
  date: string;
  first_login: string | null;
  last_activity: string | null;
  session_count: number;
  ip_addresses: string[];
}

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
  first_name?: string;
  last_name?: string;
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
  first_name?: string | null;
  last_name?: string | null;
  assigned_doctors?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
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
  { id: "overview",   label: "Overview",   icon: LayoutDashboard },
  { id: "users",      label: "Users",      icon: Users },
  { id: "attendance", label: "Attendance", icon: Calendar },
  { id: "system",     label: "System",     icon: Server },
  { id: "audit",      label: "Audit",      icon: ClipboardList },
];

function AdminContent() {
  const router = useRouter();
  const { theme } = useTheme();
  const headerGradient = theme === "light"
    ? "linear-gradient(135deg, #1e40af, #0c4a6e, #0f766e)"
    : "linear-gradient(135deg, #bae6fd, #7dd3fc, #0ea5e9, #06b6d4)";
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("ALL");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL");
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ email: "", password: "", role: "DOCTOR", specialization: "General Physician" });
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [accuracyMetrics, setAccuracyMetrics] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [doctors, setDoctors] = useState<DoctorOverview[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<AllUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [diag, setDiag] = useState<DiagDist[]>([]);
  const [health, setHealth] = useState<SysHealth | null>(null);
  const [actionMsg, setActionMsg] = useState<string>("");
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [attendanceDays, setAttendanceDays] = useState<number>(7);
  const [attendanceRole, setAttendanceRole] = useState<string>("");
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Doctor attendance summary (admin new view)
  const [doctorAttSummary, setDoctorAttSummary] = useState<any[]>([]);
  const [doctorAttLoading, setDoctorAttLoading] = useState(false);
  const [attMonth, setAttMonth] = useState(new Date());
  const [attYear, setAttYear] = useState(new Date().getFullYear());
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [doctorDetail, setDoctorDetail] = useState<any>(null);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: "", name: "", notes: "" });

  // ML Retraining state
  const [retraining, setRetraining] = useState(false);
  const [retrainProgress, setRetrainProgress] = useState(0);
  const [retrainStep, setRetrainStep] = useState("");
  const [retrainResult, setRetrainResult] = useState<any>(null);

  // Active cases count
  const [activeCasesCount, setActiveCasesCount] = useState(0);

  // Doctor assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPatientForAssignment, setSelectedPatientForAssignment] = useState<AllUser | null>(null);
  const [selectedDoctorForAssignment, setSelectedDoctorForAssignment] = useState<string>("");
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const handleReassignDoctor = async (patient: AllUser) => {
    setSelectedPatientForAssignment(patient);
    setSelectedDoctorForAssignment("");
    setAssignmentError(null);
    setShowAssignModal(true);
  };

  const submitDoctorAssignment = async () => {
    if (!selectedPatientForAssignment || !selectedDoctorForAssignment) {
      setAssignmentError("Please select a doctor");
      return;
    }

    setAssignmentLoading(true);
    setAssignmentError(null);

    try {
      if (selectedPatientForAssignment.assigned_doctors && selectedPatientForAssignment.assigned_doctors.length > 0) {
        // Reassign
        await api.reassignDoctor(selectedDoctorForAssignment, selectedPatientForAssignment.id);
        toast("Doctor reassigned and notifications sent");
      } else {
        // New assignment
        await api.assignDoctor(selectedDoctorForAssignment, selectedPatientForAssignment.id);
        toast("Doctor assigned and notifications sent");
      }
      setShowAssignModal(false);
      setSelectedPatientForAssignment(null);
      setSelectedDoctorForAssignment("");
      refreshUsers();
    } catch (e: any) {
      setAssignmentError(e.message || "Failed to assign doctor");
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainResult(null);
    setRetrainProgress(0);
    const steps = [
      { p: 15, label: "Collecting feedback data..." },
      { p: 35, label: "Loading current model..." },
      { p: 55, label: "Building training matrix..." },
      { p: 75, label: "Retraining XGBoost..." },
      { p: 90, label: "Saving model version..." },
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setRetrainProgress(steps[i].p);
        setRetrainStep(steps[i].label);
        i++;
      }
    }, 400);

    try {
      const result: any = await api.retrainModel();
      clearInterval(interval);
      setRetrainProgress(100);
      setRetrainStep("Complete");
      setRetrainResult(result);
    } catch (err: any) {
      clearInterval(interval);
      setRetrainResult({ error: err.message || "Unknown error" });
    } finally {
      setTimeout(() => setRetraining(false), 1500);
    }
  };

  const loadAttendance = (days: number, role: string) => {
    setAttendanceLoading(true);
    api.getAttendance(days, role || undefined)
      .then((data) => setAttendance(Array.isArray(data) ? data : []))
      .catch((e) => { console.error(e); setAttendance([]); })
      .finally(() => setAttendanceLoading(false));
  };

  const loadDoctorAttSummary = (date: Date) => {
    setDoctorAttLoading(true);
    api.getAdminAllDoctorsSummary(date.getFullYear(), date.getMonth() + 1)
      .then((data: any) => setDoctorAttSummary(Array.isArray(data) ? data : []))
      .catch((e) => { console.error(e); setDoctorAttSummary([]); })
      .finally(() => setDoctorAttLoading(false));
  };

  const loadDoctorDetail = (doctorId: string) => {
    api.getAdminDoctorAttendance(doctorId, attMonth.getFullYear(), attMonth.getMonth() + 1)
      .then(setDoctorDetail)
      .catch(console.error);
  };

  const loadPendingLeaves = () => {
    api.getAdminPendingLeaves()
      .then((data: any) => setPendingLeaves(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const handleLeaveDecision = async (leaveId: string, status: "approved" | "rejected") => {
    try {
      await api.decideLeave(leaveId, status);
      loadPendingLeaves();
      loadDoctorAttSummary(attMonth);
      if (selectedDoctorId) loadDoctorDetail(selectedDoctorId);
    } catch (e) { console.error(e); }
  };

  const handleMarkHoliday = async () => {
    if (!holidayForm.date || !holidayForm.name) return;
    try {
      await api.markHoliday(holidayForm.date, holidayForm.name, holidayForm.notes);
      setShowHolidayModal(false);
      setHolidayForm({ date: "", name: "", notes: "" });
      loadDoctorAttSummary(attMonth);
    } catch (e) { console.error(e); }
  };

  const loadAll = () => {
    api.getStats().then(setStats).catch(console.error);
    api.getDoctorsOverview().then(setDoctors).catch(console.error);
    api.getAppointments(0, 10).then(setAppointments).catch(console.error);
    api.getAllUsers().then(setUsers).catch(console.error);
    api.getAuditLog(0, 30).then(setAudit).catch(console.error);
    api.getDiagnosesDistribution().then(setDiag).catch(console.error);
    api.getSystemHealth().then(setHealth).catch(console.error);
    api.getAccuracyMetrics().then(setAccuracyMetrics).catch(console.error);
    // Load active cases count
    api.getRecords(0, 100)
      .then((records: any[]) => {
        const activeCases = records.filter(
          (r) => r.status === "pending" || r.status === "in_review" || r.status === "reviewed"
        );
        setActiveCasesCount(activeCases.length);
      })
      .catch(console.error);
  };

  useEffect(() => { loadAll(); }, []);

  // Lazy-load attendance when its tab opens
  useEffect(() => {
    if (adminTab === "attendance") {
      if (attendance.length === 0 && !attendanceLoading) {
        loadAttendance(attendanceDays, attendanceRole);
      }
      loadDoctorAttSummary(attMonth);
      loadPendingLeaves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminTab]);

  useEffect(() => {
    if (adminTab === "attendance") loadDoctorAttSummary(attMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attMonth]);

  useEffect(() => {
    if (selectedDoctorId) loadDoctorDetail(selectedDoctorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctorId, attMonth]);

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
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            backgroundImage: headerGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { label: "Total Users", value: String((stats?.total_patients ?? 0) + (stats?.total_doctors ?? 0)), icon: Users, color: "sky" as const, gradient: "from-sky-500 to-blue-600", onClick: () => setAdminTab("users") },
                { label: "Patients", value: String(stats?.total_patients ?? "…"), icon: Activity, color: "rose" as const, gradient: "from-rose-500 to-pink-600", onClick: () => router.push("/dashboard/patients") },
                { label: "Doctors", value: String(stats?.total_doctors ?? "…"), icon: Stethoscope, color: "violet" as const, gradient: "from-violet-500 to-purple-600", onClick: () => { setAdminTab("users"); } },
                { label: "Total Records", value: String(stats?.total_records ?? "…"), icon: Database, color: "emerald" as const, gradient: "from-emerald-500 to-teal-600", onClick: () => router.push("/dashboard/records") },
                { label: "Active Cases", value: String(activeCasesCount ?? "…"), icon: Zap, color: "cyan" as const, gradient: "from-cyan-500 to-blue-600", onClick: () => router.push("/dashboard/active-cases") },
              ].map((card, idx) => (
                <motion.div key={card.label} variants={item}>
                  <StatCard
                    label={card.label}
                    value={card.value}
                    icon={card.icon}
                    color={card.color}
                    gradient={card.gradient}
                    delay={idx * 0.05}
                    onClick={card.onClick}
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
                  appointments.slice(0, 10).map((appt) => (
                    <motion.div
                      key={appt.id}
                      whileHover={{ x: 4, backgroundColor: "rgba(5,150,213,0.08)" }}
                      onClick={() => router.push("/dashboard/appointments")}
                      className="flex items-center justify-between p-4 bg-white/3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                          <Calendar size={16} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{appt.first_name} {appt.last_name} — {appt.specialist}</p>
                          <p className="text-zinc-500 text-xs">{appt.reason ?? "—"}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
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
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-xl font-black flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
                      <Users size={20} className="text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-sky-200 to-blue-300 bg-clip-text text-transparent">
                      User Management
                    </span>
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">{users.filter(u => (userRoleFilter === "ALL" || u.role === userRoleFilter) && (userStatusFilter === "ALL" || (userStatusFilter === "ACTIVE" ? u.is_active : !u.is_active)) && (userSearchQuery === "" || u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))).length} of {users.length}</span>
                    <button
                      onClick={() => setShowAddUser(true)}
                      className="px-4 py-2 bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-sky-500/30 flex items-center gap-1.5"
                    >
                      <span>+</span> Add User
                    </button>
                  </div>
                </div>
                {/* Search + Filter Row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by email..."
                    className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:border-sky-500"
                    style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)", color: "var(--foreground)" }}
                  />
                  <div className="flex items-center gap-1.5 p-1 rounded-lg border" style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)" }}>
                    {["ALL", "DOCTOR", "PATIENT"].map((role) => (
                      <button
                        key={role}
                        onClick={() => setUserRoleFilter(role)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                          userRoleFilter === role
                            ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                            : "hover:bg-white/5"
                        }`}
                        style={userRoleFilter === role ? {} : { color: "var(--foreground)", opacity: 0.7 }}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 p-1 rounded-lg border" style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)" }}>
                    {["ALL", "ACTIVE", "INACTIVE"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setUserStatusFilter(status)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                          userStatusFilter === status
                            ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                            : "hover:bg-white/5"
                        }`}
                        style={userStatusFilter === status ? {} : { color: "var(--foreground)", opacity: 0.7 }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 backdrop-blur z-10" style={{ background: "var(--background)" }}>
                    <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5">
                      <th className="text-left pb-3 font-semibold">Name / Email</th>
                      <th className="text-left pb-3 font-semibold">Role</th>
                      <th className="text-left pb-3 font-semibold">Status</th>
                      <th className="text-left pb-3 font-semibold">Assigned Doctor</th>
                      <th className="text-left pb-3 font-semibold">Joined</th>
                      <th className="text-right pb-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users
                      .filter(u => (userRoleFilter === "ALL" || u.role === userRoleFilter) && (userStatusFilter === "ALL" || (userStatusFilter === "ACTIVE" ? u.is_active : !u.is_active)) && (userSearchQuery === "" || u.email.toLowerCase().includes(userSearchQuery.toLowerCase())))
                      .map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3">
                          <p className="font-semibold" style={{ color: "var(--foreground)" }}>
                            {(u.first_name || u.last_name) ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() : u.email.split("@")[0]}
                          </p>
                          <p className="text-xs text-zinc-500">{u.email}</p>
                        </td>
                        <td className="py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            u.role === "DOCTOR" ? "bg-blue-500/10 text-blue-400" :
                            u.role === "PATIENT" ? "bg-emerald-500/10 text-emerald-400" :
                            "bg-purple-500/10 text-purple-400"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${STATUS_COLOR_MAP[u.is_active ? "emerald" : "rose"]}`}>
                            {u.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 text-xs">
                          {u.role === "PATIENT" ? (
                            u.assigned_doctors && u.assigned_doctors.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {u.assigned_doctors.map((doc) => (
                                  <div key={doc.id} className="flex items-center justify-between gap-2 p-1.5 bg-white/5 rounded border border-white/10">
                                    <div className="flex-1">
                                      <p className="font-semibold text-sky-400 text-xs">{doc.name}</p>
                                      <p className="text-zinc-600 text-xs">{doc.email}</p>
                                    </div>
                                    <button
                                      onClick={() => handleReassignDoctor(u)}
                                      className="text-xs px-2 py-1 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 rounded transition-colors whitespace-nowrap"
                                    >
                                      Reassign
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleReassignDoctor(u)}
                                className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors"
                              >
                                + Assign Doctor
                              </button>
                            )
                          ) : "—"}
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

        {/* ── ATTENDANCE (Admin: Doctor-focused) ── */}
        {adminTab === "attendance" && (
          <motion.div
            key="attendance"
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {/* Header */}
            <motion.div variants={item} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                  <Calendar size={22} className="text-sky-400" />
                  Doctor Attendance
                </h2>
                <p className="text-zinc-500 text-sm mt-1">
                  {attMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })} • Track, approve leaves, mark holidays
                </p>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={() => setAttMonth(new Date(attMonth.getFullYear(), attMonth.getMonth() - 1))} className="px-3 py-2 rounded-lg border" style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)", color: "var(--foreground)" }}>←</button>
                <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                  {attMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
                <button onClick={() => setAttMonth(new Date(attMonth.getFullYear(), attMonth.getMonth() + 1))} className="px-3 py-2 rounded-lg border" style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)", color: "var(--foreground)" }}>→</button>
                <select
                  value={attYear}
                  onChange={(e) => {
                    const newYear = parseInt(e.target.value);
                    setAttYear(newYear);
                    setAttMonth(new Date(newYear, attMonth.getMonth()));
                  }}
                  className="px-3 py-2 rounded-lg border text-sm font-bold"
                  style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)", color: "var(--foreground)" }}
                >
                  {[2024, 2025, 2026].map(yr => <option key={yr} value={yr}>{yr}</option>)}
                </select>
                <button onClick={() => setShowHolidayModal(true)} className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-lg shadow-amber-500/20">+ Holiday</button>
                <button onClick={() => loadDoctorAttSummary(attMonth)} className="px-4 py-2 text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-lg">Refresh</button>
              </div>
            </motion.div>

            {/* Pending Leaves Alert */}
            {pendingLeaves.length > 0 && (
              <motion.div variants={item} className="glass-card rounded-2xl p-6 border border-amber-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-amber-400 flex items-center gap-2">
                    <AlertCircle size={18} /> Pending Leave Requests ({pendingLeaves.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {pendingLeaves.map((leave: any) => (
                    <div key={leave.id} className="flex items-center justify-between p-4 rounded-xl border" style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)" }}>
                      <div>
                        <p className="font-bold" style={{ color: "var(--foreground)" }}>{leave.doctor_name || leave.doctor_email}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{leave.start_date} to {leave.end_date}</p>
                        <p className="text-sm text-zinc-400 mt-1">{leave.reason}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleLeaveDecision(leave.id, "approved")} className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30">Approve</button>
                        <button onClick={() => handleLeaveDecision(leave.id, "rejected")} className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-bold rounded-lg border border-rose-500/30">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Per-doctor summary cards */}
            <motion.div variants={item}>
              <h3 className="text-lg font-black mb-4" style={{ color: "var(--foreground)" }}>Doctor Attendance Summary</h3>
              {doctorAttLoading ? (
                <div className="py-16 text-center"><div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mx-auto" /></div>
              ) : doctorAttSummary.length === 0 ? (
                <div className="py-16 text-center text-zinc-500">No doctors found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {doctorAttSummary.map((doc: any) => (
                    <motion.div
                      key={doc.doctor_id}
                      whileHover={{ scale: 1.02, y: -4 }}
                      onClick={() => setSelectedDoctorId(doc.doctor_id)}
                      className="glass-card rounded-2xl p-5 border border-white/[0.08] cursor-pointer transition-all hover:border-sky-500/40"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-black text-base" style={{ color: "var(--foreground)" }}>
                            Dr. {(doc.first_name || "") + " " + (doc.last_name || "")}
                          </p>
                          <p className="text-xs text-zinc-500">{doc.email}</p>
                        </div>
                        <div className={`text-2xl font-black ${doc.attendance_pct >= 80 ? "text-emerald-400" : doc.attendance_pct >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                          {doc.attendance_pct}%
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                        <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                          <p className="font-black text-emerald-400 text-base">{doc.stats.present}</p>
                          <p className="text-emerald-500/70 text-[10px] mt-0.5">Present</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-rose-500/10">
                          <p className="font-black text-rose-400 text-base">{doc.stats.absent}</p>
                          <p className="text-rose-500/70 text-[10px] mt-0.5">Absent</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-amber-500/10">
                          <p className="font-black text-amber-400 text-base">{doc.stats.leave + doc.stats.half_day + doc.stats.emergency}</p>
                          <p className="text-amber-500/70 text-[10px] mt-0.5">Leave</p>
                        </div>
                      </div>
                      {doc.pending_leaves > 0 && (
                        <div className="mt-3 px-2 py-1 bg-amber-500/15 text-amber-400 text-[11px] font-bold rounded-md text-center">
                          {doc.pending_leaves} pending leave{doc.pending_leaves > 1 ? "s" : ""}
                        </div>
                      )}
                      {doc.failed_logins > 0 && (
                        <div className="mt-2 px-2 py-1 bg-red-500/15 text-red-400 text-[11px] font-bold rounded-md text-center">
                          Failed Logins: {doc.failed_logins}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Doctor Detail Modal */}
            {selectedDoctorId && doctorDetail && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                onClick={() => { setSelectedDoctorId(null); setDoctorDetail(null); }}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border shadow-2xl"
                  style={{ background: "var(--background)", borderColor: "var(--glass-border)", color: "var(--foreground)" }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-black">Dr. {doctorDetail.doctor.first_name} {doctorDetail.doctor.last_name}</h3>
                      <p className="text-xs text-zinc-500">{doctorDetail.doctor.email}</p>
                    </div>
                    <button onClick={() => { setSelectedDoctorId(null); setDoctorDetail(null); }} className="text-zinc-400 hover:text-rose-400"><X size={20} /></button>
                  </div>

                  {/* Attendance Calendar */}
                  <h4 className="font-bold mb-3 text-sm" style={{ color: "var(--foreground)" }}>{attMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })} — Attendance</h4>
                  <div className="grid grid-cols-7 gap-1 mb-6">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="text-center text-xs text-zinc-500 font-bold py-1">{d}</div>)}
                    {Array.from({ length: new Date(attMonth.getFullYear(), attMonth.getMonth(), 1).getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: new Date(attMonth.getFullYear(), attMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${attMonth.getFullYear()}-${String(attMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const att = doctorDetail.attendance[dateStr];
                      const colorMap: Record<string, string> = {
                        present: "bg-emerald-500/30 text-emerald-300 border-emerald-500/40",
                        absent: "bg-rose-500/30 text-rose-300 border-rose-500/40",
                        leave: "bg-amber-500/30 text-amber-300 border-amber-500/40",
                        half_day: "bg-sky-500/30 text-sky-300 border-sky-500/40",
                        emergency: "bg-orange-500/30 text-orange-300 border-orange-500/40",
                        holiday: "bg-violet-500/30 text-violet-300 border-violet-500/40",
                      };
                      return (
                        <div key={day} className={`aspect-square rounded-md border text-xs flex items-center justify-center font-bold ${att ? colorMap[att.status] || "" : "border-white/5 text-zinc-600"}`} title={att ? `${att.status}${att.notes ? " — " + att.notes : ""}` : ""}>
                          {day}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mb-6 text-[11px]">
                    {[["present", "emerald"], ["absent", "rose"], ["leave", "amber"], ["half_day", "sky"], ["emergency", "orange"], ["holiday", "violet"]].map(([k, c]) => (
                      <div key={k} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full bg-${c}-400`} /><span className="capitalize text-zinc-400">{k.replace("_", " ")}</span></div>
                    ))}
                  </div>

                  {/* Leave History */}
                  <h4 className="font-bold mb-3 text-sm" style={{ color: "var(--foreground)" }}>Leave History</h4>
                  {doctorDetail.leaves.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4 text-center">No leave applications</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {doctorDetail.leaves.map((l: any) => (
                        <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border text-xs" style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)" }}>
                          <div>
                            <p className="font-bold" style={{ color: "var(--foreground)" }}>{l.start_date} → {l.end_date}</p>
                            <p className="text-zinc-500 mt-0.5">{l.reason}</p>
                          </div>
                          {l.status === "pending" ? (
                            <div className="flex gap-1.5">
                              <button onClick={() => handleLeaveDecision(l.id, "approved")} className="px-2 py-1 bg-emerald-500/15 text-emerald-400 rounded font-bold">Approve</button>
                              <button onClick={() => handleLeaveDecision(l.id, "rejected")} className="px-2 py-1 bg-rose-500/15 text-rose-400 rounded font-bold">Reject</button>
                            </div>
                          ) : (
                            <span className={`px-2 py-1 rounded font-bold ${l.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>{l.status}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* Holiday Modal */}
            {showHolidayModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setShowHolidayModal(false)}>
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="rounded-2xl p-8 max-w-md w-full border shadow-2xl" style={{ background: "var(--background)", borderColor: "var(--glass-border)", color: "var(--foreground)" }}>
                  <h3 className="text-xl font-black mb-6">Mark Holiday</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground)", opacity: 0.7 }}>Date</label>
                      <input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:border-sky-500" style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)", color: "var(--foreground)" }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground)", opacity: 0.7 }}>Holiday Name</label>
                      <input type="text" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="e.g., Diwali, Christmas" className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:border-sky-500" style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)", color: "var(--foreground)" }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground)", opacity: 0.7 }}>Notes (optional)</label>
                      <textarea value={holidayForm.notes} onChange={(e) => setHolidayForm({ ...holidayForm, notes: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:border-sky-500" style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)", color: "var(--foreground)" }} />
                    </div>
                    <div className="flex gap-2 pt-3">
                      <button onClick={() => setShowHolidayModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border" style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)", color: "var(--foreground)" }}>Cancel</button>
                      <button onClick={handleMarkHoliday} disabled={!holidayForm.date || !holidayForm.name} className="flex-1 px-4 py-2.5 bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold rounded-lg disabled:opacity-50">Mark Holiday</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            <motion.div variants={item} className="glass-premium rounded-[2rem] p-4 sm:p-6 border border-white/10 overflow-hidden">
              {attendanceLoading ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mx-auto" />
                </div>
              ) : attendance.length === 0 ? (
                <div className="py-16 text-center">
                  <Calendar size={36} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 font-medium">No attendance records in this range</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-zinc-500 tracking-wider">
                      <tr className="border-b border-white/5">
                        <th className="text-left p-3 font-bold">User</th>
                        <th className="text-left p-3 font-bold">Role</th>
                        <th className="text-left p-3 font-bold">Date</th>
                        <th className="text-left p-3 font-bold">First Login</th>
                        <th className="text-left p-3 font-bold">Last Activity</th>
                        <th className="text-center p-3 font-bold">Sessions</th>
                        <th className="text-left p-3 font-bold hidden lg:table-cell">IPs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((a, i) => (
                        <motion.tr
                          key={`${a.user_email}-${a.date}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.4) }}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="p-3 font-semibold text-white">{a.user_email}</td>
                          <td className="p-3">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                              a.role === "DOCTOR" ? "bg-sky-500/10 text-sky-400" :
                              a.role === "ADMIN" ? "bg-violet-500/10 text-violet-400" :
                              "bg-rose-500/10 text-rose-400"
                            }`}>{a.role}</span>
                          </td>
                          <td className="p-3 text-zinc-300">{a.date}</td>
                          <td className="p-3 text-zinc-400 text-xs">{a.first_login ? new Date(a.first_login).toLocaleTimeString() : "—"}</td>
                          <td className="p-3 text-zinc-400 text-xs">{a.last_activity ? new Date(a.last_activity).toLocaleTimeString() : "—"}</td>
                          <td className="p-3 text-center">
                            <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                              {a.session_count}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-zinc-500 hidden lg:table-cell truncate max-w-[200px]">
                            {a.ip_addresses.join(", ") || "—"}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                {(() => {
                  const acc = accuracyMetrics?.overall_accuracy;
                  const correctCount = accuracyMetrics?.feedback_distribution?.correct ?? 0;
                  const totalFb = accuracyMetrics?.total_feedback_records ?? 0;
                  const accStr = (acc !== undefined && totalFb > 0) ? `${acc}%` : "No data yet";
                  const accPct = (acc !== undefined && totalFb > 0) ? acc : 0;
                  return [
                    { label: "XGBoost Diagnosis", status: health?.ml_model === "healthy" ? "Active" : "Idle", performance: accStr, pct: accPct, color: "emerald" as const },
                    { label: "Approved Diagnoses", status: `${correctCount} correct`, performance: `${totalFb} total`, pct: totalFb > 0 ? (correctCount/totalFb)*100 : 0, color: "sky" as const },
                    { label: "Doctor Reviews", status: "Live", performance: `${stats?.total_records ?? 0} records`, pct: Math.min(100, (stats?.total_records ?? 0)), color: "violet" as const },
                  ];
                })().map((model) => (
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

            {/* Model Retraining */}
            <motion.div variants={item} className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                  <Brain size={20} className="text-white" />
                </div>
                <span className="bg-gradient-to-r from-emerald-200 to-teal-300 bg-clip-text text-transparent">
                  Model Retraining (XGBoost)
                </span>
              </h2>
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  Retrain XGBoost on doctor-approved diagnoses with feedback. Auto-falls-back to simulated mode if insufficient data.
                </p>

                {!retraining && !retrainResult && (
                  <button
                    onClick={handleRetrain}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-lg transition-all text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Brain size={16} /> Retrain Now
                  </button>
                )}

                {/* Progress bar */}
                {retraining && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 p-4 rounded-xl border border-emerald-500/30" style={{ background: "var(--glass-bg)" }}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-emerald-400">{retrainStep || "Initializing..."}</span>
                      <span className="font-mono font-black text-emerald-400">{retrainProgress}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <motion.div
                        animate={{ width: `${retrainProgress}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg shadow-emerald-500/30"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Result */}
                {retrainResult && !retraining && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl border ${retrainResult.error ? "bg-rose-500/10 border-rose-500/30" : retrainResult.simulated ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
                    {retrainResult.error ? (
                      <>
                        <p className="font-bold text-rose-400">✗ Failed</p>
                        <p className="text-xs text-rose-400/70 mt-1">{retrainResult.error}</p>
                      </>
                    ) : retrainResult.simulated ? (
                      <>
                        <p className="font-bold text-amber-400">⚠ Simulated</p>
                        <p className="text-xs text-amber-400/70 mt-1">{retrainResult.message}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-emerald-400">✓ Retrain Complete</p>
                        <p className="text-xs text-emerald-400/70 mt-1">
                          Used {retrainResult.records_used} records • Version: {retrainResult.model_version}
                        </p>
                      </>
                    )}
                    <button onClick={() => setRetrainResult(null)} className="text-xs underline mt-3 opacity-70 hover:opacity-100">Run again</button>
                  </motion.div>
                )}

                <p className="text-xs text-zinc-600">
                  Manual retrain available anytime. Feedback collected from doctor approval workflow.
                </p>
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
            {/* Recent Activity - System Actions */}
            <motion.div variants={item} className="glass-card rounded-[2rem] p-8 border border-white/[0.08]">
              <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
                  <Activity size={20} className="text-white" />
                </div>
                <span className="bg-gradient-to-r from-sky-200 to-blue-300 bg-clip-text text-transparent">
                  Recent Activity
                </span>
              </h2>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {audit.length === 0 ? (
                  <p className="py-8 text-center text-zinc-600">No recent activity</p>
                ) : (
                  audit.slice(0, 10).map((e, idx) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      whileHover={{ x: 4, backgroundColor: "rgba(139,92,246,0.06)" }}
                      className="flex items-center justify-between p-4 bg-white/3 rounded-xl transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded uppercase flex-shrink-0 ${
                          e.action === "login"  ? "bg-sky-500/10 text-sky-400" :
                          e.action === "delete" ? "bg-rose-500/10 text-rose-400" :
                          e.action === "update" ? "bg-amber-500/10 text-amber-400" :
                          e.action === "create" ? "bg-emerald-500/10 text-emerald-400" :
                          "bg-zinc-500/10 text-zinc-400"
                        }`}>{e.action}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-300 truncate">{e.user_email ?? "System"}</p>
                          {e.resource_type && <p className="text-xs text-zinc-600 truncate">{e.resource_type}</p>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-zinc-600 text-[10px]">
                          {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
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

        {/* Add User Modal (admin-only) - Solid background, theme-aware */}
        {showAddUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => !addUserLoading && setShowAddUser(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl p-8 max-w-md w-full border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--background)",
                borderColor: "var(--glass-border)",
                color: "var(--foreground)",
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-3" style={{ color: "var(--foreground)" }}>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg">
                    <Users size={18} className="text-white" />
                  </div>
                  Create New User
                </h3>
                <button
                  onClick={() => { setShowAddUser(false); setAddUserError(null); }}
                  disabled={addUserLoading}
                  className="text-zinc-400 hover:text-rose-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {addUserError && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {addUserError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--foreground)", opacity: 0.7 }}>Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-sky-500"
                    style={{
                      background: "var(--glass-bg)",
                      borderColor: "var(--glass-border)",
                      color: "var(--foreground)",
                    }}
                  >
                    <option value="DOCTOR">Doctor</option>
                    <option value="PATIENT">Patient</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {newUserForm.role === "DOCTOR" && (
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--foreground)", opacity: 0.7 }}>Specialization</label>
                    <select
                      value={newUserForm.specialization}
                      onChange={(e) => setNewUserForm({ ...newUserForm, specialization: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-sky-500"
                      style={{
                        background: "var(--glass-bg)",
                        borderColor: "var(--glass-border)",
                        color: "var(--foreground)",
                      }}
                    >
                      {["General Physician","Cardiologist","Neurologist","Dermatologist","Pediatrician","Endocrinologist","Pulmonologist","Orthopedist","Psychiatrist","Gastroenterologist","Infectious Disease Specialist"].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--foreground)", opacity: 0.7 }}>Email</label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-sky-500"
                    placeholder="dr.smith@example.com"
                    style={{
                      background: "var(--glass-bg)",
                      borderColor: "var(--glass-border)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--foreground)", opacity: 0.7 }}>Password</label>
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-sky-500"
                    placeholder="Min 8 chars, mixed case + number"
                    style={{
                      background: "var(--glass-bg)",
                      borderColor: "var(--glass-border)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => {
                      setShowAddUser(false);
                      setNewUserForm({ email: "", password: "", role: "DOCTOR", specialization: "General Physician" });
                      setAddUserError(null);
                    }}
                    disabled={addUserLoading}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border hover:opacity-80"
                    style={{
                      background: "var(--glass-bg)",
                      borderColor: "var(--glass-border)",
                      color: "var(--foreground)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setAddUserError(null);
                      setAddUserLoading(true);
                      try {
                        await api.adminCreateUser(newUserForm);
                        setShowAddUser(false);
                        setNewUserForm({ email: "", password: "", role: "DOCTOR", specialization: "General Physician" });
                        const fresh: any = await api.getAllUsers();
                        setUsers(fresh as AllUser[]);
                      } catch (e: any) {
                        setAddUserError(e.message || "Failed to create user");
                      } finally {
                        setAddUserLoading(false);
                      }
                    }}
                    disabled={addUserLoading || !newUserForm.email || !newUserForm.password}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-sky-500/30"
                  >
                    {addUserLoading ? "Creating..." : "Create User"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Doctor Assignment Modal */}
        {showAssignModal && selectedPatientForAssignment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => !assignmentLoading && setShowAssignModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl p-8 max-w-md w-full border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--background)",
                borderColor: "var(--glass-border)",
                color: "var(--foreground)",
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-3" style={{ color: "var(--foreground)" }}>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg">
                    <Stethoscope size={18} className="text-white" />
                  </div>
                  {selectedPatientForAssignment.assigned_doctors && selectedPatientForAssignment.assigned_doctors.length > 0 ? "Reassign Doctor" : "Assign Doctor"}
                </h3>
                <button
                  onClick={() => !assignmentLoading && setShowAssignModal(false)}
                  disabled={assignmentLoading}
                  className="text-zinc-400 hover:text-rose-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {assignmentError && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {assignmentError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--foreground)", opacity: 0.7 }}>Patient</label>
                  <div className="p-3 rounded-lg border" style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)" }}>
                    <p className="font-bold text-sm">{selectedPatientForAssignment.first_name} {selectedPatientForAssignment.last_name}</p>
                    <p className="text-xs text-zinc-500">{selectedPatientForAssignment.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--foreground)", opacity: 0.7 }}>Select Doctor</label>
                  <select
                    value={selectedDoctorForAssignment}
                    onChange={(e) => setSelectedDoctorForAssignment(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-sky-500"
                    style={{
                      background: "var(--glass-bg)",
                      borderColor: "var(--glass-border)",
                      color: "var(--foreground)",
                    }}
                  >
                    <option value="">Choose a doctor...</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.name} — {doc.specialization}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedPatientForAssignment(null);
                      setSelectedDoctorForAssignment("");
                      setAssignmentError(null);
                    }}
                    disabled={assignmentLoading}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border hover:opacity-80"
                    style={{
                      background: "var(--glass-bg)",
                      borderColor: "var(--glass-border)",
                      color: "var(--foreground)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitDoctorAssignment}
                    disabled={assignmentLoading || !selectedDoctorForAssignment}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-sky-500/30"
                  >
                    {assignmentLoading ? "Assigning..." : selectedPatientForAssignment.assigned_doctors && selectedPatientForAssignment.assigned_doctors.length > 0 ? "Reassign Doctor" : "Assign Doctor"}
                  </button>
                </div>
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
