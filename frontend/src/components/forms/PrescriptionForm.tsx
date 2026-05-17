"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

interface PrescriptionFormProps {
  patientId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}

const COMMON_MEDICATIONS = [
  "Lisinopril",
  "Metformin",
  "Aspirin",
  "Atorvastatin",
  "Sertraline",
  "Amoxicillin",
  "Ibuprofen",
  "Albuterol",
  "Levetiracetam",
  "Fluoxetine",
];

const FREQUENCIES = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every other day",
  "As needed",
];

export default function PrescriptionForm({
  patientId,
  onSuccess,
  onCancel,
  isModal = false,
}: PrescriptionFormProps) {
  const [formData, setFormData] = useState({
    medication_name: "",
    dosage: "",
    frequency: "",
    instructions: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleMedicationSelect = (med: string) => {
    setFormData((prev) => ({
      ...prev,
      medication_name: med,
    }));
    setShowMedicationDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;  // Prevent double-submit
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.medication_name.trim()) {
      setError("Please enter a medication name");
      setLoading(false);
      return;
    }
    if (!formData.dosage.trim()) {
      setError("Please enter a dosage");
      setLoading(false);
      return;
    }
    if (!formData.frequency) {
      setError("Please select a frequency");
      setLoading(false);
      return;
    }

    try {
      await api.createPrescription({
        patient_id: patientId,
        medication_name: formData.medication_name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        instructions: formData.instructions,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        setSuccess(false);
        setFormData({
          medication_name: "",
          dosage: "",
          frequency: "",
          instructions: "",
          start_date: new Date().toISOString().split("T")[0],
          end_date: "",
        });
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to create prescription");
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Medication Name with Dropdown */}
      <div className="relative">
        <label className="block text-sm font-semibold text-zinc-400 mb-2">
          Medication Name *
        </label>
        <div className="relative">
          <input
            type="text"
            name="medication_name"
            value={formData.medication_name}
            onChange={handleInputChange}
            onFocus={() => setShowMedicationDropdown(true)}
            placeholder="Enter medication name"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-all"
          />
          {showMedicationDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-10"
            >
              {COMMON_MEDICATIONS.map((med) => (
                <button
                  key={med}
                  type="button"
                  onClick={() => handleMedicationSelect(med)}
                  className="w-full text-left px-4 py-2.5 hover:bg-sky-500/10 transition-colors text-white text-sm"
                >
                  {med}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Dosage */}
      <div>
        <label className="block text-sm font-semibold text-zinc-400 mb-2">
          Dosage *
        </label>
        <input
          type="text"
          name="dosage"
          value={formData.dosage}
          onChange={handleInputChange}
          placeholder="e.g., 10mg, 500mg, 1%"
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-all"
        />
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-sm font-semibold text-zinc-400 mb-2">
          Frequency *
        </label>
        <select
          name="frequency"
          value={formData.frequency}
          onChange={handleInputChange}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-all"
        >
          <option value="">Select frequency</option>
          {FREQUENCIES.map((freq) => (
            <option key={freq} value={freq}>
              {freq}
            </option>
          ))}
        </select>
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-sm font-semibold text-zinc-400 mb-2">
          Instructions
        </label>
        <textarea
          name="instructions"
          value={formData.instructions}
          onChange={handleInputChange}
          placeholder="e.g., Take with food, take in the morning, etc."
          rows={3}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-all resize-none"
        />
      </div>

      {/* Start Date */}
      <div>
        <label className="block text-sm font-semibold text-zinc-400 mb-2">
          Start Date
        </label>
        <input
          type="date"
          name="start_date"
          value={formData.start_date}
          onChange={handleInputChange}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-all"
        />
      </div>

      {/* End Date (Optional) */}
      <div>
        <label className="block text-sm font-semibold text-zinc-400 mb-2">
          End Date (Optional)
        </label>
        <input
          type="date"
          name="end_date"
          value={formData.end_date}
          onChange={handleInputChange}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-all"
        />
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
        >
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}

      {/* Success Message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
        >
          <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-400 text-sm">Prescription created successfully!</p>
        </motion.div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={loading || success}
          className="flex-1 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            "Create Prescription"
          )}
        </motion.button>
        {onCancel && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all"
          >
            Cancel
          </motion.button>
        )}
      </div>
    </motion.div>
  );

  if (isModal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-zinc-900 rounded-2xl border border-white/10 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Add Prescription</h2>
            <button
              onClick={onCancel}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          {formContent}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-8">
        <h2 className="text-2xl font-bold text-white mb-8">Add New Prescription</h2>
        {formContent}
      </div>
    </div>
  );
}
