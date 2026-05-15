"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, AlertCircle, CheckCircle, Calendar, Clock } from "lucide-react";
import { api } from "@/lib/api";

interface AppointmentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}

const SPECIALISTS = [
  "Cardiology",
  "Neurology",
  "Dermatology",
  "Pediatrics",
  "General Physician",
  "Endocrinologist",
  "Pulmonologist",
  "Orthopedist",
];

const TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
];

export default function AppointmentForm({
  onSuccess,
  onCancel,
  isModal = false,
}: AppointmentFormProps) {
  const [formData, setFormData] = useState({
    specialist: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    reason: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.specialist) {
      setError("Please select a specialist");
      setLoading(false);
      return;
    }
    if (!formData.date) {
      setError("Please select a date");
      setLoading(false);
      return;
    }
    if (!formData.time) {
      setError("Please select a time");
      setLoading(false);
      return;
    }

    try {
      await api.createAppointment({
        specialist: formData.specialist,
        date: formData.date,
        time: formData.time,
        reason: formData.reason,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        setSuccess(false);
        setFormData({
          specialist: "",
          date: new Date().toISOString().split("T")[0],
          time: "",
          reason: "",
        });
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to book appointment");
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
      <div>
        <label className="block text-sm font-semibold text-zinc-400 mb-2">
          Specialist *
        </label>
        <select
          name="specialist"
          value={formData.specialist}
          onChange={handleChange}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500 transition-all"
        >
          <option value="">Select a specialist</option>
          {SPECIALISTS.map((spec) => (
            <option key={spec} value={spec}>
              {spec}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-zinc-400 mb-2 flex items-center gap-2">
          <Calendar size={16} />
          Date *
        </label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          min={new Date().toISOString().split("T")[0]}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500 transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-zinc-400 mb-2 flex items-center gap-2">
          <Clock size={16} />
          Time *
        </label>
        <select
          name="time"
          value={formData.time}
          onChange={handleChange}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500 transition-all"
        >
          <option value="">Select a time</option>
          {TIME_SLOTS.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-zinc-400 mb-2">
          Reason for Visit
        </label>
        <textarea
          name="reason"
          value={formData.reason}
          onChange={handleChange}
          placeholder="Brief description of your concern"
          rows={3}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-all resize-none"
        />
      </div>

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

      {success && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
        >
          <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-400 text-sm">Appointment booked successfully!</p>
        </motion.div>
      )}

      <div className="flex gap-3 pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={loading || success}
          className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-500/50 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Booking...
            </>
          ) : (
            "Book Appointment"
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
            <h2 className="text-xl font-bold text-white">Book Appointment</h2>
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
        <h2 className="text-2xl font-bold text-white mb-8">Book New Appointment</h2>
        {formContent}
      </div>
    </div>
  );
}
