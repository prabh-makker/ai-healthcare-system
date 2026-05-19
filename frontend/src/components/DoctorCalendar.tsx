"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, AlertCircle, Calendar, Users, Clock } from "lucide-react";
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
  patient_name: string;
  time: string;       // backend now returns 24h "09:00"
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
  unavailable_message?: string | null;
}

interface WeekDay {
  date: string;
  count: number;
}

interface DoctorCalendarProps {
  date?: string;
}

const WORKING_HOURS = [
  { start: 9, end: 13 },
  { start: 14, end: 16 },
  { start: 17, end: 19 },
];

const BREAKS = [
  { start: 13, end: 14 },
  { start: 16, end: 17 },
];

function isWithinWorkingHours(hour: number): boolean {
  return WORKING_HOURS.some((w) => hour >= w.start && hour < w.end);
}

function isBreakTime(hour: number): boolean {
  return BREAKS.some((b) => hour >= b.start && hour < b.end);
}

/** Format hour number → display label like "9 AM", "1 PM" */
function hourLabel(h: number): string {
  if (h === 12) return "12 PM";
  if (h === 0) return "12 AM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

/** Get Monday of the week containing dateStr */
function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default function DoctorCalendar({ date: initialDate }: DoctorCalendarProps) {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || today);
  const [weekStart, setWeekStart] = useState<string>(getMondayOf(initialDate || today));
  const [schedule, setSchedule] = useState<DoctorScheduleData | null>(null);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekLoading, setWeekLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Weekly summary ───────────────────────────────────────────────────
  const fetchWeekly = useCallback(async (start: string) => {
    try {
      setWeekLoading(true);
      const data = await api.getDoctorWeekly(start);
      setWeekDays(data.days ?? []);
    } catch {
      // non-critical — just leave empty
    } finally {
      setWeekLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeekly(weekStart);
  }, [weekStart, fetchWeekly]);

  // ── Daily schedule ───────────────────────────────────────────────────
  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDoctorSchedule(selectedDate);
      setSchedule(data);
    } catch (err: any) {
      setError(err instanceof APIError ? err.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // ── Navigation ────────────────────────────────────────────────────────
  const goToDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    const newWeekStart = getMondayOf(dateStr);
    if (newWeekStart !== weekStart) setWeekStart(newWeekStart);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() - 1);
    goToDate(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    goToDate(d.toISOString().split("T")[0]);
  };

  const handlePrevWeek = () => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() - 7);
    const newStart = d.toISOString().split("T")[0];
    setWeekStart(newStart);
    // Move selectedDate into that week (same weekday)
    const sel = new Date(selectedDate + "T00:00:00");
    sel.setDate(sel.getDate() - 7);
    setSelectedDate(sel.toISOString().split("T")[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    const newStart = d.toISOString().split("T")[0];
    setWeekStart(newStart);
    const sel = new Date(selectedDate + "T00:00:00");
    sel.setDate(sel.getDate() + 7);
    setSelectedDate(sel.toISOString().split("T")[0]);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

  const formatShortDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
    });

  // ── Schedule helpers ──────────────────────────────────────────────────
  const getAppointmentForTime = (time: string): Appointment | null => {
    if (!schedule) return null;
    // backend returns 24h "09:00"; time arg is also 24h "09:00"
    return schedule.appointments.find((a) => a.time === time) ?? null;
  };

  const getAllHours = () => {
    const hours = [];
    for (let h = 9; h < 20; h++) hours.push(h);
    return hours;
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
          className="h-12 border border-zinc-700/20 bg-zinc-900/50 flex items-center px-3"
        >
          <span className="text-[10px] text-zinc-600 italic">Break</span>
        </div>
      );
    }

    if (appointment) {
      const isUpcoming = appointment.status === "upcoming";
      return (
        <motion.div
          key={time}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className={`h-12 border-l-4 rounded-r-lg p-2 flex items-center gap-2 overflow-hidden ${
            isUpcoming
              ? "border-l-sky-500 bg-sky-500/15"
              : "border-l-emerald-500 bg-emerald-500/10"
          }`}
        >
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold truncate ${isUpcoming ? "text-sky-300" : "text-emerald-300"}`}>
              {appointment.patient_name || appointment.patient_id}
            </p>
            {appointment.reason && (
              <p className="text-[10px] text-zinc-400 truncate">{appointment.reason}</p>
            )}
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-semibold ${
            isUpcoming ? "bg-sky-500/20 text-sky-400" : "bg-emerald-500/20 text-emerald-400"
          }`}>
            {appointment.status}
          </span>
        </motion.div>
      );
    }

    return (
      <div
        key={time}
        className={`h-12 border border-zinc-700/20 transition-colors ${
          isWorking ? "bg-white/[0.02] hover:bg-white/[0.04]" : "bg-zinc-900/20"
        }`}
      />
    );
  };

  // ── Week strip ─────────────────────────────────────────────────────────
  const weekDayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const renderWeekStrip = () => (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrevWeek}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronLeft size={16} className="text-zinc-400" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-sky-400" />
          <span className="text-xs font-semibold text-zinc-300">
            {new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </span>
          {weekLoading && (
            <div className="w-3 h-3 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
          )}
        </div>
        <button
          onClick={handleNextWeek}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronRight size={16} className="text-zinc-400" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDayNames.map((name, i) => {
          const d = new Date(weekStart + "T00:00:00");
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split("T")[0];
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const dayData = weekDays.find((w) => w.date === dateStr);
          const count = dayData?.count ?? 0;

          return (
            <button
              key={dateStr}
              onClick={() => goToDate(dateStr)}
              className={`relative flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all ${
                isSelected
                  ? "bg-sky-500/20 border border-sky-500/40"
                  : "hover:bg-white/5 border border-transparent"
              }`}
            >
              <span className={`text-[10px] font-semibold ${isSelected ? "text-sky-400" : "text-zinc-500"}`}>
                {name}
              </span>
              <span className={`text-sm font-bold ${
                isToday && !isSelected
                  ? "text-amber-400"
                  : isSelected
                  ? "text-sky-300"
                  : "text-zinc-300"
              }`}>
                {d.getDate()}
              </span>
              {count > 0 ? (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  isSelected ? "bg-sky-500 text-white" : "bg-zinc-700 text-zinc-300"
                }`}>
                  {count}
                </span>
              ) : (
                <span className="h-[18px]" />
              )}
              {isToday && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Week total */}
      {weekDays.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Users size={12} />
            <span>Week total:</span>
          </div>
          <span className="text-xs font-bold text-sky-400">
            {weekDays.reduce((sum, d) => sum + d.count, 0)} appointments
          </span>
        </div>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Week Strip */}
      {renderWeekStrip()}

      {/* Day Navigation */}
      <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4 backdrop-blur">
        <button
          onClick={handlePrevDay}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} className="text-zinc-400" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">{formatDate(selectedDate)}</h2>
          {selectedDate === today && (
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Today</span>
          )}
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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
        >
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-xs text-zinc-500">Loading schedule…</p>
        </div>
      ) : schedule ? (
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Day header */}
          <div className="bg-gradient-to-r from-sky-500/20 to-blue-500/10 border-b border-sky-500/20 p-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-sky-300">Working Hours</p>
                <p className="text-xs text-zinc-400 mt-1">
                  9 AM–1 PM · 2–4 PM · 5–7 PM
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{schedule.appointments.length}</p>
                <p className="text-xs text-zinc-400">
                  {schedule.appointments.length === 1 ? "Patient" : "Patients"} today
                </p>
              </div>
            </div>

            {/* Unavailability alert */}
            {schedule.unavailable_message && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 bg-rose-500/15 border border-rose-500/30 rounded-lg flex items-center gap-2"
              >
                <AlertCircle size={14} className="text-rose-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-rose-300">{schedule.unavailable_message}</span>
              </motion.div>
            )}

            {/* Appointment summary pills */}
            {schedule.appointments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {schedule.appointments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1"
                  >
                    <Clock size={10} className="text-sky-400 flex-shrink-0" />
                    <span className="text-[11px] font-semibold text-white">{a.time}</span>
                    <span className="text-[11px] text-zinc-400">{a.patient_name || a.patient_id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Empty state */}
          {schedule.appointments.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Calendar size={24} className="text-zinc-600" />
              </div>
              <p className="text-sm font-semibold text-zinc-400">No appointments today</p>
              <p className="text-xs text-zinc-600 mt-1">Your schedule is clear for {formatDate(selectedDate)}</p>
            </div>
          )}

          {/* Time Grid */}
          {schedule.appointments.length > 0 && (
            <div className="p-4">
              <div className="space-y-0.5">
                {getAllHours().map((hour) => (
                  <div key={`hour-${hour}`} className="space-y-0">
                    {/* On-the-hour slot */}
                    <div className="flex gap-2">
                      <div className="w-16 flex-shrink-0 text-[11px] text-zinc-500 font-semibold py-1 text-right pr-2">
                        {hourLabel(hour)}
                      </div>
                      <div className="flex-1">{renderTimeCell(hour, 0)}</div>
                    </div>
                    {/* :30 slot */}
                    <div className="flex gap-2">
                      <div className="w-16 flex-shrink-0 text-[10px] text-zinc-700 py-1 text-right pr-2">
                        {isBreakTime(hour) ? "" : ":30"}
                      </div>
                      <div className="flex-1">{renderTimeCell(hour, 30)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Break legend */}
          <div className="bg-zinc-900/50 border-t border-zinc-700/20 p-3 flex items-center gap-4 text-xs text-zinc-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-zinc-800 rounded" />
              <span>Break: 1–2 PM, 4–5 PM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-sky-500/30 rounded border-l-2 border-sky-500" />
              <span>Upcoming</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-emerald-500/20 rounded border-l-2 border-emerald-500" />
              <span>Completed</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
