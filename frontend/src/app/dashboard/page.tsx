"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Activity, Users, TrendingUp, Bell, Plus,
  ArrowUpRight, ChevronRight, Clock, ClipboardList, HeartPulse,
  Pill, Zap, Brain, Stethoscope, Dna, Fingerprint,
  FileCheck, Edit3, Save, Calendar as CalendarIcon, MessageSquare,
} from "lucide-react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import NotificationBell from "@/components/NotificationBell";

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

// ── Background effects (absolute so they respect the main layout) ─────────────

function Particles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    w: (i % 3) + 2,
    h: (i % 3) + 2,
    alpha: ((i % 5) + 1) * 0.06,
    left: ((i * 37) % 100),
    top: ((i * 53) % 100),
    dur: 4 + (i % 4),
    dx: (i % 7) - 3,
    delay: (i % 4) * 0.5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.w,
            height: p.h,
            background: `rgba(14,165,233,${p.alpha})`,
            left: `${p.left}%`,
            top: `${p.top}%`,
          }}
          animate={{ y: [0, -50, 0], x: [0, p.dx, 0], opacity: [0.2, 0.9, 0.2], scale: [1, 1.8, 1] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}
    </div>
  );
}

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.04 }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(14,165,233,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14,165,233,0.6) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 30%, rgba(14,165,233,0.2), transparent 70%)" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function GradientOrbs({ isDoctor }: { isDoctor: boolean }) {
  const color1 = isDoctor ? "rgba(14,165,233,0.12)" : "rgba(244,63,94,0.12)";
  return (
    <>
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 700, height: 700, borderRadius: "50%",
          background: `radial-gradient(circle, ${color1}, transparent 70%)`,
          left: "-10%", top: "-10%",
        }}
        animate={{ x: [0, 80, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)",
          right: "-5%", bottom: "0%",
        }}
        animate={{ x: [0, -60, 0], y: [0, -50, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

function FloatingIcons({ isDoctor }: { isDoctor: boolean }) {
  const doctorIcons = [
    { Icon: Stethoscope, style: { right: "2%", top: "15%" }, delay: 0 },
    { Icon: Brain, style: { right: "5%", bottom: "20%" }, delay: 1.2 },
    { Icon: Dna, style: { right: "18%", top: "8%" }, delay: 0.6 },
  ];
  const patientIcons = [
    { Icon: HeartPulse, style: { right: "2%", top: "15%" }, delay: 0 },
    { Icon: Fingerprint, style: { right: "5%", bottom: "20%" }, delay: 1.2 },
    { Icon: Pill, style: { right: "18%", top: "8%" }, delay: 0.6 },
  ];
  const icons = isDoctor ? doctorIcons : patientIcons;
  return (
    <>
      {icons.map(({ Icon, style, delay }, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{ ...style, color: "rgba(14,165,233,0.07)" }}
          animate={{ y: [0, -25, 0], rotate: [0, 10, 0], opacity: [0.04, 0.14, 0.04] }}
          transition={{ duration: 5 + i * 1.5, repeat: Infinity, ease: "easeInOut", delay }}
        >
          <Icon size={56} />
        </motion.div>
      ))}
    </>
  );
}

function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px pointer-events-none"
      style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.5), transparent)" }}
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
    />
  );
}

// ── 3D Tilt Stat Card ─────────────────────────────────────────────────────────

