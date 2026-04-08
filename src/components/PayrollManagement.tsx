import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Payroll, Staff, UserProfile } from '../types';
import { Receipt, History, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface PayrollManagementProps { profile: UserProfile | null; }

export default function PayrollManagement({ profile }: PayrollManagementProps) {
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'payroll'), orderBy('paymentDate', 'desc'));
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Payroll Management</h2>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
          Send All Payments
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
            ) : (
              payroll.map((p) => (
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
                      <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Payslip">
                        <Receipt className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Salary History">
                        <History className="w-5 h-5" />
                      </button>
                      {p.status === 'pending' && (
                        <button className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors">
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
    </div>
  );
}
