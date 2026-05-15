"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Plus, Stethoscope, CheckCircle, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DashboardBg from "@/components/DashboardBg";
import AppointmentForm from "@/components/forms/AppointmentForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api, APIError } from "@/lib/api";

interface Appointment {
  id: string;
  patient_id: string;
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
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

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
      fetchAppointments();
    } catch (err: any) {
      setError(err.message || "Failed to cancel appointment");
    }
  };

  const filtered = appointments.filter(
    (a) => filter === "all" || a.status === filter
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
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-rose-200 via-rose-400 to-pink-500 bg-clip-text text-transparent">
              Appointments
            </h1>
            <p className="text-zinc-500 mt-2 font-medium">
              {user?.email?.split("@")[0]}&apos;s scheduled visits
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-rose-500 hover:bg-rose-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl shadow-rose-500/20 active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Book Appointment</span>
          </button>
        </motion.header>

        <div className="flex gap-2 mb-8">
          {(["all", "upcoming", "completed"] as const).map((f) => (
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
                          <p className="font-bold" style={{ color: "var(--foreground)" }}>{appt.specialist}</p>
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
            onSuccess={() => {
              setShowForm(false);
              fetchAppointments();
            }}
            onCancel={() => setShowForm(false)}
          />
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
