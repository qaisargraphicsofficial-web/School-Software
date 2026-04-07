import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { DailyDiary as DiaryType, UserProfile } from '../types';
import { BookOpen, Plus, Search, Calendar, Clock, ChevronRight, FilePlus, BookText } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function DailyDiary({ profile }: { profile: UserProfile | null }) {
  const [diaries, setDiaries] = useState<DiaryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDiary, setNewDiary] = useState<Partial<DiaryType>>({
    date: new Date().toISOString().split('T')[0],
    class: '',
    section: '',
    subject: '',
    homework: '',
  });

  useEffect(() => {
    fetchDiaries();
  }, []);

  const fetchDiaries = async () => {
    try {
      const q = query(collection(db, 'daily_diary'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setDiaries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaryType)));
    } catch (error) {
      console.error("Error fetching diaries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'daily_diary'), {
        ...newDiary,
        campusId: profile?.campusId || 'main',
      });
      setIsModalOpen(false);
      fetchDiaries();
    } catch (error) {
      console.error("Error adding diary:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily Diary & Parent Communication</h1>
          <p className="text-slate-500 text-sm">Post daily homework and tasks for parents to see</p>
        </div>
        {profile?.role !== 'parent' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Diary Entry
          </button>
        )}
      </div>

      <div className="space-y-4">
        {diaries.map((d) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <BookText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{d.subject}</h3>
                  <p className="text-sm text-slate-500">{d.class} - {d.section}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{d.date}</p>
                <p className="text-xs text-slate-500">Posted Today</p>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-slate-700 text-sm whitespace-pre-wrap">{d.homework}</p>
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
            <h2 className="text-xl font-bold mb-4">Add Diary Entry</h2>
            <form onSubmit={handleAddDiary} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newDiary.date}
                  onChange={e => setNewDiary({...newDiary, date: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newDiary.class}
                    onChange={e => setNewDiary({...newDiary, class: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newDiary.section}
                    onChange={e => setNewDiary({...newDiary, section: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newDiary.subject}
                  onChange={e => setNewDiary({...newDiary, subject: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Homework/Task</label>
                <textarea
                  required
                  rows={4}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newDiary.homework}
                  onChange={e => setNewDiary({...newDiary, homework: e.target.value})}
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
                  Post Diary
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
