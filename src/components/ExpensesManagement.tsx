import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Expense, UserProfile, SchoolSettings } from '../types';
import { Search, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface ExpensesManagementProps { profile: UserProfile | null; }

export default function ExpensesManagement({ profile }: ExpensesManagementProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(['Utility Bills', 'Maintenance', 'Stationery', 'Events', 'Salaries', 'Others']);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<{old: string, new: string} | null>(null);
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showExpenseReport, setShowExpenseReport] = useState(false);

  const filteredExpenses = expenses.filter(e => {
    const matchesCategory = filterCategory === 'All Categories' || e.category === filterCategory;
    const matchesStartDate = !filterStartDate || e.date >= filterStartDate;
    const matchesEndDate = !filterEndDate || e.date <= filterEndDate;
    return matchesCategory && matchesStartDate && matchesEndDate;
  });

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    const snap = await getDocs(collection(db, 'settings'));
    if (!snap.empty) {
      const s = { id: snap.docs[0].id, ...snap.docs[0].data() } as SchoolSettings;
      setSettings(s);
      if (s.expenseCategories) {
        setExpenseCategories(s.expenseCategories);
      }
    }
  };

  const updateSettings = async (newCategories: string[]) => {
    if (settings?.id) {
      await updateDoc(doc(db, 'settings', settings.id), { expenseCategories: newCategories });
      setExpenseCategories(newCategories);
      setSettings({ ...settings, expenseCategories: newCategories });
    }
  };

  const addCategory = () => {
    if (newCategory && !expenseCategories.includes(newCategory)) {
      const updated = [...expenseCategories, newCategory];
      updateSettings(updated);
      setNewCategory('');
    }
  };

  const deleteCategory = (cat: string) => {
    const updated = expenseCategories.filter(c => c !== cat);
    updateSettings(updated);
  };

  const editCategory = (oldCat: string, newCat: string) => {
    const updated = expenseCategories.map(c => c === oldCat ? newCat : c);
    updateSettings(updated);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Expense Management</h2>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowExpenseReport(!showExpenseReport)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            {showExpenseReport ? 'Hide Report' : 'View Report'}
          </button>
          <button className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors">
            + Add Expense
          </button>
        </div>
      </div>

      {showExpenseReport && (
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Expense Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-xs text-slate-500 font-bold uppercase">Total Amount</p>
              <p className="text-xl font-bold text-slate-900">${filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-xs text-slate-500 font-bold uppercase">Total Tax</p>
              <p className="text-xl font-bold text-slate-900">${filteredExpenses.reduce((sum, e) => sum + (e.taxAmount || 0), 0).toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-xs text-slate-500 font-bold uppercase">Grand Total</p>
              <p className="text-xl font-bold text-slate-900">${filteredExpenses.reduce((sum, e) => sum + e.amount + (e.taxAmount || 0), 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <input type="date" className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
        <input type="date" className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
        <select className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option>All Categories</option>
          {expenseCategories.map(cat => <option key={cat}>{cat}</option>)}
        </select>
      </div>

      <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Manage Categories</h3>
        <div className="flex flex-wrap gap-2">
          {expenseCategories.map(cat => (
            <div key={cat} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-sm">
              {editingCategory?.old === cat ? (
                <input 
                  type="text" 
                  value={editingCategory.new} 
                  onChange={e => setEditingCategory({...editingCategory, new: e.target.value})} 
                  onBlur={() => editCategory(cat, editingCategory.new)}
                  className="w-20 px-1 rounded border border-slate-300"
                />
              ) : (
                <span onClick={() => setEditingCategory({old: cat, new: cat})}>{cat}</span>
              )}
              <button onClick={() => deleteCategory(cat)} className="text-rose-500 hover:text-rose-700">×</button>
            </div>
          ))}
          <div className="flex gap-2">
            <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="New Category" className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm" />
            <button onClick={addCategory} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm">Add</button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">DATE</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">CATEGORY</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">DESCRIPTION</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">AMOUNT</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">TAX</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center animate-pulse">Loading expenses...</td></tr>
            ) : filteredExpenses.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No expenses found</td></tr>
            ) : (
              filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">{expense.date}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{expense.category}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{expense.description}</td>
                  <td className="px-6 py-4 text-sm font-bold text-rose-600">-${expense.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-amber-600">-${(expense.taxAmount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">-${(expense.amount + (expense.taxAmount || 0)).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
