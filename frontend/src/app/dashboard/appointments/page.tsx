"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Plus, Stethoscope, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const MOCK_APPOINTMENTS = [
  {
    id: "1",
    specialist: "General Physician",
    date: "2026-05-10",
    time: "10:00 AM",
    status: "upcoming",
    reason: "Routine checkup",
  },
  {
    id: "2",
    specialist: "Pulmonologist",
    date: "2026-04-25",
    time: "2:30 PM",
    status: "completed",
    reason: "Breathing follow-up",
  },
];

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all");

  const filtered = MOCK_APPOINTMENTS.filter(
    (a) => filter === "all" || a.status === filter
  );

  return (
    <div>
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-12"
      >
        <div>
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-rose-200 via-rose-400 to-pink-500 bg-clip-text text-transparent">
            Appointments
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            {user?.email?.split("@")[0]}&apos;s scheduled visits
          </p>
        </div>
        <Link
          href="/dashboard/symptoms"
          className="bg-rose-500 hover:bg-rose-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl shadow-rose-500/20 active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          <span>New Consultation</span>
        </Link>
      </motion.header>

      <div className="flex gap-2 mb-8">
        {(["all", "upcoming", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
              filter === f
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                : "text-zinc-500 hover:text-white bg-white/5"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="glass-card rounded-[2rem] p-16 text-center">
            <Calendar size={40} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">No appointments found</p>
            <p className="text-zinc-600 text-sm mt-1">Book a consultation from the symptom checker.</p>
          </div>
        ) : (
          filtered.map((appt) => (
            <motion.div
              key={appt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-[2rem] p-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-5">
                <div className={`p-3 rounded-2xl ${
                  appt.status === "upcoming" ? "bg-sky-500/10" : "bg-emerald-500/10"
                }`}>
                  <Stethoscope size={22} className={
                    appt.status === "upcoming" ? "text-sky-400" : "text-emerald-400"
                  } />
                </div>
                <div>
                  <p className="font-bold">{appt.specialist}</p>
                  <p className="text-zinc-500 text-sm mt-0.5">{appt.reason}</p>
                </div>
              </div>

              <div className="flex items-center gap-8 text-sm">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar size={15} />
                  <span>{appt.date}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Clock size={15} />
                  <span>{appt.time}</span>
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl ${
                  appt.status === "upcoming"
                    ? "bg-sky-500/10 text-sky-400"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}>
                  {appt.status === "upcoming"
                    ? <><Clock size={12} /> Upcoming</>
                    : <><CheckCircle size={12} /> Completed</>}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
