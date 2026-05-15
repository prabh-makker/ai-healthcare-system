"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Pill, Search, Plus, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy: string;
  startDate: string;
  status: "active" | "completed" | "paused";
  instructions: string;
}

const MOCK_MEDICATIONS: Medication[] = [
  {
    id: "1",
    name: "Lisinopril",
    dosage: "10mg",
    frequency: "Once daily",
    prescribedBy: "Dr. Smith (Cardiologist)",
    startDate: "2025-03-15",
    status: "active",
    instructions: "Take in the morning with or without food",
  },
  {
    id: "2",
    name: "Metformin",
    dosage: "500mg",
    frequency: "Twice daily",
    prescribedBy: "Dr. Johnson (Endocrinologist)",
    startDate: "2025-02-20",
    status: "active",
    instructions: "Take with meals to minimize stomach upset",
  },
  {
    id: "3",
    name: "Aspirin",
    dosage: "81mg",
    frequency: "Once daily",
    prescribedBy: "Dr. Smith (Cardiologist)",
    startDate: "2024-12-01",
    status: "active",
    instructions: "Take with water in the morning",
  },
];

function MedicationsContent() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [medications] = useState<Medication[]>(MOCK_MEDICATIONS);

  const filtered = medications.filter((med) =>
    med.name.toLowerCase().includes(search.toLowerCase()) ||
    med.prescribedBy.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = medications.filter((m) => m.status === "active").length;
  const rowVariants = {
    hidden: { opacity: 0, x: -12 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    }),
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-400";
      case "completed":
        return "bg-zinc-500/10 text-zinc-400";
      case "paused":
        return "bg-amber-500/10 text-amber-400";
      default:
        return "bg-zinc-500/10 text-zinc-400";
    }
  };

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#f59e0b" />

      <div className="relative z-10">
        <header className="flex justify-between items-center mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-amber-200 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Medications
            </h1>
            <p className="text-zinc-500 mt-2 font-medium">
              {user?.email?.split("@")[0]} — {activeCount} active medication{activeCount !== 1 ? "s" : ""}
            </p>
          </motion.div>
          <div className="flex items-center gap-3">
            <div className="flex items-center glass-card px-4 py-2.5 rounded-2xl text-zinc-400 focus-within:text-[var(--foreground)] transition-colors">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search medications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none ml-3 text-sm w-48 font-medium"
                style={{ color: "var(--foreground)" }}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold px-6 py-2.5 rounded-2xl hover:shadow-lg hover:shadow-amber-500/20 transition-all"
            >
              <Plus size={18} />
              Add Medication
            </motion.button>
          </div>
        </header>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <div className="glass-card rounded-[2rem] p-6 border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">Active</p>
                <p className="text-4xl font-black mt-2" style={{ color: "var(--foreground)" }}>
                  {activeCount}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10">
                <Pill size={24} className="text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-6 border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">Total</p>
                <p className="text-4xl font-black mt-2" style={{ color: "var(--foreground)" }}>
                  {medications.length}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-sky-500/10">
                <Clock size={24} className="text-sky-400" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-6 border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">Paused</p>
                <p className="text-4xl font-black mt-2" style={{ color: "var(--foreground)" }}>
                  {medications.filter((m) => m.status === "paused").length}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10">
                <AlertCircle size={24} className="text-amber-400" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Medications List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-[2rem] p-8 border border-white/[0.08]"
        >
          <h2 className="text-xl font-black mb-8 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
              <Pill size={20} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">
              Current Medications
            </span>
          </h2>

          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-zinc-600 font-medium">No medications found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((med, idx) => (
                <motion.div
                  key={med.id}
                  custom={idx}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ backgroundColor: "rgba(245, 158, 11, 0.05)" }}
                  className="p-6 rounded-2xl border border-white/5 transition-all duration-200 cursor-default"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                        {med.name}
                      </h3>
                      <p className="text-sm text-zinc-500 mt-1">{med.prescribedBy}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${statusColor(med.status)} capitalize`}>
                      {med.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">Dosage</p>
                      <p className="font-bold" style={{ color: "var(--foreground)" }}>
                        {med.dosage}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">Frequency</p>
                      <p className="font-bold" style={{ color: "var(--foreground)" }}>
                        {med.frequency}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">Started</p>
                      <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>
                        {new Date(med.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">Instructions</p>
                      <p className="text-sm text-zinc-400">{med.instructions}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function MedicationsPage() {
  return (
    <ProtectedRoute requiredRole="PATIENT">
      <MedicationsContent />
    </ProtectedRoute>
  );
}
