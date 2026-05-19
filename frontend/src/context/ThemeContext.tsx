"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "dark" | "light";
type Accent = "sky" | "violet" | "rose" | "emerald" | "amber" | "cyan" | "pink" | "orange" | "teal" | "indigo";
type Font = "geist" | "inter" | "mono" | "serif" | "sans";

interface ThemeContextType {
  theme: Theme;
  accent: Accent;
  font: Font;
  customColor: string | null;
  customGradient: string | null;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
  setFont: (font: Font) => void;
  setCustomColor: (color: string | null) => void;
  setCustomGradient: (gradient: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [accent, setAccentState] = useState<Accent>("sky");
  const [font, setFontState] = useState<Font>("geist");
  const [customColor, setCustomColorState] = useState<string | null>(null);
  const [customGradient, setCustomGradientState] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const savedAccent = localStorage.getItem("accent") as Accent | null;
    const savedFont = localStorage.getItem("font") as Font | null;
    const savedCustomColor = localStorage.getItem("customColor") as string | null;

    if (savedTheme) {
      setThemeState(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    }

    if (savedAccent) {
      setAccentState(savedAccent);
      // Trigger setAccent to apply colors
      const accentColors = {
        sky: "#0ea5e9",
        violet: "#a78bfa",
        rose: "#fb7185",
        emerald: "#10b981",
        amber: "#f59e0b",
        cyan: "#06b6d4",
        pink: "#ec4899",
        orange: "#f97316",
        teal: "#14b8a6",
        indigo: "#6366f1",
      };
      document.documentElement.style.setProperty("--accent-primary", accentColors[savedAccent]);
    }

    if (savedFont) {
      setFontState(savedFont);
      const fontFamilies = {
        geist: "var(--font-geist-sans), system-ui, sans-serif",
        inter: "'Inter', system-ui, sans-serif",
        mono: "'Courier New', 'Monaco', monospace",
        serif: "'Georgia', 'Times New Roman', serif",
        sans: "'Trebuchet MS', 'Arial', sans-serif",
      };
      document.documentElement.style.fontFamily = fontFamilies[savedFont];
    }

    if (savedCustomColor) {
      setCustomColorState(savedCustomColor);
      document.documentElement.style.setProperty("--accent-primary", savedCustomColor);
    }

    const savedGradient = localStorage.getItem("customGradient");
    if (savedGradient) {
      setCustomGradientState(savedGradient);
      applyGradientStyles(savedGradient);
    }

    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  };

  const setAccent = (newAccent: Accent) => {
    setAccentState(newAccent);
    localStorage.setItem("accent", newAccent);

    const accentColors = {
      sky: "#0ea5e9",
      violet: "#a78bfa",
      rose: "#fb7185",
      emerald: "#10b981",
      amber: "#f59e0b",
      cyan: "#06b6d4",
      pink: "#ec4899",
      orange: "#f97316",
      teal: "#14b8a6",
      indigo: "#6366f1",
    };

    // Apply accent color as CSS variable
    document.documentElement.style.setProperty("--accent-primary", accentColors[newAccent]);

    // Create or update style tag for dynamic Tailwind overrides
    let styleTag = document.getElementById("accent-styles");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "accent-styles";
      document.head.appendChild(styleTag);
    }

    const color = accentColors[newAccent];
    styleTag.textContent = `
      :root {
        --accent-primary: ${color};
      }
      .bg-sky-500, .bg-sky-600 { background-color: ${color} !important; }
      .text-sky-500, .text-sky-400 { color: ${color} !important; }
      .border-sky-500 { border-color: ${color} !important; }
      .shadow-sky-500 { --tw-shadow-color: ${color}; }
      .ring-sky-500 { --tw-ring-color: ${color}; }
      button:has(svg.text-sky-500) { color: ${color}; }
    `;
  };

  const setFont = (newFont: Font) => {
    setFontState(newFont);
    localStorage.setItem("font", newFont);

    const fontFamilies = {
      geist: "var(--font-geist-sans), system-ui, sans-serif",
      inter: "'Inter', system-ui, sans-serif",
      mono: "'Courier New', 'Monaco', monospace",
      serif: "'Georgia', 'Times New Roman', serif",
      sans: "'Trebuchet MS', 'Arial', sans-serif",
    };

    document.documentElement.style.fontFamily = fontFamilies[newFont];
  };

  const setCustomColor = (color: string | null) => {
    setCustomColorState(color);
    if (color) {
      localStorage.setItem("customColor", color);
      document.documentElement.style.setProperty("--accent-primary", color);

      // Create or update style tag for custom color overrides
      let styleTag = document.getElementById("custom-color-styles");
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "custom-color-styles";
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = `
        :root {
          --accent-primary: ${color};
        }
        .bg-sky-500, .bg-sky-600 { background-color: ${color} !important; }
        .text-sky-500, .text-sky-400 { color: ${color} !important; }
        .border-sky-500 { border-color: ${color} !important; }
        .shadow-sky-500 { --tw-shadow-color: ${color}; }
        .ring-sky-500 { --tw-ring-color: ${color}; }
      `;
    } else {
      localStorage.removeItem("customColor");
      let styleTag = document.getElementById("custom-color-styles");
      if (styleTag) styleTag.remove();
    }
  };

  const applyGradientStyles = (gradient: string) => {
    let styleTag = document.getElementById("custom-gradient-styles");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "custom-gradient-styles";
      document.head.appendChild(styleTag);
    }
    // Apply gradient to backgrounds, and the first gradient color to text/border
    const firstColor = gradient.match(/#[0-9a-fA-F]{6}/)?.[0] || "#0ea5e9";
    styleTag.textContent = `
      :root {
        --accent-primary: ${firstColor};
        --accent-gradient: ${gradient};
      }
      .bg-sky-500, .bg-sky-600,
      button.bg-sky-500, button.bg-sky-600,
      [class*="from-sky-"][class*="to-sky-"],
      [class*="from-sky-"][class*="to-blue-"] {
        background: ${gradient} !important;
      }
      .text-sky-500, .text-sky-400 { color: ${firstColor} !important; }
      .border-sky-500 { border-color: ${firstColor} !important; }
      .shadow-sky-500 { --tw-shadow-color: ${firstColor}; }
      .ring-sky-500 { --tw-ring-color: ${firstColor}; }
      /* Apply gradient to gradient text classes */
      .bg-gradient-to-r.from-sky-200,
      .bg-gradient-to-r.from-sky-300,
      .bg-gradient-to-br.from-sky-500 {
        background-image: ${gradient} !important;
      }
    `;
  };

  const setCustomGradient = (gradient: string | null) => {
    setCustomGradientState(gradient);
    if (gradient) {
      localStorage.setItem("customGradient", gradient);
      applyGradientStyles(gradient);
    } else {
      localStorage.removeItem("customGradient");
      const styleTag = document.getElementById("custom-gradient-styles");
      if (styleTag) styleTag.remove();
    }
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, accent, font, customColor, customGradient, setTheme, setAccent, setFont, setCustomColor, setCustomGradient }}>
      <div className={theme === "light" ? "light" : "dark"}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
