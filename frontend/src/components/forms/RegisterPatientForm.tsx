"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle } from "lucide-react";
import { api, APIError } from "@/lib/api";

interface RegisterPatientFormProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

export default function RegisterPatientForm({ onSuccess, isModal = true }: RegisterPatientFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    blood_group: "",
    chronic_conditions: "",
    emergency_contact: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.first_name || !formData.last_name) {
      setError("Email, first name, and last name are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const chronicConditions = formData.chronic_conditions
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const response = await api.registerPatientByDoctor({
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        blood_group: formData.blood_group || undefined,
        chronic_conditions: chronicConditions.length > 0 ? chronicConditions : undefined,
        emergency_contact: formData.emergency_contact || undefined,
      });

      setTempPassword(response.temporary_password);
      setSuccess(true);

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }

      // Reset form
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        blood_group: "",
        chronic_conditions: "",
        emergency_contact: "",
      });
    } catch (err: any) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError("Failed to register patient");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6 glass-card rounded-2xl p-8 border border-white/[0.08]"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
        >
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-400" />
            <p className="text-emerald-400 text-sm font-semibold">Patient registered successfully!</p>
          </div>
          {tempPassword && (
            <div className="bg-black/40 rounded-lg p-3">
              <p className="text-xs text-zinc-400 mb-2">Share this temporary password with the patient:</p>
              <p className="text-sm font-mono text-emerald-300 break-all">{tempPassword}</p>
              <p className="text-xs text-zinc-500 mt-2">Patient should change it in settings after login.</p>
            </div>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="patient@example.com"
            required
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 transition-all"
          />
        </div>

        {/* First Name */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">First Name *</label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="John"
            required
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 transition-all"
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Last Name *</label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Doe"
            required
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 transition-all"
          />
        </div>

        {/* Blood Group */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Blood Group</label>
          <select
            name="blood_group"
            value={formData.blood_group}
            onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-all"
          >
            <option value="">— Select —</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
        </div>

        {/* Emergency Contact */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Emergency Contact</label>
          <input
            type="tel"
            name="emergency_contact"
            value={formData.emergency_contact}
            onChange={handleChange}
            placeholder="+1 (555) 000-0000"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 transition-all"
          />
        </div>

        {/* Chronic Conditions */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Chronic Conditions (comma-separated)</label>
          <textarea
            name="chronic_conditions"
            value={formData.chronic_conditions}
            onChange={handleChange}
            placeholder="e.g., Diabetes, Hypertension, Asthma"
            rows={3}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 transition-all resize-none"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 pt-4">
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/20"
        >
          {loading ? "Registering..." : "Register Patient"}
        </motion.button>
      </div>
    </motion.form>
  );
}
