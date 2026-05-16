/**
 * Centralized color and styling constants
 * Used across dashboard components to maintain consistency
 */

export const COLOR_CLASS_MAP = {
  sky: {
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    hover: "group-hover:bg-sky-500/20",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    hover: "group-hover:bg-rose-500/20",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    hover: "group-hover:bg-violet-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    hover: "group-hover:bg-emerald-500/20",
  },
} as const;

export const STATUS_COLOR_MAP = {
  sky: "bg-sky-500/10 text-sky-400",
  rose: "bg-rose-500/10 text-rose-400",
  violet: "bg-violet-500/10 text-violet-400",
  emerald: "bg-emerald-500/10 text-emerald-400",
  amber: "bg-amber-500/10 text-amber-400",
  zinc: "bg-zinc-500/10 text-zinc-400",
  red: "bg-red-500/10 text-red-400",
} as const;

export type ColorKey = keyof typeof COLOR_CLASS_MAP;
