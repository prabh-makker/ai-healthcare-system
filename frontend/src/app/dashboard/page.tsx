"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Activity, Users, ShieldCheck, TrendingUp, Bell, Plus,
  ArrowUpRight, ChevronRight, Clock, ClipboardList, HeartPulse,
  Pill, Zap, Brain, Stethoscope, Dna, Scan, Fingerprint,
} from "lucide-react";
import {
  motion, useMotionValue, useTransform, useSpring, AnimatePresence,
} from "framer-motion";
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

// ── Shared background components (same DNA as login) ──────────────────────────

function Particles() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {Array.from({ length: 25 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 1,
            height: Math.random() * 4 + 1,
            background: `rgba(14,165,233,${Math.random() * 0.25 + 0.05})`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{ y: [0, -40, 0], x: [0, Math.random() * 20 - 10, 0], opacity: [0.1, 0.6, 0.1], scale: [1, 1.6, 1] }}
          transition={{ duration: Math.random() * 5 + 4, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 3 }}
        />
      ))}
    </div>
  );
}

function GridBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-[0.025] z-0">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(14,165,233,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14,165,233,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(14,165,233,0.12), transparent 70%)" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function GradientOrbs({ isDoctor }: { isDoctor: boolean }) {
  return (
    <>
      <motion.div
        className="fixed pointer-events-none z-0"
        style={{
          width: 600, height: 600, borderRadius: "50%",
          background: isDoctor
            ? "radial-gradient(circle, rgba(14,165,233,0.07), transparent 70%)"
            : "radial-gradient(circle, rgba(244,63,94,0.07), transparent 70%)",
          left: "5%", top: "10%",
        }}
        animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="fixed pointer-events-none z-0"
        style={{
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.06), transparent 70%)",
          right: "5%", bottom: "10%",
        }}
        animate={{ x: [0, -50, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

function FloatingIcons({ isDoctor }: { isDoctor: boolean }) {
  const icons = isDoctor
    ? [
        { Icon: Stethoscope, pos: { left: "3%", top: "20%" }, delay: 0 },
        { Icon: Brain, pos: { right: "4%", top: "30%" }, delay: 1 },
        { Icon: Dna, pos: { left: "6%", bottom: "25%" }, delay: 0.5 },
        { Icon: Scan, pos: { right: "6%", bottom: "30%" }, delay: 1.5 },
      ]
    : [
        { Icon: HeartPulse, pos: { left: "3%", top: "20%" }, delay: 0 },
        { Icon: Fingerprint, pos: { right: "4%", top: "30%" }, delay: 1 },
        { Icon: Activity, pos: { left: "6%", bottom: "25%" }, delay: 0.5 },
        { Icon: Pill, pos: { right: "6%", bottom: "30%" }, delay: 1.5 },
      ];

  return (
    <>
      {icons.map(({ Icon, pos, delay }, i) => (
        <motion.div
          key={i}
          className="fixed pointer-events-none text-sky-500/8 z-0"
          style={pos}
          animate={{ y: [0, -20, 0], rotate: [0, 8, 0], opacity: [0.04, 0.12, 0.04] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay }}
        >
          <Icon size={48} />
        </motion.div>
      ))}
    </>
  );
}

function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px pointer-events-none z-10"
      style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.4), transparent)" }}
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
    />
  );
}

// ── 3D Tilt Stat Card ─────────────────────────────────────────────────────────

