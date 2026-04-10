import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, addDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Subject, UserProfile } from '../types';
import { Plus, Edit2, Trash2, X, BookOpen } from 'lucide-react';

interface SubjectsProps {
  profile: UserProfile | null;
}

export default function SubjectsManagement({ profile }: SubjectsProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', class: '', teacherId: '' });

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  const fetchData = async () => {
    const q = query(collection(db, 'subjects'), where('campusId', '==', profile?.campusId || 'main'));
    const snap = await getDocs(q);
    setSubjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubject) {
      await updateDoc(doc(db, 'subjects', editingSubject.id!), formData);
    } else {
      await addDoc(collection(db, 'subjects'), { ...formData, campusId: profile?.campusId || 'main' });
    }
    setIsModalOpen(false);
    setEditingSubject(null);
    setFormData({ name: '', code: '', class: '', teacherId: '' });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      await deleteDoc(doc(db, 'subjects', id));
      fetchData();
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
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {subjects.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{s.code}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{s.class}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setEditingSubject(s); setFormData(s); setIsModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(s.id!)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{editingSubject ? 'Edit' : 'Add'} Subject</h2>
            <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            <input type="text" placeholder="Code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            <input type="text" placeholder="Class" value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">{editingSubject ? 'Save' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
