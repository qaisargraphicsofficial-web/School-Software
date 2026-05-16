import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, onSnapshot, where, getCountFromServer, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { getSchoolSubscription } from '../services/subscriptionService';
import { UserProfile, Task, Subject, SchoolSubscription } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
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
  ChevronRight,
  BookOpen
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
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  const [fetchingStats, setFetchingStats] = useState(false);
  const [schoolName, setSchoolName] = useState<string>('Your School');
  const [subscription, setSubscription] = useState<SchoolSubscription | null>(null);

  useEffect(() => {
    const fetchSchoolData = async () => {
      if (!profile?.schoolId) return;
      try {
        const [nameSnap, sub] = await Promise.all([
          getDoc(doc(db, 'school_settings', profile.schoolId)),
          getSchoolSubscription(profile.schoolId)
        ]);
        
        if (nameSnap.exists()) {
          setSchoolName(nameSnap.data().schoolName || 'Your School');
        }
        setSubscription(sub);
      } catch (err) {
        console.error("Error fetching school data:", err);
      }
    };
    
    fetchSchoolData();
  }, [profile?.schoolId]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile) return;
      setFetchingStats(true);

      const queryConstraints = [];
      if (profile.schoolId) {
        queryConstraints.push(where('schoolId', '==', profile.schoolId));
      }
      if (profile.campusId && profile.campusId !== 'all') {
        queryConstraints.push(where('campusId', '==', profile.campusId));
      }

      try {
        // Use parallel counting for better speed and lower cost
        if (profile.role === 'admin' || profile.role === 'staff') {
          const [studentsCount, staffCount] = await Promise.all([
            getCountFromServer(query(collection(db, 'students'), ...queryConstraints)).catch(err => {
              handleFirestoreError(err, OperationType.LIST, 'students');
              throw err;
            }),
            getCountFromServer(query(collection(db, 'staff'), ...queryConstraints)).catch(err => {
              handleFirestoreError(err, OperationType.LIST, 'staff');
              throw err;
            })
          ]);

          // Fetch recent fee records for total (ideally this would be a summary doc)
          const feesSnap = await getDocs(query(
            collection(db, 'fee_records'), 
            ...queryConstraints, 
            where('status', '==', 'paid'),
            limit(100)
          )).catch(err => {
            handleFirestoreError(err, OperationType.LIST, 'fee_records');
            return { docs: [], forEach: () => {} } as any;
          });
          
          let totalFees = 0;
          feesSnap.forEach((doc: any) => {
            totalFees += doc.data().amount || 0;
          });

          setStats({
            totalStudents: studentsCount.data().count,
            totalStaff: staffCount.data().count,
            totalFees: totalFees,
            attendanceRate: 94.5,
          });
        }

        // Fetch subjects for staff
        if (profile.role === 'staff' && profile.staffId) {
          const subjectsConstraints = [where('schoolId', '==', profile.schoolId || 'main-hq')];
          
          // We need to find the staff document ID first to link with subjects
          const staffQuery = query(collection(db, 'staff'), ...queryConstraints, where('staffId', '==', profile.staffId));
          const staffSnap = await getDocs(staffQuery);
          
          if (!staffSnap.empty) {
            const staffDocId = staffSnap.docs[0].id;
            const subjectsQ = query(collection(db, 'subjects'), where('teacherId', '==', staffDocId), limit(10));
            const subjectsSnap = await getDocs(subjectsQ);
            setMySubjects(subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
          }
        }
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
      } finally {
        setFetchingStats(false);
      }
    };

    fetchDashboardData();

    // Task listener (optimized for role)
    if (!profile?.uid || !profile?.role) return;
    if (!profile.schoolId && profile.role !== 'admin') return;

    const taskConstraints = [];
    if (profile.schoolId) taskConstraints.push(where('schoolId', '==', profile.schoolId));
    if (profile.campusId && profile.campusId !== 'all') taskConstraints.push(where('campusId', '==', profile.campusId));

    let q;
    try {
      if (profile.role === 'admin' || profile.role === 'staff') {
        q = query(collection(db, 'tasks'), ...taskConstraints, orderBy('createdAt', 'desc'), limit(5));
      } else {
        q = query(collection(db, 'tasks'), ...taskConstraints, where('assignedToIds', 'array-contains', profile.uid), limit(5));
      }
    } catch (err) {
      console.warn("Could not construct task query:", err);
      return;
    }

    const unsubscribeTasks = onSnapshot(q as any, (snap: any) => {
      setRecentTasks(snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error: any) => {
      if (profile?.uid && error.code !== 'permission-denied') {
        console.error("Task listener error:", error);
      }
    });

    return () => unsubscribeTasks();
  }, [profile?.uid, profile?.schoolId, profile?.campusId]);

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
      className="card p-4 lg:p-7 group cursor-default"
    >
      <div className="flex items-start justify-between mb-3 lg:mb-5">
        <div className={cn("p-2 lg:p-3.5 rounded-xl lg:rounded-2xl shadow-lg transition-transform duration-300 group-hover:rotate-6", color)}>
          <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full text-[10px] lg:text-xs font-bold",
            trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          )}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3 lg:w-3.5 lg:h-3.5" /> : <ArrowDownRight className="w-3 h-3 lg:w-3.5 lg:h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
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
          <p className="text-slate-500 font-medium">Here's what's happening at {schoolName} today.</p>
        </div>
        <div className="flex items-center gap-3">
          {subscription && (
            <div className={cn(
              "px-4 py-2 border rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm",
              subscription.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
              subscription.status === 'trial' ? "bg-amber-50 text-amber-600 border-amber-100" :
              "bg-rose-50 text-rose-600 border-rose-100"
            )}>
              {subscription.planId.toUpperCase()} Plan ({subscription.status})
            </div>
          )}
          <div className="flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 shadow-sm">
            <Calendar className="w-4 h-4 text-indigo-600" />
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard 
          title="Students" 
          value={stats.totalStudents} 
          icon={Users} 
          trend={12}
          color="bg-indigo-600"
        />
        <StatCard 
          title="Staff" 
          value={stats.totalStaff} 
          icon={GraduationCap} 
          trend={4}
          color="bg-purple-600"
        />
        <StatCard 
          title="Fees" 
          value={`$${stats.totalFees.toLocaleString()}`} 
          icon={Wallet} 
          trend={8}
          color="bg-emerald-600"
        />
        <StatCard 
          title="Attendance" 
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
          <div className="card p-5 lg:p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Fee Collection</h3>
              <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-widest">Monthly</div>
            </div>
            <div className="h-64 lg:h-80 min-h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
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

          <div className="card p-5 lg:p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Weekly Attendance</h3>
              <div className="px-3 py-1 bg-purple-50 text-purple-600 text-[10px] font-black rounded-full uppercase tracking-widest">Weekly</div>
            </div>
            <div className="h-64 lg:h-80 min-h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
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
              <Link to="/teachers/tasks" className="flex flex-col items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors border border-white/10">
                <CheckSquare className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">New Task</span>
              </Link>
              <Link to="/communication" className="flex flex-col items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors border border-white/10">
                <FileText className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">Notice</span>
              </Link>
              <Link to="/fees" className="flex flex-col items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors border border-white/10">
                <Wallet className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">Fees</span>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Recent Activity</h3>
              <Link to="/teachers/tasks" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All</Link>
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

          {/* My Subjects (Staff Only) */}
          {profile?.role === 'staff' && (
            <div className="card p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">My Subjects</h3>
                <Link to="/subjects" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All</Link>
              </div>
              <div className="space-y-4">
                {mySubjects.length === 0 ? (
                  <div className="text-center py-10">
                    <BookOpen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400">No subjects assigned</p>
                  </div>
                ) : (
                  mySubjects.map(subject => (
                    <div key={subject.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{subject.name}</p>
                        <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          <span>{subject.code}</span>
                          <span>•</span>
                          <span>Class {subject.class}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
