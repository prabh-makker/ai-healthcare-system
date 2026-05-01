export const trackPerformanceMetric = (
  name: string,
  value: number,
  unit: string
): void => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Analytics] ${name}: ${value.toFixed(2)}${unit}`);
  }
};