function StatCard3D({
  label, value, icon: Icon, trend, gradFrom, gradTo, glowColor, delay, href, onClick,
}: {
  label: string; value: string; icon: React.ElementType;
  trend: string; gradFrom: string; gradTo: string; glowColor: string; delay?: number; href?: string; onClick?: () => void;
}) {
  // Disable 3D rotation to fix hang
  const handleMouseMove = useCallback(() => {}, []);
  const handleMouseLeave = useCallback(() => {}, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 70, damping: 14, delay: delay || 0 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`group relative ${onClick || href ? "cursor-pointer" : "cursor-default"}`}
    >
      {/* Glow halo */}
      <motion.div
        className="absolute -inset-2 rounded-[2.4rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none"
        style={{ background: glowColor }}
      />

      <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] p-4 md:p-6 glass-premium card-3d border border-white/[0.08] group-hover:border-white/[0.2] transition-all duration-300">
        <ScanLine />
        {/* Hospital scan line */}
        <div className="scan-line opacity-30 group-hover:opacity-60 transition-opacity" />

        {/* BG gradient sweep on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${gradFrom}10, ${gradTo}05)` }}
        />

        {/* Shimmer */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{ background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.05) 50%, transparent 65%)" }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-5">
            <motion.div
              className="p-3.5 rounded-2xl"
              style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`, boxShadow: `0 8px 24px ${gradFrom}40` }}
              whileHover={{ rotate: 15, scale: 1.2 }}
            >
              <Icon size={24} className="text-white drop-shadow" />
            </motion.div>

            <motion.div
              className="flex items-center space-x-1 text-xs font-black px-2.5 py-1.5 rounded-xl border"
              style={
                trend.startsWith("+")
                  ? { background: "rgba(16,185,129,0.1)", color: "#34d399", borderColor: "rgba(16,185,129,0.25)" }
                  : { background: "rgba(14,165,233,0.1)", color: "#38bdf8", borderColor: "rgba(14,165,233,0.25)" }
              }
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: (delay || 0) + 0.3, type: "spring" }}
            >
              <span>{trend}</span>
              <ArrowUpRight size={11} />
            </motion.div>
          </div>

          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">{label}</p>
          <motion.h3
            className="text-2xl lg:text-3xl font-bold mt-2 tracking-tight"
            style={{ color: "var(--foreground)", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (delay || 0) + 0.15 }}
          >
            {value}
          </motion.h3>
        </div>

        {/* Animated bottom bar */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 rounded-full"
          style={{ background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})` }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.4, delay: (delay || 0) + 0.4, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

// ── Doctor widgets ────────────────────────────────────────────────────────────

