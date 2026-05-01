/**
 * Performance monitoring module for tracking application performance metrics
 */

import * as Sentry from "@sentry/nextjs";
import { trackPerformanceMetric } from "./analytics";

export interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

const performanceMetrics: PerformanceMetrics[] = [];

/**
 * Measure function execution time
 */
export const measureAsyncFunction = async <T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    recordMetric(name, duration, metadata);
    trackPerformanceMetric(name, duration, "ms");

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    recordMetric(name, duration, { ...metadata, error: true });
    throw error;
  }
};

/**
 * Measure synchronous function execution time
 */
export const measureFunction = <T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, any>
): T => {
  const start = performance.now();

  try {
    const result = fn();
    const duration = performance.now() - start;

    recordMetric(name, duration, metadata);
    trackPerformanceMetric(name, duration, "ms");

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    recordMetric(name, duration, { ...metadata, error: true });
    throw error;
  }
};

/**
 * Measure API response time
 */
export const measureAPIRequest = async <T>(
  method: string,
  endpoint: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    recordMetric(`api_${method}_${endpoint}`, duration, metadata);
    trackPerformanceMetric(`API ${method} ${endpoint}`, duration, "ms");

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    recordMetric(`api_${method}_${endpoint}`, duration, { ...metadata, error: true });
    throw error;
  }
};

/**
 * Record performance metric
 */
const recordMetric = (
  name: string,
  duration: number,
  metadata?: Record<string, any>
): void => {
  const metric: PerformanceMetrics = {
    name,
    duration,
    timestamp: Date.now(),
    metadata,
  };

  performanceMetrics.push(metric);

  // Keep only last 1000 metrics to avoid memory issues
  if (performanceMetrics.length > 1000) {
    performanceMetrics.shift();
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`, metadata);
  }
};

/**
 * Get all recorded metrics
 */
export const getMetrics = (): PerformanceMetrics[] => {
  return [...performanceMetrics];
};

/**
 * Get metrics by name
 */
export const getMetricsByName = (name: string): PerformanceMetrics[] => {
  return performanceMetrics.filter((m) => m.name === name);
};

/**
 * Calculate average duration for a metric
 */
export const getAverageDuration = (name: string): number => {
  const metrics = getMetricsByName(name);
  if (metrics.length === 0) return 0;

  const total = metrics.reduce((sum, m) => sum + m.duration, 0);
  return total / metrics.length;
};

/**
 * Clear all metrics
 */
export const clearMetrics = (): void => {
  performanceMetrics.length = 0;
};

/**
 * Report metrics to monitoring service
 */
export const reportMetrics = (): void => {
  const avgMetrics = performanceMetrics.reduce(
    (acc, metric) => {
      const existing = acc.find((m) => m.name === metric.name);
      if (existing) {
        existing.durations.push(metric.duration);
      } else {
        acc.push({
          name: metric.name,
          durations: [metric.duration],
        });
      }
      return acc;
    },
    [] as Array<{ name: string; durations: number[] }>
  );

  avgMetrics.forEach((metric) => {
    const avg = metric.durations.reduce((a, b) => a + b, 0) / metric.durations.length;
    const max = Math.max(...metric.durations);
    const min = Math.min(...metric.durations);

    Sentry.captureMessage(
      `Performance Summary: ${metric.name}`,
      {
        level: "info",
        extra: {
          average_duration_ms: avg.toFixed(2),
          max_duration_ms: max.toFixed(2),
          min_duration_ms: min.toFixed(2),
          sample_count: metric.durations.length,
        },
      }
    );
  });

  if (process.env.NODE_ENV === "development") {
    console.group("[Performance] Summary Report");
    avgMetrics.forEach((metric) => {
      const avg = metric.durations.reduce((a, b) => a + b, 0) / metric.durations.length;
      const max = Math.max(...metric.durations);
      const min = Math.min(...metric.durations);
      console.log(`${metric.name}: avg=${avg.toFixed(2)}ms, max=${max.toFixed(2)}ms, min=${min.toFixed(2)}ms, count=${metric.durations.length}`);
    });
    console.groupEnd();
  }
};

/**
 * Monitor component render time
 */
export const usePerformanceMonitoring = (componentName: string) => {
  if (typeof window === "undefined") return;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name.includes(componentName)) {
        trackPerformanceMetric(`Component Render: ${componentName}`, entry.duration, "ms");
      }
    }
  });

  try {
    observer.observe({ entryTypes: ["measure", "navigation"] });
  } catch (e) {
    // Observer not supported in this browser
  }

  return () => {
    observer.disconnect();
  };
};

/**
 * Get Core Web Vitals
 */
export const getCoreWebVitals = (): void => {
  if (typeof window === "undefined") return;

  // Largest Contentful Paint
  const paintObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    if (entries.length > 0) {
      const lastEntry = entries[entries.length - 1];
      trackPerformanceMetric("Largest Contentful Paint", lastEntry.startTime, "ms");
    }
  });

  try {
    paintObserver.observe({ entryTypes: ["largest-contentful-paint"] });
  } catch (e) {
    // Observer not supported
  }

  // Cumulative Layout Shift
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }
    trackPerformanceMetric("Cumulative Layout Shift", clsValue * 100, "%");
  });

  try {
    clsObserver.observe({ entryTypes: ["layout-shift"] });
  } catch (e) {
    // Observer not supported
  }

  // First Input Delay
  const fid = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      trackPerformanceMetric("First Input Delay", (entry as any).processingDuration, "ms");
    }
  });

  try {
    fid.observe({ entryTypes: ["first-input"] });
  } catch (e) {
    // Observer not supported
  }
};

export default {
  measureAsyncFunction,
  measureFunction,
  measureAPIRequest,
  getMetrics,
  getMetricsByName,
  getAverageDuration,
  clearMetrics,
  reportMetrics,
  usePerformanceMonitoring,
  getCoreWebVitals,
};
