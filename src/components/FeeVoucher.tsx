import React from 'react';
import { FeeRecord, Student, FeeType, SchoolSettings } from '../types';

interface VoucherProps {
  feeRecord: FeeRecord;
  student: Student;
  feeType: FeeType;
  settings?: SchoolSettings;
}

export const VoucherSection = ({ feeRecord, student, feeType, title, settings }: VoucherProps & { title: string }) => {
  const currencySymbol = settings?.currency === 'PKR' ? 'Rs. ' : (settings?.currency === 'GBP' ? '£ ' : (settings?.currency === 'EUR' ? '€ ' : (settings?.currency === 'INR' ? '₹ ' : '$')));
  const fontFamily = settings?.voucherSettings?.fontFamily || 'monospace';

  return (
    <div className="border border-slate-400 p-4 text-xs bg-white flex-1 break-inside-avoid" style={{ fontFamily }}>
      <div className="text-center font-bold text-sm border-b border-slate-300 pb-2 mb-2 uppercase tracking-wide">
        {settings?.schoolName || 'School Name'}
      </div>
      
      <div className="flex justify-between font-bold pb-2 mb-2 border-b border-slate-200">
        <span className="bg-slate-800 text-white px-2 py-0.5 rounded-sm">{title}</span>
        <span>Voucher #: {feeRecord.id.substring(0, 8).toUpperCase()}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4 text-[11px]">
        <div><span className="text-slate-500 font-semibold">Student:</span> {student.name}</div>
        <div><span className="text-slate-500 font-semibold">Father:</span> {student.parentName || 'N/A'}</div>
        <div><span className="text-slate-500 font-semibold">Class:</span> {student.class}</div>
        <div><span className="text-slate-500 font-semibold">Section:</span> {student.section || 'N/A'}</div>
        <div><span className="text-slate-500 font-semibold">Roll No:</span> {student.rollNumber}</div>
        <div><span className="text-slate-500 font-semibold">Due Date:</span> {feeRecord.dueDate}</div>
      </div>

      <div className="border border-slate-300 rounded mb-4">
        <div className="bg-slate-100 flex justify-between font-bold p-1.5 border-b border-slate-300">
          <span>Particulars</span>
          <span>Amount</span>
        </div>
        <div className="flex justify-between p-1.5">
          <span>Tuition & General Fee ({feeType.name})</span>
          <span>{currencySymbol}{feeRecord.amount}</span>
        </div>
        <div className="flex justify-between p-1.5">
          <span>Examination Fee</span>
          <span>{currencySymbol}0</span>
        </div>
        <div className="flex justify-between p-1.5">
          <span>Other Charges</span>
          <span>{currencySymbol}0</span>
        </div>
        <div className="bg-slate-50 flex justify-between font-bold p-1.5 border-t border-slate-300">
          <span>Total Payable</span>
          <span>{currencySymbol}{feeRecord.amount}</span>
        </div>
      </div>

      {settings?.voucherSettings?.bankAccounts && settings.voucherSettings.bankAccounts.length > 0 ? (
        <div className="mt-2 text-[10px] text-slate-800 bg-slate-50 p-2 border border-slate-200 rounded">
          <div className="font-bold border-b border-slate-200 pb-1 mb-1">Payment Methods</div>
          <ul className="space-y-1">
            {settings.voucherSettings.bankAccounts.map((acc, i) => (
              <li key={i}>
                <span className="font-bold">{acc.bankName}:</span> {acc.accountTitle} <br/>
                <span className="text-slate-600 font-mono text-[9px]">{acc.accountNumber}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : settings?.bankAccountDetails ? (
        <div className="mt-2 text-[10px] text-slate-800 bg-slate-50 p-2 border border-slate-200 rounded">
          <span className="font-bold">Payment Methods:</span> {settings.bankAccountDetails}
        </div>
      ) : null}

      {(settings?.voucherSettings?.customNote || settings?.customPaymentNote) && (
        <div className="mt-2 text-[10px] text-slate-700 italic text-center p-1.5 bg-amber-50/50 rounded border border-amber-100/50">
          * {settings?.voucherSettings?.customNote || settings?.customPaymentNote}
        </div>
      )}
    </div>
  );
};

export const FeeVoucher = ({ feeRecord, student, feeType, settings }: VoucherProps) => (
  <div className="w-full mb-6 break-inside-avoid">
    <div className="flex flex-col md:flex-row gap-4 border-2 border-slate-600 p-2 bg-white print:border-black rounded-lg">
      <VoucherSection feeRecord={feeRecord} student={student} feeType={feeType} settings={settings} title="School Copy" />
      <div className="hidden md:block w-px border-l-2 border-dashed border-slate-400 print:border-black" />
      <div className="md:hidden h-px border-t-2 border-dashed border-slate-400 print:border-black" />
      <VoucherSection feeRecord={feeRecord} student={student} feeType={feeType} settings={settings} title="Parent Copy" />
    </div>
  </div>
);

export const FeeVoucherList = React.forwardRef<HTMLDivElement, { records: { feeRecord: FeeRecord, student: Student, feeType: FeeType }[], settings?: SchoolSettings }>(({ records, settings }, ref) => {
  return (
    <div ref={ref} className="p-4 print:p-0 max-w-5xl mx-auto">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; }
          .break-inside-avoid { page-break-inside: avoid; }
          .break-after-page { page-break-after: always; }
        }
      `}</style>
      
      <div className="space-y-6">
        {records.map((r, i) => (
          <React.Fragment key={r.feeRecord.id}>
            <FeeVoucher {...r} settings={settings} />
            {settings?.voucherSettings?.vouchersPerPage && 
             (i + 1) % settings.voucherSettings.vouchersPerPage === 0 && 
             i !== records.length - 1 && (
              <div className="break-after-page print:block" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});
