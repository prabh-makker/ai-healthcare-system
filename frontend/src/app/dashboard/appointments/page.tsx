"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Plus, Stethoscope, CheckCircle, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DashboardBg from "@/components/DashboardBg";
import AppointmentForm from "@/components/forms/AppointmentForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import DoctorCalendar from "@/components/DoctorCalendar";
import { api, APIError } from "@/lib/api";

interface Appointment {
  id: string;
  patient_id: string;
  patient_email?: string;
  specialist: string;
  date: string;
  time: string;
  status: string;
  reason: string;
  created_at?: string;
}

const statusConfig = {
  upcoming: {
    glow: "rgba(14,165,233,0.35)",
    border: "#0ea5e9",
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    icon: Clock,
    label: "Upcoming",
  },
  completed: {
    glow: "rgba(113,113,122,0.25)",
    border: "#71717a",
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    icon: CheckCircle,
    label: "Completed",
  },
  cancelled: {
    glow: "rgba(244,63,94,0.35)",
    border: "#f43f5e",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    icon: X,
    label: "Cancelled",
  },
};

function AppointmentsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const searchParams = useSearchParams();
  const prefilledSpecialist = searchParams.get("specialist") || "";
  const prefilledReason = searchParams.get("reason") || "";
  const [tab, setTab] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorsSummary, setDoctorsSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(!!prefilledSpecialist && !isAdmin);
  const headerRef = useRef<HTMLDivElement>(null);

  // Set initial tab based on user role
  useEffect(() => {
    if (user?.role === "DOCTOR") {
      setTab("calendar");
    }
  }, [user?.role]);

  // Admin: load per-doctor summary
  useEffect(() => {
    if (isAdmin) {
      api.getAdminDoctorsAppointmentSummary()
        .then((data: any) => setDoctorsSummary(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [isAdmin]);

  // Mouse parallax on header
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (!headerRef.current) return;
      const { innerWidth, innerHeight } = window;
      const dx = ((e.clientX / innerWidth) - 0.5) * 10;
      const dy = ((e.clientY / innerHeight) - 0.5) * 10;
      headerRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await api.getAppointments(0, 50);
      setAppointments(data);
      setError(null);
    } catch (err: any) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError("Failed to load appointments");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }
    try {
      await api.cancelAppointment(id);
      await fetchAppointments();
    } catch (err: any) {
      setError(err.message || "Failed to cancel appointment");
    }
  };

  const filtered = useMemo(
    () => appointments.filter((a) => filter === "all" || a.status === filter),
    [appointments, filter]
  );

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  };

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#f43f5e" />

      <div className="relative z-10">
        <motion.header
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-12"
          style={{ willChange: "transform", transition: "transform 0.12s ease-out" }}
        >
          <div>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#4169E1' }}>
              {isAdmin ? "Doctor Schedule Overview" : user?.role === "DOCTOR" ? "Schedule" : "Appointments"}
            </h1>
            <p className="text-zinc-500 mt-2 text-sm sm:text-base font-medium">
              {isAdmin
                ? `${doctorsSummary.length} doctors • Real-time appointment stats`
                : user?.role === "DOCTOR"
                ? "Appointments you'll have"
                : `${user?.email?.split("@")[0]}'s scheduled visits`}
            </p>
          </div>
          {user?.role === "PATIENT" && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-rose-500 hover:bg-rose-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl shadow-rose-500/20 active:scale-95"
            >
              <Plus size={20} strokeWidth={3} />
              <span>Book Appointment</span>
            </button>
          )}
        </motion.header>

        {/* Admin: Per-Doctor Schedule Cards */}
        {isAdmin && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {doctorsSummary.map((doc: any, i: number) => (
              <motion.div
                key={doc.doctor_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="glass-card rounded-2xl p-5 border border-white/[0.08] hover:border-rose-500/40 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                      <Stethoscope size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="font-black text-base" style={{ color: "var(--foreground)" }}>
                        Dr. {(doc.first_name || "") + " " + (doc.last_name || "")}
                      </p>
                      <p className="text-xs text-zinc-500">{doc.specialization || "—"}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${doc.is_available ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-500/15 text-zinc-500"}`}>
                    {doc.is_available ? "On Duty" : "Off"}
                  </span>
                </div>

                {/* Big total */}
                <div className="mb-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Total Appointments</p>
                  <p className="text-4xl font-black mt-1" style={{ color: "var(--foreground)" }}>{doc.total}</p>
                </div>

                {/* Status breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
                    <p className="text-sky-400 font-black text-lg">{doc.upcoming}</p>
                    <p className="text-sky-500/70 text-[10px] mt-0.5">Upcoming</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-emerald-400 font-black text-lg">{doc.completed}</p>
                    <p className="text-emerald-500/70 text-[10px] mt-0.5">Completed</p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-400 font-black text-lg">{doc.pending}</p>
                    <p className="text-amber-500/70 text-[10px] mt-0.5">Pending</p>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <p className="text-rose-400 font-black text-lg">{doc.cancelled}</p>
                    <p className="text-rose-500/70 text-[10px] mt-0.5">Cancelled</p>
                  </div>
                </div>

                {doc.today > 0 && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-violet-500/15 border border-violet-500/30 text-center">
                    <p className="text-xs text-violet-400 font-bold">📅 {doc.today} appointment{doc.today > 1 ? "s" : ""} today</p>
                  </div>
                )}
              </motion.div>
            ))}
            {doctorsSummary.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-500">No doctors with appointments yet</div>
            )}
          </motion.div>
        )}

        {user?.role === "DOCTOR" && (
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setTab("calendar")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                tab === "calendar"
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                  : "text-zinc-500 hover:text-[var(--foreground)] bg-white/5"
              }`}
            >
              My Calendar
            </button>
            <button
              onClick={() => setTab("list")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                tab === "list"
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                  : "text-zinc-500 hover:text-[var(--foreground)] bg-white/5"
              }`}
            >
              All Appointments
            </button>
          </div>
        )}

        {tab === "calendar" && user?.role === "DOCTOR" && <DoctorCalendar />}

        {(user?.role !== "DOCTOR" || tab === "list") && (
          <>
            <div className="flex gap-2 mb-8">
              {(["all", "upcoming", "completed", "cancelled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                filter === f
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                  : "text-zinc-500 hover:text-[var(--foreground)] bg-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
          </div>
        )}

        {error && !loading && (
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

        {!loading && !error && (
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card rounded-[2rem] p-16 text-center"
              >
                <Calendar size={40} className="text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 font-medium">No appointments found</p>
                <p className="text-zinc-600 text-sm mt-1">Book your first appointment to get started.</p>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                className="space-y-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {filtered.map((appt) => {
                  const cfg = statusConfig[appt.status as keyof typeof statusConfig] || statusConfig.upcoming;
                  const StatusIcon = cfg.icon;
                  return (
                    <motion.div
                      key={appt.id}
                      variants={itemVariants}
                      whileHover={{ y: -4, scale: 1.01 }}
                      className="glass-card rounded-[2rem] p-6 flex items-center justify-between relative overflow-hidden"
                      style={{
                        borderTop: `2px solid ${cfg.border}`,
                        boxShadow: `0 0 20px ${cfg.glow}`,
                      }}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`p-3 rounded-2xl ${cfg.bg}`}>
                          <Stethoscope size={22} className={cfg.text} />
                        </div>
                        <div>
                          <p className="font-bold text-white">{appt.specialist}</p>
                          {appt.patient_email && (
                            <p className="text-sky-400 text-xs font-semibold mt-0.5">{appt.patient_email}</p>
                          )}
                          <p className="text-zinc-500 text-sm mt-0.5">{appt.reason || "No reason provided"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 text-sm">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Calendar size={15} />
                          <span>{appt.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Clock size={15} />
                          <span>{appt.time}</span>
                        </div>
                        <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl ${cfg.bg} ${cfg.text}`}>
                          <StatusIcon size={12} />
                          {cfg.label}
                        </span>
                        {appt.status === "upcoming" && (
                          <button
                            onClick={() => handleCancel(appt.id)}
                            className="text-xs px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-lg transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}

            {showForm && (
              <AppointmentForm
                isModal={true}
                defaultSpecialist={prefilledSpecialist}
                defaultReason={prefilledReason}
                onSuccess={() => {
                  setShowForm(false);
                  fetchAppointments();
                }}
                onCancel={() => setShowForm(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <ProtectedRoute>
      <AppointmentsContent />
    </ProtectedRoute>
  );
}
