"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Pill, Search, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";
import { api, APIError } from "@/lib/api";
import { STATUS_COLOR_MAP } from "@/constants/colors";

const PRESCRIPTION_STATUS_COLOR: Record<string, string> = {
  active: STATUS_COLOR_MAP.emerald,
  completed: STATUS_COLOR_MAP.zinc,
  discontinued: STATUS_COLOR_MAP.red,
};

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  doctor_id: string;
  start_date: string;
  status: "active" | "completed" | "discontinued";
  instructions: string;
  created_at: string;
}

function MedicationsContent() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [medications, setMedications] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [takingMed, setTakingMed] = useState<string | null>(null);
  const [recentlyTaken, setRecentlyTaken] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();
    };
  }, []);

  const handleMarkAsTaken = async (prescriptionId: string) => {
    setTakingMed(prescriptionId);
    try {
      await api.logMedicationTaken(prescriptionId);
      setRecentlyTaken((prev) => new Set(prev).add(prescriptionId));
      // Clear any previous timeout for this med, then schedule new one
      const existing = timeoutsRef.current.get(prescriptionId);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        setRecentlyTaken((current) => {
          const updated = new Set(current);
          updated.delete(prescriptionId);
          return updated;
        });
        timeoutsRef.current.delete(prescriptionId);
      }, 3000);
      timeoutsRef.current.set(prescriptionId, t);
    } catch (err: any) {
      console.error("Error logging:", err);
    } finally {
      setTakingMed(null);
    }
  };

  useEffect(() => {
    const fetchMedications = async () => {
      try {
        setLoading(true);
        const data = await api.getPrescriptions(0, 50);
        setMedications(data);
        setError(null);
      } catch (err: any) {
        if (err instanceof APIError) {
          setError(err.message);
        } else {
          setError("Failed to load medications");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, []);

  const filtered = useMemo(
    () => medications.filter((med) => med.medication_name.toLowerCase().includes(search.toLowerCase())),
    [medications, search]
  );

  const activeCount = useMemo(
    () => medications.filter((m) => m.status === "active").length,
    [medications]
  );

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#f59e0b" />

      <div className="relative z-10">
        <header className="flex justify-between items-center mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#4169E1' }}>
              Medications
            </h1>
            <p className="text-zinc-500 mt-2 font-medium">
              {user?.email?.split("@")[0]} — {activeCount} active medication{activeCount !== 1 ? "s" : ""}
            </p>
          </motion.div>
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
        </header>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center py-20"
          >
            <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          </motion.div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl"
          >
            <AlertCircle size={24} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-semibold">Error Loading Medications</p>
              <p className="text-red-400/80 text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Medications List */}
        {!loading && !error && (
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
                <p className="text-zinc-600 font-medium">
                  {search ? "No medications match your search" : "No medications prescribed yet"}
                </p>
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
                          {med.medication_name}
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1">
                          Prescribed by your doctor
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${PRESCRIPTION_STATUS_COLOR[med.status] ?? STATUS_COLOR_MAP.zinc} capitalize`}>
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
                        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">Prescribed</p>
                        <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>
                          {new Date(med.start_date).toLocaleDateString()}
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
        )}
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
