"use client";

import React from "react";
import { motion } from "framer-motion";

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  title?: string;
  centerLabel?: string;
}

export default function SimpleDonutChart({ data, title, centerLabel }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 80;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
      {title && <h3 className="text-lg font-bold text-white mb-6">{title}</h3>}

      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="relative">
          <svg
            width={radius * 2 + strokeWidth}
            height={radius * 2 + strokeWidth}
            className="transform -rotate-90"
          >
            <circle
              cx={radius + strokeWidth / 2}
              cy={radius + strokeWidth / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={strokeWidth}
            />
            {data.map((item, idx) => {
              const percentage = total > 0 ? item.value / total : 0;
              const dashLength = percentage * circumference;
              const dashOffset = cumulativeOffset;
              cumulativeOffset += dashLength;

              return (
                <motion.circle
                  key={item.label}
                  cx={radius + strokeWidth / 2}
                  cy={radius + strokeWidth / 2}
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeDashoffset={-dashOffset}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.1, duration: 0.6 }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <p className="text-3xl font-black text-white">{total}</p>
            {centerLabel && (
              <p className="text-xs text-zinc-500 uppercase tracking-wider">{centerLabel}</p>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-3 w-full">
          {data.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-zinc-400">{item.label}</span>
              </div>
              <span className="text-sm font-bold text-white">
                {item.value} ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
