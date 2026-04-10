import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, ExamResult, UserProfile } from '../types';
import { Search, FileText, Calendar, Award, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '../lib/utils';

export default function Results({ profile }: { profile: UserProfile | null }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [resultFilters, setResultFilters] = useState({
    studentId: '',
    examType: '',
    term: ''
  });
  const [loading, setLoading] = useState(true);
  const reportCardRef = useRef<HTMLDivElement>(null);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  useEffect(() => {
    fetchStudents();
    fetchResults();
  }, []);

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, 'students'));
      const snap = await getDocs(q);
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchResults = async () => {
    try {
      const q = query(collection(db, 'results'));
      const snap = await getDocs(q);
      setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult)));
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(result => {
    if (resultFilters.studentId && result.studentId !== resultFilters.studentId) return false;
    if (resultFilters.examType && result.examType !== resultFilters.examType) return false;
    if (resultFilters.term && result.term !== resultFilters.term) return false;
    return true;
  });

  const generateReportCard = async (result: ExamResult) => {
    setSelectedResult(result);
    setTimeout(async () => {
      if (reportCardRef.current) {
        try {
          const canvas = await html2canvas(reportCardRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          const student = students.find(s => s.id === result.studentId);
          pdf.save(`Report_Card_${student?.name || 'Student'}_${result.term}.pdf`);
        } catch (error) {
          console.error("Error generating report card:", error);
          alert("Failed to generate report card PDF.");
        } finally {
          setSelectedResult(null);
        }
      }
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Results</h1>
        <p className="text-slate-500 text-sm">View and download student exam results</p>
      </div>

      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <select
            value={resultFilters.studentId}
            onChange={(e) => setResultFilters({...resultFilters, studentId: e.target.value})}
            className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none w-full"
          >
            <option value="">All Students</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} S/O {s.parentName} ({s.class})</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex-1 min-w-[200px]">
          <FileText className="w-4 h-4 text-slate-400" />
          <select
            value={resultFilters.examType}
            onChange={(e) => setResultFilters({...resultFilters, examType: e.target.value})}
            className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none w-full"
          >
            <option value="">All Exam Types</option>
            {Array.from(new Set(results.map(r => r.examType))).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex-1 min-w-[200px]">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={resultFilters.term}
            onChange={(e) => setResultFilters({...resultFilters, term: e.target.value})}
            className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none w-full"
          >
            <option value="">All Terms</option>
            {Array.from(new Set(results.map(r => r.term))).map(term => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
        </div>
        {(resultFilters.studentId || resultFilters.examType || resultFilters.term) && (
          <button
            onClick={() => setResultFilters({ studentId: '', examType: '', term: '' })}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Exam Type</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Term</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Marks</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grade</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Position</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">No results found matching your filters.</td>
                </tr>
              ) : (
                filteredResults.map(result => {
                  const student = students.find(s => s.id === result.studentId);
                  const obtainedMarks = Object.values(result.marks || {}).reduce((a: number, b: number) => a + b, 0);
                  return (
                    <tr key={result.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{student ? `${student.name} S/O ${student.parentName}` : 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{student?.class}</div>
                      </td>
                      <td className="p-4 text-sm text-slate-700">{result.examType}</td>
                      <td className="p-4 text-sm text-slate-700">{result.term}</td>
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{obtainedMarks} / {result.totalMarks}</div>
                        <div className="text-xs text-slate-500">{result.percentage.toFixed(1)}%</div>
                      </td>
                      <td className="p-4">
                        <span className={cn("px-2 py-1 rounded-lg text-xs font-bold", 
                          result.grade === 'A+' || result.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                          result.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                          result.grade === 'C' ? 'bg-amber-100 text-amber-700' :
                          result.grade === 'D' ? 'bg-orange-100 text-orange-700' :
                          'bg-rose-100 text-rose-700'
                        )}>
                          {result.grade}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-900">{result.position}</td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => generateReportCard(result)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
