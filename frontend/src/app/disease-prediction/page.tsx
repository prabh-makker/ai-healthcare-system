'use client';

import React from 'react';
import DiseasePredictor from '@/components/DiseasePredictor';
import { motion } from 'framer-motion';

export default function DiseasePredictionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-3">
            AI Disease Prediction System
          </h1>
          <p className="text-slate-300 text-lg">
            Advanced XGBoost model with 99.535% accuracy across 20 diseases
          </p>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-500/20 rounded-lg p-4">
            <div className="text-3xl font-bold text-cyan-400">99.53%</div>
            <div className="text-slate-400 text-sm">Overall Accuracy</div>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border border-purple-500/20 rounded-lg p-4">
            <div className="text-3xl font-bold text-purple-400">20</div>
            <div className="text-slate-400 text-sm">Diseases Supported</div>
          </div>
          <div className="bg-gradient-to-br from-pink-900/30 to-pink-900/10 border border-pink-500/20 rounded-lg p-4">
            <div className="text-3xl font-bold text-pink-400">84</div>
            <div className="text-slate-400 text-sm">Total Symptoms</div>
          </div>
          <div className="bg-gradient-to-br from-green-900/30 to-green-900/10 border border-green-500/20 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">v4.0</div>
            <div className="text-slate-400 text-sm">Model Version</div>
          </div>
        </motion.div>

        {/* Main Predictor Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <DiseasePredictor />
        </motion.div>

        {/* Info Section */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-cyan-400 mb-3">How It Works</h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>✓ Select multiple symptoms from the list</li>
              <li>✓ AI analyzes symptom combinations</li>
              <li>✓ Get instant disease predictions</li>
              <li>✓ View confidence scores and analysis</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-purple-400 mb-3">Key Features</h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>✓ Real-time predictions</li>
              <li>✓ Top 5 disease rankings</li>
              <li>✓ Symptom importance analysis</li>
              <li>✓ Specialist recommendations</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-pink-400 mb-3">Supported Diseases</h3>
            <ul className="space-y-1 text-slate-300 text-sm">
              <li>• COVID-19, Pneumonia, Flu</li>
              <li>• Asthma, Bronchitis, Sinusitis</li>
              <li>• Diabetes, Hypertension, Arthritis</li>
              <li>• And 11 more conditions...</li>
            </ul>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="mt-12 pt-8 border-t border-slate-700/50 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-slate-400 text-sm">
            🔬 Powered by XGBoost Machine Learning Model v4.0<br/>
            📊 Trained on 300,000 synthetic samples with real disease patterns
          </p>
        </motion.div>
      </div>
    </div>
  );
}
