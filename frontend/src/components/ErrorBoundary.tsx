"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dashboard ErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="max-w-md w-full glass-card rounded-2xl p-8 border border-red-500/20 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-zinc-400 mb-6">
            {this.state.error?.message || "An unexpected error occurred while rendering this page."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
            >
              <RefreshCw size={14} />
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
