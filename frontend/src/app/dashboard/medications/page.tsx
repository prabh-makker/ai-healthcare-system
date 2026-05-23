"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Pill, AlertCircle } from "lucide-react";
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

