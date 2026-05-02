"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileSearch, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import DashboardBg from "@/components/DashboardBg";

interface Record {
  id: string;
  patient_id: string;
  ai_prediction: string | null;
  confidence_score: number | null;
  recommended_specialist: string | null;
  symptoms: string[];
  created_at: string | null;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Record[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await api.getRecords();
      const all: Record[] = Array.isArray(data) ? data : [];
      const q = query.toLowerCase();
      setResults(
        all.filter(
          (r) =>
            (r.ai_prediction ?? "").toLowerCase().includes(q) ||
            r.symptoms.some((s) => s.toLowerCase().includes(q)) ||
            (r.recommended_specialist ?? "").toLowerCase().includes(q) ||
            r.patient_id.toLowerCase().includes(q)
        )
      );
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    }),
  };

  return (
    <div className="relative min-h-full">
      <DashboardBg accentColor="#0ea5e9" />

      <div className="relative z-10">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-cyan-200 via-blue-400 to-sky-500 bg-clip-text text-transparent">
            Search Records
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            Search by diagnosis, symptom, or specialist
          </p>
        </motion.header>

        <form onSubmit={handleSearch} className="flex gap-3 mb-10">
          <motion.div
            animate={focused ? { scale: 1.01 } : { scale: 1 }}
            className="flex-1 flex items-center glass-card px-5 py-3.5 rounded-2xl text-zinc-400 transition-colors"
            style={{
              boxShadow: focused ? "0 0 0 2px rgba(14,165,233,0.5), 0 0 20px rgba(14,165,233,0.15)" : undefined,
            }}
          >
            <Search size={20} />
            <input
              type="text"
              placeholder="e.g. COVID-19, fever, pulmonologist..."
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
            disabled={loading}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            animate={!loading && !searched ? { boxShadow: ["0 20px 40px rgba(14,165,233,0.2)", "0 20px 40px rgba(14,165,233,0.45)", "0 20px 40px rgba(14,165,233,0.2)"] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-colors shadow-xl shadow-sky-500/20"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Search
          </motion.button>
        </form>

        <AnimatePresence>
          {searched && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[2rem] p-8"
            >
              <p className="text-zinc-500 text-sm mb-6">
                {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
              </p>

              {results.length === 0 ? (
                <div className="text-center py-12">
                  <FileSearch size={36} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 font-medium">No matching records</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((r, i) => (
                    <motion.div
                      key={r.id}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover={{ y: -3, scale: 1.005 }}
                      className="flex items-center justify-between p-4 bg-white/3 rounded-2xl hover:bg-sky-500/5 transition-colors border border-transparent hover:border-sky-500/20"
                    >
                      <div>
                        <p className="font-bold" style={{ color: "var(--foreground)" }}>{r.ai_prediction ?? "Unknown"}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.symptoms.slice(0, 4).map((s) => (
                            <span key={s} className="text-[10px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded-lg">
                              {s.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-zinc-400">{r.recommended_specialist ?? "—"}</p>
                        <p className="text-zinc-600 text-xs mt-1">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
