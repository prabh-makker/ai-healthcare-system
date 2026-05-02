"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Activity, Users, TrendingUp, Bell, Plus,
  ArrowUpRight, ChevronRight, Clock, ClipboardList, HeartPulse,
  Pill, Zap, Brain, Stethoscope, Dna, Fingerprint,
} from "lucide-react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
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
  label, value, icon: Icon, trend, gradFrom, gradTo, glowColor, delay,
}: {
  label: string; value: string; icon: React.ElementType;
  trend: string; gradFrom: string; gradTo: string; glowColor: string; delay?: number;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-60, 60], [10, -10]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-60, 60], [-10, 10]), { stiffness: 200, damping: 20 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => { mouseX.set(0); mouseY.set(0); }, [mouseX, mouseY]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 70, damping: 14, delay: delay || 0 }}
      style={{ rotateX, rotateY, perspective: 700, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative cursor-default"
    >
      {/* Glow halo */}
      <motion.div
        className="absolute -inset-2 rounded-[2.4rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
        style={{ background: glowColor }}
      />

      <div className="relative overflow-hidden rounded-[2rem] p-4 md:p-6 glass-card border border-white/[0.08] group-hover:border-white/[0.2] transition-all duration-300">
        <ScanLine />

        {/* BG gradient sweep on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `linear-gradient(135deg, ${gradFrom}10, ${gradTo}05)` }}
        />

        {/* Shimmer */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100"
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [mounted, setMounted] = useState(false);
  const isDoctor = user?.role === "DOCTOR";

  useEffect(() => {
    setMounted(true);
    api.getStats().then(setStats).catch(console.error);
  }, []);

  if (!mounted) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
  };

  const DoctorDashboard = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.header variants={itemVariants} className="flex flex-wrap justify-between items-start gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-1">
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
            className="text-5xl font-black tracking-tight"
            style={{ backgroundImage: "linear-gradient(135deg, #bae6fd, #7dd3fc, #0ea5e9, #06b6d4)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
          >
            Clinical Dashboard
          </h1>
          <p className="text-zinc-500 mt-1 font-bold">Welcome back, Dr. {user?.email?.split("@")[0] || "Physician"}</p>
          <StatusBar />
        </div>

        <div className="flex items-center space-x-4">
          <motion.div whileHover={{ scale: 1.08 }} className="relative glass-card p-3 rounded-2xl text-zinc-400 hover:text-white cursor-pointer transition-all">
            <Bell size={20} />
            <motion.div className="absolute top-2 right-2 w-2 h-2 bg-sky-500 rounded-full ring-4 ring-[#050505]" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          </motion.div>
          <ShimmerButton href="/dashboard/symptoms" gradFrom="#0ea5e9" gradTo="#06b6d4" shadow="rgba(14,165,233,0.3)">
            <Plus size={20} strokeWidth={3} />
            <span>Initiate Triage</span>
          </ShimmerButton>
        </div>
      </motion.header>

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12 overflow-hidden">
        <StatCard3D label="Total Patients" value={stats ? String(stats.total_patients) : "—"} icon={Users} trend="+active" gradFrom="#0ea5e9" gradTo="#06b6d4" glowColor="rgba(14,165,233,0.2)" delay={0} />
        <StatCard3D label="Medical Records" value={stats ? String(stats.total_records) : "—"} icon={Activity} trend="+records" gradFrom="#8b5cf6" gradTo="#a78bfa" glowColor="rgba(139,92,246,0.2)" delay={0.1} />
        <StatCard3D label="Model Precision" value="98.4%" icon={Brain} trend="+1.2%" gradFrom="#10b981" gradTo="#34d399" glowColor="rgba(16,185,129,0.2)" delay={0.2} />
        <StatCard3D label="Doctors Active" value={stats ? String(stats.total_doctors) : "—"} icon={TrendingUp} trend="+staff" gradFrom="#f59e0b" gradTo="#fbbf24" glowColor="rgba(245,158,11,0.2)" delay={0.3} />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold" style={{ backgroundImage: "linear-gradient(135deg, #bae6fd, #7dd3fc)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              Recent Diagnostic Records
            </h2>
            <Link href="/dashboard/records" className="text-sky-500 text-sm font-bold hover:text-sky-400 flex items-center gap-1 group">
              <span>View All</span><ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="glass-card rounded-[2rem] overflow-hidden border border-white/[0.07] relative">
            <ScanLine />
            <table className="w-full text-left">
              <thead><tr className="border-b border-white/5 bg-white/[0.02]">
                {["Diagnosis","Symptoms","Confidence","Date"].map(h => <th key={h} className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-white/[0.04]">
                {stats?.recent_records?.length ? stats.recent_records.map((r, idx) => (
                  <motion.tr key={r.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + idx * 0.07 }} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-5 font-bold" style={{ color: "var(--foreground)" }}>{r.ai_prediction || "Pending"}</td>
                    <td className="px-6 py-5 text-sm" style={{ color: "var(--foreground)", opacity: 0.6 }}>{r.symptoms?.slice(0,2).join(", ") || "—"}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${r.confidence_score || 0}%` }} transition={{ duration: 1, delay: 0.6 }} className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #0ea5e9, #06b6d4)" }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: "var(--foreground)", opacity: 0.8 }}>{r.confidence_score ? `${r.confidence_score}%` : "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-zinc-500 text-sm">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                  </motion.tr>
                )) : (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-600 text-sm">No records yet. Run a symptom analysis to begin.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-5" style={{ color: "var(--foreground)" }}>AI Insights</h2>
          <div className="glass-card rounded-[2rem] p-7 space-y-4 border border-white/[0.07] relative overflow-hidden">
            <ScanLine />
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="p-5 rounded-2xl border transition-all" style={{ background: "rgba(16,185,129,0.05)", borderColor: "rgba(16,185,129,0.15)" }}>
              <div className="flex items-center gap-2 mb-2"><Zap size={13} style={{ color: "#34d399" }} /><h4 className="font-bold text-sm">System Status</h4></div>
              <p className="text-sm text-zinc-400 leading-relaxed">All diagnostic engines online. ML model loaded and running at peak efficiency.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="p-5 rounded-2xl border transition-all" style={{ background: "rgba(14,165,233,0.05)", borderColor: "rgba(14,165,233,0.15)" }}>
              <div className="flex items-center gap-2 mb-2"><Brain size={13} style={{ color: "#38bdf8" }} /><h4 className="font-bold text-sm">Quick Actions</h4></div>
              <p className="text-sm text-zinc-400 leading-relaxed">Navigate to Diagnostics, Patient Registry, or Records from the sidebar.</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/dashboard/symptoms" className="w-full py-4 rounded-2xl border font-bold transition-all flex items-center justify-center gap-2 text-sm" style={{ background: "rgba(14,165,233,0.08)", borderColor: "rgba(14,165,233,0.2)", color: "#38bdf8" }}>
                <Activity size={15} />New Diagnostic Analysis
              </Link>
            </motion.div>
          </div>
        </section>
      </motion.div>
    </motion.div>
  );

  const PatientDashboard = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.header variants={itemVariants} className="flex flex-wrap justify-between items-start gap-6 mb-12">
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
            className="text-5xl font-black tracking-tight"
            style={{ backgroundImage: "linear-gradient(135deg, #fecdd3, #fda4af, #f43f5e, #ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
          >
            My Health Portal
          </h1>
          <p className="text-zinc-500 mt-1 font-bold">Welcome back, {user?.email?.split("@")[0] || "Patient"}</p>
          <StatusBar />
        </div>

        <div className="flex items-center space-x-4">
          <motion.div whileHover={{ scale: 1.08 }} className="relative glass-card p-3 rounded-2xl text-zinc-400 hover:text-white cursor-pointer transition-all">
            <Bell size={20} />
            <motion.div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-4 ring-[#050505]" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          </motion.div>
          <ShimmerButton href="/dashboard/symptoms" gradFrom="#f43f5e" gradTo="#ec4899" shadow="rgba(244,63,94,0.3)">
            <Activity size={20} strokeWidth={3} />
            <span>Check Symptoms</span>
          </ShimmerButton>
        </div>
      </motion.header>

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12 overflow-hidden">
        <StatCard3D label="Health Score" value="Good" icon={HeartPulse} trend="+stable" gradFrom="#f43f5e" gradTo="#ec4899" glowColor="rgba(244,63,94,0.2)" delay={0} />
        <StatCard3D label="Medical Records" value={stats ? String(stats.recent_records.filter(r => r.patient_id === user?.id).length) : "—"} icon={ClipboardList} trend="+latest" gradFrom="#8b5cf6" gradTo="#a78bfa" glowColor="rgba(139,92,246,0.2)" delay={0.1} />
        <StatCard3D label="Appointments" value="1" icon={Clock} trend="tomorrow" gradFrom="#10b981" gradTo="#34d399" glowColor="rgba(16,185,129,0.2)" delay={0.2} />
        <StatCard3D label="Medications" value="2 Active" icon={Pill} trend="on track" gradFrom="#f59e0b" gradTo="#fbbf24" glowColor="rgba(245,158,11,0.2)" delay={0.3} />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
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
    <div className="relative min-h-full">
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
