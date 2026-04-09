import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Expense, UserProfile, SchoolSettings } from '../types';
import { Search, Plus, Download, X, FileText, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [filterInvoiceNumber, setFilterInvoiceNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Expense | 'total'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showExpenseReport, setShowExpenseReport] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    category: 'Utility Bills',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    invoiceNumber: '',
    campusId: profile?.campusId || 'main'
  });

  const filteredExpenses = expenses
    .filter(e => {
      const matchesCategory = filterCategory === 'All Categories' || e.category === filterCategory;
      const matchesStartDate = !filterStartDate || e.date >= filterStartDate;
      const matchesEndDate = !filterEndDate || e.date <= filterEndDate;
      const matchesInvoice = !filterInvoiceNumber || (e.invoiceNumber && e.invoiceNumber.toLowerCase().includes(filterInvoiceNumber.toLowerCase()));
      const matchesSearch = !searchQuery || 
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.invoiceNumber && e.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesCategory && matchesStartDate && matchesEndDate && matchesInvoice && matchesSearch;
    })
    .sort((a, b) => {
      let valA: any = a[sortField as keyof Expense] ?? '';
      let valB: any = b[sortField as keyof Expense] ?? '';

      if (sortField === 'total') {
        valA = a.amount;
        valB = b.amount;
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
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

  const deleteCategory = async (cat: string) => {
    if (cat === 'Others') {
      alert("The 'Others' category cannot be deleted.");
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete the category "${cat}"? All associated expenses will be moved to "Others".`)) {
      try {
        const batch = writeBatch(db);
        
        // Update settings
        const updatedCategories = expenseCategories.filter(c => c !== cat);
        if (settings?.id) {
          batch.update(doc(db, 'settings', settings.id), { expenseCategories: updatedCategories });
        }
        
        // Update expenses
        const expensesToUpdate = expenses.filter(e => e.category === cat);
        expensesToUpdate.forEach(e => {
          batch.update(doc(db, 'expenses', e.id!), { category: 'Others' });
        });
        
        await batch.commit();
        setExpenseCategories(updatedCategories);
        fetchData();
      } catch (error) {
        console.error("Error deleting category:", error);
      }
    }
  };

  const editCategory = async (oldCat: string, newCat: string) => {
    if (!newCat || oldCat === newCat) {
      setEditingCategory(null);
      return;
    }

    try {
      const batch = writeBatch(db);
      
      // Update settings
      const updatedCategories = expenseCategories.map(c => c === oldCat ? newCat : c);
      if (settings?.id) {
        batch.update(doc(db, 'settings', settings.id), { expenseCategories: updatedCategories });
      }
      
      // Update expenses
      const expensesToUpdate = expenses.filter(e => e.category === oldCat);
      expensesToUpdate.forEach(e => {
        batch.update(doc(db, 'expenses', e.id!), { category: newCat });
      });
      
      await batch.commit();
      setExpenseCategories(updatedCategories);
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      console.error("Error editing category:", error);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'expenses'), {
        ...newExpense,
        amount: Number(newExpense.amount),
        campusId: profile?.campusId || 'main'
      });
      setIsAddModalOpen(false);
      setNewExpense({
        category: 'Utility Bills',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
        invoiceNumber: '',
        campusId: profile?.campusId || 'main'
      });
      fetchData();
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  const exportToCSV = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const lastMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= lastMonth && d <= endOfLastMonth;
    });

    if (lastMonthExpenses.length === 0) {
      alert("No expenses found for last month.");
      return;
    }

    const headers = ['Date', 'Category', 'Description', 'Invoice Number', 'Amount'];
    const rows = lastMonthExpenses.map(e => [
      e.date,
      e.category,
      e.description,
      e.invoiceNumber || 'N/A',
      e.amount
    ]);

    // Add Grand Total row
    const totalAmount = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    rows.push(['', '', 'GRAND TOTAL', '', totalAmount]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expense_report_last_month_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (field: keyof Expense | 'total') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: keyof Expense | 'total' }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Expense Management</h2>
        <div className="flex gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
          <button 
            onClick={() => setShowExpenseReport(!showExpenseReport)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            {showExpenseReport ? 'Hide Report' : 'View Report'}
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {showExpenseReport && (
        <div className="p-8 bg-white rounded-[32px] shadow-xl border border-slate-100 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Financial Summary Report</h3>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Period</p>
              <p className="text-sm font-bold text-slate-600">
                {filterStartDate || 'Beginning'} to {filterEndDate || 'Today'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-3 mb-2 text-indigo-600">
                <FileText className="w-5 h-5" />
                <p className="text-[10px] font-black uppercase tracking-widest">Total Expenses</p>
              </div>
              <p className="text-3xl font-black text-slate-900">${filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-3 mb-2 text-emerald-600">
                <FileText className="w-5 h-5" />
                <p className="text-[10px] font-black uppercase tracking-widest">Transaction Count</p>
              </div>
              <p className="text-3xl font-black text-slate-900">{filteredExpenses.length}</p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Category Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                {expenseCategories.map(cat => {
                  const catExpenses = filteredExpenses.filter(e => e.category === cat);
                  const catTotal = catExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const grandTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const percentage = grandTotal > 0 ? (catTotal / grandTotal) * 100 : 0;
                  
                  if (catTotal === 0) return null;

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-slate-600">{cat}</span>
                        <span className="text-slate-900">${catTotal.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className="h-full bg-indigo-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                      <th className="pb-3">Category</th>
                      <th className="pb-3 text-right">Count</th>
                      <th className="pb-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenseCategories.map(cat => {
                      const catExpenses = filteredExpenses.filter(e => e.category === cat);
                      const catTotal = catExpenses.reduce((sum, e) => sum + e.amount, 0);
                      if (catTotal === 0) return null;
                      return (
                        <tr key={cat} className="text-slate-600">
                          <td className="py-3 font-bold">{cat}</td>
                          <td className="py-3 text-right">{catExpenses.length}</td>
                          <td className="py-3 text-right font-black text-slate-900">${catTotal.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Expenses</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search description, category..." 
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="w-48 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice #</label>
          <input 
            type="text" 
            placeholder="INV-001" 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all font-mono"
            value={filterInvoiceNumber}
            onChange={e => setFilterInvoiceNumber(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
          <input 
            type="date" 
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all" 
            value={filterStartDate} 
            onChange={e => setFilterStartDate(e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
          <input 
            type="date" 
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all" 
            value={filterEndDate} 
            onChange={e => setFilterEndDate(e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
          <select 
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all" 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option>All Categories</option>
            {expenseCategories.map(cat => <option key={cat}>{cat}</option>)}
          </select>
        </div>

        <button 
          onClick={() => {
            setFilterStartDate('');
            setFilterEndDate('');
            setFilterCategory('All Categories');
            setFilterInvoiceNumber('');
            setSearchQuery('');
          }}
          className="px-4 py-3 text-slate-400 hover:text-rose-600 font-bold text-sm transition-colors"
        >
          Clear
        </button>
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
              <th 
                className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center">DATE <SortIcon field="date" /></div>
              </th>
              <th 
                className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('invoiceNumber')}
              >
                <div className="flex items-center">INVOICE # <SortIcon field="invoiceNumber" /></div>
              </th>
              <th 
                className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center">CATEGORY <SortIcon field="category" /></div>
              </th>
              <th 
                className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('description')}
              >
                <div className="flex items-center">DESCRIPTION <SortIcon field="description" /></div>
              </th>
              <th 
                className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center">AMOUNT <SortIcon field="amount" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center animate-pulse">Loading expenses...</td></tr>
            ) : filteredExpenses.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No expenses found</td></tr>
            ) : (
              filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">{expense.date}</td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">{expense.invoiceNumber || '---'}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{expense.category}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{expense.description}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">${expense.amount.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                  <Plus className="w-6 h-6" />
                  <h2 className="text-2xl font-black tracking-tight">Add New Expense</h2>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddExpense} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Date</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                      value={newExpense.date}
                      onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Invoice Number</label>
                    <input
                      type="text"
                      placeholder="INV-001"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-mono"
                      value={newExpense.invoiceNumber}
                      onChange={e => setNewExpense({...newExpense, invoiceNumber: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Category</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                    value={newExpense.category}
                    onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Amount</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                    value={newExpense.amount}
                    onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea
                    required
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all resize-none"
                    value={newExpense.description}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  Save Expense
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
