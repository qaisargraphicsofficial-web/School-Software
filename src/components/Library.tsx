import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { LibraryLoan, UserProfile, Student } from '../types';
import { Book, Plus, Search, Calendar, User, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Library({ profile }: { profile: UserProfile | null }) {
  const [loans, setLoans] = useState<LibraryLoan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLoan, setNewLoan] = useState<Partial<LibraryLoan>>({
    studentId: '',
    bookTitle: '',
    loanDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'borrowed',
  });

  useEffect(() => {
    fetchLoans();
    fetchStudents();
  }, []);

  const fetchLoans = async () => {
    try {
      const q = query(collection(db, 'library_loans'));
      const snap = await getDocs(q);
      setLoans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibraryLoan)));
    } catch (error) {
      console.error("Error fetching loans:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    const snap = await getDocs(collection(db, 'students'));
    setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
  };

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'library_loans'), {
        ...newLoan,
        campusId: profile?.campusId || 'main',
      });
      setIsModalOpen(false);
      fetchLoans();
    } catch (error) {
      console.error("Error adding loan:", error);
    }
  };

  const handleReturnBook = async (loanId: string) => {
    try {
      await updateDoc(doc(db, 'library_loans', loanId), {
        status: 'returned',
        returnDate: new Date().toISOString().split('T')[0],
      });
      fetchLoans();
    } catch (error) {
      console.error("Error returning book:", error);
    }
  };

  const getStudentName = (id: string) => {
    const s = students.find(s => s.id === id);
    return s ? `${s.name} S/O ${s.parentName}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Library Book Loans</h1>
          <p className="text-slate-500 text-sm">Track and manage school library books</p>
        </div>
        {profile?.role !== 'parent' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Issue Book
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Book Title</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Loan Date</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Due Date</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.map((loan) => (
                <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Book className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-900">{loan.bookTitle}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{getStudentName(loan.studentId)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{loan.loanDate}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{loan.dueDate}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit",
                      loan.status === 'returned' ? "bg-emerald-100 text-emerald-700" :
                      loan.status === 'overdue' ? "bg-rose-100 text-rose-700" :
                      "bg-amber-100 text-amber-700"
                    )}>
                      {loan.status === 'returned' ? <CheckCircle className="w-3 h-3" /> :
                       loan.status === 'overdue' ? <AlertCircle className="w-3 h-3" /> :
                       <Clock className="w-3 h-3" />}
                      {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {loan.status === 'borrowed' && profile?.role !== 'parent' && (
                      <button
                        onClick={() => handleReturnBook(loan.id!)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        Mark Returned
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-4">Issue New Book</h2>
            <form onSubmit={handleAddLoan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Student</label>
                <select
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newLoan.studentId}
                  onChange={e => setNewLoan({...newLoan, studentId: e.target.value})}
                >
                  <option value="">Select a student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Book Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newLoan.bookTitle}
                  onChange={e => setNewLoan({...newLoan, bookTitle: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loan Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newLoan.loanDate}
                    onChange={e => setNewLoan({...newLoan, loanDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newLoan.dueDate}
                    onChange={e => setNewLoan({...newLoan, dueDate: e.target.value})}
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
                  Issue Book
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
