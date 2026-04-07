import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Fee, Expense, Student, UserProfile } from '../types';
import { 
  Wallet, 
  Receipt, 
  TrendingDown, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle,
  Download,
  Calendar,
  DollarSign,
  School
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface FinanceProps { profile: UserProfile | null; }

export default function Finance({ profile }: FinanceProps) {
  const [activeTab, setActiveTab] = useState<'fees' | 'expenses' | 'tax'>('fees');
  const [fees, setFees] = useState<Fee[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [show1Bill, setShow1Bill] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);

  // Form states
  const [feeForm, setFeeForm] = useState<Partial<Fee>>({
    studentId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    status: 'paid',
    receiptNumber: `REC-${Date.now().toString().slice(-6)}`
  });

  const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({
    category: 'Utility Bills',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'fees') {
        const q = query(collection(db, 'fees'), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        setFees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Fee)));
        
        const sSnap = await getDocs(collection(db, 'students'));
        setStudents(sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      } else {
        const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        setExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
      }
    } catch (error) {
      console.error("Error fetching finance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'fees'), feeForm);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error adding fee:", error);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'expenses'), expenseForm);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  const totalFees = fees.filter(f => f.status === 'paid').reduce((acc, f) => acc + f.amount, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Finance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <Wallet className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <h3 className="text-2xl font-bold text-slate-900">${totalFees.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-100 rounded-xl">
              <TrendingDown className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Expenses</p>
              <h3 className="text-2xl font-bold text-slate-900">${totalExpenses.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Net Balance</p>
              <h3 className="text-2xl font-bold text-slate-900">${(totalFees - totalExpenses).toLocaleString()}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('fees')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'fees' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Fee Management
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'expenses' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Expense Tracker
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'tax' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Tax & Reports
          </button>
        </div>
        {profile?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add {activeTab === 'fees' ? 'Fee Record' : 'Expense'}
          </button>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {activeTab === 'tax' ? (
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                  FBR Tax Simulation (Pakistan)
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total Taxable Income:</span>
                    <span className="font-bold text-slate-900">${totalFees.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax Rate (Simulated):</span>
                    <span className="font-bold text-slate-900">5%</span>
                  </div>
                  <div className="pt-4 border-t border-slate-200 flex justify-between">
                    <span className="font-bold text-slate-900">Estimated Tax Liability:</span>
                    <span className="font-bold text-indigo-600">${(totalFees * 0.05).toLocaleString()}</span>
                  </div>
                  <button className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                    Generate FBR Report
                  </button>
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Profit & Loss Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Gross Revenue:</span>
                    <span className="font-bold text-emerald-600">+${totalFees.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total Expenses:</span>
                    <span className="font-bold text-rose-600">-${totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-200 flex justify-between">
                    <span className="font-bold text-slate-900">Net Profit:</span>
                    <span className="font-bold text-indigo-600">${(totalFees - totalExpenses).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {activeTab === 'fees' ? (
                    <>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">Amount</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">Date</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">Category</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">Description</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">Amount</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">Date</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center animate-pulse">Loading finance data...</td></tr>
                ) : activeTab === 'fees' ? (
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
                        <div className="flex items-center justify-end gap-2">
                          {fee.status === 'pending' && (
                            <button 
                              onClick={() => { setSelectedFee(fee); setShow1Bill(true); }}
                              className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              1Bill Pay
                            </button>
                          )}
                          <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Receipt className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{expense.category}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{expense.description}</td>
                      <td className="px-6 py-4 text-sm font-bold text-rose-600">-${expense.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{expense.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1Bill Simulation Modal */}
      <AnimatePresence>
        {show1Bill && selectedFee && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
              onClick={() => setShow1Bill(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-indigo-600 p-8 text-white text-center">
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <School className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold">1Bill Payment Gateway</h2>
                <p className="text-indigo-100 opacity-80">Secure Online Fee Payment</p>
              </div>
              <div className="p-8 space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-500 text-sm">Consumer ID:</span>
                    <span className="font-mono font-bold text-slate-900">1000{selectedFee.id?.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-500 text-sm">Student:</span>
                    <span className="font-bold text-slate-900">{students.find(s => s.id === selectedFee.studentId)?.name}</span>
                  </div>
                  <div className="flex justify-between pt-4 border-t border-slate-200">
                    <span className="text-slate-900 font-bold">Total Amount:</span>
                    <span className="text-2xl font-black text-indigo-600">${selectedFee.amount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <button 
                    onClick={async () => {
                      await updateDoc(doc(db, 'fees', selectedFee.id!), { status: 'paid' });
                      setShow1Bill(false);
                      fetchData();
                    }}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    Confirm Payment
                  </button>
                  <button 
                    onClick={() => setShow1Bill(false)}
                    className="w-full py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-bold">
                  Powered by 1Bill & EduManage Pro
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <h2 className="text-xl font-bold">Add {activeTab === 'fees' ? 'Fee Record' : 'Expense'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={activeTab === 'fees' ? handleAddFee : handleAddExpense} className="p-6 space-y-6">
                {activeTab === 'fees' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Select Student</label>
                      <select
                        required
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={feeForm.studentId}
                        onChange={e => setFeeForm({...feeForm, studentId: e.target.value})}
                      >
                        <option value="">Choose a student...</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Amount</label>
                        <input
                          required
                          type="number"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={feeForm.amount}
                          onChange={e => setFeeForm({...feeForm, amount: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Date</label>
                        <input
                          required
                          type="date"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={feeForm.date}
                          onChange={e => setFeeForm({...feeForm, date: e.target.value})}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Category</label>
                      <select
                        required
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={expenseForm.category}
                        onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                      >
                        <option>Utility Bills</option>
                        <option>Maintenance</option>
                        <option>Stationery</option>
                        <option>Events</option>
                        <option>Salaries</option>
                        <option>Others</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Amount</label>
                        <input
                          required
                          type="number"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={expenseForm.amount}
                          onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Date</label>
                        <input
                          required
                          type="date"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={expenseForm.date}
                          onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Description</label>
                      <textarea
                        required
                        rows={3}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={expenseForm.description}
                        onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                      />
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Save Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
