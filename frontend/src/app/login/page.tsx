"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock, ArrowRight, Activity } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Login() {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const loginParams = new URLSearchParams();
            loginParams.append('username', formData.username);
            loginParams.append('password', formData.password);

            const response = await fetch('http://localhost:8001/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: loginParams,
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.access_token);
                router.push('/dashboard');
            } else {
                const data = await response.json();
                alert(data.detail || "Authentication failed.");
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
                    <h2 className="text-3xl font-bold tracking-tight text-gradient">Login Portal</h2>
                    <p className="text-zinc-500 mt-2 font-medium">Secure verification required.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-sky-500 transition-colors" size={20} />
                            <input
                                type="email"
                                placeholder="Secure Email Access"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-sky-500/50 transition-all font-medium text-white placeholder:text-zinc-600"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
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
                        {loading ? <span>Processing...</span> : <><span>Establish Connection</span> <ArrowRight size={20} /></>}
                    </motion.button>
                </form>

                <div className="mt-10 text-center">
                    <p className="text-zinc-500 font-medium">New to HealthAI? <Link href="/register" className="text-sky-500 font-bold hover:text-sky-400 transition-colors">Register</Link></p>
                </div>
            </motion.div>
        </div>
    );
}
