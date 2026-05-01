/**
 * Sentry Configuration for React/Next.js
 * Error tracking and performance monitoring
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || "development";

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.log("Sentry DSN not configured, skipping initialization");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",

    // Capture unhandled promise rejections
    attachStacktrace: true,
    maxValueLength: 1024,

    // Filter out certain errors
    ignoreErrors: [
      // Network errors that are expected
      "Network request failed",
      "NetworkError",
      "Failed to fetch",
      // Browser extensions
      /chrome-extension/i,
      /moz-extension/i,
      // Ignore third-party scripts
      /script error/i,
    ],

    beforeSend(event, hint) {
      // Filter out certain events
      if (event.exception) {
        const error = hint.originalException;

        // Ignore certain error types
        if (error instanceof TypeError && error.message.includes("Cannot read properties")) {
          return null;
        }
      }

      return event;
    },
  });
};

/**
 * Capture an exception with additional context
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture a message
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = "info") => {
  Sentry.captureMessage(message, level);
};

/**
 * Set user context for error tracking
 */
export const setUserContext = (userId: string, email?: string, name?: string) => {
  Sentry.setUser({
    id: userId,
    email,
    username: name,
  });
};

/**
 * Clear user context
 */
export const clearUserContext = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addBreadcrumb = (
  message: string,
  category: string = "user-action",
  level: Sentry.SeverityLevel = "info"
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
};

export default Sentry;
