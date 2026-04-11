import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Student, Fee, Attendance, ExamResult } from '../types';
import { 
  FileText, 
  Download, 
  Filter, 
  Users, 
  Wallet, 
  CheckSquare, 
  GraduationCap,
  Loader2,
  Printer
} from 'lucide-react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportsProps {
  profile: UserProfile | null;
}

export default function Reports({ profile }: ReportsProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'finance' | 'attendance' | 'academic'>('students');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [activeTab]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'students') {
        const q = query(collection(db, 'students'), orderBy('name'));
        const snap = await getDocs(q);
        setReportData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else if (activeTab === 'finance') {
        const q = query(collection(db, 'fees'), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        setReportData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else if (activeTab === 'attendance') {
        const q = query(collection(db, 'attendance'), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        setReportData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else if (activeTab === 'academic') {
        const q = query(collection(db, 'results'), orderBy('term', 'desc'));
        const snap = await getDocs(q);
        setReportData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    setGeneratingPDF(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${activeTab}_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const renderStudentReport = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-4 font-semibold text-slate-600">Name</th>
            <th className="p-4 font-semibold text-slate-600">Parent/Guardian</th>
            <th className="p-4 font-semibold text-slate-600">Roll Number</th>
            <th className="p-4 font-semibold text-slate-600">Class</th>
            <th className="p-4 font-semibold text-slate-600">Status</th>
          </tr>
        </thead>
        <tbody>
          {reportData.map((student: any) => (
            <tr key={student.id} className="border-b border-slate-100">
              <td className="p-4">{student.name}</td>
              <td className="p-4">{student.parentName || '-'}</td>
              <td className="p-4">{student.rollNumber}</td>
              <td className="p-4">{student.class} - {student.section}</td>
              <td className="p-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {student.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderFinanceReport = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-4 font-semibold text-slate-600">Date</th>
            <th className="p-4 font-semibold text-slate-600">Receipt No</th>
            <th className="p-4 font-semibold text-slate-600">Amount</th>
            <th className="p-4 font-semibold text-slate-600">Status</th>
          </tr>
        </thead>
        <tbody>
          {reportData.map((fee: any) => (
            <tr key={fee.id} className="border-b border-slate-100">
              <td className="p-4">{fee.date}</td>
              <td className="p-4">{fee.receiptNumber || 'N/A'}</td>
              <td className="p-4">${fee.amount}</td>
              <td className="p-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${fee.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {fee.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAttendanceReport = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-4 font-semibold text-slate-600">Date</th>
            <th className="p-4 font-semibold text-slate-600">Target ID</th>
            <th className="p-4 font-semibold text-slate-600">Type</th>
            <th className="p-4 font-semibold text-slate-600">Status</th>
          </tr>
        </thead>
        <tbody>
          {reportData.map((record: any) => (
            <tr key={record.id} className="border-b border-slate-100">
              <td className="p-4">{record.date}</td>
              <td className="p-4">{record.targetId}</td>
              <td className="p-4 capitalize">{record.targetType}</td>
              <td className="p-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  record.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                  record.status === 'late' ? 'bg-amber-100 text-amber-700' : 
                  'bg-rose-100 text-rose-700'
                }`}>
                  {record.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAcademicReport = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-4 font-semibold text-slate-600">Term</th>
            <th className="p-4 font-semibold text-slate-600">Exam Type</th>
            <th className="p-4 font-semibold text-slate-600">Percentage</th>
            <th className="p-4 font-semibold text-slate-600">Grade</th>
          </tr>
        </thead>
        <tbody>
          {reportData.map((result: any) => (
            <tr key={result.id} className="border-b border-slate-100">
              <td className="p-4">{result.term}</td>
              <td className="p-4">{result.examType}</td>
              <td className="p-4">{result.percentage}%</td>
              <td className="p-4 font-bold">{result.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 text-sm">Generate and export comprehensive school reports</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            disabled={loading || reportData.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 print:hidden"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
          <button
            onClick={exportToPDF}
            disabled={generatingPDF || loading || reportData.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 print:hidden"
          >
            {generatingPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Export PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {[
          { id: 'students', label: 'Student Report', icon: Users },
          { id: 'finance', label: 'Financial Report', icon: Wallet },
          { id: 'attendance', label: 'Attendance Report', icon: CheckSquare },
          { id: 'academic', label: 'Academic Report', icon: GraduationCap },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 print:shadow-none print:border-none print:p-0">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div ref={reportRef} className="bg-white p-4">
            <div className="mb-6 text-center border-b border-slate-200 pb-4">
              <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">
                {activeTab} Report
              </h2>
              <p className="text-slate-500 mt-1">Generated on {new Date().toLocaleDateString()}</p>
            </div>
            
            {reportData.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No data available for this report.
              </div>
            ) : (
              <>
                {activeTab === 'students' && renderStudentReport()}
                {activeTab === 'finance' && renderFinanceReport()}
                {activeTab === 'attendance' && renderAttendanceReport()}
                {activeTab === 'academic' && renderAcademicReport()}
              </>
            )}
            
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between text-sm text-slate-500">
              <span>Total Records: {reportData.length}</span>
              <span>EduManage Pro System</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
