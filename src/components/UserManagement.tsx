import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, updateDoc, doc, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole, UserStatus } from '../types';
import { Users, Search, Shield, CheckCircle, XCircle, Trash2, Mail, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface UserManagementProps {
  profile: UserProfile | null;
}

export default function UserManagement({ profile }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Logic: System Admin sees ALL users. 
      // School Admin would see users for their school only (if we allowed them access to this module).
      const q = query(collection(db, 'users'));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)));
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (uid: string, status: UserStatus) => {
    try {
      await updateDoc(doc(db, 'users', uid), { status });
      setUsers(users.map(u => u.uid === uid ? { ...u, status } : u));
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleUpdateRole = async (uid: string, role: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      setUsers(users.map(u => u.uid === uid ? { ...u, role } : u));
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm("Are you sure you want to delete this user profile? This won't delete their Firebase Auth account.")) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(users.filter(u => u.uid !== uid));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user profile. You may not have sufficient permissions.");
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            User Management
          </h1>
          <p className="text-slate-500 font-medium">Manage cross-school user access and permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="admin">Admins</option>
          <option value="staff">Staff</option>
          <option value="student">Students</option>
          <option value="parent">Parents</option>
        </select>
        <select
          className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">School ID</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-slate-500 font-bold">Loading users...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-medium">
                    No users found matching your filters
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black">
                          {user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{user.displayName || 'No Name'}</p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <select
                        className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.uid, e.target.value as UserRole)}
                      >
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                        <option value="student">Student</option>
                        <option value="parent">Parent</option>
                      </select>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg w-fit">
                        <Building2 className="w-3 h-3" />
                        {user.schoolId || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        user.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                        user.status === 'pending' ? "bg-amber-100 text-amber-700" :
                        "bg-rose-100 text-rose-700"
                      )}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        {user.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(user.uid, 'approved')}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                            title="Approve User"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        {user.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(user.uid, 'rejected')}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Reject User"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(user.uid)}
                          className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors"
                          title="Delete Profile"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Grid View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="px-6 py-10 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-slate-500 font-bold">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500 font-medium">
              No users found matching your filters
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.uid} className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg">
                    {user.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-slate-900 truncate">{user.displayName || 'No Name'}</p>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1.5 font-medium">
                      <Mail className="w-3.5 h-3.5" />
                      {user.email}
                    </p>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                    user.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                    user.status === 'pending' ? "bg-amber-100 text-amber-700" :
                    "bg-rose-100 text-rose-700"
                  )}>
                    {user.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Context Role</p>
                    <select
                      className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.uid, e.target.value as UserRole)}
                    >
                      <option value="admin">Admin</option>
                      <option value="staff">Staff</option>
                      <option value="student">Student</option>
                      <option value="parent">Parent</option>
                    </select>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">School ID</p>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                      <Building2 className="w-3.5 h-3.5" />
                      {user.schoolId || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {user.status !== 'approved' && (
                    <button
                      onClick={() => handleUpdateStatus(user.uid, 'approved')}
                      className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                  )}
                  {user.status !== 'rejected' && (
                    <button
                      onClick={() => handleUpdateStatus(user.uid, 'rejected')}
                      className="flex-1 py-3 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteUser(user.uid)}
                    className="p-3 bg-slate-50 text-slate-400 rounded-2xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
