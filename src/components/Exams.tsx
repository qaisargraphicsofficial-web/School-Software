import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamPaper, UserProfile } from '../types';
import { FileText, Plus, Search, Calendar, Clock, ChevronRight, FilePlus } from 'lucide-react';
import { motion } from 'motion/react';

export default function Exams({ profile }: { profile: UserProfile | null }) {
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPaper, setNewPaper] = useState<Partial<ExamPaper>>({
    title: '',
    class: '',
    subject: '',
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    questions: [],
  });

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const q = query(collection(db, 'exam_papers'));
      const snap = await getDocs(q);
      setPapers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamPaper)));
    } catch (error) {
      console.error("Error fetching papers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'exam_papers'), {
        ...newPaper,
        campusId: profile?.campusId || 'main',
      });
      setIsModalOpen(false);
      fetchPapers();
    } catch (error) {
      console.error("Error adding paper:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Online Exams & Paper Gen</h1>
          <p className="text-slate-500 text-sm">Create and manage online exam papers</p>
        </div>
        {profile?.role === 'admin' || profile?.role === 'staff' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <FilePlus className="w-5 h-5" />
            Create Paper
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {papers.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                {p.class}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{p.title}</h3>
            <p className="text-sm text-slate-500 mb-4">{p.subject}</p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                {p.date}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                {p.duration} Minutes
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-indigo-600 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors font-medium">
              View Questions
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-xl font-bold mb-4">Create Exam Paper</h2>
            <form onSubmit={handleAddPaper} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paper Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newPaper.title}
                  onChange={e => setNewPaper({...newPaper, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newPaper.class}
                    onChange={e => setNewPaper({...newPaper, class: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newPaper.subject}
                    onChange={e => setNewPaper({...newPaper, subject: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newPaper.date}
                    onChange={e => setNewPaper({...newPaper, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newPaper.duration}
                    onChange={e => setNewPaper({...newPaper, duration: parseInt(e.target.value)})}
                  />
                </div>
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
                  Create Paper
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
