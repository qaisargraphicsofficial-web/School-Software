import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  ShieldCheck,
  TrendingUp,
  Mail,
  Phone,
  MessageSquare,
  Search,
  Filter,
  ArrowRight,
  MoreVertical,
  MinusCircle,
  UserCircle
} from 'lucide-react';
import { collection, query, getDocs, doc, updateDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { SchoolSettings, SchoolApplication } from '../types';

interface MasterDashboardProps {
  onSwitchSchool: (schoolId: string) => void;
}

export default function MasterDashboard({ onSwitchSchool }: MasterDashboardProps) {
  const [schools, setSchools] = useState<any[]>([]);
  const [applications, setApplications] = useState<SchoolApplication[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'trial'>('all');

  useEffect(() => {
    const fetchSchools = async () => {
      const q = query(collection(db, 'schools'));
      const unsubscribe = onSnapshot(q, (snap) => {
        setSchools(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });
      return unsubscribe;
    };

    const fetchApps = async () => {
      const q = query(collection(db, 'school_applications'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        setApplications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolApplication)));
      });
      return unsubscribe;
    };

    const fetchNotifications = async () => {
      const q = query(collection(db, 'system_notifications'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return unsubscribe;
    };

    fetchSchools();
    fetchApps();
    fetchNotifications();
  }, []);

  const stats = [
    { label: 'Total Schools', value: schools.length, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Active Trials', value: schools.filter(s => s.isTrial).length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Pending Apps', value: applications.filter(a => a.status === 'pending').length, icon: UserCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Messages', value: notifications.length, icon: MessageSquare, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         school.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && school.isActive !== false) ||
                         (filterStatus === 'suspended' && school.isActive === false) ||
                         (filterStatus === 'trial' && school.isTrial);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Master Workspace</h1>
          <p className="text-slate-500 font-medium">Global system management and school monitoring center.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            System Status: Healthy
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-2xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Schools Management Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Main Schools List */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
                Managed Institutions
              </h2>
              <div className="flex items-center gap-3">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search schools..."
                      className="pl-10 pr-4 py-2 bg-slate-50 border border-transparent rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-100 transition-all w-full sm:w-64"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                 </div>
                 <select 
                   className="bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-500 px-3 py-2 outline-none cursor-pointer"
                   value={filterStatus}
                   onChange={e => setFilterStatus(e.target.value as any)}
                 >
                   <option value="all">All Schools</option>
                   <option value="active">Active Only</option>
                   <option value="suspended">Suspended</option>
                   <option value="trial">Trialing</option>
                 </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">School Info</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing & Status</th>
                    <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSchools.map((school) => {
                    const trialLeft = school.isTrial && school.trialExpiresAt 
                      ? Math.ceil((new Date(school.trialExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : 0;

                    return (
                      <tr key={school.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                           <div className="flex items-center gap-4">
                             <div className={cn(
                               "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-all group-hover:scale-105 shadow-sm",
                               school.isActive !== false ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"
                             )}>
                               {school.name.charAt(0)}
                             </div>
                             <div>
                               <p className="font-black text-slate-900 mb-0.5">{school.name}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{school.email}</p>
                             </div>
                           </div>
                        </td>
                        <td className="py-4 px-6">
                           <div className="space-y-1.5">
                             <div className="flex items-center gap-2">
                               <span className={cn(
                                 "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                 school.isActive !== false ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                               )}>
                                 {school.isActive !== false ? 'Active' : 'Suspended'}
                               </span>
                               <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                 {school.plan || 'basic'}
                               </span>
                             </div>
                             {school.isTrial && (
                               <div className={cn(
                                 "flex items-center gap-1.5 text-[10px] font-bold",
                                 trialLeft > 0 ? "text-amber-600" : "text-rose-600"
                               )}>
                                 <Clock className="w-3 h-3" />
                                 {trialLeft > 0 ? `${trialLeft} Days Left in Trial` : 'Trial Expired'}
                               </div>
                             )}
                           </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                           <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => onSwitchSchool(school.id)}
                                className="p-2 bg-white text-indigo-600 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex items-center gap-2 px-3"
                              >
                                <span className="text-xs font-black uppercase tracking-widest">Access</span>
                                <ExternalLink className="w-4 h-4" />
                              </button>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Sections */}
        <div className="space-y-8">
          {/* Registration Requests */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 overflow-hidden">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight text-sm">
                 <Users className="w-5 h-5 text-indigo-600" />
                 Sign-up Requests
               </h3>
               <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                 {applications.filter(a => a.status === 'pending').length} New
               </span>
             </div>
             
             <div className="space-y-4">
               {applications.filter(a => a.status === 'pending').slice(0, 5).map(app => (
                 <div key={app.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all cursor-pointer group">
                   <div className="flex items-center justify-between mb-2">
                     <p className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{app.schoolName}</p>
                     <p className="text-[9px] font-bold text-slate-400">{new Date(app.createdAt).toLocaleDateString()}</p>
                   </div>
                   <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                     <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {app.email.split('@')[0]}...</span>
                     <span className="flex items-center gap-1 uppercase tracking-widest text-[#a855f7] bg-purple-50 px-1.5 rounded">{app.plan}</span>
                   </div>
                   <button 
                     onClick={() => {}} // This logic is in Settings but we can replicate or prompt redirection
                     className="mt-3 w-full py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                   >
                     Review Request
                   </button>
                 </div>
               ))}
               {applications.filter(a => a.status === 'pending').length === 0 && (
                 <div className="text-center py-8">
                   <CheckCircle2 className="w-10 h-10 text-emerald-100 mx-auto mb-2" />
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">All Clear!</p>
                 </div>
               )}
             </div>
          </div>

          {/* System Issues / Reports */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight text-sm">
                 <AlertCircle className="w-5 h-5 text-rose-500" />
                 Issues & Feedback
               </h3>
             </div>
             
             <div className="space-y-4">
               {notifications.slice(0, 5).map(note => (
                 <div key={note.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-rose-100 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                        note.type === 'complaint' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                      )}>
                        {note.type}
                      </span>
                      <p className="text-[9px] font-bold text-slate-400">
                        {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                    <p className="font-bold text-slate-900 text-xs lines-clamp-1">{note.subject || 'System Notification'}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">{note.message}</p>
                    <div className="mt-2 flex items-center gap-2">
                       <div className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[8px] font-bold">
                         {note.schoolName?.charAt(0) || 'S'}
                       </div>
                       <span className="text-[10px] font-bold text-slate-400">{note.schoolName}</span>
                    </div>
                 </div>
               ))}
               {notifications.length === 0 && (
                 <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">
                     No critical system issues reported by schools.
                   </p>
                 </div>
               )}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
