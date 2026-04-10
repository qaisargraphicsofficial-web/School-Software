import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Task } from '../types';
import { 
  Users, 
  GraduationCap, 
  Wallet, 
  TrendingUp, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  UserPlus,
  CheckSquare,
  FileText,
  Clock,
  ChevronRight
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
import { Link } from 'react-router-dom';

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
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

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

    // Only fetch tasks for staff/admin, or filter by assignedTo for others to avoid permission errors
    let q;
    if (profile.role === 'admin' || profile.role === 'staff') {
      q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(5));
    } else {
      // For students/parents, only show tasks assigned to them
      q = query(
        collection(db, 'tasks'),
        where('assignedToIds', 'array-contains', profile.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
    }

    const unsubscribeTasks = onSnapshot(q, (snap) => {
      setRecentTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => {
      console.error("Error in task listener:", error);
      if (error.code === 'permission-denied') {
        setRecentTasks([]);
      }
    });

    fetchStats();
    return () => unsubscribeTasks();
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

      {/* Charts & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Charts */}
        <div className="lg:col-span-8 space-y-10">
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

        {/* Sidebar: Quick Actions & Activity */}
        <div className="lg:col-span-4 space-y-8">
          {/* Quick Actions */}
          <div className="card p-8 bg-indigo-600 text-white border-0 shadow-xl shadow-indigo-100">
            <h3 className="text-lg font-black tracking-tight mb-6">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/students" className="flex flex-col items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors border border-white/10">
                <UserPlus className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">Add Student</span>
              </Link>
              <Link to="/tasks" className="flex flex-col items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors border border-white/10">
                <CheckSquare className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">New Task</span>
              </Link>
              <Link to="/communication" className="flex flex-col items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors border border-white/10">
                <FileText className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">Notice</span>
              </Link>
              <Link to="/finance" className="flex flex-col items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors border border-white/10">
                <Wallet className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">Fees</span>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Recent Activity</h3>
              <Link to="/tasks" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All</Link>
            </div>
            <div className="space-y-6">
              {recentTasks.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-400">No recent activity</p>
                </div>
              ) : (
                recentTasks.map(task => (
                  <div key={task.id} className="flex gap-4 group cursor-pointer">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                      task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                    )}>
                      {task.status === 'completed' ? <CheckSquare className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0 border-b border-slate-50 pb-4 group-last:border-0 group-last:pb-0">
                      <p className="text-sm font-bold text-slate-900 truncate mb-0.5">{task.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {task.status === 'completed' ? 'Completed' : 'Assigned'} • {new Date(task.createdAt || '').toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 self-center opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
