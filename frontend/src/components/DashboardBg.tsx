"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

interface DashboardBgProps {
  accentColor?: string;
}

export default function DashboardBg({ accentColor = "#0ea5e9" }: DashboardBgProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Parse hex to rgb components for dynamic opacity
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [14, 165, 233];
  };
  const [r, g, b] = hexToRgb(accentColor);

  // Deterministic particles — no Math.random
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    w: (i % 3) + 2,
    h: (i % 3) + 2,
    alpha: isDark ? ((i % 5) + 1) * 0.03 : ((i % 5) + 1) * 0.05,
    left: (i * 37 + 11) % 100,
    top: (i * 53 + 7) % 100,
    dur: 4 + (i % 4),
    dx: (i % 7) - 3,
    delay: (i % 4) * 0.5,
  }));

  const particleColor = isDark
    ? `rgba(14,165,233,0.15)`
    : `rgba(14,165,233,0.25)`;

  const orb1Color = isDark
    ? `rgba(${r},${g},${b},0.10)`
    : `rgba(${r},${g},${b},0.15)`;
  const orb2Color = isDark ? `rgba(139,92,246,0.10)` : `rgba(139,92,246,0.12)`;

  const gridLineColor = isDark ? `rgba(14,165,233,0.5)` : `rgba(14,165,233,0.4)`;
  const gridOpacity = isDark ? 0.04 : 0.06;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.w,
            height: p.h,
            background: particleColor,
            left: `${p.left}%`,
            top: `${p.top}%`,
          }}
          animate={{
            y: [0, -50, 0],
            x: [0, p.dx, 0],
            opacity: [0.2, 0.9, 0.2],
            scale: [1, 1.8, 1],
          }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}

      {/* Animated grid */}
      <div className="absolute inset-0" style={{ opacity: gridOpacity }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(${gridLineColor} 1px, transparent 1px),
              linear-gradient(90deg, ${gridLineColor} 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${orb1Color}, transparent 70%)`,
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Gradient orb 1 */}
      <motion.div
        className="absolute"
        style={{
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${orb1Color}, transparent 70%)`,
          left: "-10%",
          top: "-10%",
        }}
        animate={{ x: [0, 80, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Gradient orb 2 */}
      <motion.div
        className="absolute"
        style={{
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${orb2Color}, transparent 70%)`,
          right: "-5%",
          bottom: "0%",
        }}
        animate={{ x: [0, -60, 0], y: [0, -50, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Light mode white gradient overlay */}
      {!isDark && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(248,249,250,0.3) 0%, transparent 40%, rgba(248,249,250,0.2) 100%)",
          }}
        />
      )}
    </div>
  );
}
