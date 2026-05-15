"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, Pill, FileText, FileUp, X } from "lucide-react";
import { api, APIError } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";
import PrescriptionForm from "@/components/forms/PrescriptionForm";

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  start_date: string;
  end_date?: string;
  status: string;
  created_at: string;
}

interface MedicalRecord {
  id: string;
  symptoms: string[];
  ai_prediction: string;
  confidence_score: number;
  status: string;
  doctor_notes?: string;
  created_at: string;
  recommended_specialist?: string;
}

interface Patient {
  id: string;
  email: string;
  name: string;
  chronic_conditions: string[];
  blood_group?: string;
  emergency_contact?: string;
}

type TabType = "prescriptions" | "records" | "notes";

function PatientDetailContent() {
  const params = useParams();
  const patientId = params.id as string;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("prescriptions");
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch patient info (basic from the my-patients endpoint, augmented with records)
        const recordsData = await api.getRecords(0, 100);
        const patientRecords = recordsData.filter(
          (r: any) => r.patient_id === patientId
        );
        setRecords(patientRecords);

        // Fetch prescriptions
        const prescriptionsData = await api.getPrescriptions(0, 100);
        const patientPrescriptions = prescriptionsData.filter(
          (p: any) => p.patient_id === patientId
        );
        setPrescriptions(patientPrescriptions);

        // Build patient object from first record
        if (patientRecords.length > 0) {
          const firstRecord = patientRecords[0];
          setPatient({
            id: patientId,
            email: firstRecord.patient_email || "",
            name: firstRecord.patient_name || "",
            chronic_conditions: firstRecord.symptoms || [],
            blood_group: undefined,
            emergency_contact: undefined,
          });
        }
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError("Failed to load patient details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [patientId]);

  const handlePrescriptionSuccess = async () => {
    setShowPrescriptionForm(false);
    // Refresh prescriptions
    try {
      const prescriptionsData = await api.getPrescriptions(0, 100);
      const patientPrescriptions = prescriptionsData.filter(
        (p: any) => p.patient_id === patientId
      );
      setPrescriptions(patientPrescriptions);
    } catch (err) {
      console.error("Error refreshing prescriptions:", err);
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

  if (error) {
    return (
      <div className="relative min-h-screen">
        <DashboardBg accentColor="#0ea5e9" />
        <div className="relative z-10 p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl"
          >
            <AlertCircle size={24} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-semibold">Error</p>
              <p className="text-red-400/80 text-sm">{error}</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#0ea5e9" />

      <div className="relative z-10 p-12 max-w-6xl">
        {/* Header with Patient Info */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-sky-200 via-blue-400 to-cyan-500 bg-clip-text text-transparent">
            {patient?.name}
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">{patient?.email}</p>

          {/* Patient Details Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {patient?.blood_group && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-zinc-500 font-semibold uppercase mb-1">
                  Blood Type
                </p>
                <p className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                  {patient.blood_group}
                </p>
              </div>
            )}
            {patient?.emergency_contact && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-zinc-500 font-semibold uppercase mb-1">
                  Emergency Contact
                </p>
                <p className="text-sm font-bold text-zinc-400">
                  {patient.emergency_contact}
                </p>
              </div>
            )}
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-zinc-500 font-semibold uppercase mb-1">
                Active Prescriptions
              </p>
              <p className="text-lg font-bold text-emerald-400">
                {prescriptions.filter((p) => p.status === "active").length}
              </p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-zinc-500 font-semibold uppercase mb-1">
                Total Records
              </p>
              <p className="text-lg font-bold text-sky-400">
                {records.length}
              </p>
            </div>
          </div>

          {/* Chronic Conditions */}
          {patient?.chronic_conditions && patient.chronic_conditions.length > 0 && (
            <div className="mt-8">
              <p className="text-xs text-zinc-500 font-semibold uppercase mb-3">
                Chronic Conditions
              </p>
              <div className="flex flex-wrap gap-2">
                {patient.chronic_conditions.map((condition) => (
                  <span
                    key={condition}
                    className="px-3 py-1.5 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-lg"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-8 glass-card p-1 rounded-xl w-fit"
        >
          {(["prescriptions", "records", "notes"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === tab
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab === "prescriptions" && (
                <>
                  <Pill size={18} className="inline mr-2" />
                  Prescriptions
                </>
              )}
              {tab === "records" && (
                <>
                  <FileText size={18} className="inline mr-2" />
                  Records
                </>
              )}
              {tab === "notes" && (
                <>
                  <FileUp size={18} className="inline mr-2" />
                  Notes
                </>
              )}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        {activeTab === "prescriptions" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Active Prescriptions</h2>
              <button
                onClick={() => setShowPrescriptionForm(true)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition-all"
              >
                + Add Prescription
              </button>
            </div>

            {prescriptions.length > 0 ? (
              <div className="grid gap-4">
                {prescriptions.map((prescription) => (
                  <motion.div
                    key={prescription.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card rounded-xl p-6 border border-white/[0.08]"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {prescription.medication_name}
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">
                          {prescription.dosage} • {prescription.frequency}
                        </p>
                        {prescription.instructions && (
                          <p className="text-sm text-zinc-500 mt-2">
                            {prescription.instructions}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-lg ${
                            prescription.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : prescription.status === "discontinued"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-zinc-500/10 text-zinc-400"
                          }`}
                        >
                          {prescription.status.charAt(0).toUpperCase() +
                            prescription.status.slice(1)}
                        </span>
                        <p className="text-xs text-zinc-500">
                          {new Date(prescription.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-xl p-8 text-center border border-white/[0.08]">
                <Pill size={48} className="mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-500">No prescriptions yet</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "records" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-white">Medical Records</h2>

            {records.length > 0 ? (
              <div className="grid gap-4">
                {records.map((record) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card rounded-xl p-6 border border-white/[0.08]"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {record.ai_prediction}
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">
                          {record.recommended_specialist}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-lg ${
                            record.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : record.status === "reviewed"
                              ? "bg-sky-500/10 text-sky-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {record.status.charAt(0).toUpperCase() +
                            record.status.slice(1)}
                        </span>
                        <p className="text-xs text-zinc-500">
                          {new Date(record.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {record.symptoms.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-zinc-500 font-semibold mb-2">
                          SYMPTOMS
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {record.symptoms.map((symptom) => (
                            <span
                              key={symptom}
                              className="text-xs px-2.5 py-1 bg-white/5 text-zinc-300 rounded-lg"
                            >
                              {symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {record.doctor_notes && (
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-xs text-zinc-500 font-semibold mb-2">
                          DOCTOR NOTES
                        </p>
                        <p className="text-sm text-zinc-300">{record.doctor_notes}</p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-white/5 text-xs text-zinc-500">
                      Confidence: {(record.confidence_score * 100).toFixed(0)}%
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-xl p-8 text-center border border-white/[0.08]">
                <FileText size={48} className="mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-500">No medical records yet</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "notes" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-white">Patient Notes</h2>

            {/* Aggregated Doctor Notes from Approved Records */}
            <div className="space-y-4">
              {records.filter((r) => r.doctor_notes).length > 0 ? (
                records
                  .filter((r) => r.doctor_notes)
                  .map((record) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass-card rounded-xl p-6 border border-white/[0.08]"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-md font-bold text-white">
                            {record.ai_prediction}
                          </h3>
                          <p className="text-xs text-zinc-500 mt-1">
                            {new Date(record.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                            record.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {record.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {record.doctor_notes}
                      </p>
                    </motion.div>
                  ))
              ) : (
                <div className="glass-card rounded-xl p-8 text-center border border-white/[0.08]">
                  <FileUp size={48} className="mx-auto text-zinc-600 mb-4" />
                  <p className="text-zinc-500">No clinical notes yet</p>
                  <p className="text-zinc-600 text-sm mt-2">
                    Notes from approved medical records will appear here
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Prescription Form Modal */}
        {showPrescriptionForm && (
          <PrescriptionForm
            patientId={patientId}
            onSuccess={handlePrescriptionSuccess}
            onCancel={() => setShowPrescriptionForm(false)}
            isModal={true}
          />
        )}
      </div>
    </div>
  );
}

export default function PatientDetailPage() {
  return (
    <ProtectedRoute requiredRole="DOCTOR">
      <PatientDetailContent />
    </ProtectedRoute>
  );
}
