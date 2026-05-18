"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { api, APIError } from "@/lib/api";

interface Slot {
  time: string;
  hour: number;
  minute: number;
  available: boolean;
  booked_by?: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  time: string;
  specialist: string;
  reason: string;
  status: string;
}

interface DoctorScheduleData {
  date: string;
  working_hours: Array<{ start: number; end: number }>;
  breaks: Array<{ start: number; end: number }>;
  slots: Slot[];
  appointments: Appointment[];
}

interface DoctorCalendarProps {
  date?: string;
}

const WORKING_HOURS = [
  { start: 9, end: 13 },   // 9 AM - 1 PM
  { start: 14, end: 16 },  // 2 PM - 4 PM
  { start: 17, end: 19 },  // 5 PM - 7 PM
];

const BREAKS = [
  { start: 13, end: 14 },  // 1-2 PM
  { start: 16, end: 17 },  // 4-5 PM
];

function isWithinWorkingHours(hour: number): boolean {
  return WORKING_HOURS.some(w => hour >= w.start && hour < w.end);
}

function isBreakTime(hour: number): boolean {
  return BREAKS.some(b => hour >= b.start && hour < b.end);
}

export default function DoctorCalendar({ date: initialDate }: DoctorCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || new Date().toISOString().split("T")[0]
  );
  const [schedule, setSchedule] = useState<DoctorScheduleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDoctorSchedule(selectedDate);
      setSchedule(data);
    } catch (err: any) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError("Failed to load schedule");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [selectedDate]);

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next.toISOString().split("T")[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  const getAllHours = () => {
    const hours = [];
    for (let h = 9; h < 20; h++) {
      hours.push(h);
    }
    return hours;
  };

  const getAppointmentForTime = (time: string) => {
    if (!schedule) return null;
    return schedule.appointments.find(a => a.time === time);
  };

  const timeToMinutes = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  };

  const renderTimeCell = (hour: number, minute: number = 0) => {
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const appointment = getAppointmentForTime(time);
    const isBreak = isBreakTime(hour);
    const isWorking = isWithinWorkingHours(hour);

    if (isBreak) {
      return (
        <div
          key={time}
          className="h-12 border border-zinc-700/30 bg-zinc-900/40"
        />
      );
    }

    if (appointment) {
      return (
        <motion.div
          key={time}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="h-12 border-l-4 border-l-sky-500 bg-sky-500/15 rounded-r p-2 flex flex-col justify-center text-xs overflow-hidden"
        >
          <p className="font-semibold text-sky-300 truncate">{appointment.patient_id}</p>
          <p className="text-zinc-400 text-xs truncate">{appointment.reason}</p>
        </motion.div>
      );
    }

    return (
      <div
        key={time}
        className={`h-12 border border-zinc-700/30 ${
          isWorking ? "bg-white/3 hover:bg-white/5" : "bg-zinc-900/20"
        } transition-colors cursor-pointer`}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4 backdrop-blur">
        <button
          onClick={handlePrevDay}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} className="text-zinc-400" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">{formatDate(selectedDate)}</h2>
          <p className="text-xs text-zinc-500">{selectedDate}</p>
        </div>
        <button
          onClick={handleNextDay}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronRight size={20} className="text-zinc-400" />
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
        >
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
        </div>
      ) : schedule ? (
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Calendar Header */}
          <div className="bg-gradient-to-r from-sky-500/20 to-blue-500/10 border-b border-sky-500/20 p-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-sky-300">Working Hours</p>
                <p className="text-xs text-zinc-400 mt-1">
                  {schedule.working_hours.map(w => {
                    const startHour = w.start === 13 ? "1 PM" : w.start === 14 ? "2 PM" : w.start === 17 ? "5 PM" : `${w.start} AM`;
                    const endHour = w.end === 13 ? "1 PM" : w.end === 14 ? "2 PM" : w.end === 16 ? "4 PM" : w.end === 19 ? "7 PM" : `${w.end}`;
                    return `${startHour}-${endHour}`;
                  }).join(", ")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sky-300">{schedule.appointments.length}</p>
                <p className="text-xs text-zinc-400">Appointments</p>
              </div>
            </div>
          </div>

          {/* Time Grid */}
          <div className="p-4">
            <div className="space-y-1">
              {/* Header with current time marker */}
              <div className="flex gap-2">
                <div className="w-16 flex-shrink-0"></div>
                <div className="flex-1 text-xs text-zinc-500 font-semibold mb-2">Schedule</div>
              </div>

              {/* Time slots */}
              {getAllHours().map(hour => (
                <div key={`hour-${hour}`} className="space-y-0">
                  {/* Hour label and morning slot */}
                  <div className="flex gap-2">
                    <div className="w-16 flex-shrink-0 text-xs text-zinc-500 font-semibold py-1">
                      {hour === 13 ? "1 PM" :
                       hour === 14 ? "2 PM" :
                       hour === 15 ? "3 PM" :
                       hour === 16 ? "4 PM" :
                       hour === 17 ? "5 PM" :
                       hour === 18 ? "6 PM" :
                       hour === 19 ? "7 PM" :
                       `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? "PM" : "AM"}`}
                    </div>
                    <div className="flex-1">
                      {renderTimeCell(hour, 0)}
                    </div>
                  </div>

                  {/* 30-min slot */}
                  <div className="flex gap-2">
                    <div className="w-16 flex-shrink-0"></div>
                    <div className="flex-1">
                      {renderTimeCell(hour, 30)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Break Times Info */}
          <div className="bg-zinc-900/50 border-t border-zinc-700/30 p-4">
            <p className="text-xs text-zinc-500">
              <span className="inline-block w-3 h-3 bg-zinc-700/40 rounded mr-2"></span>
              Break times: {schedule.breaks.map(b => {
                const startHour = b.start === 13 ? "1 PM" : b.start === 16 ? "4 PM" : `${b.start} AM`;
                const endHour = b.end === 14 ? "2 PM" : b.end === 17 ? "5 PM" : `${b.end} AM`;
                return `${startHour}-${endHour}`;
              }).join(", ")}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
