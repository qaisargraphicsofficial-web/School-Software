import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Staff, UserProfile, Payroll } from '../types';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Trash2, 
  X,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Edit2,
  CheckCircle2,
  XCircle,
  UserCheck,
  Wallet,
  History,
  ArrowRight,
  Users,
  Key,
  ShieldCheck,
  QrCode,
  Scan,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface StaffProps {
  profile: UserProfile | null;
}

export default function StaffManagement({ profile }: StaffProps) {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'staffId' | 'joiningDate'>('name');
  const [loading, setLoading] = useState(true);
  const [viewingSalaryHistory, setViewingSalaryHistory] = useState<Staff | null>(null);
  const [viewingAttendanceHistory, setViewingAttendanceHistory] = useState<Staff | null>(null);
  const [payrollHistory, setPayrollHistory] = useState<Payroll[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [selectedStaffForCreds, setSelectedStaffForCreds] = useState<Staff | null>(null);
  const [credFormData, setCredFormData] = useState({
    username: '',
    password: ''
  });

  const handleGenerateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForCreds) return;
    
    try {
      // Store credentials in a separate collection
      // In a real app, password should be hashed
      try {
        await setDoc(doc(db, 'staff_credentials', selectedStaffForCreds.staffId), {
          username: credFormData.username,
          password: credFormData.password,
          staffId: selectedStaffForCreds.staffId,
          campusId: profile?.campusId || 'main',
          role: selectedStaffForCreds.role,
          name: selectedStaffForCreds.name
        });
        
        alert('Credentials generated successfully!');
        setIsCredentialModalOpen(false);
        setCredFormData({ username: '', password: '' });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `staff_credentials/${selectedStaffForCreds.staffId}`);
      }
    } catch (error) {
      console.error("Error generating credentials:", error);
      alert('Failed to generate credentials.');
    }
  };

  const fetchPayrollHistory = async (staffId: string) => {
    try {
      const q = query(collection(db, 'payroll'), where('staffId', '==', staffId), orderBy('paymentDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Payroll));
      setPayrollHistory(data);
    } catch (error) {
      console.error("Error fetching payroll history:", error);
    }
  };

  const fetchAttendanceHistory = async (staffId: string) => {
    try {
      const q = query(
        collection(db, 'attendance'), 
        where('targetId', '==', staffId),
        where('targetType', '==', 'staff'),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceHistory(data);
    } catch (error) {
      console.error("Error fetching attendance history:", error);
    }
  };

  const initialFormData: Partial<Staff> = {
    name: '',
    staffId: '',
    role: 'Teacher',
    contact: '',
    salary: 0,
    joiningDate: new Date().toISOString().split('T')[0],
    leavingDate: '',
    classIncharge: 'None',
    totalSalaryReceived: 0,
    remainingDues: 0,
    status: 'active',
    campusId: profile?.campusId || 'main',
  };

  const [formData, setFormData] = useState<Partial<Staff>>(initialFormData);

  useEffect(() => {
    if (profile) {
      fetchStaff();
    }
  }, [profile]);

  useEffect(() => {
    if (isScannerOpen) {
      const scanner = new Html5QrcodeScanner("staff-reader", { fps: 10, qrbox: 250 }, false);
      scanner.render(onScanSuccess, onScanError);
      return () => {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      };
    }
  }, [isScannerOpen]);

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);
    
    try {
      // Find staff by staffId
      const staff = staffList.find(s => s.staffId === decodedText);
      if (!staff) {
        setScanResult(`Error: Staff ID ${decodedText} not found.`);
        setTimeout(() => setScanResult(null), 3000);
        setIsProcessingScan(false);
        return;
      }

      const date = new Date().toISOString().split('T')[0];
      
      // Check if already marked for today
      const q = query(
        collection(db, 'attendance'), 
        where('targetId', '==', staff.staffId),
        where('date', '==', date),
        where('targetType', '==', 'staff')
      );
      const existing = await getDocs(q);
      
      if (!existing.empty) {
        setScanResult(`${staff.name} already marked present for today.`);
      } else {
        await addDoc(collection(db, 'attendance'), {
          date,
          targetId: staff.staffId,
          targetType: 'staff',
          status: 'present',
          method: 'qr',
          campusId: profile?.campusId || 'main',
          timestamp: new Date().toISOString()
        });
        setScanResult(`Attendance marked for ${staff.name}`);
      }
      
      setTimeout(() => setScanResult(null), 3000);
    } catch (error) {
      console.error("Staff QR Scan Error:", error);
      setScanResult("Error processing scan.");
      setTimeout(() => setScanResult(null), 3000);
    } finally {
      setIsProcessingScan(false);
    }
  };

  const onScanError = (err: any) => {
    // console.warn(err);
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'staff'), orderBy('joiningDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Staff));
      setStaffList(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && editingId) {
        await setDoc(doc(db, 'staff', editingId), {
          ...formData,
          campusId: profile?.campusId || 'main'
        });
      } else {
        await addDoc(collection(db, 'staff'), {
          ...formData,
          campusId: profile?.campusId || 'main'
        });
      }
      
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      setFormData(initialFormData);
      fetchStaff();
    } catch (error) {
      console.error("Error saving staff record:", error);
    }
  };

  const handleEdit = (staff: Staff) => {
    setFormData(staff);
    setEditingId(staff.id!);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      try {
        await deleteDoc(doc(db, 'staff', id));
        fetchStaff();
      } catch (error) {
        console.error("Error deleting staff:", error);
      }
    }
  };

  const handleQuickPay = async (staff: Staff) => {
    const amount = prompt(`Enter salary amount paid to ${staff.name}:`, staff.salary.toString());
    if (amount && !isNaN(Number(amount))) {
      try {
        const paid = Number(amount);
        const currentReceived = staff.totalSalaryReceived || 0;
        const currentDues = staff.remainingDues || 0;
        
        await updateDoc(doc(db, 'staff', staff.id!), {
          totalSalaryReceived: currentReceived + paid,
          remainingDues: Math.max(0, currentDues - paid)
        });
        fetchStaff();
      } catch (error) {
        console.error("Error updating salary:", error);
      }
    }
  };

  const updateStaffStatus = async (staff: Staff) => {
    const newStatus = staff.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'staff', staff.id!), { status: newStatus });
      fetchStaff();
    } catch (error) {
      console.error("Error updating staff status:", error);
    }
  };

  const filteredStaff = staffList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.staffId.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'staffId') return a.staffId.localeCompare(b.staffId);
    return new Date(a.joiningDate).getTime() - new Date(b.joiningDate).getTime();
  });

  const roles = ['all', ...new Set(staffList.map(s => s.role))];

  const exportToCSV = () => {
    try {
      const headers = ['Name', 'Staff ID', 'Role', 'Contact', 'Salary', 'Joining Date', 'Status', 'Class Incharge', 'Total Received', 'Remaining Dues'];
      const data = filteredStaff.map(s => [
        s.name,
        s.staffId,
        s.role,
        s.contact,
        s.salary,
        s.joiningDate,
        s.status,
        s.classIncharge || 'None',
        s.totalSalaryReceived || 0,
        s.remainingDues || 0
      ]);

      const csvContent = [
        headers.join(','),
        ...data.map(row => row.map(cell => `"${cell || ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `staff_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Management</h1>
          <p className="text-slate-500 font-medium">Manage faculty, administration, and financial records.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToCSV}
            className="btn-secondary px-5 py-2.5 text-sm flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>
          {profile?.role === 'admin' && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="btn-secondary px-5 py-2.5 text-sm flex items-center gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                <Scan className="w-4 h-4" />
                Scan Attendance
              </button>
              <button
                onClick={() => {
                  setFormData(initialFormData);
                  setIsEditMode(false);
                  setIsModalOpen(true);
                }}
                className="btn-primary"
              >
                <UserPlus className="w-5 h-5" />
                Add Staff Member
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Filters */}
          <div className="card p-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or staff ID..."
                className="input-field pl-12"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select 
                className="input-field py-2 text-sm w-full md:w-40"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
              >
                <option value="name">Sort by Name</option>
                <option value="staffId">Sort by ID</option>
                <option value="joiningDate">Sort by Date</option>
              </select>
              <select 
                className="input-field py-2 text-sm w-full md:w-40"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                {roles.map(role => (
                  <option key={role as string} value={role as string}>{(role as string).charAt(0).toUpperCase() + (role as string).slice(1)}</option>
                ))}
              </select>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(['all', 'active', 'inactive'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      statusFilter === status ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Staff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              <div className="col-span-full py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-[32px] border border-slate-100">
                No staff members found matching your criteria.
              </div>
            ) : (
              filteredStaff.map((staff) => (
                <motion.div
                  layout
                  key={staff.id}
                  className="card p-7 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[100px] -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                  
                  <div className="flex items-start justify-between mb-6 relative">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-100 overflow-hidden relative">
                        {staff.name[0]}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{staff.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => updateStaffStatus(staff)}
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors",
                              staff.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"
                            )}
                          >
                            {staff.status}
                          </button>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID: {staff.staffId}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                        <button
                          onClick={() => handleEdit(staff)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {profile?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(staff.id!)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="p-1.5 bg-white border border-slate-100 rounded-xl shadow-sm">
                        <QRCodeSVG value={staff.staffId} size={48} />
                      </div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Scan ID</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 relative">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Role</p>
                      <p className="text-sm font-bold text-slate-900">{staff.role}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Incharge</p>
                      <p className="text-sm font-bold text-slate-900">{staff.classIncharge || 'None'}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 relative">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-500 font-bold">
                        <Phone className="w-4 h-4" />
                        <span>{staff.contact}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 font-bold">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {staff.joiningDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 relative">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Salary</p>
                        <p className="text-lg font-black text-slate-900">${staff.salary.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setViewingSalaryHistory(staff);
                            fetchPayrollHistory(staff.id!);
                          }}
                          className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          title="Salary History"
                        >
                          <History className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            setViewingAttendanceHistory(staff);
                            fetchAttendanceHistory(staff.staffId);
                          }}
                          className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          title="Attendance History"
                        >
                          <UserCheck className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleQuickPay(staff)}
                          className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          title="Pay Salary"
                        >
                          <Wallet className="w-5 h-5" />
                        </button>
                        {profile?.role === 'admin' && (
                          <button 
                            onClick={() => {
                              setSelectedStaffForCreds(staff);
                              setCredFormData({ username: staff.staffId, password: '' });
                              setIsCredentialModalOpen(true);
                            }}
                            className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                            title="Generate Login Credentials"
                          >
                            <Key className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Received</p>
                        <p className="text-sm font-bold text-emerald-600">${(staff.totalSalaryReceived || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pending Dues</p>
                        <p className="text-sm font-bold text-rose-600">${(staff.remainingDues || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          <div className="card p-6 bg-indigo-600 text-white">
            <h3 className="text-lg font-black uppercase tracking-widest mb-6 opacity-80">Staff Summary</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="font-bold">Total Staff</span>
                </div>
                <span className="text-2xl font-black">{staffList.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <span className="font-bold">Active</span>
                </div>
                <span className="text-2xl font-black">{staffList.filter(s => s.status === 'active').length}</span>
              </div>
              <div className="pt-6 border-t border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Total Monthly Payroll</p>
                <p className="text-3xl font-black">${staffList.reduce((acc, s) => acc + s.salary, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Financial Health</h3>
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Paid</p>
                <p className="text-xl font-black text-emerald-700">${staffList.reduce((acc, s) => acc + (s.totalSalaryReceived || 0), 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Total Dues</p>
                <p className="text-xl font-black text-rose-700">${staffList.reduce((acc, s) => acc + (s.remainingDues || 0), 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance History Modal */}
      <AnimatePresence>
        {viewingAttendanceHistory && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setViewingAttendanceHistory(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-6 h-6" />
                  <h2 className="text-2xl font-black tracking-tight">Attendance History: {viewingAttendanceHistory.name}</h2>
                </div>
                <button onClick={() => setViewingAttendanceHistory(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  {attendanceHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">No attendance records found.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {attendanceHistory.map((record) => (
                        <div key={record.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{record.date}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{record.method === 'qr' ? 'QR Scan' : 'Manual'}</p>
                          </div>
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase">Present</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Salary History Modal */}
      <AnimatePresence>
        {viewingSalaryHistory && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setViewingSalaryHistory(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <History className="w-6 h-6" />
                  <h2 className="text-2xl font-black tracking-tight">Salary History: {viewingSalaryHistory.name}</h2>
                </div>
                <button onClick={() => setViewingSalaryHistory(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Date</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payrollHistory.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No payroll history found.</td></tr>
                    ) : (
                      payrollHistory.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{p.month}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{p.paymentDate}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-900">${p.amount.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-semibold",
                              p.status === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Staff Modal */}
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
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-6 h-6" />
                  <h2 className="text-2xl font-black tracking-tight">{isEditMode ? 'Edit Staff Record' : 'Add Staff Member'}</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                    <input
                      required
                      type="text"
                      className="input-field"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Staff ID</label>
                    <input
                      required
                      type="text"
                      className="input-field"
                      value={formData.staffId}
                      onChange={e => setFormData({...formData, staffId: e.target.value})}
                      placeholder="STF-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Role</label>
                    <select
                      required
                      className="input-field"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      <option>Teacher</option>
                      <option>Administrator</option>
                      <option>Accountant</option>
                      <option>Librarian</option>
                      <option>Support Staff</option>
                      <option>Security</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Class Incharge</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.classIncharge}
                      onChange={e => setFormData({...formData, classIncharge: e.target.value})}
                      placeholder="e.g. 10th A or None"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Monthly Salary</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        required
                        type="number"
                        className="input-field pl-10"
                        value={formData.salary}
                        onChange={e => setFormData({...formData, salary: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        required
                        type="tel"
                        className="input-field pl-10"
                        value={formData.contact}
                        onChange={e => setFormData({...formData, contact: e.target.value})}
                        placeholder="+1 234 567 890"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Joining Date</label>
                    <input
                      required
                      type="date"
                      className="input-field"
                      value={formData.joiningDate}
                      onChange={e => setFormData({...formData, joiningDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Leaving Date (Optional)</label>
                    <input
                      type="date"
                      className="input-field"
                      value={formData.leavingDate}
                      onChange={e => setFormData({...formData, leavingDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Status</label>
                    <select
                      required
                      className="input-field"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Initial Pending Dues</label>
                    <input
                      type="number"
                      className="input-field"
                      value={formData.remainingDues}
                      onChange={e => setFormData({...formData, remainingDues: Number(e.target.value)})}
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    {isEditMode ? 'Update Record' : 'Add Staff Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {isScannerOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
              onClick={() => setIsScannerOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <Scan className="w-6 h-6" />
                  <h2 className="text-2xl font-black tracking-tight">Staff Attendance</h2>
                </div>
                <button 
                  onClick={() => setIsScannerOpen(false)} 
                  className="p-2 hover:bg-white/10 rounded-2xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="relative aspect-square bg-slate-100 rounded-[32px] overflow-hidden border-4 border-slate-100 shadow-inner">
                  <div id="staff-reader" className="w-full h-full"></div>
                  {isProcessingScan && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                      <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                    </div>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {scanResult ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "p-4 rounded-2xl text-center font-bold text-sm",
                        scanResult.startsWith('Error') ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                      )}
                    >
                      {scanResult}
                    </motion.div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl text-center text-slate-500 text-sm font-medium">
                      Point the camera at a staff QR code
                    </div>
                  )}
                </AnimatePresence>

                <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-indigo-900 uppercase tracking-tight">Quick Access</p>
                      <p className="text-xs text-indigo-600/80 font-medium leading-relaxed mt-1">
                        Scan staff ID cards to automatically log attendance and track entry times.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Credential Generation Modal */}
      <AnimatePresence>
        {isCredentialModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsCredentialModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-amber-600 text-white">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6" />
                  <h2 className="text-2xl font-black tracking-tight">Staff Credentials</h2>
                </div>
                <button onClick={() => setIsCredentialModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleGenerateCredentials} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-xs font-bold text-amber-700 mb-1">Staff Member</p>
                    <p className="text-lg font-black text-slate-900">{selectedStaffForCreds?.name}</p>
                    <p className="text-xs text-slate-500">ID: {selectedStaffForCreds?.staffId}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Login Username (Unique ID)</label>
                    <input
                      required
                      type="text"
                      className="input-field"
                      value={credFormData.username}
                      onChange={e => setCredFormData({...credFormData, username: e.target.value})}
                      placeholder="e.g. STF-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Login Password</label>
                    <input
                      required
                      type="password"
                      className="input-field"
                      value={credFormData.password}
                      onChange={e => setCredFormData({...credFormData, password: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCredentialModalOpen(false)}
                    className="flex-1 px-6 py-4 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-amber-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-100"
                  >
                    Generate
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
