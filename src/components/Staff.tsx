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
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

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
  const [payrollHistory, setPayrollHistory] = useState<Payroll[]>([]);

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
                      <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-100">
                        {staff.name[0]}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{staff.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                            staff.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                          )}>
                            {staff.status}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID: {staff.staffId}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(staff)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {profile?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(staff.id!)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
                          onClick={() => handleQuickPay(staff)}
                          className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          title="Pay Salary"
                        >
                          <Wallet className="w-5 h-5" />
                        </button>
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
    </div>
  );
}
