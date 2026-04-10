import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, LeaveRequest, LeaveBalance, Staff } from '../types';
import { Calendar as CalendarIcon, Check, X, Plus, Settings, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LeaveProps {
  profile: UserProfile | null;
}

interface LeaveType {
  name: string;
  allocated: number;
}

export default function Leave({ profile }: LeaveProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'calendar' | 'settings'>('requests');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([
    { name: 'Sick Leave', allocated: 10 },
    { name: 'Casual Leave', allocated: 12 },
    { name: 'Paid Leave', allocated: 20 },
  ]);

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({ type: 'Sick Leave', startDate: '', endDate: '', reason: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.campusId) return;

    // Fetch Staff
    const fetchStaff = async () => {
      const q = query(collection(db, 'staff'), where('campusId', '==', profile.campusId));
      const snap = await getDocs(q);
      setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() } as Staff)));
    };
    fetchStaff();

    // Listen to Leave Requests
    let requestsQuery = query(collection(db, 'leave_requests'), where('campusId', '==', profile.campusId));
    if (profile.role !== 'admin') {
      requestsQuery = query(collection(db, 'leave_requests'), where('campusId', '==', profile.campusId), where('staffId', '==', profile.staffId || profile.uid));
    }

    const unsubRequests = onSnapshot(requestsQuery, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest)));
      setLoading(false);
    });

    // Listen to Leave Balances
    let balancesQuery = query(collection(db, 'leave_balances'), where('campusId', '==', profile.campusId));
    if (profile.role !== 'admin') {
      balancesQuery = query(collection(db, 'leave_balances'), where('campusId', '==', profile.campusId), where('staffId', '==', profile.staffId || profile.uid));
    }

    const unsubBalances = onSnapshot(balancesQuery, (snap) => {
      setBalances(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveBalance)));
    });

    return () => {
      unsubRequests();
      unsubBalances();
    };
  }, [profile]);

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    const oldStatus = request.status;
    if (oldStatus === status) return; // No change

    try {
      await updateDoc(doc(db, 'leave_requests', id), { status });
      
      const balance = balances.find(b => b.staffId === request.staffId);
      if (!balance) return;

      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      const balanceRef = doc(db, 'leave_balances', balance.id!);
      const updateData: any = {};

      let change = 0;
      // If approved, subtract days. If rejected, add days back if it was previously approved.
      if (status === 'approved') {
        change = -diffDays;
      } else if (status === 'rejected' && oldStatus === 'approved') {
        change = diffDays;
      }

      if (change === 0) return;

      if (request.type === 'Sick Leave') updateData.sickLeave = (balance.sickLeave || 0) + change;
      else if (request.type === 'Casual Leave') updateData.casualLeave = (balance.casualLeave || 0) + change;
      else if (request.type === 'Paid Leave') updateData.paidLeave = (balance.paidLeave || 0) + change;
      
      await updateDoc(balanceRef, updateData);
    } catch (error) {
      console.error("Error updating leave request:", error);
    }
  };

  const handleSubmitRequest = async () => {
    if (!newRequest.startDate || !newRequest.endDate || !newRequest.reason || !profile?.campusId) return;
    
    try {
      const requestData: Omit<LeaveRequest, 'id'> = {
        staffId: profile.staffId || profile.uid,
        staffName: profile.displayName || 'Staff Member',
        type: newRequest.type,
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
        reason: newRequest.reason,
        status: 'pending',
        appliedOn: new Date().toISOString(),
        campusId: profile.campusId
      };
      
      await addDoc(collection(db, 'leave_requests'), requestData);
      setIsRequestModalOpen(false);
      setNewRequest({ type: 'Sick Leave', startDate: '', endDate: '', reason: '' });
    } catch (error) {
      console.error("Error submitting leave request:", error);
    }
  };

  const getTakenCount = (type: string) => {
    return requests.filter(r => r.type === type && r.status === 'approved').length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leave Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage staff and teacher leave requests</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          {(['requests', 'calendar', 'settings'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Leave Balances</h2>
            <button onClick={() => setIsRequestModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm shadow-sm">
              <Plus className="w-4 h-4" /> Apply for Leave
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leaveTypes.map(lt => {
              const taken = getTakenCount(lt.name);
              return (
                <div key={lt.name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{lt.name}</p>
                  <div className="flex items-end gap-2 mt-2">
                    <span className="text-3xl font-bold text-slate-900">{lt.allocated - taken}</span>
                    <span className="text-sm text-slate-500 font-medium mb-1">/ {lt.allocated} remaining</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900">Recent Requests</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 font-bold text-slate-500">Staff</th>
                    <th className="px-6 py-3 font-bold text-slate-500">Type</th>
                    <th className="px-6 py-3 font-bold text-slate-500">Dates</th>
                    <th className="px-6 py-3 font-bold text-slate-500">Reason</th>
                    <th className="px-6 py-3 font-bold text-slate-500">Status</th>
                    {profile?.role === 'admin' && <th className="px-6 py-3 text-right font-bold text-slate-500">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                  ) : requests.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No leave requests found.</td></tr>
                  ) : (
                    requests.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{r.staffName}</td>
                        <td className="px-6 py-4 text-slate-600">{r.type}</td>
                        <td className="px-6 py-4 text-slate-600">{r.startDate} to {r.endDate}</td>
                        <td className="px-6 py-4 text-slate-600">{r.reason}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                            {r.status.toUpperCase()}
                          </span>
                        </td>
                        {profile?.role === 'admin' && (
                          <td className="px-6 py-4 text-right">
                            {r.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleStatusChange(r.id!, 'approved')} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><Check className="w-4 h-4" /></button>
                                <button onClick={() => handleStatusChange(r.id!, 'rejected')} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{r.status}</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-slate-900 mb-4">Absence Calendar</h3>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center font-bold text-slate-500 text-xs py-2">{day}</div>)}
            {Array.from({ length: 30 }).map((_, i) => {
              const date = `2026-04-${(i + 1).toString().padStart(2, '0')}`;
              const approvedRequests = requests.filter(r => r.status === 'approved' && date >= r.startDate && date <= r.endDate);
              return (
                <div key={i} className={`h-24 border border-slate-100 rounded-lg p-2 ${approvedRequests.length > 0 ? 'bg-indigo-50' : ''}`}>
                  <span className="text-xs font-bold text-slate-500">{i + 1}</span>
                  {approvedRequests.map(r => <div key={r.id} className="text-[10px] bg-indigo-100 text-indigo-700 p-1 rounded mt-1 truncate">{r.staffName}</div>)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'settings' && profile?.role === 'admin' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h3 className="font-bold text-slate-900">Leave Type Configuration</h3>
          {leaveTypes.map(lt => (
            <div key={lt.name} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <span className="flex-1 font-medium text-slate-900">{lt.name}</span>
              <input type="number" value={lt.allocated} onChange={e => setLeaveTypes(prev => prev.map(t => t.name === lt.name ? {...t, allocated: parseInt(e.target.value)} : t))} className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
            </div>
          ))}
        </div>
      )}

      {/* Apply Modal */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Apply for Leave</h2>
              <div className="space-y-4">
                <select value={newRequest.type} onChange={e => setNewRequest({...newRequest, type: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  {leaveTypes.map(lt => <option key={lt.name} value={lt.name}>{lt.name}</option>)}
                </select>
                <input type="date" onChange={e => setNewRequest({...newRequest, startDate: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                <input type="date" onChange={e => setNewRequest({...newRequest, endDate: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                <textarea placeholder="Reason" onChange={e => setNewRequest({...newRequest, reason: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setIsRequestModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
                <button onClick={handleSubmitRequest} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">Submit</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
