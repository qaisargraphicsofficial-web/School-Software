import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Syllabus, UserProfile } from '../types';
import { BookOpen, Plus, Search, FileText, Download } from 'lucide-react';
import { motion } from 'motion/react';

export default function Curriculum({ profile }: { profile: UserProfile | null }) {
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSyllabus, setNewSyllabus] = useState<Partial<Syllabus>>({
    class: '',
    subject: '',
    term: 'First Term',
    content: '',
  });

  useEffect(() => {
    fetchSyllabuses();
  }, []);

  const fetchSyllabuses = async () => {
    try {
      const q = query(collection(db, 'syllabus'));
      const snap = await getDocs(q);
      setSyllabuses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Syllabus)));
    } catch (error) {
      console.error("Error fetching syllabus:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'syllabus'), {
        ...newSyllabus,
        campusId: profile?.campusId || 'main',
      });
      setIsModalOpen(false);
      fetchSyllabuses();
    } catch (error) {
      console.error("Error adding syllabus:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Curriculum & Syllabus</h1>
          <p className="text-slate-500 text-sm">Manage school curriculum and subject syllabuses</p>
        </div>
        {profile?.role !== 'parent' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Syllabus
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {syllabuses.map((s) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                {s.term}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{s.subject}</h3>
            <p className="text-sm text-slate-500 mb-4">{s.class}</p>
            <div className="space-y-3">
              <p className="text-sm text-slate-600 line-clamp-3">{s.content}</p>
              <button className="flex items-center gap-2 text-indigo-600 text-sm font-medium hover:text-indigo-700">
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-4">Add New Syllabus</h2>
            <form onSubmit={handleAddSyllabus} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newSyllabus.class}
                  onChange={e => setNewSyllabus({...newSyllabus, class: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newSyllabus.subject}
                  onChange={e => setNewSyllabus({...newSyllabus, subject: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Term</label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newSyllabus.term}
                  onChange={e => setNewSyllabus({...newSyllabus, term: e.target.value})}
                >
                  <option>First Term</option>
                  <option>Mid Term</option>
                  <option>Final Term</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content Summary</label>
                <textarea
                  required
                  rows={4}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newSyllabus.content}
                  onChange={e => setNewSyllabus({...newSyllabus, content: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Save Syllabus
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
