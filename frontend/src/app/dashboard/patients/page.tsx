"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Users, Activity, AlertCircle } from "lucide-react";
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

  // Memoize cases results
