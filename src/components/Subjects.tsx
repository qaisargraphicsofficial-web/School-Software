import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, addDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Subject, UserProfile, Staff } from '../types';
import { Plus, Edit2, Trash2, X, BookOpen, User } from 'lucide-react';

interface SubjectsProps {
  profile: UserProfile | null;
}

export default function SubjectsManagement({ profile }: SubjectsProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', class: '', teacherId: '' });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchData();
      fetchStaff();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const q = query(collection(db, 'subjects'), where('campusId', '==', profile?.campusId || 'main'));
      const snap = await getDocs(q);
      setSubjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchStaff = async () => {
    try {
      const q = query(collection(db, 'staff'), where('campusId', '==', profile?.campusId || 'main'), where('status', '==', 'active'));
      const snap = await getDocs(q);
      setStaff(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await updateDoc(doc(db, 'subjects', editingSubject.id!), formData);
      } else {
        await addDoc(collection(db, 'subjects'), { ...formData, campusId: profile?.campusId || 'main' });
      }
      setIsModalOpen(false);
      setEditingSubject(null);
      setFormData({ name: '', code: '', class: '', teacherId: '' });
      fetchData();
    } catch (error) {
      console.error("Error saving subject:", error);
    }
  };

  const handleDelete = async () => {
    if (subjectToDelete) {
      try {
        await deleteDoc(doc(db, 'subjects', subjectToDelete));
        setIsDeleteModalOpen(false);
        setSubjectToDelete(null);
        fetchData();
      } catch (error) {
        console.error("Error deleting subject:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Manage Subjects</h2>
        <button onClick={() => { setIsModalOpen(true); setEditingSubject(null); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Code</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Class</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Assigned Teacher</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {subjects.map(s => {
              const assignedTeacher = staff.find(st => st.id === s.teacherId);
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{s.code}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{s.class}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {assignedTeacher ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium text-slate-700">{assignedTeacher.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditingSubject(s); setFormData({ name: s.name, code: s.code, class: s.class, teacherId: s.teacherId || '' }); setIsModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => { setSubjectToDelete(s.id!); setIsDeleteModalOpen(true); }} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Subject?</h3>
            <p className="text-slate-500 text-sm mb-6">This action cannot be undone. Are you sure you want to delete this subject?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{editingSubject ? 'Edit' : 'Add'} Subject</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Subject Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Mathematics" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Subject Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. MATH-101" 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Class</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 10th" 
                    value={formData.class} 
                    onChange={e => setFormData({...formData, class: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assign Teacher</label>
                <div className="relative">
                  <select 
                    value={formData.teacherId} 
                    onChange={e => setFormData({...formData, teacherId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                  >
                    <option value="">-- Select Teacher --</option>
                    {staff.map(st => (
                      <option key={st.id} value={st.id}>{st.name} ({st.role})</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-2xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit} 
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
              >
                {editingSubject ? 'Save Changes' : 'Add Subject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
