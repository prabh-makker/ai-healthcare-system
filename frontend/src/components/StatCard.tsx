"use client";

import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { COLOR_CLASS_MAP, type ColorKey } from "@/constants/colors";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: ColorKey;
  gradient?: string;
  delay?: number;
  trend?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  gradient = "from-sky-500 to-blue-600",
  delay = 0,
  trend,
}: StatCardProps) {
  const colorClasses = COLOR_CLASS_MAP[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="group relative overflow-hidden rounded-[2rem] p-6 glass-card border border-white/[0.08] hover:border-white/[0.15] transition-colors"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
      <div className={`p-3 rounded-2xl w-fit mb-4 ${colorClasses.bg} ${colorClasses.hover} transition-colors relative z-10`}>
        <Icon size={22} className={`${colorClasses.text} group-hover:text-${color}-300 transition-colors`} />
      </div>
      <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] relative z-10">{label}</p>
      <motion.h3
        className="text-4xl font-black mt-2 tracking-tight relative z-10"
        style={{ color: "var(--foreground)" }}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        {value}
      </motion.h3>
      {trend && (
        <p className="text-zinc-600 text-xs mt-2 relative z-10">{trend}</p>
      )}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${gradient} rounded-full opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500 -z-10`} />
    </motion.div>
  );
}