function StatCard3D({
  label, value, icon: Icon, trend, gradient, glowColor, delay,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend: string;
  gradient: string;
  glowColor: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-60, 60], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-60, 60], [-8, 8]), { stiffness: 200, damping: 20 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 80, damping: 15, delay: delay || 0 }}
      style={{ rotateX, rotateY, perspective: 800, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative cursor-default"
    >
      {/* Glow on hover */}
      <motion.div
        className={`absolute -inset-1 rounded-[2.2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`}
        style={{ background: glowColor }}
      />

      <div className="relative overflow-hidden rounded-[2rem] p-6 glass-card border border-white/[0.08] group-hover:border-white/[0.18] transition-all duration-300">
        <ScanLine />

        {/* Background gradient sweep */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-500`}
        />

        {/* Shimmer */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100"
          style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)" }}
          animate={{ backgroundPosition: ["-200% 0", "200% 0"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />

        <div className="flex justify-between items-start mb-5 relative z-10">
          <motion.div
            className={`p-3.5 rounded-2xl bg-gradient-to-br ${gradient} bg-opacity-15`}
            whileHover={{ rotate: 12, scale: 1.15 }}
            style={{ transformStyle: "preserve-3d", translateZ: 20 }}
          >
            <Icon size={26} className="text-white drop-shadow-lg" />
          </motion.div>

          <motion.div
            className={`flex items-center space-x-1 text-xs font-black px-2.5 py-1.5 rounded-xl ${
              trend.startsWith("+") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
            }`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: (delay || 0) + 0.3, type: "spring" }}
          >
            <span>{trend}</span>
            <ArrowUpRight size={11} />
          </motion.div>
        </div>

        <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.18em] relative z-10">{label}</p>
        <motion.h3
          className="text-4xl font-black mt-2 tracking-tight text-white relative z-10"
          style={{ translateZ: 10 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (delay || 0) + 0.15 }}
        >
          {value}
        </motion.h3>

        {/* Animated bottom bar */}
        <motion.div
          className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${gradient}`}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.2, delay: (delay || 0) + 0.4, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

// ── Pulse dots ─────────────────────────────────────────────────────────────────

function PulseDots() {
  return (
    <div className="flex space-x-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-sky-500"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ── Status bar ─────────────────────────────────────────────────────────────────

function StatusBar() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="flex items-center space-x-4 text-[10px] text-zinc-600 font-mono"
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
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  };

  const DoctorDashboard = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.header variants={itemVariants} className="flex flex-wrap justify-between items-start gap-6 mb-14">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              className="p-2.5 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-xl shadow-sky-500/30"
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Stethoscope size={22} className="text-white" />
            </motion.div>
            <PulseDots />
          </div>
          <motion.h1
            className="text-5xl font-black tracking-tight bg-gradient-to-br from-sky-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            Clinical Dashboard
          </motion.h1>
          <p className="text-zinc-500 mt-2 font-bold">
            Welcome back, Dr. {user?.email?.split("@")[0] || "Physician"}
          </p>
          <StatusBar />
        </div>

        <div className="flex items-center space-x-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative glass-card p-3 rounded-2xl text-zinc-400 hover:text-white cursor-pointer transition-all border border-white/[0.06] hover:border-white/[0.15]"
          >
            <Bell size={20} />
            <motion.div
              className="absolute top-2 right-2 w-2 h-2 bg-sky-500 rounded-full ring-4 ring-[#050505]"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/dashboard/symptoms"
              className="relative overflow-hidden bg-gradient-to-r from-sky-500 to-cyan-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 shadow-xl shadow-sky-500/25"
            >
              <motion.div
                className="absolute inset-0 opacity-30"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }}
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <Plus size={20} strokeWidth={3} className="relative z-10" />
              <span className="relative z-10">Initiate Triage</span>
            </Link>
          </motion.div>
        </div>
      </motion.header>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
        <StatCard3D label="Total Patients" value={stats ? String(stats.total_patients) : "—"} icon={Users} trend="+active" gradient="from-sky-500 to-cyan-500" glowColor="rgba(14,165,233,0.15)" delay={0} />
        <StatCard3D label="Medical Records" value={stats ? String(stats.total_records) : "—"} icon={Activity} trend="+records" gradient="from-violet-500 to-purple-500" glowColor="rgba(139,92,246,0.15)" delay={0.1} />
        <StatCard3D label="Model Precision" value="98.4%" icon={Brain} trend="+1.2%" gradient="from-emerald-500 to-teal-500" glowColor="rgba(16,185,129,0.15)" delay={0.2} />
        <StatCard3D label="Doctors Active" value={stats ? String(stats.total_doctors) : "—"} icon={TrendingUp} trend="+staff" gradient="from-amber-500 to-orange-500" glowColor="rgba(245,158,11,0.15)" delay={0.3} />
      </motion.div>

      {/* Records + Insights */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-sky-200 to-cyan-300 bg-clip-text text-transparent">
              Recent Diagnostic Records
            </h2>
            <Link href="/dashboard/records" className="text-sky-500 text-sm font-bold hover:text-sky-400 flex items-center space-x-1 group">
              <span>View All</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <motion.div
            className="glass-card rounded-[2rem] overflow-hidden border border-white/[0.06] relative"
            whileHover={{ borderColor: "rgba(255,255,255,0.12)" }}
          >
            <ScanLine />
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {["Diagnosis", "Symptoms", "Confidence", "Date"].map((h) => (
                    <th key={h} className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {stats?.recent_records?.length ? stats.recent_records.map((r, idx) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.08 }}
                    className="group hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-6 py-5 font-bold text-zinc-200">{r.ai_prediction || "Pending"}</td>
                    <td className="px-6 py-5 text-zinc-400 text-sm">{r.symptoms?.slice(0, 2).join(", ") || "—"}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${r.confidence_score || 0}%` }} transition={{ duration: 1, delay: 0.7 }} className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full" />
                        </div>
                        <span className="text-xs font-bold text-zinc-300">{r.confidence_score ? `${r.confidence_score}%` : "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-zinc-500 text-sm">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                  </motion.tr>
                )) : (
                  <tr><td colSpan={4} className="px-6 py-14 text-center text-zinc-600">No records yet. Run a symptom analysis to begin.</td></tr>
                )}
              </tbody>
            </table>
          </motion.div>
        </section>

        <section>
          <h2 className="text-2xl font-black tracking-tight mb-6">AI Insights</h2>
          <div className="glass-card rounded-[2rem] p-7 space-y-5 border border-white/[0.06] relative overflow-hidden">
            <ScanLine />
            {[
              { title: "System Status", body: "All diagnostic engines online. ML model loaded and running at peak efficiency.", icon: Zap, color: "emerald" },
              { title: "Quick Actions", body: "Navigate to Diagnostics, Patient Registry, or Records from the sidebar.", icon: Brain, color: "sky" },
            ].map(({ title, body, icon: I, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className={`p-5 rounded-2xl bg-${color}-500/5 border border-${color}-500/10 hover:border-${color}-500/20 transition-all group`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <I size={14} className={`text-${color}-400`} />
                  <h4 className="font-bold text-sm">{title}</h4>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">{body}</p>
              </motion.div>
            ))}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/dashboard/symptoms" className="w-full py-4 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 font-bold transition-all flex items-center justify-center gap-2 text-sky-400">
                <Activity size={16} />
                New Diagnostic Analysis
              </Link>
            </motion.div>
          </div>
        </section>
      </motion.div>
    </motion.div>
  );

  const PatientDashboard = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.header variants={itemVariants} className="flex flex-wrap justify-between items-start gap-6 mb-14">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-xl shadow-rose-500/30"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <HeartPulse size={22} className="text-white" />
            </motion.div>
            <PulseDots />
          </div>
          <motion.h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-rose-200 via-pink-300 to-red-400 bg-clip-text text-transparent">
            My Health Portal
          </motion.h1>
          <p className="text-zinc-500 mt-2 font-bold">
            Welcome back, {user?.email?.split("@")[0] || "Patient"}
          </p>
          <StatusBar />
        </div>

        <div className="flex items-center space-x-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative glass-card p-3 rounded-2xl text-zinc-400 hover:text-white cursor-pointer transition-all border border-white/[0.06] hover:border-white/[0.15]"
          >
            <Bell size={20} />
            <motion.div
              className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-4 ring-[#050505]"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/dashboard/symptoms"
              className="relative overflow-hidden bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 shadow-xl shadow-rose-500/25"
            >
              <motion.div
                className="absolute inset-0 opacity-30"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }}
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <Activity size={20} strokeWidth={3} className="relative z-10" />
              <span className="relative z-10">Check Symptoms</span>
            </Link>
          </motion.div>
        </div>
      </motion.header>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
        <StatCard3D label="Health Score" value="Good" icon={HeartPulse} trend="+stable" gradient="from-rose-500 to-pink-500" glowColor="rgba(244,63,94,0.15)" delay={0} />
        <StatCard3D label="Medical Records" value={stats ? String(stats.recent_records.filter(r => r.patient_id === user?.id).length) : "—"} icon={ClipboardList} trend="+latest" gradient="from-violet-500 to-purple-500" glowColor="rgba(139,92,246,0.15)" delay={0.1} />
        <StatCard3D label="Appointments" value="1" icon={Clock} trend="tomorrow" gradient="from-emerald-500 to-teal-500" glowColor="rgba(16,185,129,0.15)" delay={0.2} />
        <StatCard3D label="Medications" value="2 Active" icon={Pill} trend="on track" gradient="from-amber-500 to-orange-500" glowColor="rgba(245,158,11,0.15)" delay={0.3} />
      </motion.div>

      {/* Records + Insights */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-rose-200 to-pink-300 bg-clip-text text-transparent">
              Recent Diagnoses
            </h2>
            <Link href="/dashboard/records" className="text-rose-500 text-sm font-bold hover:text-rose-400 flex items-center space-x-1 group">
              <span>View All</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <motion.div
            className="glass-card rounded-[2rem] overflow-hidden border border-white/[0.06] relative"
            whileHover={{ borderColor: "rgba(255,255,255,0.12)" }}
          >
            <ScanLine />
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {["AI Prediction", "Specialist", "Confidence", "Date"].map((h) => (
                    <th key={h} className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {stats?.recent_records?.some(r => r.patient_id === user?.id) ? (
                  stats.recent_records.filter(r => r.patient_id === user?.id).map((r, idx) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + idx * 0.08 }}
                      className="group hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-6 py-5 font-bold text-zinc-200">{r.ai_prediction || "Pending"}</td>
                      <td className="px-6 py-5 text-zinc-400 text-sm">{r.recommended_specialist || "General Physician"}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-2">
                          <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${r.confidence_score || 0}%` }} transition={{ duration: 1, delay: 0.7 }} className="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full" />
                          </div>
                          <span className="text-xs font-bold text-zinc-300">{r.confidence_score ? `${r.confidence_score}%` : "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-zinc-500 text-sm">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                    </motion.tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-6 py-14 text-center text-zinc-600">No records yet. Run a symptom check to get started.</td></tr>
                )}
              </tbody>
            </table>
          </motion.div>
        </section>

        <section>
          <h2 className="text-2xl font-black tracking-tight mb-6">Health Insights</h2>
          <div className="glass-card rounded-[2rem] p-7 space-y-5 border border-white/[0.06] relative overflow-hidden">
            <ScanLine />
            {[
              { title: "AI Health Tip", body: "Stay hydrated and monitor your sleep patterns to improve your health score further.", icon: Zap, color: "rose" },
              { title: "Next Steps", body: "Review recent diagnoses and book with the recommended specialist if symptoms persist.", icon: ClipboardList, color: "violet" },
            ].map(({ title, body, icon: I, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className={`p-5 rounded-2xl bg-${color}-500/5 border border-${color}-500/10 hover:border-${color}-500/20 transition-all`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <I size={14} className={`text-${color}-400`} />
                  <h4 className="font-bold text-sm">{title}</h4>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">{body}</p>
              </motion.div>
            ))}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/dashboard/symptoms" className="w-full py-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 font-bold transition-all flex items-center justify-center gap-2 text-rose-400">
                <Activity size={16} />
                Analyze New Symptoms
              </Link>
            </motion.div>
          </div>
        </section>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="relative min-h-screen">
      {/* Global background effects */}
      <Particles />
      <GridBackground />
      <GradientOrbs isDoctor={isDoctor} />
      <FloatingIcons isDoctor={isDoctor} />

      {/* Content */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {isDoctor ? <DoctorDashboard key="doctor" /> : <PatientDashboard key="patient" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
