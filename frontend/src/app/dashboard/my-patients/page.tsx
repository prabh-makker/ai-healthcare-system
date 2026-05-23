"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, AlertCircle, Plus, X } from "lucide-react";
import { api, APIError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";
import RegisterPatientForm from "@/components/forms/RegisterPatientForm";

interface Patient {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  chronic_conditions: string[];
  assigned_date: string;
  blood_group?: string;
  emergency_contact?: string;
}

function MyPatientsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await api.getMyPatients(0, 50);
      setPatients(data);
      setFilteredPatients(data);
    } catch (err: any) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError("Failed to load patients");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handlePatientRegistered = () => {
    setShowRegisterModal(false);
    fetchPatients();
  };

  // Filter patients by search
  useEffect(() => {
    const filtered = patients.filter(
      (patient) => {
        const fullName = `${patient.first_name || ""} ${patient.last_name || ""}`.toLowerCase();
        return (
          fullName.includes(search.toLowerCase()) ||
          (patient.email?.toLowerCase() || "").includes(search.toLowerCase()) ||
          (patient.chronic_conditions?.some((cond) =>
            cond?.toLowerCase().includes(search.toLowerCase())
          ) ?? false)
        );
      }
    );
    setFilteredPatients(filtered);
  }, [search, patients]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  };

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#0ea5e9" />

      <div className="relative z-10 p-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12 flex justify-between items-start"
        >
          <div>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#4169E1' }}>
              My Patients
            </h1>
            <p className="text-zinc-500 mt-2 font-medium">
              {filteredPatients.length} patient{filteredPatients.length !== 1 ? "s" : ""} assigned to you
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowRegisterModal(true)}
            className="bg-sky-500 hover:bg-sky-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl shadow-sky-500/20"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Register Patient</span>
          </motion.button>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 flex items-center glass-card px-4 py-2.5 rounded-2xl text-zinc-400 focus-within:text-[var(--foreground)] transition-colors"
        >
          <Search size={18} />
          <input
            type="text"
            placeholder="Search patients by name, email, or condition..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none ml-3 text-sm w-full font-medium"
            style={{ color: "var(--foreground)" }}
          />
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl mb-8"
          >
            <AlertCircle size={24} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-semibold">Error Loading Patients</p>
              <p className="text-red-400/80 text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Patients Grid */}
        {!loading && !error && filteredPatients.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredPatients.map((patient) => (
              <motion.div
                key={patient.id}
                variants={itemVariants}
                whileHover={{ y: -5, boxShadow: "0 20px 25px -5 rgba(0,0,0,0.3)" }}
                onClick={() => router.push(`/dashboard/my-patients/${patient.id}`)}
                className="glass-card rounded-[2rem] p-6 border border-white/[0.08] cursor-pointer transition-all duration-300"
              >
                {/* Patient Name */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                    {patient.first_name} {patient.last_name}
                  </h3>
                  <p className="text-sm text-zinc-500 mt-1">{patient.email}</p>
                </div>

                {/* Blood Group Badge */}
                {patient.blood_group && (
                  <div className="mb-4">
                    <div className="inline-block px-3 py-1 bg-sky-500/10 text-sky-400 text-xs font-bold rounded-lg">
                      {patient.blood_group}
                    </div>
                  </div>
                )}

                {/* Chronic Conditions */}
                <div className="mb-4">
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
                    Chronic Conditions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {patient.chronic_conditions.length > 0 ? (
                      patient.chronic_conditions.map((condition) => (
                        <span
                          key={condition}
                          className="text-xs px-2.5 py-1 bg-white/5 text-zinc-300 rounded-lg"
                        >
                          {condition}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-600">No chronic conditions</span>
                    )}
                  </div>
                </div>

                {/* Assigned Date */}
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-zinc-600">
                    Assigned{" "}
                    {new Date(patient.assigned_date).toLocaleDateString()}
                  </p>
                </div>

                {/* Click Indicator */}
                <div className="mt-4 text-sky-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  View Details →
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPatients.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 glass-card rounded-[2rem] border border-white/[0.08]"
          >
            <AlertCircle size={48} className="text-zinc-600 mb-4" />
            <p className="text-zinc-500 text-lg font-medium">
              {search ? "No patients match your search" : "No patients assigned yet"}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-4 text-sky-400 hover:text-sky-300 transition-colors text-sm font-semibold"
              >
                Clear search
              </button>
            )}
          </motion.div>
        )}

        {/* Register Patient Modal */}
        <AnimatePresence>
          {showRegisterModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowRegisterModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="relative">
                  <button
                    onClick={() => setShowRegisterModal(false)}
                    className="absolute right-6 top-6 z-10 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white transition-all"
                  >
                    <X size={24} />
                  </button>
                  <RegisterPatientForm onSuccess={handlePatientRegistered} isModal={true} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function MyPatientsPage() {
  return (
    <ProtectedRoute requiredRole="DOCTOR">
      <MyPatientsContent />
    </ProtectedRoute>
  );
}
