import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface Prediction {
  disease: string;
  confidence: number;
  probability: number;
}

interface PredictionResponse {
  top_predictions: Prediction[];
  primary_disease: string;
  confidence_score: number;
  symptom_analysis: Record<string, number>;
  message: string;
}

interface DiseasePredictorProps {
  selectedSymptoms?: string[];
  onPredictionResult?: (result: PredictionResponse) => void;
}

const DiseasePredictor: React.FC<DiseasePredictorProps> = ({
  selectedSymptoms = [],
  onPredictionResult
}) => {
  const [symptoms, setSymptoms] = useState<string[]>(selectedSymptoms);
  const [availableSymptoms, setAvailableSymptoms] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available symptoms on mount
  useEffect(() => {
    fetchSymptoms();
  }, []);

  const fetchSymptoms = async () => {
    try {
      const response = await axios.get('/api/v1/disease/symptoms');
      setAvailableSymptoms(response.data.symptoms);
    } catch (err) {
      console.error('Error fetching symptoms:', err);
    }
  };

  const handleSymptomToggle = (symptom: string) => {
    setSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handlePredict = async () => {
    if (symptoms.length === 0) {
      setError('Please select at least one symptom');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<PredictionResponse>('/api/v1/disease/predict', {
        symptoms
      });
      setPrediction(response.data);
      if (onPredictionResult) {
        onPredictionResult(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error getting prediction');
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSymptoms([]);
    setPrediction(null);
    setError(null);
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-lg border border-purple-500/20 p-6 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
          AI Disease Prediction
        </h2>
        <p className="text-slate-400 text-sm">Select symptoms for AI-powered diagnosis prediction</p>
      </div>

      {/* Symptoms Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-300 mb-3">
          Select Symptoms ({symptoms.length} selected)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
          {availableSymptoms.map(symptom => (
            <button
              key={symptom}
              onClick={() => handleSymptomToggle(symptom)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                symptoms.includes(symptom)
                  ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-300'
                  : 'bg-slate-700/30 border border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              {symptom.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handlePredict}
          disabled={loading || symptoms.length === 0}
          className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Predicting...' : 'Get Prediction'}
        </button>
        {symptoms.length > 0 && (
          <button
            onClick={handleClear}
            className="bg-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-lg hover:bg-slate-600 transition-all"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}

      {/* Prediction Results */}
      {prediction && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Primary Prediction */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4">
            <p className="text-sm text-slate-400 mb-1">Primary Diagnosis</p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-bold text-cyan-300">{prediction.primary_disease}</h3>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                    style={{ width: `${prediction.confidence_score}%` }}
                  />
                </div>
                <span className="text-cyan-400 font-bold text-sm">{prediction.confidence_score.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Top 5 Predictions */}
          <div>
            <p className="text-sm font-semibold text-slate-300 mb-3">All Predictions (Top 5)</p>
            <div className="space-y-2">
              {prediction.top_predictions.map((pred, idx) => (
                <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 font-medium text-sm">{pred.disease}</span>
                    <span className="text-slate-400 text-xs">{(pred.probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${pred.confidence}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Symptom Importance */}
          {Object.keys(prediction.symptom_analysis).length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-3">Symptom Importance for Diagnosis</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(prediction.symptom_analysis).slice(0, 6).map(([symptom, importance]) => (
                  <div key={symptom} className="bg-slate-800/40 rounded-lg p-2">
                    <p className="text-xs text-slate-400 truncate">{symptom.replace(/_/g, ' ')}</p>
                    <p className="text-xs font-bold text-purple-400">{importance.toFixed(2)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Message */}
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg p-3">
            <p className="text-sm text-slate-300 italic">{prediction.message}</p>
          </div>
        </motion.div>
      )}

      {/* Info Box */}
      {!prediction && symptoms.length === 0 && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-400">
            Select patient symptoms above and click "Get Prediction" to see AI-powered disease diagnosis suggestions
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default DiseasePredictor;
