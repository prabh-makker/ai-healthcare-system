"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, FileSearch, Loader2, Users, ClipboardList, Calendar, Pill, Stethoscope, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import DashboardBg from "@/components/DashboardBg";
import ProtectedRoute from "@/components/ProtectedRoute";

type Category = "all" | "users" | "patients" | "records" | "appointments" | "prescriptions";

interface SearchResult {
  type: "user" | "patient" | "record" | "appointment" | "prescription";
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  href?: string;
  badge?: string;
  badgeColor?: string;
}

function SearchPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isDoctor = user?.role === "DOCTOR";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [category, setCategory] = useState<Category>("all");

  const categories: { key: Category; label: string; icon: any; access: boolean }[] = [
    { key: "all" as const, label: "All", icon: Search, access: true },
    { key: "patients" as const, label: "Patients", icon: Users, access: true },
    { key: "users" as const, label: "Users", icon: Users, access: isAdmin },
    { key: "records" as const, label: "Records", icon: ClipboardList, access: true },
    { key: "appointments" as const, label: "Appointments", icon: Calendar, access: true },
    { key: "prescriptions" as const, label: "Prescriptions", icon: Pill, access: isAdmin || isDoctor },
  ].filter(c => c.access);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    const q = query.toLowerCase();
    const collected: SearchResult[] = [];

    try {
      // Use backend search for admins, fallback to client-side for others
      if (isAdmin) {
        try {
          const res: any = await api.adminSearch(query.trim(), 0, 50);
          if (res && res.results) {
            for (const r of res.results) {
              if (category === "all" || category === r.type) {
                let result: SearchResult | null = null;
                if (r.type === "user") {
                  result = {
                    type: "user",
                    id: r.id,
                    title: r.title,
                    subtitle: r.subtitle,
                    meta: r.role,
                    badge: r.status,
                    badgeColor: r.status === "active" ? "emerald" : "rose",
                  };
                } else if (r.type === "record") {
                  result = {
                    type: "record",
                    id: r.id,
                    title: r.title,
                    subtitle: r.subtitle,
                    meta: r.specialist || "—",
                    badge: r.status || "pending",
                    badgeColor: r.status === "approved" ? "emerald" : r.status === "rejected" ? "rose" : "amber",
                    href: `/dashboard/records/${r.id}`,
                  };
                } else if (r.type === "appointment") {
                  result = {
                    type: "appointment",
                    id: r.id,
                    title: r.title,
                    subtitle: r.date,
                    meta: r.time,
                    badge: r.status,
                    badgeColor: r.status === "upcoming" ? "sky" : r.status === "completed" ? "emerald" : "rose",
                  };
                }
                if (result) collected.push(result);
              }
            }
          }
        } catch (e) { console.error("admin search failed", e); }
      } else {
        // Client-side search for non-admins (fallback)
        // Records search (everyone)
        if (category === "all" || category === "records") {
          try {
            const recs: any = await api.getRecords();
            if (Array.isArray(recs)) {
              for (const r of recs) {
                const name = r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : r.patient_email?.split("@")[0] || "Unknown";
                const haystack = `${r.ai_prediction || ""} ${(r.symptoms || []).join(" ")} ${r.recommended_specialist || ""} ${name} ${r.patient_email || ""}`.toLowerCase();
                if (haystack.includes(q)) {
                  collected.push({
                    type: "record",
                    id: r.id,
                    title: r.ai_prediction || "Diagnosis Record",
                    subtitle: name,
                    meta: r.recommended_specialist || "—",
                    badge: r.status || "pending",
                    badgeColor: r.status === "approved" ? "emerald" : r.status === "rejected" ? "rose" : "amber",
                    href: `/dashboard/records/${r.id}`,
                  });
                }
              }
            }
          } catch (e) { console.error("records search failed", e); }
        }
      }

      // Appointments search (non-admin fallback)
      if (!isAdmin && (category === "all" || category === "appointments")) {
        try {
          const appts: any = await api.getAppointments(0, 100);
          if (Array.isArray(appts)) {
            for (const a of appts) {
              const name = a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : a.patient_email?.split("@")[0] || "Patient";
              const haystack = `${a.specialist || ""} ${a.reason || ""} ${a.date || ""} ${name} ${a.patient_email || ""}`.toLowerCase();
              if (haystack.includes(q)) {
                collected.push({
                  type: "appointment",
                  id: a.id,
                  title: `${a.specialist} • ${a.date} ${a.time}`,
                  subtitle: name,
                  meta: a.reason || "—",
                  badge: a.status,
                  badgeColor: a.status === "upcoming" ? "sky" : a.status === "completed" ? "zinc" : "rose",
                  href: `/dashboard/appointments`,
                });
              }
            }
          }
        } catch (e) { console.error("appts search failed", e); }
      }

      // Patients search (admin can search all patients; others search via records/appointments)
      if (isAdmin && (category === "all" || category === "patients")) {
        try {
          const users: any = await api.getAllUsers();
          if (Array.isArray(users)) {
            for (const u of users) {
              if (u.role !== "PATIENT") continue; // Only patients
              const name = u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email.split("@")[0];
              const haystack = `${u.email} ${name}`.toLowerCase();
              if (haystack.includes(q)) {
                collected.push({
                  type: "patient",
                  id: u.id,
                  title: name,
                  subtitle: u.email,
                  meta: "Patient",
                  badge: u.is_active ? "active" : "inactive",
                  badgeColor: u.is_active ? "emerald" : "rose",
                  href: `/dashboard/patients`,
                });
              }
            }
          }
        } catch (e) { console.error("patients search failed", e); }
      }

      // Users search (admin only)
      if (isAdmin && (category === "all" || category === "users")) {
        try {
          const users: any = await api.getAllUsers();
          if (Array.isArray(users)) {
            for (const u of users) {
              const name = u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email.split("@")[0];
              const haystack = `${u.email} ${name} ${u.role}`.toLowerCase();
              if (haystack.includes(q)) {
                collected.push({
                  type: "user",
                  id: u.id,
                  title: name,
                  subtitle: u.email,
                  meta: u.role,
                  badge: u.is_active ? "active" : "inactive",
                  badgeColor: u.is_active ? "emerald" : "rose",
                  href: `/dashboard/admin`,
                });
              }
            }
          }
        } catch (e) { console.error("users search failed", e); }
      }

      // Prescriptions (doctor/admin)
      if ((isAdmin || isDoctor) && (category === "all" || category === "prescriptions")) {
        try {
          const rx: any = await api.getPrescriptions(0, 100);
          if (Array.isArray(rx)) {
            for (const p of rx) {
              const haystack = `${p.medication_name || ""} ${p.dosage || ""} ${p.frequency || ""} ${p.instructions || ""}`.toLowerCase();
              if (haystack.includes(q)) {
                collected.push({
                  type: "prescription",
                  id: p.id,
                  title: p.medication_name,
                  subtitle: `${p.dosage || ""} • ${p.frequency || ""}`,
                  meta: p.instructions || "—",
                  badge: p.status,
                  badgeColor: p.status === "active" ? "emerald" : "zinc",
                  href: `/dashboard/prescriptions`,
                });
              }
            }
          }
        } catch (e) { console.error("rx search failed", e); }
      }

      setResults(collected);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const grouped = useMemo(() => {
    const g: Record<string, SearchResult[]> = { user: [], patient: [], record: [], appointment: [], prescription: [] };
    for (const r of results) g[r.type].push(r);
    return g;
  }, [results]);

  const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
    user: { label: "Users", icon: Users, color: "violet" },
    patient: { label: "Patients", icon: Users, color: "cyan" },
    record: { label: "Records", icon: ClipboardList, color: "sky" },
    appointment: { label: "Appointments", icon: Calendar, color: "rose" },
    prescription: { label: "Prescriptions", icon: Pill, color: "amber" },
  };

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#0ea5e9" />

      <div className="relative z-10">
        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: 'white' }}>
            Global Search
          </h1>
          <p className="text-zinc-500 mt-2 font-medium text-sm sm:text-base">
            {isAdmin ? "Search across users, records, appointments, prescriptions" : isDoctor ? "Search records, appointments, prescriptions" : "Search your records and appointments"}
          </p>
        </motion.header>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <motion.div
            animate={focused ? { scale: 1.01 } : { scale: 1 }}
            className="flex-1 flex items-center glass-card px-5 py-3.5 rounded-2xl transition-colors"
            style={{ boxShadow: focused ? "0 0 0 2px rgba(14,165,233,0.5), 0 0 20px rgba(14,165,233,0.15)" : undefined, color: "var(--foreground)" }}
          >
            <Search size={20} className="text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, email, diagnosis, medication..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="bg-transparent border-none outline-none ml-3 text-base w-full font-medium placeholder:text-zinc-600"
              style={{ color: "var(--foreground)" }}
            />
          </motion.div>
          <motion.button
            type="submit"
            disabled={loading || !query.trim()}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white px-6 sm:px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-colors shadow-xl shadow-sky-500/20"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            <span className="hidden sm:inline">Search</span>
          </motion.button>
        </form>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap mb-8">
          {categories.map(c => {
            const Icon = c.icon;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border ${
                  category === c.key
                    ? "bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/30"
                    : "border-white/10 hover:border-white/20"
                }`}
                style={category === c.key ? {} : { background: "var(--glass-bg)", color: "var(--foreground)" }}
              >
                <Icon size={14} />
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <AnimatePresence>
          {searched && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <p className="text-zinc-500 text-sm mb-6">
                {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
                {category !== "all" && ` in ${category}`}
              </p>

              {results.length === 0 ? (
                <div className="text-center py-16 glass-card rounded-2xl border border-white/[0.08]">
                  <FileSearch size={40} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 font-medium">No matching results</p>
                  <p className="text-zinc-600 text-xs mt-1">Try different keywords or change category</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(["user", "record", "appointment", "prescription"] as const).map(type => {
                    if (grouped[type].length === 0) return null;
                    const meta = TYPE_META[type];
                    const Icon = meta.icon;
                    return (
                      <div key={type}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`p-1.5 rounded-md bg-${meta.color}-500/15`}>
                            <Icon size={14} className={`text-${meta.color}-400`} />
                          </div>
                          <h3 className="font-black text-sm uppercase tracking-wider" style={{ color: "var(--foreground)" }}>
                            {meta.label} ({grouped[type].length})
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {grouped[type].map((r, i) => (
                            <motion.div
                              key={r.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              whileHover={{ x: 4, scale: 1.005 }}
                              onClick={() => r.href && router.push(r.href)}
                              className="flex items-center justify-between p-4 glass-card rounded-2xl hover:border-sky-500/30 transition-all cursor-pointer border border-white/[0.06]"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-bold truncate" style={{ color: "var(--foreground)" }}>{r.title}</p>
                                <p className="text-xs text-zinc-500 mt-0.5 truncate">{r.subtitle}</p>
                                {r.meta && <p className="text-xs text-zinc-600 mt-1 truncate">{r.meta}</p>}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                {r.badge && (
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md bg-${r.badgeColor}-500/15 text-${r.badgeColor}-400`}>
                                    {r.badge}
                                  </span>
                                )}
                                <ArrowUpRight size={14} className="text-zinc-500" />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {!searched && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 glass-card rounded-2xl border border-white/[0.06]">
              <Search size={48} className="text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400 font-bold">Start typing to search</p>
              <p className="text-zinc-600 text-xs mt-2">Search across {categories.length - 1} categories with one query</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <ProtectedRoute requiredRole="PATIENT">
      <SearchPageContent />
    </ProtectedRoute>
  );
}
