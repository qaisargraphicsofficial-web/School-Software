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

  // Apply font family mapping
  const getFontFamily = () => {
    return fontFamily;
  };

  return (
    <div 
      className="border border-slate-400 p-3 text-[10px] bg-white flex-1 break-inside-avoid flex flex-col h-full" 
      style={{ fontFamily: getFontFamily() }}
    >
      <div className="text-center font-bold text-xs border-b border-slate-300 pb-1.5 mb-1.5 uppercase tracking-wide flex items-center justify-center gap-2">
        {settings?.logoUrl && <img src={settings.logoUrl} alt="" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />}
        <span>{settings?.schoolName || 'School Name'}</span>
      </div>
      
      <div className="flex justify-between font-bold pb-1.5 mb-1.5 border-b border-slate-200">
        <span className="bg-slate-800 text-white px-2 py-0.5 rounded-sm text-[9px]">{title}</span>
        <span>Voucher #: {feeRecord.id.substring(0, 8).toUpperCase()}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mb-2 text-[10px]">
        <div><span className="text-slate-500 font-semibold underline decoration-slate-200">Student:</span> <span className="font-bold">{student.name}</span></div>
        <div><span className="text-slate-500 font-semibold underline decoration-slate-200">Father:</span> {student.parentName || 'N/A'}</div>
        <div><span className="text-slate-500 font-semibold underline decoration-slate-200">Class:</span> {student.class}</div>
        <div><span className="text-slate-500 font-semibold underline decoration-slate-200">Section:</span> {student.section || 'N/A'}</div>
        <div><span className="text-slate-500 font-semibold underline decoration-slate-200">Roll No:</span> {student.rollNumber}</div>
        <div><span className="text-slate-500 font-semibold underline decoration-slate-200">Due Date:</span> <span className="text-rose-600 font-bold">{feeRecord.dueDate}</span></div>
      </div>

      <div className="border border-slate-300 rounded mb-2 overflow-hidden flex-1 min-h-0">
        <div className="bg-slate-100 flex justify-between font-bold p-1 border-b border-slate-300 text-[9px]">
          <span>Particulars</span>
          <span>Amount</span>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex justify-between p-1">
            <span>Tuition & General Fee ({feeType.name})</span>
            <span>{currencySymbol}{feeRecord.amount}</span>
          </div>
          <div className="flex justify-between p-1">
            <span>Examination Fee</span>
            <span>{currencySymbol}0</span>
          </div>
          <div className="flex justify-between p-1">
            <span>Other Charges</span>
            <span>{currencySymbol}0</span>
          </div>
        </div>
        <div className="bg-slate-50 flex justify-between font-bold p-1 border-t border-slate-300 mt-auto">
          <span>Total Payable</span>
          <span>{currencySymbol}{feeRecord.amount}</span>
        </div>
      </div>

      {settings?.voucherSettings?.bankAccounts && settings.voucherSettings.bankAccounts.length > 0 ? (
        <div className="mt-1 text-[9px] text-slate-800 bg-slate-50 p-1.5 border border-slate-200 rounded">
          <div className="font-bold border-b border-slate-200 pb-0.5 mb-1 text-[8px] uppercase tracking-tighter">Payment Methods</div>
          <div className="grid grid-cols-1 gap-0.5">
            {settings.voucherSettings.bankAccounts.map((acc, i) => (
              <div key={i} className="flex justify-between gap-1 leading-tight">
                <span className="font-bold truncate max-w-[120px]">{acc.bankName}:</span>
                <span className="text-slate-600 font-mono text-[8px] text-right">{acc.accountNumber}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {(settings?.voucherSettings?.customNote || settings?.customPaymentNote) && (
        <div className="mt-1 text-[8px] text-slate-700 italic text-center p-1 bg-amber-50/50 rounded border border-amber-100/50 leading-tight">
          * {settings?.voucherSettings?.customNote || settings?.customPaymentNote}
        </div>
      )}
    </div>
  );
};

export const FeeVoucher = ({ feeRecord, student, feeType, settings }: VoucherProps) => {
  const vouchersPerPage = settings?.voucherSettings?.vouchersPerPage || 3;
  const showStudent = settings?.voucherSettings?.showStudentCopy !== false; // Default to true
  const showSchool = settings?.voucherSettings?.showSchoolCopy !== false;   // Default to true
  const showBank = settings?.voucherSettings?.showBankCopy === true;        // Default to false
  
  // Calculate height based on 297mm (A4 height) minus margins, divided by vouchers per page
  // A4 = 297mm. If 20mm margin total, we have 277mm.
  // 3 per page = 92mm each approx.
  // We'll use a dynamic style for print
  
  return (
    <div 
      className="w-full break-inside-avoid print:mb-0" 
      style={{ 
        height: vouchersPerPage === 1 ? 'auto' : undefined,
        // @ts-ignore - printing custom height
        '--voucher-height': `calc((100vh - 20mm) / ${vouchersPerPage})`
      } as any}
    >
      <div className="flex flex-col md:flex-row gap-2 border-2 border-slate-600 p-1.5 bg-white print:border-black rounded-lg h-full max-h-[var(--voucher-height)] mb-4 print:mb-0">
        {showSchool && (
          <VoucherSection feeRecord={feeRecord} student={student} feeType={feeType} settings={settings} title="School Copy" />
        )}
        {showSchool && (showStudent || showBank) && (
          <>
            <div className="hidden md:block w-px border-l-2 border-dashed border-slate-400 print:border-black" />
            <div className="md:hidden h-px border-t-2 border-dashed border-slate-400 print:border-black" />
          </>
        )}
        {showStudent && (
          <VoucherSection feeRecord={feeRecord} student={student} feeType={feeType} settings={settings} title="Student Copy" />
        )}
        {showStudent && showBank && (
          <>
            <div className="hidden md:block w-px border-l-2 border-dashed border-slate-400 print:border-black" />
            <div className="md:hidden h-px border-t-2 border-dashed border-slate-400 print:border-black" />
          </>
        )}
        {showBank && (
          <VoucherSection feeRecord={feeRecord} student={student} feeType={feeType} settings={settings} title="Bank Copy" />
        )}
      </div>
    </div>
  );
};

export const FeeVoucherList = React.forwardRef<HTMLDivElement, { records: { feeRecord: FeeRecord, student: Student, feeType: FeeType }[], settings?: SchoolSettings }>(({ records, settings }, ref) => {
  const vouchersPerPage = settings?.voucherSettings?.vouchersPerPage || 3;

  return (
    <div ref={ref} className="p-4 print:p-0 max-w-5xl mx-auto">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; }
          .break-inside-avoid { page-break-inside: avoid; }
          .break-after-page { page-break-after: always; }
          
          .voucher-list-inner {
            display: flex;
            flex-direction: column;
            width: 100%;
          }
          
          .voucher-item {
             height: calc((100vh - 20mm) / ${vouchersPerPage});
             box-sizing: border-box;
             padding: 2mm 0;
          }
        }
      `}</style>
      
      <div className="space-y-6 print:space-y-0 voucher-list-inner">
        {records.map((r, i) => (
          <React.Fragment key={r.feeRecord.id}>
            <div className="voucher-item">
              <FeeVoucher {...r} settings={settings} />
            </div>
            {vouchersPerPage > 0 && (i + 1) % vouchersPerPage === 0 && i !== records.length - 1 && (
              <div className="break-after-page print:block" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});
