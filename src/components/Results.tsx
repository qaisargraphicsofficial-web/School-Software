import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, ExamResult, UserProfile, ExamPaper } from '../types';
import { Search, FileText, Calendar, Award, Download, Eye, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '../lib/utils';
import { doc, getDoc } from 'firebase/firestore';

export default function Results({ profile }: { profile: UserProfile | null }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [examPapers, setExamPapers] = useState<Record<string, ExamPaper>>({});
  const [selectedPaper, setSelectedPaper] = useState<ExamPaper | null>(null);
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
      const resultsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult));
      setResults(resultsData);

      // Fetch linked papers
      const paperIds = new Set<string>();
      resultsData.forEach(r => {
        if (r.examPaperIds) {
          Object.values(r.examPaperIds).forEach(id => {
            if (id) paperIds.add(id);
          });
        }
      });

      const papersMap: Record<string, ExamPaper> = {};
      await Promise.all(Array.from(paperIds).map(async (id) => {
        const paperDoc = await getDoc(doc(db, 'exam_papers', id));
        if (paperDoc.exists()) {
          papersMap[id] = { id: paperDoc.id, ...paperDoc.data() } as ExamPaper;
        }
      }));
      setExamPapers(papersMap);
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
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent/Guardian</th>
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
                        <div className="font-medium text-slate-900">{student ? student.name : 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{student?.class}</div>
                      </td>
                      <td className="p-4 text-sm text-slate-700">{student?.parentName || '-'}</td>
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
                        <div className="flex items-center justify-end gap-2">
                          {result.examPaperIds && Object.values(result.examPaperIds).some(id => id) && (
                            <div className="flex gap-1">
                              {Object.entries(result.examPaperIds).map(([subject, paperId]) => (
                                paperId && (
                                  <button
                                    key={subject}
                                    onClick={() => setSelectedPaper(examPapers[paperId])}
                                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title={`View ${subject} Paper`}
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                )
                              ))}
                            </div>
                          )}
                          <button 
                            onClick={() => generateReportCard(result)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Download Report Card"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Paper Modal */}
      <AnimatePresence>
        {selectedPaper && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedPaper(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedPaper.title}</h2>
                  <p className="text-slate-500">{selectedPaper.subject} • Class {selectedPaper.class} • {selectedPaper.duration} mins</p>
                </div>
                <button onClick={() => setSelectedPaper(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8">
                {selectedPaper.questions.map((q, idx) => (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-start gap-4">
                      <span className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-slate-900 font-medium text-lg mb-4">{q.question}</p>
                        
                        {q.type === 'mcq' && q.options && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-400">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="text-slate-700">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {q.answer && (
                          <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Correct Answer / Key Points</p>
                            <p className="text-emerald-800 text-sm">{q.answer}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
