"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Pill, FileText, Calendar, Activity, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardBg from "@/components/DashboardBg";
import Link from "next/link";

interface TimelineEvent {
  id: string;
  type: "record" | "prescription" | "appointment";
  date: Date;
  title: string;
  description: string;
  status?: string;
  link?: string;
}

const TYPE_CONFIG = {
  record: {
    icon: FileText,
    color: "sky",
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/20",
    gradient: "from-sky-500 to-blue-500",
    label: "Diagnosis",
  },
  prescription: {
    icon: Pill,
    color: "amber",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    gradient: "from-amber-500 to-orange-500",
    label: "Prescription",
  },
  appointment: {
    icon: Calendar,
    color: "rose",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
    gradient: "from-rose-500 to-pink-500",
    label: "Appointment",
  },
};

function TimelineContent() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "record" | "prescription" | "appointment">("all");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        // Fetch all three types
        const [records, prescriptions, appointments] = await Promise.all([
          api.getRecords(0, 100).catch(() => []),
          api.getPrescriptions(0, 100).catch(() => []),
          api.getAppointments(0, 100).catch(() => []),
        ]);

        const allEvents: TimelineEvent[] = [];

        // Add records
        records.forEach((record: any) => {
          allEvents.push({
            id: `record-${record.id}`,
            type: "record",
            date: new Date(record.created_at),
            title: record.ai_prediction || "Medical Record",
            description: `${record.symptoms?.length || 0} symptoms recorded. ${record.recommended_specialist || ""}`,
            status: record.status,
            link: `/dashboard/records/${record.id}`,
          });
        });

        // Add prescriptions
        prescriptions.forEach((p: any) => {
          allEvents.push({
            id: `prescription-${p.id}`,
            type: "prescription",
            date: new Date(p.created_at),
            title: p.medication_name,
            description: `${p.dosage} • ${p.frequency}`,
            status: p.status,
            link: "/dashboard/medications",
          });
        });

        // Add appointments
        appointments.forEach((a: any) => {
          // Use scheduled date+time as event date (consistent with what user sees);
          // fall back to created_at if date is missing.
          const dateStr = a.date && a.time ? `${a.date}T${a.time}:00` : a.date || a.created_at;
          allEvents.push({
            id: `appointment-${a.id}`,
            type: "appointment",
            date: new Date(dateStr),
            title: a.specialist,
            description: `${a.date} at ${a.time}${a.reason ? ` - ${a.reason}` : ""}`,
            status: a.status,
            link: "/dashboard/appointments",
          });
        });

        // Sort chronologically (newest first)
        allEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
        setEvents(allEvents);
      } catch (err) {
        console.error("Error fetching timeline:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const filteredEvents = filter === "all" ? events : events.filter((e) => e.type === filter);

  // Group by date
  const groupedEvents: { [key: string]: TimelineEvent[] } = {};
  filteredEvents.forEach((event) => {
    const dateKey = event.date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groupedEvents[dateKey]) groupedEvents[dateKey] = [];
    groupedEvents[dateKey].push(event);
  });

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#0ea5e9" />

      <div className="relative z-10 p-12 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-sky-200 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Health Timeline
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            Your complete medical journey, chronologically
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-12 flex-wrap">
          {(["all", "record", "prescription", "appointment"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                filter === f
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                  : "text-zinc-500 hover:text-[var(--foreground)] bg-white/5"
              }`}
            >
              {f === "all" ? "All Events" : `${f}s`}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && filteredEvents.length === 0 && (
          <div className="glass-card rounded-2xl p-16 text-center border border-white/[0.08]">
            <Activity size={56} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-400 text-lg font-bold">No events yet</p>
            <p className="text-zinc-500 text-sm mt-2">
              Your medical timeline will populate as you use the system
            </p>
          </div>
        )}

        {!loading && filteredEvents.length > 0 && (
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-sky-500/50 via-amber-500/50 to-rose-500/50" />

            {Object.entries(groupedEvents).map(([dateKey, dayEvents], groupIdx) => (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: groupIdx * 0.1 }}
                className="mb-12"
              >
                {/* Date Header */}
                <div className="flex items-center mb-6 ml-16">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                    {dateKey}
                  </h2>
                </div>

                {/* Events */}
                <div className="space-y-4">
                  {dayEvents.map((event, idx) => {
                    const cfg = TYPE_CONFIG[event.type];
                    const Icon = cfg.icon;

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="relative pl-20"
                      >
                        {/* Icon Circle */}
                        <div
                          className={`absolute left-4 top-2 w-9 h-9 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-lg`}
                        >
                          <Icon size={16} className="text-white" />
                        </div>

                        {/* Card */}
                        <Link href={event.link || "#"}>
                          <motion.div
                            whileHover={{ x: 5, scale: 1.01 }}
                            className={`glass-card rounded-xl p-5 cursor-pointer transition-all ${cfg.border} hover:bg-white/5`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${cfg.bg} ${cfg.text}`}
                                  >
                                    {cfg.label}
                                  </span>
                                  {event.status && (
                                    <span
                                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                        event.status === "approved" || event.status === "active"
                                          ? "bg-emerald-500/10 text-emerald-400"
                                          : event.status === "pending" || event.status === "upcoming"
                                          ? "bg-amber-500/10 text-amber-400"
                                          : "bg-zinc-500/10 text-zinc-400"
                                      }`}
                                    >
                                      {event.status}
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-lg font-bold text-white">
                                  {event.title}
                                </h3>
                                <p className="text-sm text-zinc-400 mt-1">
                                  {event.description}
                                </p>
                              </div>
                              <ChevronRight size={20} className="text-zinc-600 flex-shrink-0 mt-2" />
                            </div>
                          </motion.div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <ProtectedRoute>
      <TimelineContent />
    </ProtectedRoute>
  );
}
