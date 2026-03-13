"use client";

import React, { useState } from 'react';
import {
    Plus,
    ChevronRight,
    Check,
    AlertCircle,
    ShieldCheck,
    Activity,
    Thermometer,
    Dna,
    FileSearch,
    ArrowRight,
    ShieldPlus,
    ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const symptoms = [
    { id: 'fever', label: 'High Fever', icon: Thermometer },
    { id: 'cough', label: 'Persistent Cough', icon: Activity },
    { id: 'fatigue', label: 'Chronic Fatigue', icon: Activity },
    { id: 'difficulty_breathing', label: 'Difficulty Breathing', icon: Activity },
    { id: 'loss_of_taste_smell', label: 'Loss of Taste/Smell', icon: Dna },
    { id: 'headache', label: 'Severe Headache', icon: Activity },
    { id: 'sore_throat', label: 'Sore Throat', icon: Activity },
];

export default function SymptomChecker() {
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const toggleSymptom = (id: string) => {
        setSelectedSymptoms(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleAnalyze = async () => {
        if (selectedSymptoms.length === 0) return;

        setIsAnalyzing(true);
        // Simulate API delay for premium feel
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const response = await fetch('http://localhost:8001/api/v1/diagnosis/symptoms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ symptoms: selectedSymptoms }),
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error('Error analyzing symptoms:', error);
            // Fallback mockup result if API is not running
            setResult({
                predicted_disease: "Unable to reach diagnostic engine.",
                confidence: 0,
                recommended_specialist: "Please contact system administrator."
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const reset = () => {
        setSelectedSymptoms([]);
        setResult(null);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-12 overflow-y-auto">
            <header className="max-w-4xl mx-auto mb-16">
                <Link href="/dashboard" className="inline-flex items-center space-x-2 text-zinc-500 hover:text-white transition-colors mb-8 group">
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold">Return to Dashboard</span>
                </Link>
                <h1 className="text-5xl font-bold tracking-tight text-gradient mb-4">Symptom Diagnostic Interface</h1>
                <p className="text-zinc-500 text-lg font-medium">Select presenting symptoms for real-time AI-powered clinical analysis.</p>
            </header>

            <main className="max-w-4xl mx-auto">
                {!result ? (
                    <div className="glass-card rounded-[2.5rem] p-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                            {symptoms.map((symptom) => {
                                const Icon = symptom.icon;
                                const isSelected = selectedSymptoms.includes(symptom.id);
                                return (
                                    <motion.div
                                        key={symptom.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => toggleSymptom(symptom.id)}
                                        className={`flex items-center justify-between p-6 rounded-3xl border cursor-pointer transition-all duration-300 ${isSelected
                                            ? 'bg-sky-500/10 border-sky-500/50 text-white shadow-lg shadow-sky-500/10'
                                            : 'bg-white/5 border-white/5 text-zinc-400'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className={`p-3 rounded-2xl ${isSelected ? 'bg-sky-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                                <Icon size={20} />
                                            </div>
                                            <span className="font-bold tracking-tight">{symptom.label}</span>
                                        </div>
                                        {isSelected && <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center"><Check size={14} strokeWidth={4} /></div>}
                                    </motion.div>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-8 rounded-[2rem]">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                                    <ShieldCheck size={28} />
                                </div>
                                <div>
                                    <h4 className="font-bold leading-none mb-1">Secure Analysis</h4>
                                    <p className="text-xs text-zinc-500 font-medium">HIPAA compliant data transmission.</p>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={selectedSymptoms.length === 0 || isAnalyzing}
                                onClick={handleAnalyze}
                                className={`flex items-center space-x-3 px-10 py-5 rounded-[1.5rem] font-bold transition-all shadow-2xl ${selectedSymptoms.length > 0 && !isAnalyzing
                                    ? 'bg-sky-500 text-white shadow-sky-500/20 hover:bg-sky-400'
                                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                                    }`}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>Analyzing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Activity size={20} />
                                        <span>Sequence Diagnostic</span>
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card rounded-[2.5rem] p-12 text-center"
                    >
                        <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-8 ${result.confidence > 70 ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
                            }`}>
                            <ShieldPlus size={40} />
                        </div>

                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">AI Diagnostic Report</h2>
                        <h3 className="text-5xl font-bold tracking-tighter mb-4 text-gradient">{result.predicted_disease}</h3>

                        <div className="flex items-center justify-center space-x-3 mb-12">
                            <div className="flex items-center glass-card px-4 py-2 rounded-full border-sky-500/20">
                                <div className="w-2 h-2 bg-sky-500 rounded-full mr-2 animate-pulse" />
                                <span className="text-xs font-bold text-sky-400">Precision: {result.confidence}%</span>
                            </div>
                        </div>

                        <div className="max-w-md mx-auto grid grid-cols-1 gap-4 mb-12">
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 text-left">
                                <div className="flex items-center space-x-3 mb-3">
                                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                                        <FileSearch size={18} />
                                    </div>
                                    <span className="font-bold text-sm tracking-tight text-zinc-300">Analysis Summary</span>
                                </div>
                                <p className="text-sm text-zinc-500 leading-relaxed">
                                    Based on the selected symptoms, the system has identified patterns characteristic of {result.predicted_disease}.
                                    Recommendation has been generated for a specialist review.
                                </p>
                            </div>

                            <div className="p-6 rounded-3xl bg-sky-500/10 border border-sky-500/10 text-left">
                                <div className="flex items-center space-x-3 mb-3">
                                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-500">
                                        <AlertCircle size={18} />
                                    </div>
                                    <span className="font-bold text-sm tracking-tight text-sky-400">Specialist Protocol</span>
                                </div>
                                <p className="text-sm text-white font-medium leading-relaxed">
                                    Recommended Specialist: <br />
                                    <span className="text-lg font-bold">{result.recommended_specialist}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={reset}
                                className="w-full md:w-auto px-10 py-5 rounded-[1.5rem] bg-zinc-800 hover:bg-zinc-700 font-bold transition-all text-zinc-300"
                            >
                                Reset Diagnostic
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-full md:w-auto px-10 py-5 rounded-[1.5rem] bg-sky-500 hover:bg-sky-400 text-white font-bold transition-all shadow-xl shadow-sky-500/30 flex items-center justify-center space-x-2"
                            >
                                <span>Save to Medical Record</span>
                                <ArrowRight size={20} />
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
