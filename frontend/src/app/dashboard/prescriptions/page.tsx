"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Pill } from "lucide-react";
import { api, APIError } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";
import PrescriptionForm from "@/components/forms/PrescriptionForm";

interface Patient {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  chronic_conditions?: string[];
  assigned_date?: string;
  blood_group?: string;
  emergency_contact?: string;
}

interface Prescription {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  start_date: string;
  end_date?: string;
  status: string;
  created_at: string;
}

type TabType = "active" | "add" | "history";

function PrescriptionsContent() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [discontinuingId, setDiscontinuingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  const refreshPrescriptions = async () => {
    const data = await api.getPrescriptions(0, 100);
    setPrescriptions(data);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prescriptionsData, patientsData] = await Promise.all([
          api.getPrescriptions(0, 100),
          api.getMyPatients(0, 100),
        ]);
        setPrescriptions(prescriptionsData);
        setPatients(patientsData);
      } catch (err: any) {
        if (err instanceof APIError) {
          setError(err.message);
        } else {
          setError("Failed to load data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePrescriptionCreated = async () => {
    try {
      await refreshPrescriptions();
      setActiveTab("active");
    } catch (err) {
      console.error("Error refreshing prescriptions:", err);
    }
  };

  const activePrescriptions = useMemo(
    () => prescriptions.filter((p) => p.status === "active"),
    [prescriptions]
  );
  const historyPrescriptions = useMemo(
    () => prescriptions.filter((p) => p.status === "completed" || p.status === "discontinued"),
    [prescriptions]
  );

  const getPatientName = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient?.first_name && patient?.last_name) {
      return `${patient.first_name} ${patient.last_name}`;
    }
    return patient?.email || "Unknown Patient";
  };

  const discontinuePrescription = async (id: string) => {
    if (!window.confirm("Are you sure you want to discontinue this prescription?")) {
      return;
    }
    setDiscontinuingId(id);
    try {
      await api.updatePrescription(id, { status: "discontinued" });
      await refreshPrescriptions();
    } catch (err: any) {
      setError(err.message || "Failed to discontinue prescription");
    } finally {
      setDiscontinuingId(null);
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <DashboardBg accentColor="#0ea5e9" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#0ea5e9" />

      <div className="relative z-10 p-12 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 pt-16"
        >
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: 'white' }}>
            Prescription Management
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            Manage and track patient prescriptions
          </p>
        </motion.div>

        {/* Error State */}
        {error && (
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

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-8 glass-card p-1 rounded-xl w-fit"
        >
          {(["active", "add", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === tab
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab === "active" && `Active Prescriptions (${activePrescriptions.length})`}
              {tab === "add" && "Add New"}
              {tab === "history" && `History (${historyPrescriptions.length})`}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        {activeTab === "active" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {activePrescriptions.length > 0 ? (
              <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5 bg-black/20">
                        <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Patient
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Medication
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Dosage
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Frequency
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Started
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {activePrescriptions.map((prescription) => (
                        <tr
                          key={prescription.id}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-white">
                              {getPatientName(prescription.patient_id)}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-white">
                              {prescription.medication_name}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-zinc-400">
                              {prescription.dosage}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-zinc-400">
                              {prescription.frequency}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-zinc-400">
                              {new Date(prescription.created_at).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => discontinuePrescription(prescription.id)}
                              disabled={discontinuingId === prescription.id}
                              className="text-xs px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {discontinuingId === prescription.id ? "Discontinuing..." : "Discontinue"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-8 text-center border border-white/[0.08]">
                <Pill size={48} className="mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-500">No active prescriptions</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "add" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-3">
                Select Patient
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-all"
              >
                <option value="">— Select a patient —</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name && patient.last_name
                      ? `${patient.first_name} ${patient.last_name}`
                      : patient.email}
                  </option>
                ))}
              </select>
            </div>

            {selectedPatientId && (
              <PrescriptionForm
                patientId={selectedPatientId}
                onSuccess={handlePrescriptionCreated}
                isModal={false}
              />
            )}

            {patients.length === 0 && (
              <div className="glass-card rounded-2xl p-8 text-center border border-white/[0.08]">
                <AlertCircle size={48} className="mx-auto text-amber-600 mb-4" />
                <p className="text-zinc-500">No assigned patients</p>
                <p className="text-zinc-600 text-sm mt-2">
                  You need to have patients assigned to create prescriptions
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "history" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {historyPrescriptions.length > 0 ? (
              <div className="grid gap-4">
                {historyPrescriptions.map((prescription) => (
                  <motion.div
                    key={prescription.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card rounded-xl p-6 border border-white/[0.08]"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-white">
                            {prescription.medication_name}
                          </h3>
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-lg ${
                              prescription.status === "discontinued"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-zinc-500/10 text-zinc-400"
                            }`}
                          >
                            {prescription.status.charAt(0).toUpperCase() +
                              prescription.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500">
                          Patient:{" "}
                          <span className="text-white">
                            {getPatientName(prescription.patient_id)}
                          </span>
                        </p>
                        <p className="text-sm text-zinc-400 mt-1">
                          {prescription.dosage} • {prescription.frequency}
                        </p>
                        {prescription.end_date && (
                          <p className="text-sm text-zinc-500 mt-1">
                            Ended:{" "}
                            {new Date(prescription.end_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600">
                        Started{" "}
                        {new Date(prescription.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-8 text-center border border-white/[0.08]">
                <Pill size={48} className="mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-500">No prescription history</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function PrescriptionsPage() {
  return (
    <ProtectedRoute requiredRole="DOCTOR">
      <PrescriptionsContent />
    </ProtectedRoute>
  );
}
