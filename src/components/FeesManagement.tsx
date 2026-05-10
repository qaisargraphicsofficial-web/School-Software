import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc as firestoreDoc, deleteDoc, where, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FeeReceipt } from './FeeReceipt';
import { FeeVoucherList } from './FeeVoucher';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FeeType, FeeRecord, PaymentHistory, Student, UserProfile, SchoolSettings } from '../types';
import { Wallet, Receipt, Plus, Printer, Download, CheckCircle2, XCircle, Search, Calendar, CreditCard, BarChart3, Settings, AlertCircle, FileText, Trash2, Edit2, ChevronRight, ArrowLeft, Mail, Bell, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

const COLORS = ['#10b981', '#ef4444', '#6366f1', '#f59e0b'];

interface FeesManagementProps { profile: UserProfile | null; }

export default function FeesManagement({ profile }: FeesManagementProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'feeTypes' | 'studentFees' | 'generate'>('dashboard');
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  
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
  const [isSavingFeeType, setIsSavingFeeType] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ feeRecordId: '', amount: 0, method: 'online' as 'cash' | 'online' | 'bank_transfer', date: new Date().toISOString().split('T')[0] });
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<FeeRecord | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [feeRecordSearch, setFeeRecordSearch] = useState('');
  const [feeRecordStatusFilter, setFeeRecordStatusFilter] = useState('all');

  const [generateForm, setGenerateForm] = useState<{
    feeTypeIds: string[], 
    termOrYear: string, 
    dueDate: string, 
    targetClasses: string[]
  }>({ 
    feeTypeIds: [], 
    termOrYear: '', 
    dueDate: '', 
    targetClasses: [] 
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  const vouchersToPrint = useMemo(() => {
    return feeRecords
        .filter(r => r.status === 'pending' || r.status === 'partial')
        .map(r => ({
            feeRecord: r,
            student: students.find(s => s.id === r.studentId)!,
            feeType: feeTypes.find(t => t.id === r.feeTypeId) || { id: r.feeTypeId, name: r.feeType || 'Unknown', defaultAmount: 0, defaultDueDate: '', campusId: r.campusId } as FeeType
        }))
        .filter(r => r.student && r.feeType);
  }, [feeRecords, students, feeTypes]);

  const [isWaiverModalOpen, setIsWaiverModalOpen] = useState(false);
  const [waiverForm, setWaiverForm] = useState({ amount: 0, reason: '' });
  const [selectedRecordForWaiver, setSelectedRecordForWaiver] = useState<FeeRecord | null>(null);
  const [isApplyingWaiver, setIsApplyingWaiver] = useState(false);

  const [isPrinting, setIsPrinting] = useState(false);

  const executePrint = () => {
    const printContent = document.getElementById('print-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Vouchers</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @page { size: A4 portrait; margin: 10mm; }
                @media print {
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; }
                  .break-inside-avoid { page-break-inside: avoid; }
                  .print\\:p-0 { padding: 0 !important; }
                  .print\\:border-black { border-color: black !important; }
                }
                body { font-family: ui-sans-serif, system-ui, sans-serif; }
              </style>
            </head>
            <body class="bg-white">
              ${printContent.innerHTML}
              <script>
                window.onload = () => {
                  setTimeout(() => {
                    window.focus();
                    window.print();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        return;
      }
    }
    
    // Fallback if popup blocked
    window.focus();
    window.print();
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      executePrint();
    }, 500);
  };

  useEffect(() => {
    const afterPrint = () => {
      // Optional: automatically go back to dashboard after printing
      // setIsPrinting(false);
    };
    window.addEventListener('afterprint', afterPrint);
    return () => window.removeEventListener('afterprint', afterPrint);
  }, []);

  const [isEditRecordModalOpen, setIsEditRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FeeRecord | null>(null);
  const [recordForm, setRecordForm] = useState({ amount: 0, dueDate: '', termOrYear: '', status: '' as FeeRecord['status'] });
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, [profile]);

  const fetchSettings = async () => {
    try {
      const docRef = firestoreDoc(db, 'settings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SchoolSettings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

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

  const formatCurrency = (amount: number) => {
    const symbol = settings?.currency === 'PKR' ? 'Rs. ' : '$';
    return `${symbol}${amount.toLocaleString()}`;
  };

  // --- Fee Types Management ---
  const handleSaveFeeType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    // Basic Validation
    if (!feeTypeForm.name.trim()) {
      alert("Please enter a fee type name.");
      return;
    }
    if (feeTypeForm.defaultAmount < 0) {
      alert("Default amount cannot be negative.");
      return;
    }

    setIsSavingFeeType(true);
    try {
      const feeTypeData = {
        name: feeTypeForm.name.trim(),
        defaultAmount: Number(feeTypeForm.defaultAmount),
        defaultDueDate: feeTypeForm.defaultDueDate,
        campusId: profile.campusId || 'main'
      };

      if (editingFeeType?.id) {
        await updateDoc(firestoreDoc(db, 'fee_types', editingFeeType.id), feeTypeData);
      } else {
        await addDoc(collection(db, 'fee_types'), feeTypeData);
      }
      setIsFeeTypeModalOpen(false);
      setEditingFeeType(null);
      setFeeTypeForm({ name: '', defaultAmount: 0, defaultDueDate: '' });
      fetchData();
    } catch (error) {
      console.error("Error saving fee type:", error);
      handleFirestoreError(error, editingFeeType?.id ? OperationType.UPDATE : OperationType.CREATE, 'fee_types');
    } finally {
      setIsSavingFeeType(false);
    }
  };

  const handleDeleteFeeType = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this fee type?")) {
      try {
        await deleteDoc(firestoreDoc(db, 'fee_types', id));
        fetchData();
      } catch (error) {
        console.error("Error deleting fee type:", error);
      }
    }
  };

  // --- Generate Fees ---
  const handleGenerateFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || generateForm.feeTypeIds.length === 0 || !generateForm.termOrYear || !generateForm.dueDate || generateForm.targetClasses.length === 0) {
      alert("Please select at least one fee type and one class, enter a due date, and term/year.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const selectedFeeTypes = feeTypes.filter(f => generateForm.feeTypeIds.includes(f.id!));
      let targetStudents = students.filter(s => s.status === 'active' && generateForm.targetClasses.includes(s.class));

      if (targetStudents.length === 0) {
        alert("No active students found for the selected criteria.");
        setIsGenerating(false);
        return;
      }
      
      const batch = writeBatch(db);
      let recordsCount = 0;
      
      targetStudents.forEach(student => {
        selectedFeeTypes.forEach(feeType => {
          // If it's a transport fee, only target students who use transport
          if (feeType.name.toLowerCase().includes('transport') && !student.useTransport) return;

          const newRecordRef = firestoreDoc(collection(db, 'fee_records'));
          batch.set(newRecordRef, {
            studentId: student.id,
            feeTypeId: feeType.id,
            feeType: feeType.name,
            amount: Number(feeType.defaultAmount),
            dueDate: generateForm.dueDate,
            status: 'pending',
            paidAmount: 0,
            termOrYear: generateForm.termOrYear,
            campusId: profile.campusId || 'main'
          });
          recordsCount++;
        });
      });

      await batch.commit();
      
      alert(`Successfully generated ${recordsCount} fee records for ${targetStudents.length} students.`);
      setGenerateForm({ feeTypeIds: [], termOrYear: '', dueDate: '', targetClasses: [] });
      await fetchData();
      
      // Trigger print after fee generation
      setTimeout(() => {
        handlePrint();
      }, 500);

    } catch (error) {
      console.error("Error generating fees:", error);
      handleFirestoreError(error, OperationType.CREATE, 'fee_records');
      alert("Failed to generate fees.");
    } finally {
      setIsGenerating(false);
    }
  };

  const [receiptData, setReceiptData] = useState<{feeRecord: FeeRecord, student: Student, payment: PaymentHistory} | null>(null);

  useEffect(() => {
    if (receiptData) {
      console.log('Generating PDF for:', receiptData);
      const generatePDF = async () => {
        // Wait for React to render the component in the DOM
        await new Promise(resolve => setTimeout(resolve, 300));
        const element = document.getElementById('fee-receipt');
        if (element) {
          console.log('Element found, generating canvas...');
          const canvas = await html2canvas(element, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`Receipt_${receiptData.student.name}_${receiptData.payment.date}.pdf`);
          console.log('PDF saved.');
          setReceiptData(null);
        } else {
          console.error('Element not found');
        }
      };
      generatePDF();
    }
  }, [receiptData]);

  const handleDownloadReceipt = async (payment: PaymentHistory) => {
    console.log('Download triggered for:', payment);
    const feeRecord = feeRecords.find(f => f.id === payment.feeRecordId);
    const student = students.find(s => s.id === payment.studentId);
    if (!feeRecord || !student) {
      console.error('FeeRecord or Student not found', { feeRecord, student });
      return;
    }

    setReceiptData({ feeRecord, student, payment });
  };

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
      const totalPayable = selectedFeeRecord.amount - (selectedFeeRecord.waiverAmount || 0);
      
      let newStatus = selectedFeeRecord.status;
      if (newPaidAmount >= totalPayable) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      await updateDoc(firestoreDoc(db, 'fee_records', selectedFeeRecord.id!), {
        paidAmount: newPaidAmount,
        status: newStatus
      });

      await addDoc(collection(db, 'payment_history'), {
        feeRecordId: selectedFeeRecord.id,
        studentId: selectedFeeRecord.studentId,
        amount: Number(paymentForm.amount),
        date: paymentForm.date,
        method: paymentForm.method,
        transactionId: paymentForm.method === 'online' ? `txn_${Math.random().toString(36).substr(2, 9)}` : undefined,
        campusId: profile.campusId || 'main'
      });

      alert("Payment processed successfully!");
      setIsPaymentModalOpen(false);
      setSelectedFeeRecord(null);
      setPaymentForm({ feeRecordId: '', amount: 0, method: 'online', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Failed to process payment.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // --- Apply Waiver ---
  const handleApplyWaiver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedRecordForWaiver || waiverForm.amount < 0) return;

    setIsApplyingWaiver(true);
    try {
      const currentWaiver = selectedRecordForWaiver.waiverAmount || 0;
      const newWaiver = Number(waiverForm.amount);
      const totalPaid = selectedRecordForWaiver.paidAmount;
      const totalAmount = selectedRecordForWaiver.amount;
      
      const remainingBalance = totalAmount - totalPaid - newWaiver;
      
      let newStatus = selectedRecordForWaiver.status;
      if (remainingBalance <= 0) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'pending';
      }

      await updateDoc(firestoreDoc(db, 'fee_records', selectedRecordForWaiver.id!), {
        waiverAmount: newWaiver,
        waiverReason: waiverForm.reason,
        status: newStatus
      });

      alert("Waiver applied successfully!");
      setIsWaiverModalOpen(false);
      setSelectedRecordForWaiver(null);
      setWaiverForm({ amount: 0, reason: '' });
      fetchData();
    } catch (error) {
      console.error("Error applying waiver:", error);
      alert("Failed to apply waiver.");
    } finally {
      setIsApplyingWaiver(false);
    }
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editingRecord?.id) return;

    setIsSavingRecord(true);
    try {
      const updatedData = {
        amount: Number(recordForm.amount),
        dueDate: recordForm.dueDate,
        termOrYear: recordForm.termOrYear,
        status: recordForm.status
      };

      await updateDoc(firestoreDoc(db, 'fee_records', editingRecord.id), updatedData);
      
      alert("Fee record updated successfully!");
      setIsEditRecordModalOpen(false);
      setEditingRecord(null);
      fetchData();
    } catch (error) {
      console.error("Error updating fee record:", error);
      alert("Failed to update fee record.");
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this fee record? This action cannot be undone.")) return;
    
    try {
      await deleteDoc(firestoreDoc(db, 'fee_records', id));
      fetchData();
    } catch (error) {
      console.error("Error deleting fee record:", error);
      alert("Failed to delete fee record.");
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
      const waiver = record.waiverAmount || 0;
      totalExpected += record.amount;
      totalCollected += record.paidAmount;
      const outstanding = Math.max(0, record.amount - record.paidAmount - waiver);
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
    if (!selectedStudent) return { totalDue: 0, totalPaid: 0, totalDiscount: 0, outstanding: 0 };
    const studentFees = feeRecords.filter(f => f.studentId === selectedStudent.id);
    const totalDue = studentFees.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = studentFees.reduce((sum, f) => sum + f.paidAmount, 0);
    const totalWaiver = studentFees.reduce((sum, f) => sum + (f.waiverAmount || 0), 0);
    const outstanding = Math.max(0, totalDue - totalPaid - totalWaiver);
    return { totalDue, totalPaid, totalWaiver, outstanding };
  }, [selectedStudent, feeRecords]);

  const filteredStudentFeeRecords = useMemo(() => {
    if (!selectedStudent) return [];
    return feeRecords
      .filter(f => f.studentId === selectedStudent.id)
      .filter(f => {
        const feeTypeName = f.feeType || feeTypes.find(t => t.id === f.feeTypeId)?.name;
        const matchesSearch = (feeTypeName || '').toLowerCase().includes(feeRecordSearch.toLowerCase()) || 
                             f.termOrYear.toLowerCase().includes(feeRecordSearch.toLowerCase());
        const matchesStatus = feeRecordStatusFilter === 'all' || f.status === feeRecordStatusFilter;
        return matchesSearch && matchesStatus;
      });
  }, [selectedStudent, feeRecords, feeTypes, feeRecordSearch, feeRecordStatusFilter]);

  if (isPrinting) {
    return (
      <div className="bg-white min-h-screen">
        <div className="p-4 print:hidden border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Print Preview</h2>
            <p className="text-sm text-slate-500 max-w-xl">If the print dialog doesn't open automatically, please click "Print Now" or use your browser's print command (Ctrl+P / Cmd+P).</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={executePrint}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium shadow hover:bg-indigo-700 transition"
            >
              <Printer className="w-4 h-4 inline-block mr-2" />
              Print Now
            </button>
            <button 
              onClick={() => setIsPrinting(false)}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-medium hover:bg-slate-300 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
        <div id="print-content" className="print:p-0">
          <FeeVoucherList records={vouchersToPrint} settings={settings || undefined} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fees Management</h1>
          <p className="text-slate-500 text-sm">Manage fee types, records, and online payments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-all"
          >
            <Printer className="w-4 h-4" />
            Print Vouchers
          </button>
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
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-indigo-200 transition-colors">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">TOTAL EXPECTED</p>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(dashboardStats.totalExpected)}</h3>
                  <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-emerald-200 transition-colors">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">TOTAL COLLECTED</p>
                  <h3 className="text-3xl font-black text-emerald-600 tracking-tight">{formatCurrency(dashboardStats.totalCollected)}</h3>
                  <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${(dashboardStats.totalCollected / (dashboardStats.totalExpected || 1)) * 100}%` }} 
                    />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-rose-200 transition-colors">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">TOTAL OUTSTANDING</p>
                  <h3 className="text-3xl font-black text-rose-600 tracking-tight">{formatCurrency(dashboardStats.totalOutstanding)}</h3>
                  <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500" 
                      style={{ width: `${(dashboardStats.totalOutstanding / (dashboardStats.totalExpected || 1)) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Collection Progress</h3>
                      <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-widest">Paid vs Outstanding</p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <PieChart className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="h-72 min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboardStats.pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={90}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          {dashboardStats.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [formatCurrency(value), 'Amount']} 
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Outstanding by Class</h3>
                      <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-widest">Revenue at Risk</p>
                    </div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="h-72 min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardStats.classChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <RechartsTooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [formatCurrency(value), 'Outstanding']} 
                        />
                        <Bar dataKey="amount" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 lg:col-span-2">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Monthly Collection Trends</h3>
                      <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-widest">Cash Flow Analysis</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="h-80 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboardStats.trendChartData}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [formatCurrency(value), 'Collected']} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="#10b981" 
                          strokeWidth={4} 
                          dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                          activeDot={{ r: 8, strokeWidth: 0 }} 
                        />
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
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Parent/Guardian</th>
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
                                <div className="font-medium text-slate-900">{student.name}</div>
                                <div className="text-xs text-slate-500">{student.rollNumber}</div>
                              </td>
                              <td className="p-4 text-sm text-slate-700">{student.parentName || '-'}</td>
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
                          <p className="text-lg font-bold text-slate-900">{formatCurrency(studentFeeSummary.totalDue)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Waiver</p>
                          <p className="text-lg font-bold text-indigo-600">{formatCurrency(studentFeeSummary.totalWaiver)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Paid</p>
                          <p className="text-lg font-bold text-emerald-600">{formatCurrency(studentFeeSummary.totalPaid)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Outstanding</p>
                          <p className="text-lg font-bold text-rose-600">{formatCurrency(studentFeeSummary.outstanding)}</p>
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
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Waiver</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Paid</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredStudentFeeRecords.map(record => {
                            const feeTypeName = record.feeType || feeTypes.find(t => t.id === record.feeTypeId)?.name;
                            return (
                              <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-medium text-slate-900">{feeTypeName || 'Unknown'}</td>
                                <td className="p-4 text-sm text-slate-700">{record.termOrYear}</td>
                                <td className="p-4 text-sm text-slate-700">{record.dueDate}</td>
                                <td className="p-4 text-sm font-medium text-slate-900">{formatCurrency(record.amount)}</td>
                                <td className="p-4">
                                  <div className="text-sm font-medium text-indigo-600">
                                    {record.waiverAmount ? formatCurrency(record.waiverAmount) : '-'}
                                  </div>
                                  {record.waiverReason && (
                                    <div className="text-[10px] text-slate-400 italic truncate max-w-[100px]" title={record.waiverReason}>
                                      {record.waiverReason}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 text-sm font-medium text-emerald-600">{formatCurrency(record.paidAmount)}</td>
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
                                  <div className="flex justify-end gap-2">
                                    {record.status !== 'paid' && (
                                      <>
                                        <button 
                                          onClick={() => {
                                            setSelectedRecordForWaiver(record);
                                            setWaiverForm({ amount: record.waiverAmount || 0, reason: record.waiverReason || '' });
                                            setIsWaiverModalOpen(true);
                                          }}
                                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                          title="Apply Waiver"
                                        >
                                          <Settings className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setEditingRecord(record);
                                            setRecordForm({
                                              amount: record.amount,
                                              dueDate: record.dueDate,
                                              termOrYear: record.termOrYear,
                                              status: record.status
                                            });
                                            setIsEditRecordModalOpen(true);
                                          }}
                                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                          title="Edit Record"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteRecord(record.id!)}
                                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                          title="Delete Record"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setSelectedFeeRecord(record);
                                            setPaymentForm({ feeRecordId: record.id!, amount: Math.max(0, record.amount - record.paidAmount - (record.waiverAmount || 0)), method: 'online', date: new Date().toISOString().split('T')[0] });
                                            setIsPaymentModalOpen(true);
                                          }}
                                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                                        >
                                          Pay Now
                                        </button>
                                      </>
                                    )}
                                  </div>
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
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paymentHistory.filter(p => p.studentId === selectedStudent.id).map(payment => (
                            <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 text-sm text-slate-700">{payment.date}</td>
                              <td className="p-4 text-sm font-medium text-emerald-600">${payment.amount.toLocaleString()}</td>
                              <td className="p-4 text-sm text-slate-700 capitalize">{payment.method.replace('_', ' ')}</td>
                              <td className="p-4 text-sm text-slate-500 font-mono">{payment.transactionId || '-'}</td>
                              <td className="p-4">
                                <button 
                                  onClick={() => handleDownloadReceipt(payment)}
                                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </td>
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

          {receiptData && (
            <div className="fixed inset-0 opacity-0 pointer-events-none -z-50">
              <FeeReceipt {...receiptData} />
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
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Fee Types</label>
                  <div className="grid grid-cols-2 gap-2">
                    {feeTypes.map(f => (
                      <label key={f.id} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                        <input 
                          type="checkbox" 
                          checked={generateForm.feeTypeIds.includes(f.id!)}
                          onChange={(e) => {
                            if (e.target.checked) setGenerateForm({...generateForm, feeTypeIds: [...generateForm.feeTypeIds, f.id!]});
                            else setGenerateForm({...generateForm, feeTypeIds: generateForm.feeTypeIds.filter(id => id !== f.id!)});
                          }}
                        />
                        <span className="text-sm text-slate-700">{f.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Classes</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        const allClasses = Array.from(new Set(students.map(s => s.class)));
                        if (e.target.checked) setGenerateForm({...generateForm, targetClasses: allClasses});
                        else setGenerateForm({...generateForm, targetClasses: []});
                      }}
                    />
                    <span className="text-sm font-bold text-slate-900">Select All Classes</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from(new Set(students.map(s => s.class))).sort().map(cls => (
                      <label key={cls} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                        <input 
                          type="checkbox" 
                          checked={generateForm.targetClasses.includes(cls)}
                          onChange={(e) => {
                            if (e.target.checked) setGenerateForm({...generateForm, targetClasses: [...generateForm.targetClasses, cls]});
                            else setGenerateForm({...generateForm, targetClasses: generateForm.targetClasses.filter(c => c !== cls)});
                          }}
                        />
                        <span className="text-sm text-slate-700">{cls}</span>
                      </label>
                    ))}
                  </div>
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

              <div className="mt-8 pt-8 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Automated Reminders</h3>
                <p className="text-sm text-slate-500 mb-4">Send email/SMS reminders for all pending/overdue fees.</p>
                <button 
                  onClick={handleSendReminders}
                  disabled={isSendingReminders}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold disabled:opacity-50"
                >
                  {isSendingReminders ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                  Send Reminders
                </button>
              </div>
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
                <button 
                  type="submit" 
                  disabled={isSavingFeeType}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center"
                >
                  {isSavingFeeType ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    editingFeeType ? 'Update Fee Type' : 'Save Fee Type'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waiver Modal */}
      {isWaiverModalOpen && selectedRecordForWaiver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <h2 className="text-xl font-bold">Apply Fee Waiver</h2>
              <button onClick={() => setIsWaiverModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleApplyWaiver} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Original Amount:</span>
                  <span className="font-bold text-slate-900">${selectedRecordForWaiver.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Paid to Date:</span>
                  <span className="font-bold text-emerald-600">${selectedRecordForWaiver.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200 mt-2">
                  <span className="text-slate-700 font-bold">Current Balance:</span>
                  <span className="font-bold text-rose-600">${(selectedRecordForWaiver.amount - selectedRecordForWaiver.paidAmount - (selectedRecordForWaiver.waiverAmount || 0)).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Waiver Amount ($)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max={selectedRecordForWaiver.amount - selectedRecordForWaiver.paidAmount}
                  value={waiverForm.amount}
                  onChange={(e) => setWaiverForm({...waiverForm, amount: Number(e.target.value)})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Reason for Waiver</label>
                <textarea
                  placeholder="e.g. Merit scholarship, financial hardship, etc."
                  value={waiverForm.reason}
                  onChange={(e) => setWaiverForm({...waiverForm, reason: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm h-24 resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsWaiverModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isApplyingWaiver}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center"
                >
                  {isApplyingWaiver ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Apply Waiver"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {isEditRecordModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <h2 className="text-xl font-bold">Edit Fee Record</h2>
              <button onClick={() => setIsEditRecordModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRecord} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Amount ($)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={recordForm.amount}
                  onChange={(e) => setRecordForm({...recordForm, amount: Number(e.target.value)})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={recordForm.dueDate}
                  onChange={(e) => setRecordForm({...recordForm, dueDate: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Term / Year</label>
                <input
                  type="text"
                  required
                  value={recordForm.termOrYear}
                  onChange={(e) => setRecordForm({...recordForm, termOrYear: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                <select
                  required
                  value={recordForm.status}
                  onChange={(e) => setRecordForm({...recordForm, status: e.target.value as FeeRecord['status']})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsEditRecordModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingRecord}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center"
                >
                  {isSavingRecord ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Update Record"
                  )}
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
                <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
