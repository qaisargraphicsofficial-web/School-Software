import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { 
  Users, 
  GraduationCap, 
  Wallet, 
  TrendingUp, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface DashboardProps {
  profile: UserProfile | null;
}

export default function Dashboard({ profile }: DashboardProps) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalStaff: 0,
    totalFees: 0,
    attendanceRate: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) return;
      
      try {
        const studentsSnap = await getDocs(collection(db, 'students'));
        const staffSnap = await getDocs(collection(db, 'staff'));
        const feesSnap = await getDocs(collection(db, 'fees'));
        
        let totalFees = 0;
        feesSnap.forEach(doc => {
          if (doc.data().status === 'paid') totalFees += doc.data().amount;
        });

        setStats({
          totalStudents: studentsSnap.size,
          totalStaff: staffSnap.size,
          totalFees: totalFees,
          attendanceRate: 94.5, // Mock for now
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchStats();
  }, [profile]);

  const feeData = [
    { month: 'Jan', amount: 45000 },
    { month: 'Feb', amount: 52000 },
    { month: 'Mar', amount: 48000 },
    { month: 'Apr', amount: 61000 },
    { month: 'May', amount: 55000 },
    { month: 'Jun', amount: 67000 },
  ];

  const attendanceData = [
    { day: 'Mon', rate: 92 },
    { day: 'Tue', rate: 95 },
    { day: 'Wed', rate: 98 },
    { day: 'Thu', rate: 94 },
    { day: 'Fri', rate: 91 },
  ];

  const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      className="card p-7 group cursor-default"
    >
      <div className="flex items-start justify-between mb-5">
        <div className={cn("p-3.5 rounded-2xl shadow-lg transition-transform duration-300 group-hover:rotate-6", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
            trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          )}>
            {trend > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{title}</p>
      <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
    </motion.div>
  );

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
            Welcome back, {profile?.email?.split('@')[0]}!
          </h1>
          <p className="text-slate-500 font-medium">Here's what's happening at your school today.</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 shadow-sm">
          <Calendar className="w-4 h-4 text-indigo-600" />
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Students" 
          value={stats.totalStudents} 
          icon={Users} 
          trend={12}
          color="bg-indigo-600"
        />
        <StatCard 
          title="Total Staff" 
          value={stats.totalStaff} 
          icon={GraduationCap} 
          trend={4}
          color="bg-purple-600"
        />
        <StatCard 
          title="Total Fees Collected" 
          value={`$${stats.totalFees.toLocaleString()}`} 
          icon={Wallet} 
          trend={8}
          color="bg-emerald-600"
        />
        <StatCard 
          title="Avg. Attendance" 
          value={`${stats.attendanceRate}%`} 
          icon={TrendingUp} 
          trend={-2}
          color="bg-amber-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Fee Collection Overview</h3>
            <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-widest">Monthly</div>
          </div>
          <div className="h-80 min-h-[320px]">
            <ResponsiveContainer width="100%" aspect={2}>
              <AreaChart data={feeData}>
                <defs>
                  <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorFees)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Weekly Attendance Rate</h3>
            <div className="px-3 py-1 bg-purple-50 text-purple-600 text-[10px] font-black rounded-full uppercase tracking-widest">Weekly</div>
          </div>
          <div className="h-80 min-h-[320px]">
            <ResponsiveContainer width="100%" aspect={2}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="rate" fill="#8b5cf6" radius={[8, 8, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
