import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Fee, Student, UserProfile } from '../types';
import { Wallet, Receipt, Plus, Printer, Download, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface FeesManagementProps { profile: UserProfile | null; }

export default function FeesManagement({ profile }: FeesManagementProps) {
  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'fees'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setFees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Fee)));
      
      const sSnap = await getDocs(collection(db, 'students'));
      setStudents(sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    } catch (error) {
      console.error("Error fetching fees:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Fee Management</h2>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
          + Add Fee Record
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Amount</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Date</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center animate-pulse">Loading fees...</td></tr>
            ) : (
              fees.map((fee) => (
                <tr key={fee.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {students.find(s => s.id === fee.studentId)?.name || 'Unknown Student'}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">${fee.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{fee.date}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit",
                      fee.status === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {fee.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {fee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
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
