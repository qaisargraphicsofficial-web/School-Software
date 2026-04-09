import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { FeeType, FeeRecord, PaymentHistory, Student, UserProfile } from '../types';
import { Wallet, Receipt, Plus, Printer, Download, CheckCircle2, XCircle, Search, Calendar, CreditCard, BarChart3, Settings, AlertCircle, FileText, Trash2, Edit2, ChevronRight, ArrowLeft, Mail, Bell, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface FeesManagementProps { profile: UserProfile | null; }

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export default function FeesManagement({ profile }: FeesManagementProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'feeTypes' | 'studentFees' | 'generate'>('dashboard');
  
  // Data states
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [isFeeTypeModalOpen, setIsFeeTypeModalOpen] = useState(false);
  const [editingFeeType, setEditingFeeType] = useState<FeeType | null>(null);
  const [feeTypeForm, setFeeTypeForm] = useState({ name: '', defaultAmount: 0, defaultDueDate: '' });

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ feeRecordId: '', amount: 0, method: 'online' as 'cash' | 'online' | 'bank_transfer' });
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<FeeRecord | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [feeRecordSearch, setFeeRecordSearch] = useState('');
  const [feeRecordStatusFilter, setFeeRecordStatusFilter] = useState('all');

  const [generateForm, setGenerateForm] = useState({ feeTypeId: '', termOrYear: '', dueDate: '', targetClass: 'All' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const campusId = profile.campusId || 'main';
      
      const studentsSnap = await getDocs(collection(db, 'students'));
      setStudents(studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)).filter(s => s.campusId === campusId));

      const feeTypesSnap = await getDocs(collection(db, 'fee_types'));
      setFeeTypes(feeTypesSnap.docs.map(d => ({ id: d.id, ...d.data() } as FeeType)).filter(f => f.campusId === campusId));

      const feeRecordsSnap = await getDocs(collection(db, 'fee_records'));
      setFeeRecords(feeRecordsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FeeRecord)).filter(f => f.campusId === campusId));

      const paymentsSnap = await getDocs(collection(db, 'payment_history'));
      setPaymentHistory(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentHistory)).filter(p => p.campusId === campusId));

    } catch (error) {
      console.error("Error fetching fee data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Fee Types Management ---
  const handleSaveFeeType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const feeTypeData = {
        ...feeTypeForm,
        campusId: profile.campusId || 'main'
      };

      if (editingFeeType?.id) {
        await updateDoc(doc(db, 'fee_types', editingFeeType.id), feeTypeData);
      } else {
        await addDoc(collection(db, 'fee_types'), feeTypeData);
      }
      setIsFeeTypeModalOpen(false);
      setEditingFeeType(null);
      setFeeTypeForm({ name: '', defaultAmount: 0, defaultDueDate: '' });
      fetchData();
    } catch (error) {
      console.error("Error saving fee type:", error);
      alert("Failed to save fee type.");
    }
  };

  const handleDeleteFeeType = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this fee type?")) {
      try {
        await deleteDoc(doc(db, 'fee_types', id));
        fetchData();
      } catch (error) {
        console.error("Error deleting fee type:", error);
      }
    }
  };

  // --- Generate Fees ---
  const handleGenerateFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !generateForm.feeTypeId || !generateForm.termOrYear || !generateForm.dueDate) return;
    
    setIsGenerating(true);
    try {
      const feeType = feeTypes.find(f => f.id === generateForm.feeTypeId);
      if (!feeType) throw new Error("Fee type not found");

      let targetStudents = students.filter(s => s.status === 'active');
      if (generateForm.targetClass !== 'All') {
        targetStudents = targetStudents.filter(s => s.class === generateForm.targetClass);
      }

      if (targetStudents.length === 0) {
        alert("No active students found for the selected criteria.");
        setIsGenerating(false);
        return;
      }
      
      const batch = writeBatch(db);
      
      targetStudents.forEach(student => {
        const newRecordRef = doc(collection(db, 'fee_records'));
        batch.set(newRecordRef, {
          studentId: student.id,
          feeTypeId: feeType.id,
          amount: Number(feeType.defaultAmount),
          dueDate: generateForm.dueDate,
          status: 'pending',
          paidAmount: 0,
          termOrYear: generateForm.termOrYear,
          campusId: profile.campusId || 'main'
        });
      });

      await batch.commit();
      alert(`Successfully generated fee records for ${targetStudents.length} students.`);
      setGenerateForm({ feeTypeId: '', termOrYear: '', dueDate: '', targetClass: 'All' });
      fetchData();
    } catch (error) {
      console.error("Error generating fees:", error);
      alert("Failed to generate fees.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Process Payment ---
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedFeeRecord || paymentForm.amount <= 0) return;

    setIsProcessingPayment(true);
    try {
      // Simulate Stripe/Payment Gateway processing delay
      if (paymentForm.method === 'online') {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      const newPaidAmount = selectedFeeRecord.paidAmount + Number(paymentForm.amount);
      let newStatus = selectedFeeRecord.status;
      if (newPaidAmount >= selectedFeeRecord.amount) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      await updateDoc(doc(db, 'fee_records', selectedFeeRecord.id!), {
        paidAmount: newPaidAmount,
        status: newStatus
      });

      await addDoc(collection(db, 'payment_history'), {
        feeRecordId: selectedFeeRecord.id,
        studentId: selectedFeeRecord.studentId,
        amount: Number(paymentForm.amount),
        date: new Date().toISOString().split('T')[0],
        method: paymentForm.method,
        transactionId: paymentForm.method === 'online' ? `txn_${Math.random().toString(36).substr(2, 9)}` : undefined,
        campusId: profile.campusId || 'main'
      });

      alert("Payment processed successfully!");
      setIsPaymentModalOpen(false);
      setSelectedFeeRecord(null);
      setPaymentForm({ feeRecordId: '', amount: 0, method: 'online' });
      fetchData();
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Failed to process payment.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // --- Send Reminders ---
  const handleSendReminders = async () => {
    if (!profile) return;
    
    const pendingFees = feeRecords.filter(r => r.status === 'pending' || r.status === 'partial');
    if (pendingFees.length === 0) {
      alert("No pending fees found.");
      return;
    }

    if (!window.confirm(`Are you sure you want to scan and send reminders for ${pendingFees.length} pending fee records?`)) {
      return;
    }

    setIsSendingReminders(true);
    try {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const reminders = pendingFees.map(record => {
        const student = students.find(s => s.id === record.studentId);
        if (!student || !student.email) return null;

        const dueDate = new Date(record.dueDate);
        const outstanding = record.amount - record.paidAmount;
        
        let type: 'upcoming' | 'overdue' | null = null;
        if (dueDate < today) {
          type = 'overdue';
        } else if (dueDate <= nextWeek) {
          type = 'upcoming';
        }

        if (!type) return null;

        return {
          email: student.email,
          studentName: student.name,
          amount: outstanding,
          dueDate: record.dueDate,
          type
        };
      }).filter(Boolean);

      if (reminders.length === 0) {
        alert("No upcoming (within 7 days) or overdue fees found to notify parents about.");
        setIsSendingReminders(false);
        return;
      }

      const response = await fetch('/api/send-fee-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminders })
      });

      const result = await response.json();
      if (result.success) {
        alert(`Successfully sent ${result.count} fee reminders to parents.`);
      } else {
        throw new Error(result.error || "Failed to send reminders");
      }
    } catch (error) {
      console.error("Error sending reminders:", error);
      alert("An error occurred while sending reminders.");
    } finally {
      setIsSendingReminders(false);
    }
  };

  // --- Dashboard Data Calculations ---
  const dashboardStats = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    
    const classOutstanding: Record<string, number> = {};
    const monthlyCollection: Record<string, number> = {};

    feeRecords.forEach(record => {
      totalExpected += record.amount;
      totalCollected += record.paidAmount;
      const outstanding = record.amount - record.paidAmount;
      totalOutstanding += outstanding;

      const student = students.find(s => s.id === record.studentId);
      if (student && outstanding > 0) {
        classOutstanding[student.class] = (classOutstanding[student.class] || 0) + outstanding;
      }
    });

    paymentHistory.forEach(payment => {
      const month = payment.date.substring(0, 7);
      monthlyCollection[month] = (monthlyCollection[month] || 0) + payment.amount;
    });

    const classChartData = Object.entries(classOutstanding).map(([className, amount]) => ({
      name: className,
      amount
    }));

    const trendChartData = Object.entries(monthlyCollection)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        amount
      }));

    const pieData = [
      { name: 'Collected', value: totalCollected },
      { name: 'Outstanding', value: totalOutstanding }
    ];

    return { totalExpected, totalCollected, totalOutstanding, classChartData, trendChartData, pieData };
  }, [feeRecords, paymentHistory, students]);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
    s.rollNumber.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const studentFeeSummary = useMemo(() => {
    if (!selectedStudent) return { totalDue: 0, totalPaid: 0, outstanding: 0 };
    const studentFees = feeRecords.filter(f => f.studentId === selectedStudent.id);
    const totalDue = studentFees.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = studentFees.reduce((sum, f) => sum + f.paidAmount, 0);
    const outstanding = totalDue - totalPaid;
    return { totalDue, totalPaid, outstanding };
  }, [selectedStudent, feeRecords]);

  const filteredStudentFeeRecords = useMemo(() => {
    if (!selectedStudent) return [];
    return feeRecords
      .filter(f => f.studentId === selectedStudent.id)
      .filter(f => {
        const feeType = feeTypes.find(t => t.id === f.feeTypeId);
        const matchesSearch = (feeType?.name || '').toLowerCase().includes(feeRecordSearch.toLowerCase()) || 
                             f.termOrYear.toLowerCase().includes(feeRecordSearch.toLowerCase());
        const matchesStatus = feeRecordStatusFilter === 'all' || f.status === feeRecordStatusFilter;
        return matchesSearch && matchesStatus;
      });
  }, [selectedStudent, feeRecords, feeTypes, feeRecordSearch, feeRecordStatusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fees Management</h1>
          <p className="text-slate-500 text-sm">Manage fee types, records, and online payments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSendReminders}
            disabled={isSendingReminders}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-all disabled:opacity-50"
          >
            {isSendingReminders ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            Send Reminders
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100/50 rounded-xl w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap", activeTab === 'dashboard' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          <BarChart3 className="w-4 h-4 inline-block mr-2" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('studentFees')}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap", activeTab === 'studentFees' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          <Wallet className="w-4 h-4 inline-block mr-2" />
          Student Fees
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap", activeTab === 'generate' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          <FileText className="w-4 h-4 inline-block mr-2" />
          Generate Fees
        </button>
        <button
          onClick={() => setActiveTab('feeTypes')}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap", activeTab === 'feeTypes' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          <Settings className="w-4 h-4 inline-block mr-2" />
          Fee Types
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">TOTAL EXPECTED</p>
                  <h3 className="text-2xl font-bold text-slate-900">${dashboardStats.totalExpected.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">TOTAL COLLECTED</p>
                  <h3 className="text-2xl font-bold text-emerald-600">${dashboardStats.totalCollected.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">TOTAL OUTSTANDING</p>
                  <h3 className="text-2xl font-bold text-rose-600">${dashboardStats.totalOutstanding.toLocaleString()}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Collection Progress</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboardStats.pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {dashboardStats.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Outstanding by Class</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardStats.classChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                        <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Payment Trends</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboardStats.trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                        <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STUDENT FEES TAB */}
          {activeTab === 'studentFees' && (
            <div className="space-y-6">
              {!selectedStudent ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student by name or roll number..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Student</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Class</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Total Due</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Paid</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Outstanding</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map(student => {
                          const studentFees = feeRecords.filter(f => f.studentId === student.id);
                          const totalDue = studentFees.reduce((sum, f) => sum + f.amount, 0);
                          const totalPaid = studentFees.reduce((sum, f) => sum + f.paidAmount, 0);
                          const outstanding = totalDue - totalPaid;

                          return (
                            <tr key={student.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedStudent(student)}>
                              <td className="p-4">
                                <div className="font-medium text-slate-900">{student.name} S/O {student.parentName}</div>
                                <div className="text-xs text-slate-500">{student.rollNumber}</div>
                              </td>
                              <td className="p-4 text-sm text-slate-700">{student.class}</td>
                              <td className="p-4 text-sm font-medium text-slate-900">${totalDue.toLocaleString()}</td>
                              <td className="p-4 text-sm font-medium text-emerald-600">${totalPaid.toLocaleString()}</td>
                              <td className="p-4 text-sm font-medium text-rose-600">${outstanding.toLocaleString()}</td>
                              <td className="p-4 text-right">
                                <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                  <ChevronRight className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <button 
                    onClick={() => setSelectedStudent(null)}
                    className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Students
                  </button>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{selectedStudent.name} S/O {selectedStudent.parentName}</h2>
                      <p className="text-slate-500">{selectedStudent.class} | Roll: {selectedStudent.rollNumber}</p>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Total Due</p>
                        <p className="text-lg font-bold text-slate-900">${studentFeeSummary.totalDue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Paid</p>
                        <p className="text-lg font-bold text-emerald-600">${studentFeeSummary.totalPaid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Outstanding</p>
                        <p className="text-lg font-bold text-rose-600">${studentFeeSummary.outstanding.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="font-bold text-slate-900">Fee Records</h3>
                      <div className="flex flex-wrap gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search records..."
                            value={feeRecordSearch}
                            onChange={(e) => setFeeRecordSearch(e.target.value)}
                            className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48"
                          />
                        </div>
                        <select
                          value={feeRecordStatusFilter}
                          onChange={(e) => setFeeRecordStatusFilter(e.target.value)}
                          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="all">All Status</option>
                          <option value="paid">Paid</option>
                          <option value="pending">Pending</option>
                          <option value="partial">Partial</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Fee Type</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Term/Year</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Due Date</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Paid</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredStudentFeeRecords.map(record => {
                            const feeType = feeTypes.find(t => t.id === record.feeTypeId);
                            return (
                              <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-medium text-slate-900">{feeType?.name || 'Unknown'}</td>
                                <td className="p-4 text-sm text-slate-700">{record.termOrYear}</td>
                                <td className="p-4 text-sm text-slate-700">{record.dueDate}</td>
                                <td className="p-4 text-sm font-medium text-slate-900">${record.amount.toLocaleString()}</td>
                                <td className="p-4 text-sm font-medium text-emerald-600">${record.paidAmount.toLocaleString()}</td>
                                <td className="p-4">
                                  <span className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                    record.status === 'paid' ? "bg-emerald-100 text-emerald-700" :
                                    record.status === 'partial' ? "bg-amber-100 text-amber-700" :
                                    record.status === 'overdue' ? "bg-rose-100 text-rose-700" :
                                    "bg-slate-100 text-slate-700"
                                  )}>
                                    {record.status}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  {record.status !== 'paid' && (
                                    <button 
                                      onClick={() => {
                                        setSelectedFeeRecord(record);
                                        setPaymentForm({ feeRecordId: record.id!, amount: record.amount - record.paidAmount, method: 'online' });
                                        setIsPaymentModalOpen(true);
                                      }}
                                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                      Pay Now
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                      <h3 className="font-bold text-slate-900">Payment History</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Method</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Transaction ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paymentHistory.filter(p => p.studentId === selectedStudent.id).map(payment => (
                            <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 text-sm text-slate-700">{payment.date}</td>
                              <td className="p-4 text-sm font-medium text-emerald-600">${payment.amount.toLocaleString()}</td>
                              <td className="p-4 text-sm text-slate-700 capitalize">{payment.method.replace('_', ' ')}</td>
                              <td className="p-4 text-sm text-slate-500 font-mono">{payment.transactionId || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GENERATE FEES TAB */}
          {activeTab === 'generate' && (
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Generate Bulk Fees</h2>
                  <p className="text-sm text-slate-500">Automatically create fee records for all active students.</p>
                </div>
              </div>

              <form onSubmit={handleGenerateFees} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Fee Type</label>
                  <select
                    required
                    value={generateForm.feeTypeId}
                    onChange={(e) => setGenerateForm({...generateForm, feeTypeId: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Fee Type...</option>
                    {feeTypes.map(f => (
                      <option key={f.id} value={f.id}>{f.name} (${f.defaultAmount})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Target Class</label>
                  <select
                    required
                    value={generateForm.targetClass}
                    onChange={(e) => setGenerateForm({...generateForm, targetClass: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="All">All Active Students</option>
                    {Array.from(new Set(students.map(s => s.class))).sort().map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Term / Year</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Fall 2026, 2026-2027"
                    value={generateForm.termOrYear}
                    onChange={(e) => setGenerateForm({...generateForm, termOrYear: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={generateForm.dueDate}
                    onChange={(e) => setGenerateForm({...generateForm, dueDate: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate Fees for All Active Students'}
                </button>
              </form>
            </div>
          )}

          {/* FEE TYPES TAB */}
          {activeTab === 'feeTypes' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setEditingFeeType(null);
                    setFeeTypeForm({ name: '', defaultAmount: 0, defaultDueDate: '' });
                    setIsFeeTypeModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Fee Type
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {feeTypes.map(feeType => (
                  <div key={feeType.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingFeeType(feeType);
                            setFeeTypeForm({ name: feeType.name, defaultAmount: feeType.defaultAmount, defaultDueDate: feeType.defaultDueDate });
                            setIsFeeTypeModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteFeeType(feeType.id!)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{feeType.name}</h3>
                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Default Amount:</span>
                        <span className="font-bold text-slate-900">${feeType.defaultAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Default Due Date:</span>
                        <span className="font-medium text-slate-700">{feeType.defaultDueDate || 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Fee Type Modal */}
      {isFeeTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">{editingFeeType ? 'Edit Fee Type' : 'Add Fee Type'}</h2>
              <button onClick={() => setIsFeeTypeModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <XCircle className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSaveFeeType} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Fee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Tuition Fee"
                  value={feeTypeForm.name}
                  onChange={(e) => setFeeTypeForm({...feeTypeForm, name: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Default Amount ($)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={feeTypeForm.defaultAmount}
                  onChange={(e) => setFeeTypeForm({...feeTypeForm, defaultAmount: Number(e.target.value)})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Default Due Date (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., 5th of every month"
                  value={feeTypeForm.defaultDueDate}
                  onChange={(e) => setFeeTypeForm({...feeTypeForm, defaultDueDate: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsFeeTypeModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                  Save Fee Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal (Stripe / Gateway Simulation) */}
      {isPaymentModalOpen && selectedFeeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <h2 className="text-xl font-bold">Process Payment</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleProcessPayment} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Total Due:</span>
                  <span className="font-bold text-slate-900">${selectedFeeRecord.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Already Paid:</span>
                  <span className="font-bold text-emerald-600">${selectedFeeRecord.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200 mt-2">
                  <span className="text-slate-700 font-bold">Remaining Balance:</span>
                  <span className="font-bold text-rose-600">${(selectedFeeRecord.amount - selectedFeeRecord.paidAmount).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Amount ($)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedFeeRecord.amount - selectedFeeRecord.paidAmount}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: Number(e.target.value)})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-bold"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentForm({...paymentForm, method: 'online'})}
                    className={cn("p-3 border rounded-xl flex flex-col items-center gap-2 transition-colors", paymentForm.method === 'online' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs font-bold">Online</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentForm({...paymentForm, method: 'cash'})}
                    className={cn("p-3 border rounded-xl flex flex-col items-center gap-2 transition-colors", paymentForm.method === 'cash' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}
                  >
                    <Wallet className="w-5 h-5" />
                    <span className="text-xs font-bold">Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentForm({...paymentForm, method: 'bank_transfer'})}
                    className={cn("p-3 border rounded-xl flex flex-col items-center gap-2 transition-colors", paymentForm.method === 'bank_transfer' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}
                  >
                    <Receipt className="w-5 h-5" />
                    <span className="text-xs font-bold">Bank</span>
                  </button>
                </div>
              </div>

              {paymentForm.method === 'online' && (
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex gap-3 text-blue-700 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>This will simulate a secure payment gateway (e.g. Stripe) transaction.</p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessingPayment}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center"
                >
                  {isProcessingPayment ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    `Pay $${paymentForm.amount}`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
