"use client";

import React from "react";
import { motion } from "framer-motion";

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  title?: string;
  maxValue?: number;
}

export default function SimpleBarChart({ data, title, maxValue }: BarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
      {title && (
        <h3 className="text-lg font-bold text-white mb-6">{title}</h3>
      )}
      <div className="space-y-4">
        {data.map((item, idx) => {
          const percentage = (item.value / max) * 100;
          const color = item.color || "from-sky-500 to-blue-500";

          return (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400 font-medium">{item.label}</span>
                <span className="text-white font-bold">{item.value}</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                  className={`h-full bg-gradient-to-r ${color} rounded-full`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
