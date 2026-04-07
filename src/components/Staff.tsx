import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Staff, UserProfile } from '../types';
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
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface StaffProps {
  profile: UserProfile | null;
}

export default function StaffManagement({ profile }: StaffProps) {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<Partial<Staff>>({
    name: '',
    staffId: '',
    role: 'Teacher',
    contact: '',
    salary: 0,
    joiningDate: new Date().toISOString().split('T')[0],
  });

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
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
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
      await addDoc(collection(db, 'staff'), formData);
      setIsModalOpen(false);
      setFormData({
        name: '',
        staffId: '',
        role: 'Teacher',
        contact: '',
        salary: 0,
        joiningDate: new Date().toISOString().split('T')[0],
      });
      fetchStaff();
    } catch (error) {
      console.error("Error Adding Staff:", error);
    }
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

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.staffId.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Directory</h1>
          <p className="text-slate-500 font-medium">Manage and track all faculty and administrative staff.</p>
        </div>
        {profile?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
          >
            <UserPlus className="w-5 h-5" />
            Add Staff Member
          </button>
        )}
      </div>

      <div className="card p-5">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or staff ID..."
            className="input-field pl-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No staff members found.
          </div>
        ) : (
          filteredStaff.map((staff) => (
            <motion.div
              layout
              key={staff.id}
              className="card p-7 group relative"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 text-2xl font-black border border-indigo-100 shadow-sm transition-transform duration-300 group-hover:rotate-3">
                  {staff.name[0]}
                </div>
                {profile?.role === 'admin' && (
                  <button
                    onClick={() => handleDelete(staff.id!)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <div className="space-y-1.5 mb-6">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{staff.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">
                    {staff.role}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID: {staff.staffId}</span>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  {staff.contact}
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  Joined {staff.joiningDate}
                </div>
                <div className="flex items-center gap-3 text-sm font-black text-slate-900">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  ${staff.salary.toLocaleString()} <span className="text-[10px] text-slate-400 uppercase ml-1">/ month</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Staff Modal */}
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
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <h2 className="text-xl font-bold">Add Staff Member</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Full Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Staff ID</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.staffId}
                      onChange={e => setFormData({...formData, staffId: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Role</label>
                    <select
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      <option>Teacher</option>
                      <option>Administrator</option>
                      <option>Accountant</option>
                      <option>Librarian</option>
                      <option>Support Staff</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Monthly Salary</label>
                    <input
                      required
                      type="number"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.salary}
                      onChange={e => setFormData({...formData, salary: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Contact Number</label>
                    <input
                      required
                      type="tel"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.contact}
                      onChange={e => setFormData({...formData, contact: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Joining Date</label>
                    <input
                      required
                      type="date"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.joiningDate}
                      onChange={e => setFormData({...formData, joiningDate: e.target.value})}
                    />
                  </div>
                </div>
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
                    Add Staff Member
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
