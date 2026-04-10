import React from 'react';
import { FeeRecord, Student, PaymentHistory } from '../types';

interface FeeReceiptProps {
  feeRecord: FeeRecord;
  student: Student;
  payment: PaymentHistory;
}

export const FeeReceipt: React.FC<FeeReceiptProps> = ({ feeRecord, student, payment }) => {
  return (
    <div id="fee-receipt" className="p-8 bg-white w-[600px] border border-slate-200 shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Fee Receipt</h1>
        <p className="text-slate-500 text-sm">Academic Session 2026 - 2027</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
        <div>
          <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Receipt Number</p>
          <p className="font-bold text-slate-900">{payment.transactionId || 'N/A'}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Date</p>
          <p className="font-bold text-slate-900">{payment.date}</p>
        </div>
      </div>

      <div className="mb-8 p-4 bg-slate-50 rounded-2xl">
        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-2">Student Details</p>
        <p className="font-bold text-slate-900 text-lg">{student.name}</p>
        <p className="text-slate-600">Roll No: {student.rollNumber} | Class: {student.class} - {student.section}</p>
      </div>

      <table className="w-full mb-8">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Fee Type</th>
            <th className="text-right py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-4 text-slate-900 font-medium">Fee Payment ({feeRecord.termOrYear})</td>
            <td className="py-4 text-right text-slate-900 font-bold">${payment.amount.toLocaleString()}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-900">
            <td className="py-4 text-slate-900 font-bold uppercase tracking-widest">Total Paid</td>
            <td className="py-4 text-right text-slate-900 font-black text-xl">${payment.amount.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div className="text-center text-slate-400 text-xs mt-12">
        <p>This is a computer-generated receipt and does not require a signature.</p>
      </div>
    </div>
  );
};
