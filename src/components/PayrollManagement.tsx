import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Payroll, Staff, UserProfile } from '../types';
import { Receipt, History, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface PayrollManagementProps { profile: UserProfile | null; }

export default function PayrollManagement({ profile }: PayrollManagementProps) {
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'staffName' | 'month' | 'paymentDate' | 'status'>('paymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPayroll, setNewPayroll] = useState({ staffId: '', amount: 0, deductions: 0, netPay: 0, month: '', paymentDate: '', status: 'pending' as 'pending' | 'paid' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'payroll'));
      const snap = await getDocs(q);
      setPayroll(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payroll)));
      
      const sSnap = await getDocs(collection(db, 'staff'));
      setStaff(sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    } catch (error) {
      console.error("Error fetching payroll:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayroll = payroll.filter(p => {
    const staffName = (staff.find(s => s.id === p.staffId)?.name || '').toLowerCase();
    return staffName.includes(searchQuery.toLowerCase()) || (p.month || '').toLowerCase().includes(searchQuery.toLowerCase());
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'staffName') {
      const nameA = staff.find(s => s.id === a.staffId)?.name || '';
      const nameB = staff.find(s => s.id === b.staffId)?.name || '';
      comparison = nameA.localeCompare(nameB);
    } else if (sortBy === 'month') comparison = a.month.localeCompare(b.month);
    else if (sortBy === 'paymentDate') comparison = new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime();
    else if (sortBy === 'status') comparison = a.status.localeCompare(b.status);
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleAddPayroll = async () => {
    if (!newPayroll.staffId || !newPayroll.month || !newPayroll.paymentDate) return;
    try {
      await addDoc(collection(db, 'payroll'), { ...newPayroll, amount: Number(newPayroll.amount), deductions: Number(newPayroll.deductions), netPay: Number(newPayroll.netPay) });
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error adding payroll:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Payroll Management</h2>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Record
        </button>
      </div>
      <div className="flex gap-4">
        <input type="text" placeholder="Search by staff name or month..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm" />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm">
          <option value="staffName">Staff Name</option>
          <option value="month">Month</option>
          <option value="paymentDate">Payment Date</option>
          <option value="status">Status</option>
        </select>
        <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold">
          {sortOrder === 'asc' ? 'Asc' : 'Desc'}
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Staff</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Gross</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Deductions</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Net Pay</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Month</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center animate-pulse">Loading payroll...</td></tr>
            ) : filteredPayroll.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No records found.</td></tr>
            ) : (
              filteredPayroll.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{staff.find(s => s.id === p.staffId)?.name || 'Unknown Staff'}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">${p.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-rose-600">${(p.deductions || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">${(p.netPay || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.month}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit",
                      p.status === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Receipt className="w-5 h-5" /></button>
                      {p.status === 'pending' && (
                        <button onClick={() => updateDoc(doc(db, 'payroll', p.id!), { status: 'paid' }).then(fetchData)} className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                          Send Pay
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Add Payroll Record</h2>
            <select value={newPayroll.staffId} onChange={e => setNewPayroll({...newPayroll, staffId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
              <option value="">Select Staff</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="number" placeholder="Gross Salary" onChange={e => setNewPayroll({...newPayroll, amount: Number(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            <input type="number" placeholder="Deductions" onChange={e => setNewPayroll({...newPayroll, deductions: Number(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            <input type="number" placeholder="Net Pay" onChange={e => setNewPayroll({...newPayroll, netPay: Number(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            <input type="text" placeholder="Month (e.g., 2026-04)" onChange={e => setNewPayroll({...newPayroll, month: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            <input type="date" onChange={e => setNewPayroll({...newPayroll, paymentDate: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
              <button onClick={handleAddPayroll} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
