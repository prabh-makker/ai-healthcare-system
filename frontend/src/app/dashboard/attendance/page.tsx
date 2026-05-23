"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle, X, Clock, Plus, AlertCircle, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DashboardBg from "@/components/DashboardBg";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api, APIError } from "@/lib/api";

interface AttendanceRecord {
  date: string;
  status: "present" | "absent" | "leave";
  notes?: string;
  marked_at?: string;
}

interface LeaveApplication {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const STATUS_CONFIG = {
  present: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    label: "Present",
    glow: "rgba(16,185,129,0.35)",
  },
  absent: {
    icon: X,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "Absent",
    glow: "rgba(239,68,68,0.35)",
  },
  leave: {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    label: "On Leave",
    glow: "rgba(245,158,11,0.35)",
  },
};

function AttendanceContent() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [leaveApps, setLeaveApps] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveFormData, setLeaveFormData] = useState({ start_date: "", end_date: "", reason: "" });

  useEffect(() => {
    if (user?.role === "DOCTOR") fetchAttendance();
    else setLoading(false);
  }, [currentMonth, user?.role]);

  useEffect(() => {
    if (user?.role === "DOCTOR") fetchLeaveApplications();
  }, [user?.role]);

  const fetchAttendance = async () => {
    if (user?.role !== "DOCTOR") return;
    try {
      setLoading(true);
      const data = await api.getAttendanceLogs(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
      setAttendance(data || {});
      setError(null);
    } catch (err: any) {
      // Silent fail on 403 (non-doctor users)
      if (err?.status === 403) return;
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError("Failed to load attendance");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveApplications = async () => {
    // Only fetch if user is a doctor (endpoint requires DOCTOR role)
    if (user?.role !== "DOCTOR") return;
    try {
      const data = await api.getLeaveApplications();
      setLeaveApps(data || []);
    } catch (err: any) {
      // Silent fail on 403 (non-doctor users) — expected for admin/patient
      if (err?.status !== 403) {
        console.error("Failed to load leave applications", err);
      }
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveFormData.start_date || !leaveFormData.end_date || !leaveFormData.reason) {
      setError("All fields required");
      return;
    }
    try {
      await api.applyLeave(leaveFormData.start_date, leaveFormData.end_date, leaveFormData.reason);
      setShowLeaveModal(false);
      setLeaveFormData({ start_date: "", end_date: "", reason: "" });
      setError(null);
      fetchLeaveApplications();
    } catch (err: any) {
      setError(err.message || "Failed to apply leave");
    }
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ day: i, dateStr });
    }
    return days;
  }, [currentMonth]);

  const stats = useMemo(() => {
    const present = Object.values(attendance).filter(r => r.status === "present").length;
    const absent = Object.values(attendance).filter(r => r.status === "absent").length;
    const leave = Object.values(attendance).filter(r => r.status === "leave").length;
    const total = present + absent + leave;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, leave, percentage };
  }, [attendance]);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#f59e0b" />

      <div className="relative z-10">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex justify-between items-start"
        >
          <div>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#4169E1' }}>
              Attendance Tracker
            </h1>
            <p className="text-zinc-500 mt-2 text-sm sm:text-base font-medium">
              {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLeaveModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl shadow-amber-500/20"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Apply Leave</span>
          </motion.button>
        </motion.header>

        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl mb-8"
          >
            <AlertCircle size={24} className="text-red-400 flex-shrink-0" />
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Present", value: stats.present, icon: CheckCircle, color: "emerald" },
            { label: "Absent", value: stats.absent, icon: X, color: "red" },
            { label: "On Leave", value: stats.leave, icon: Clock, color: "amber" },
            { label: "Attendance %", value: `${stats.percentage}%`, icon: TrendingUp, color: "sky" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card rounded-2xl p-6 border border-${stat.color}-500/20`}
                style={{
                  borderColor: `var(--${stat.color}-500)`,
                  boxShadow: `0 0 20px rgba(${stat.color === 'emerald' ? '16,185,129' : stat.color === 'red' ? '239,68,68' : stat.color === 'amber' ? '245,158,11' : '14,165,233'},0.1)`,
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-zinc-500 text-sm font-medium mb-2">{stat.label}</p>
                    <p className="text-3xl font-black" style={{ color: `var(--foreground)` }}>
                      {stat.value}
                    </p>
                  </div>
                  <Icon size={32} className={`text-${stat.color}-400`} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-[2rem] p-8 border border-white/[0.08] mb-8"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                <Calendar size={20} className="text-white" />
              </div>
              <span className="bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">
                Monthly Overview
              </span>
            </h2>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={prevMonth}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
              >
                ←
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={nextMonth}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
              >
                →
              </motion.button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="text-center text-xs font-bold text-zinc-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} />;

                  const record = attendance[day.dateStr];
                  const cfg = record ? STATUS_CONFIG[record.status] : null;
                  const StatusIcon = cfg?.icon;

                  return (
                    <motion.div
                      key={day.dateStr}
                      whileHover={{ scale: 1.05 }}
                      className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-sm font-bold cursor-default transition-all ${
                        cfg
                          ? `${cfg.bg} ${cfg.border} border-2`
                          : "bg-white/5 border-white/10"
                      }`}
                      style={cfg ? { boxShadow: `0 0 12px ${cfg.glow}` } : {}}
                    >
                      <span className="text-zinc-400">{day.day}</span>
                      {StatusIcon && <StatusIcon size={16} className={cfg.color} />}
                    </motion.div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-4 mt-6 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <Icon size={16} className={cfg.color} />
                      <span className="text-xs text-zinc-500">{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Leave Applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-[2rem] p-8 border border-white/[0.08]"
        >
          <h2 className="text-xl font-black mb-6 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/20">
              <Clock size={20} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-200 to-pink-300 bg-clip-text text-transparent">
              Recent Leave Applications
            </span>
          </h2>

          {leaveApps.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No leave applications yet</p>
          ) : (
            <div className="space-y-3">
              {leaveApps.map((app, idx) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-premium rounded-xl p-4 border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-sm">{app.reason}</p>
                    <p className="text-xs text-zinc-500">
                      {app.start_date} to {app.end_date}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                    app.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                    app.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Leave Modal */}
        <AnimatePresence>
          {showLeaveModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setShowLeaveModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="glass-card rounded-2xl p-8 max-w-md w-full border border-white/10"
              >
                <h3 className="text-xl font-black mb-6">Apply for Leave</h3>
                <form onSubmit={handleLeaveSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-zinc-400">Start Date</label>
                    <input
                      type="date"
                      required
                      value={leaveFormData.start_date}
                      onChange={e => setLeaveFormData({ ...leaveFormData, start_date: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-zinc-400">End Date</label>
                    <input
                      type="date"
                      required
                      value={leaveFormData.end_date}
                      onChange={e => setLeaveFormData({ ...leaveFormData, end_date: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-zinc-400">Reason</label>
                    <textarea
                      required
                      value={leaveFormData.reason}
                      onChange={e => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setShowLeaveModal(false)}
                      className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      className="flex-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold transition-all"
                    >
                      Submit
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <ProtectedRoute requiredRole="DOCTOR">
      <AttendanceContent />
    </ProtectedRoute>
  );
}
