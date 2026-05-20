"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Users, Search, Activity, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";

interface PatientData {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role: string;
  is_active: boolean;
  created_at?: string | null;
  profile?: {
    date_of_birth?: string | null;
    blood_group?: string | null;
    chronic_conditions?: string[];
    emergency_contact?: string | null;
  };
}

function PatientsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Admin sees all users and filters for patients
    api.getAllUsers()
      .then((allUsers: any[]) => {
        const patientsList = allUsers.filter((u) => u.role === "PATIENT");
        setPatients(patientsList);
      })
      .catch((err) => {
        console.error("Failed to load patients:", err);
        setPatients([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Memoize filtered results
  const filtered = useMemo(() => {
    if (!search) return patients;
    const lower = search.toLowerCase();
    return patients.filter((p) =>
      (p.email?.toLowerCase() || "").includes(lower) ||
      (p.first_name?.toLowerCase() || "").includes(lower) ||
      (p.last_name?.toLowerCase() || "").includes(lower) ||
      (p.profile?.blood_group?.toLowerCase() || "").includes(lower) ||
      (p.profile?.chronic_conditions || []).some((c) => c?.toLowerCase().includes(lower))
    );
  }, [patients, search]);

  const rowVariants = {
    hidden: { opacity: 0, x: -12 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    }),
  };

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#0ea5e9" />

      <div className="relative z-10 p-12">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex justify-between items-start"
        >
          <div>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: 'white' }}>
              Patient Registry
            </h1>
            <p className="text-zinc-500 mt-2 font-medium">
              {filtered.length} of {patients.length} patient{patients.length !== 1 ? "s" : ""} in system
            </p>
          </div>
          <div className="flex items-center glass-card px-4 py-2.5 rounded-2xl text-zinc-400 focus-within:text-[var(--foreground)] transition-colors">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by name, email, condition..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none ml-3 text-sm w-80 font-medium"
              style={{ color: "var(--foreground)" }}
            />
          </div>
        </motion.header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-[2rem] p-8 border border-white/[0.08]"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
                  <Activity size={20} className="text-white" />
                </div>
                <span className="bg-gradient-to-r from-sky-200 to-blue-300 bg-clip-text text-transparent">
                  All Patients
                </span>
              </h2>
              <p className="text-xs text-zinc-500">{filtered.length} patient{filtered.length !== 1 ? "s" : ""}</p>
            </div>

            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-600 font-medium">
                  {search ? "No patients match your search" : "No patients registered"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5">
                      <th className="text-left pb-4 font-semibold">Name / Email</th>
                      <th className="text-left pb-4 font-semibold">Blood Group</th>
                      <th className="text-left pb-4 font-semibold">Chronic Conditions</th>
                      <th className="text-left pb-4 font-semibold">Emergency Contact</th>
                      <th className="text-left pb-4 font-semibold">Status</th>
                      <th className="text-left pb-4 font-semibold">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((p, idx) => (
                      <motion.tr
                        key={p.id}
                        custom={idx}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ backgroundColor: "rgba(14,165,233,0.05)" }}
                        className="transition-all duration-200"
                      >
                        <td className="py-4 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                          <div>
                            <p>{p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : "—"}</p>
                            <p className="text-zinc-500 text-xs">{p.email}</p>
                          </div>
                        </td>
                        <td className="py-4 text-sm">
                          {p.profile?.blood_group ? (
                            <span className="inline-block px-3 py-1 bg-sky-500/10 text-sky-400 text-xs font-bold rounded-lg">
                              {p.profile.blood_group}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="py-4 text-sm">
                          {p.profile?.chronic_conditions && p.profile.chronic_conditions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.profile.chronic_conditions.slice(0, 2).map((cond, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block text-xs px-2 py-1 bg-white/5 text-zinc-300 rounded"
                                >
                                  {cond}
                                </span>
                              ))}
                              {p.profile.chronic_conditions.length > 2 && (
                                <span className="text-xs text-zinc-600">
                                  +{p.profile.chronic_conditions.length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-600">None</span>
                          )}
                        </td>
                        <td className="py-4 text-xs text-zinc-500">
                          {p.profile?.emergency_contact || "—"}
                        </td>
                        <td className="py-4 text-xs">
                          <span className={`px-3 py-1 rounded-lg font-semibold ${
                            p.is_active
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-zinc-500/10 text-zinc-400"
                          }`}>
                            {p.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-4 text-xs text-zinc-500">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function PatientsPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <PatientsContent />
    </ProtectedRoute>
  );
}
