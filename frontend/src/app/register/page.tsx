"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Register() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'patient'
    });
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('http://localhost:8001/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                router.push('/login');
            } else {
                const data = await response.json();
                alert(data.detail || "Registration failed.");
            }
        } catch (err) {
            alert("Network error. Make sure the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card w-full max-w-md p-10 rounded-[3rem] shadow-2xl relative overflow-hidden"
            >
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-sky-500 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-sky-500/20 mb-6">
                        <ShieldCheck size={36} className="text-white" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-gradient">Create Account</h2>
                    <p className="text-zinc-500 mt-2 font-medium">Join the next-gen clinical network.</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Role Allocation</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'patient' })}
                                className={`p-4 rounded-2xl border transition-all font-bold ${formData.role === 'patient' ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'bg-white/5 border-white/5 text-zinc-500'}`}
                            >
                                Patient
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'doctor' })}
                                className={`p-4 rounded-2xl border transition-all font-bold ${formData.role === 'doctor' ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'bg-white/5 border-white/5 text-zinc-500'}`}
                            >
                                Doctor
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-sky-500 transition-colors" size={20} />
                            <input
                                type="email"
                                placeholder="Secure Email Access"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-sky-500/50 transition-all font-medium text-white placeholder:text-zinc-600"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-sky-500 transition-colors" size={20} />
                            <input
                                type="password"
                                placeholder="Access Secret"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-sky-500/50 transition-all font-medium text-white placeholder:text-zinc-600"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-xl shadow-sky-500/20 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <span>Processing...</span> : <><span>Initialize Identity</span> <ArrowRight size={20} /></>}
                    </motion.button>
                </form>

                <div className="mt-10 text-center">
                    <p className="text-zinc-500 font-medium">Already indexed? <Link href="/login" className="text-sky-500 font-bold hover:text-sky-400 transition-colors">SignIn</Link></p>
                </div>
            </motion.div>
        </div>
    );
}
