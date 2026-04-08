import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Calendar as CalendarIcon, Check, X, Plus, Settings, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LeaveProps {
  profile: UserProfile | null;
}

interface LeaveRequest {
  id: string;
  staffName: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
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

  const [requests, setRequests] = useState<LeaveRequest[]>([
    { id: '1', staffName: 'Mr. Smith', type: 'Sick Leave', startDate: '2026-04-10', endDate: '2026-04-12', reason: 'Fever', status: 'pending' },
    { id: '2', staffName: 'Ms. Johnson', type: 'Casual Leave', startDate: '2026-04-15', endDate: '2026-04-15', reason: 'Personal work', status: 'approved' },
  ]);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({ type: 'Sick Leave', startDate: '', endDate: '', reason: '' });

  const handleStatusChange = (id: string, status: 'approved' | 'rejected') => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const handleSubmitRequest = () => {
    if (!newRequest.startDate || !newRequest.endDate || !newRequest.reason) return;
    
    const request: LeaveRequest = {
      id: Date.now().toString(),
      staffName: profile?.displayName || 'Staff Member',
      ...newRequest,
      status: 'pending'
    };
    
    setRequests(prev => [...prev, request]);
    setIsRequestModalOpen(false);
    setNewRequest({ type: 'Sick Leave', startDate: '', endDate: '', reason: '' });
  };

  const getTakenCount = (type: string) => requests.filter(r => r.type === type && r.status === 'approved').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leave Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage staff and teacher leave requests</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          {(['requests', 'calendar', 'settings'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Leave Balances</h2>
            <button onClick={() => setIsRequestModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-sm">
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
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-slate-500">Staff</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500">Type</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500">Dates</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500">Status</th>
                  {profile?.role === 'admin' && <th className="px-6 py-3 text-right font-bold text-slate-500">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-medium text-slate-900">{r.staffName}</td>
                    <td className="px-6 py-4 text-slate-600">{r.type}</td>
                    <td className="px-6 py-4 text-slate-600">{r.startDate} to {r.endDate}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    {profile?.role === 'admin' && r.status === 'pending' && (
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button onClick={() => handleStatusChange(r.id, 'approved')} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"><Check className="w-4 h-4" /></button>
                        <button onClick={() => handleStatusChange(r.id, 'rejected')} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><X className="w-4 h-4" /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
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
                <div key={i} className={`h-24 border border-slate-100 rounded-lg p-2 ${approvedRequests.length > 0 ? 'bg-blue-50' : ''}`}>
                  <span className="text-xs font-bold text-slate-500">{i + 1}</span>
                  {approvedRequests.map(r => <div key={r.id} className="text-[10px] bg-blue-100 text-blue-700 p-1 rounded mt-1 truncate">{r.staffName}</div>)}
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
                <button onClick={handleSubmitRequest} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">Submit</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