function DoctorTodaysAppointments({ appointments, onNavigate }: { appointments: any[]; onNavigate: () => void }) {
  return (
    <section>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
          <CalendarIcon size={20} className="text-sky-400" />
          Today&apos;s Appointments
        </h2>
        <button onClick={onNavigate} className="text-sky-400 text-sm font-bold hover:text-sky-300 flex items-center gap-1 group">
          <span>View All</span><ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      <div className="glass-premium rounded-[2rem] p-5 border border-white/10 min-h-[200px]">
        {appointments.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarIcon size={36} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium text-sm">No appointments today</p>
            <p className="text-zinc-600 text-xs mt-1">All clear — enjoy a calm day!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt: any, i: number) => (
              <motion.div
                key={appt.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ x: 4 }}
                onClick={onNavigate}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--foreground)" }}>{appt.time}</p>
                    <p className="text-xs text-zinc-500 truncate">{appt.patient_email || "Patient"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-zinc-400 hidden sm:inline">{appt.reason || "Consultation"}</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                    appt.status === "upcoming" ? "bg-sky-500/10 text-sky-400" :
                    appt.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                    "bg-zinc-500/10 text-zinc-400"
                  }`}>{appt.status}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function DoctorQuickNotes({ pendingRecords, onSaved }: { pendingRecords: any[]; onSaved: (id: string) => void }) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [noteText, setNoteText] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async (id: string) => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      await api.patchRecord(id, { doctor_notes: noteText, status: "approved" });
      onSaved(id);
      setEditingId(null);
      setNoteText("");
    } catch (e) {
      console.error("Failed to save note", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
          <Edit3 size={20} className="text-emerald-400" />
          Pending — Add Notes
        </h2>
        <Link href="/dashboard/approvals" className="text-emerald-400 text-sm font-bold hover:text-emerald-300 flex items-center gap-1 group">
          <span>View All</span><ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
      <div className="glass-premium rounded-[2rem] p-5 border border-white/10 min-h-[200px]">
        {pendingRecords.length === 0 ? (
          <div className="py-12 text-center">
            <FileCheck size={36} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium text-sm">No pending records</p>
            <p className="text-zinc-600 text-xs mt-1">All caught up.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRecords.map((rec: any, i: number) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-xl bg-white/[0.03] border border-white/5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--foreground)" }}>
                      {rec.ai_prediction || "Pending diagnosis"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      Symptoms: {Array.isArray(rec.symptoms) ? rec.symptoms.join(", ") : "—"}
                    </p>
                  </div>
                  {editingId !== rec.id && (
                    <button
                      onClick={() => { setEditingId(rec.id); setNoteText(rec.doctor_notes || ""); }}
                      className="shrink-0 px-3 py-1.5 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-all flex items-center gap-1"
                    >
                      <Edit3 size={12} />
                      Add Note
                    </button>
                  )}
                </div>
                {editingId === rec.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2 mt-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Write your medical note here..."
                      rows={3}
                      autoFocus
                      className="w-full px-3 py-2 text-sm bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(rec.id)}
                        disabled={saving || !noteText.trim()}
                        className="flex-1 px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Save size={12} />
                        {saving ? "Saving..." : "Save & Approve"}
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setNoteText(""); }}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function PulseDots({ color = "#0ea5e9" }: { color?: string }) {
  return (
    <div className="flex space-x-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.4, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22 }}
        />
      ))}
    </div>
  );
}

function StatusBar() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="flex items-center space-x-4 text-[11px] font-mono mt-1.5 tracking-wide"
      style={{ color: "var(--foreground)", opacity: 0.45 }}
    >
      <div className="flex items-center space-x-1.5">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-emerald-500"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span>SYSTEM ONLINE</span>
      </div>
      <span className="text-zinc-800">|</span>
      <span>AI MODEL LOADED</span>
      <span className="text-zinc-800">|</span>
      <span>TLS 1.3</span>
    </motion.div>
  );
}

function ShimmerButton({ href, children, gradFrom, gradTo, shadow }: {
  href: string; children: React.ReactNode;
  gradFrom: string; gradTo: string; shadow: string;
}) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
      <Link
        href={href}
        className="relative overflow-hidden text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2"
        style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`, boxShadow: `0 20px 40px ${shadow}` }}
      >
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)" }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <span className="relative z-10 flex items-center space-x-2">{children}</span>
      </Link>
    </motion.div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [mounted, setMounted] = useState(false);
  const isDoctor = user?.role === "DOCTOR";

  // Admin sees rich admin dashboard at /dashboard/admin
  useEffect(() => {
    if (user?.role === "ADMIN") {
      router.replace("/dashboard/admin");
    }
  }, [user?.role, router]);

  const [activeMedsCount, setActiveMedsCount] = useState<number | null>(null);
  const [upcomingAppts, setUpcomingAppts] = useState<number | null>(null);
  // Doctor-only state
  const [myPatientsCount, setMyPatientsCount] = useState<number | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number | null>(null);
  const [activeRxCount, setActiveRxCount] = useState<number | null>(null);
  const [todaysAppointments, setTodaysAppointments] = useState<any[]>([]);
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    // Patient/doctor: fetch their records, medications, and appointments
    Promise.allSettled([
      api.getRecords(0, 50),
      api.getPrescriptions(0, 50),
      api.getAppointments(),
    ]).then(([recordsRes, prescriptionsRes, appointmentsRes]) => {
      if (cancelled) return;
      const records = recordsRes.status === "fulfilled" ? recordsRes.value : [];
      const prescriptions = prescriptionsRes.status === "fulfilled" ? prescriptionsRes.value : [];
      const appointments = appointmentsRes.status === "fulfilled" ? appointmentsRes.value : [];
      setStats({
        total_records: Array.isArray(records) ? records.length : 0,
        total_patients: 0,
        total_doctors: 0,
        recent_records: Array.isArray(records) ? records : [],
      });
      setActiveMedsCount(Array.isArray(prescriptions) ? prescriptions.filter((p: any) => p.status === "active").length : 0);
      setUpcomingAppts(Array.isArray(appointments) ? appointments.filter((a: any) => a.status === "upcoming").length : 0);
      // Active Rx count for doctor
      setActiveRxCount(Array.isArray(prescriptions) ? prescriptions.filter((p: any) => p.status === "active").length : 0);
      // Today's appointments (doctor view)
      const today = new Date().toISOString().split("T")[0];
      setTodaysAppointments(Array.isArray(appointments) ? appointments.filter((a: any) => a.date === today) : []);
    });

    // Doctor-only fetches
    if (user?.role === "DOCTOR") {
      Promise.allSettled([
        api.getMyPatients(),
        api.getPendingRecords(),
      ]).then(([patientsRes, pendingRes]) => {
        if (cancelled) return;
        const patients = patientsRes.status === "fulfilled" ? patientsRes.value : [];
        const pending = pendingRes.status === "fulfilled" ? pendingRes.value : [];
        setMyPatientsCount(Array.isArray(patients) ? patients.length : 0);
        setPendingApprovalsCount(Array.isArray(pending) ? pending.length : 0);
        setPendingRecords(Array.isArray(pending) ? pending.slice(0, 3) : []);
      });
    }

    return () => { cancelled = true; };
  }, [user?.role]);

  if (!mounted || user?.role === "ADMIN") return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
  };

  const DoctorDashboard = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-wrap justify-between items-start gap-6 mb-14 mt-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              className="p-2.5 rounded-2xl"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)", boxShadow: "0 12px 32px rgba(14,165,233,0.35)" }}
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Stethoscope size={22} className="text-white" />
            </motion.div>
            <PulseDots color="#0ea5e9" />
          </div>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight"
            style={{ backgroundImage: "linear-gradient(135deg, #bae6fd, #7dd3fc, #0ea5e9, #06b6d4)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
          >
            Clinical Dashboard
          </h1>
          <p className="text-zinc-500 mt-1 text-sm sm:text-base font-bold">Welcome back, Dr. {user?.email?.split("@")[0] || "Physician"}</p>
          <StatusBar />
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <NotificationBell />
          <ShimmerButton href="/dashboard/approvals" gradFrom="#0ea5e9" gradTo="#06b6d4" shadow="rgba(14,165,233,0.3)">
            <FileCheck size={20} strokeWidth={3} />
            <span>Review Approvals</span>
          </ShimmerButton>
        </div>
      </motion.header>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8 sm:mb-12 overflow-hidden">
        <StatCard3D label="My Patients" value={myPatientsCount === null ? "—" : String(myPatientsCount)} icon={Users} trend="assigned" gradFrom="#0ea5e9" gradTo="#06b6d4" glowColor="rgba(14,165,233,0.2)" delay={0} onClick={() => router.push("/dashboard/my-patients")} />
        <StatCard3D label="Today's Appointments" value={String(todaysAppointments.length)} icon={CalendarIcon} trend="scheduled" gradFrom="#8b5cf6" gradTo="#a78bfa" glowColor="rgba(139,92,246,0.2)" delay={0.1} onClick={() => router.push("/dashboard/appointments")} />
        <StatCard3D label="Pending Approvals" value={pendingApprovalsCount === null ? "—" : String(pendingApprovalsCount)} icon={Brain} trend="pending" gradFrom="#10b981" gradTo="#34d399" glowColor="rgba(16,185,129,0.2)" delay={0.2} onClick={() => router.push("/dashboard/approvals")} />
        <StatCard3D label="Active Rx" value={activeRxCount === null ? "—" : String(activeRxCount)} icon={Pill} trend="active" gradFrom="#f59e0b" gradTo="#fbbf24" glowColor="rgba(245,158,11,0.2)" delay={0.3} onClick={() => router.push("/dashboard/prescriptions")} />
      </motion.div>


      {/* Today's Appointments + Quick Notes — Doctor operations row */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mt-8">
        <DoctorTodaysAppointments appointments={todaysAppointments} onNavigate={() => router.push("/dashboard/appointments")} />
        <DoctorQuickNotes
          pendingRecords={pendingRecords}
          onSaved={(id) => {
            setPendingRecords((prev) => prev.filter((r) => r.id !== id));
            setPendingApprovalsCount((c) => (c !== null ? Math.max(0, c - 1) : c));
          }}
        />
      </motion.div>
    </motion.div>
  );

  const PatientDashboard = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-wrap justify-between items-start gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <motion.div
              className="p-2.5 rounded-2xl"
              style={{ background: "linear-gradient(135deg, #f43f5e, #ec4899)", boxShadow: "0 12px 32px rgba(244,63,94,0.35)" }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <HeartPulse size={22} className="text-white" />
            </motion.div>
            <PulseDots color="#f43f5e" />
          </div>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight"
            style={{ backgroundImage: "linear-gradient(135deg, #fecdd3, #fda4af, #f43f5e, #ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
          >
            My Health Portal
          </h1>
          <p className="text-zinc-500 mt-1 text-sm sm:text-base font-bold">Welcome back, {user?.email?.split("@")[0] || "Patient"}</p>
          <StatusBar />
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <NotificationBell />
          <ShimmerButton href="/dashboard/symptoms" gradFrom="#f43f5e" gradTo="#ec4899" shadow="rgba(244,63,94,0.3)">
            <Activity size={20} strokeWidth={3} />
            <span>Check Symptoms</span>
          </ShimmerButton>
        </div>
      </motion.header>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8 sm:mb-12 overflow-hidden">
        <StatCard3D label="Health Score" value={stats?.recent_records?.length ? "Active" : "—"} icon={HeartPulse} trend={stats?.recent_records?.length ? "tracked" : "no data"} gradFrom="#f43f5e" gradTo="#ec4899" glowColor="rgba(244,63,94,0.2)" delay={0} />
        <StatCard3D label="Medical Records" value={stats ? String(stats?.recent_records?.filter(r => r.patient_id === user?.id).length ?? 0) : "—"} icon={ClipboardList} trend="+latest" gradFrom="#8b5cf6" gradTo="#a78bfa" glowColor="rgba(139,92,246,0.2)" delay={0.1} onClick={() => router.push("/dashboard/records")} />
        <StatCard3D label="Appointments" value={upcomingAppts === null ? "—" : String(upcomingAppts)} icon={Clock} trend={upcomingAppts ? "upcoming" : "none"} gradFrom="#10b981" gradTo="#34d399" glowColor="rgba(16,185,129,0.2)" delay={0.2} onClick={() => router.push("/dashboard/appointments")} />
        <StatCard3D label="Medications" value={activeMedsCount === null ? "—" : `${activeMedsCount} Active`} icon={Pill} trend="on track" gradFrom="#f59e0b" gradTo="#fbbf24" glowColor="rgba(245,158,11,0.2)" delay={0.3} onClick={() => router.push("/dashboard/medications")} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <section className="xl:col-span-2">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold" style={{ backgroundImage: "linear-gradient(135deg, #fecdd3, #fda4af)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              Recent Diagnoses
            </h2>
            <Link href="/dashboard/records" className="text-rose-500 text-sm font-bold hover:text-rose-400 flex items-center gap-1 group">
              <span>View All</span><ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="glass-card rounded-[2rem] overflow-hidden border border-white/[0.07] relative">
            <ScanLine />
            <table className="w-full text-left">
              <thead><tr className="border-b border-white/5 bg-white/[0.02]">
                {["AI Prediction","Specialist","Confidence","Date"].map(h => <th key={h} className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-white/[0.04]">
                {stats?.recent_records?.some(r => r.patient_id === user?.id) ? (
                  stats.recent_records.filter(r => r.patient_id === user?.id).map((r, idx) => (
                    <motion.tr key={r.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + idx * 0.07 }} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-5 font-bold" style={{ color: "var(--foreground)" }}>{r.ai_prediction || "Pending"}</td>
                      <td className="px-6 py-5 text-sm" style={{ color: "var(--foreground)", opacity: 0.6 }}>{r.recommended_specialist || "General Physician"}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${r.confidence_score || 0}%` }} transition={{ duration: 1, delay: 0.6 }} className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #f43f5e, #ec4899)" }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: "var(--foreground)", opacity: 0.8 }}>{r.confidence_score ? `${r.confidence_score}%` : "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-zinc-500 text-sm">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                    </motion.tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-600 text-sm">No records yet. Run a symptom check to get started.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-5" style={{ color: "var(--foreground)" }}>Health Insights</h2>
          <div className="glass-card rounded-[2rem] p-7 space-y-4 border border-white/[0.07] relative overflow-hidden">
            <ScanLine />
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="p-5 rounded-2xl border transition-all" style={{ background: "rgba(244,63,94,0.05)", borderColor: "rgba(244,63,94,0.15)" }}>
              <div className="flex items-center gap-2 mb-2"><Zap size={13} style={{ color: "#fb7185" }} /><h4 className="font-bold text-sm">AI Health Tip</h4></div>
              <p className="text-sm text-zinc-400 leading-relaxed">Stay hydrated and monitor your sleep patterns to improve your health score further.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="p-5 rounded-2xl border transition-all" style={{ background: "rgba(139,92,246,0.05)", borderColor: "rgba(139,92,246,0.15)" }}>
              <div className="flex items-center gap-2 mb-2"><ClipboardList size={13} style={{ color: "#c4b5fd" }} /><h4 className="font-bold text-sm">Next Steps</h4></div>
              <p className="text-sm text-zinc-400 leading-relaxed">Review recent diagnoses and book with the recommended specialist if symptoms persist.</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/dashboard/symptoms" className="w-full py-4 rounded-2xl border font-bold transition-all flex items-center justify-center gap-2 text-sm" style={{ background: "rgba(244,63,94,0.08)", borderColor: "rgba(244,63,94,0.2)", color: "#fb7185" }}>
                <Activity size={15} />Analyze New Symptoms
              </Link>
            </motion.div>
          </div>
        </section>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="relative min-h-full dash-page bg-medical-grid">
      {/* Background effects — absolute so they fill the main content area */}
      <Particles />
      <GridBackground />
      <GradientOrbs isDoctor={isDoctor} />
      <FloatingIcons isDoctor={isDoctor} />

      {/* Content on top */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {isDoctor ? <DoctorDashboard key="doctor" /> : <PatientDashboard key="patient" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
