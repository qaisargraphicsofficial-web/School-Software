import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Plus, Search, Calendar, Download, FileText, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface FeesProps {
  profile: UserProfile | null;
}

export default function Fees({ profile }: FeesProps) {
  const [activeTab, setActiveTab] = useState<'payments' | 'feeTypes' | 'defaulters'>('payments');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fee Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage fee structures and collect payments</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm">
            <Plus className="w-4 h-4" />
            Add Fee Type
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm shadow-sm">
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        </div>
      </div>

      <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-medium">
        Create a fee structure first
      </div>

      <div className="flex gap-2 p-1 bg-slate-100/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('payments')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'payments' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Payments
        </button>
        <button
          onClick={() => setActiveTab('feeTypes')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'feeTypes' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Fee Types
        </button>
        <button
          onClick={() => setActiveTab('defaulters')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'defaulters' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Defaulters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">TOTAL DUE</p>
          <h3 className="text-xl font-bold text-slate-900">PKR 0</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">COLLECTED</p>
          <h3 className="text-xl font-bold text-emerald-600">PKR 0</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">PAID</p>
          <h3 className="text-xl font-bold text-slate-900">0 <span className="text-slate-400 text-sm font-medium">/ 0</span></h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">PENDING</p>
          <h3 className="text-xl font-bold text-amber-500">0</h3>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-slate-900">Collection Progress</h3>
          <span className="text-lg font-bold text-slate-900">0%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '0%' }}></div>
        </div>
        <div className="flex justify-between text-xs text-slate-400 font-medium">
          <span>PKR 0 collected</span>
          <span>PKR 0 total</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            
            <div className="relative">
              <select className="appearance-none pl-4 pr-10 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                <option>Class 1 A</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select className="appearance-none pl-4 pr-10 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                <option>Paid</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <div className="flex items-center pl-4 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white">
                <span className="mr-4">March 2026</span>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border-2 border-slate-900 text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
              Generate Fees
            </button>
            <button className="px-4 py-2 bg-[#00a669] text-white rounded-lg text-sm font-bold hover:bg-[#008f5a] transition-colors">
              Export Excel
            </button>
            <button className="px-4 py-2 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">STUDENT</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">FEE</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">PERIOD</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOTAL DUE</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">PAID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">STATUS</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">RECEIPT</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">PRINT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                  No fee records found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
