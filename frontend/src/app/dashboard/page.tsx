"use client";

import React from 'react';
import { 
  Activity, 
  Users, 
  Calendar, 
  ShieldCheck, 
  TrendingUp, 
  Search, 
  Bell,
  Plus,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const SidebarLink = ({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <div className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all duration-300 group ${
    active ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-zinc-500 hover:bg-white/5 hover:text-white'
  }`}>
    <Icon size={20} className={active ? '' : 'group-hover:scale-110 transition-transform'} />
    <span className="font-medium">{label}</span>
  </div>
);

const StatCard = ({ label, value, icon: Icon, trend, color }: { label: string, value: string, icon: any, trend: string, color: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5 }}
    className="glass-card p-6 rounded-[2rem]"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-20`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
      <div className={`flex items-center space-x-1 text-xs font-bold ${trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
        <span>{trend}</span>
        <ArrowUpRight size={14} />
      </div>
    </div>
    <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">{label}</p>
    <h3 className="text-3xl font-bold mt-1 tracking-tight">{value}</h3>
  </motion.div>
);

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex font-[family-name:var(--font-sans)]">
      {/* Sidebar */}
      <aside className="w-72 glass-nav p-8 flex flex-col hidden lg:flex">
        <div className="flex items-center space-x-3 mb-16">
          <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tighter block leading-none">HealthAI</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Intelligence</span>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <SidebarLink icon={Activity} label="Overview" active />
          <SidebarLink icon={Users} label="Patient Registry" />
          <SidebarLink icon={Calendar} label="Schedule" />
          <SidebarLink icon={TrendingUp} label="Diagnostics" />
        </nav>

        <div className="glass-card p-6 rounded-3xl bg-sky-500/5">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Mainframe Active</span>
          </div>
          <p className="text-sm text-zinc-300">System running at 99.9% efficiency.</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gradient">Clinical Dashboard</h1>
            <p className="text-zinc-500 mt-2 font-medium">Monitoring systemic health in real-time.</p>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center glass-card px-4 py-2.5 rounded-2xl text-zinc-400 focus-within:text-white transition-colors">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search patient ID..." 
                className="bg-transparent border-none outline-none ml-3 text-sm w-48 font-medium"
              />
            </div>
            
            <div className="relative glass-card p-2.5 rounded-2xl text-zinc-400 hover:text-white cursor-pointer transition-all">
              <Bell size={20} />
              <div className="absolute top-2 right-2 w-2 h-2 bg-sky-500 rounded-full ring-4 ring-[#050505]" />
            </div>

            <button className="bg-sky-500 hover:bg-sky-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl shadow-sky-500/20 active:scale-95">
              <Plus size={20} strokeWidth={3} />
              <span>Initiate Triage</span>
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <StatCard 
            label="Verified Patients" 
            value="1,492" 
            icon={Users} 
            trend="+12.5%" 
            color="bg-sky-500"
          />
          <StatCard 
            label="Inference Load" 
            value="8.2ms" 
            icon={Activity} 
            trend="-24.1%" 
            color="bg-violet-500"
          />
          <StatCard 
            label="Model Precision" 
            value="98.4%" 
            icon={ShieldCheck} 
            trend="+1.2%" 
            color="bg-emerald-500"
          />
          <StatCard 
            label="Growth Velocity" 
            value="15.8%" 
            icon={TrendingUp} 
            trend="+5.4%" 
            color="bg-amber-500"
          />
        </div>

        {/* Data Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Table */}
          <section className="xl:col-span-2">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Recent Diagnostic Sequences</h2>
              <button className="text-sky-500 text-sm font-bold hover:text-sky-400 flex items-center space-x-1 group">
                <span>View Full Registry</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="glass-card rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Subject</th>
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Protocol</th>
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Confidence</th>
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { name: "John Doe", type: "X-Ray Analysis", conf: 98, status: "Critical", color: "text-rose-400" },
                    { name: "Sarah Connor", type: "Symptom Check", conf: 92, status: "Moderate", color: "text-amber-400" },
                    { name: "Marcus Wright", type: "MRI Scan", conf: 99, status: "Normal", color: "text-sky-400" },
                  ].map((row, i) => (
                    <tr key={i} className="group hover:bg-white/[0.03] transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800" />
                          <span className="font-bold text-zinc-200">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-zinc-400 font-medium">{row.type}</td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${row.conf}%` }}
                              className="h-full bg-sky-500" 
                            />
                          </div>
                          <span className="text-xs font-bold">{row.conf}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className={`text-xs font-black uppercase tracking-tighter ${row.color} px-3 py-1 rounded-full bg-white/5`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Right Panel */}
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-8">AI Insights</h2>
            <div className="glass-card rounded-[2.5rem] p-8 space-y-6">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                <h4 className="font-bold mb-2">Pneumonia Pattern Detected</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Sequence #8291 shows significant density in the lower right lobe. Specialist notification sent.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                <h4 className="font-bold mb-2">Efficiency Threshold Met</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Inference latency has dropped below 10ms consistently over the last 24 hours.
                </p>
              </div>
              <button className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold transition-all">
                Generate Full Report
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
