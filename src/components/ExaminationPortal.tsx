import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, ExamResult, UserProfile, ExamPaper } from '../types';
import { 
  Search, 
  Download, 
  Save,
  Loader2,
  Paperclip,
  ExternalLink,
  XCircle,
  GraduationCap,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ReportCard } from './ReportCard';

interface ExaminationPortalProps {
  profile: UserProfile | null;
}

export default function ExaminationPortal({ profile }: ExaminationPortalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState('10th');
  const [selectedTerm, setSelectedTerm] = useState('First Term');
  const [examType, setExamType] = useState('Monthly Test - April');
  const [marks, setMarks] = useState<Record<string, Record<string, number>>>({});
  const [submittedPapers, setSubmittedPapers] = useState<Record<string, Record<string, string>>>({});
  const [examPaperIds, setExamPaperIds] = useState<Record<string, Record<string, string>>>({});
  const [examPapers, setExamPapers] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [linkingPaper, setLinkingPaper] = useState<{ studentId: string, subject: string } | null>(null);
  const [paperUrlInput, setPaperUrlInput] = useState('');
  const reportCardRef = useRef<HTMLDivElement>(null);

  const subjects = ['Mathematics', 'Science', 'English', 'History', 'Geography'];

  useEffect(() => {
    if (profile) {
      fetchStudents();
      fetchExamPapers();
    }
  }, [selectedClass, profile]);

  const fetchExamPapers = async () => {
    try {
      const q = query(collection(db, 'exam_papers'), where('class', '==', selectedClass));
      const snap = await getDocs(q);
      setExamPapers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamPaper)));
    } catch (error) {
      console.error("Error fetching exam papers:", error);
    }
  };

  useEffect(() => {
    if (students.length > 0) {
      fetchExistingResults();
    }
  }, [students, selectedTerm, examType]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'students'), where('class', '==', selectedClass));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingResults = async () => {
    try {
      const q = query(
        collection(db, 'results'), 
        where('term', '==', selectedTerm),
        where('examType', '==', examType)
      );
      const snap = await getDocs(q);
      const existingMarks: Record<string, Record<string, number>> = {};
      const existingPapers: Record<string, Record<string, string>> = {};
      const existingInternalPapers: Record<string, Record<string, string>> = {};
      
      // Initialize with 0s first
      students.forEach(s => {
        existingMarks[s.id!] = subjects.reduce((acc, sub) => ({ ...acc, [sub]: 0 }), {});
        existingPapers[s.id!] = {};
        existingInternalPapers[s.id!] = {};
      });

      // Overlay existing data
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (existingMarks[data.studentId]) {
          existingMarks[data.studentId] = data.marks;
          if (data.submittedPapers) {
            existingPapers[data.studentId] = data.submittedPapers;
          }
          if (data.examPaperIds) {
            existingInternalPapers[data.studentId] = data.examPaperIds;
          }
        }
      });
      
      setMarks(existingMarks);
      setSubmittedPapers(existingPapers);
      setExamPaperIds(existingInternalPapers);
    } catch (error) {
      console.error("Error fetching existing results:", error);
    }
  };

  const EXAM_WEIGHTS: Record<string, number> = {
    'Monthly Test': 10,
    'Mid Term': 30,
    'Final Term': 60,
    'First Term': 40,
    'Second Term': 60,
    'Class Test': 5
  };

  const saveResults = async () => {
    setSaving(true);
    try {
      const weightage = EXAM_WEIGHTS[examType] || 100;

      const promises = Object.entries(marks).map(([studentId, studentMarks]) => {
        const total = Object.values(studentMarks).reduce((a, b) => (a as number) + (b as number), 0) as number;
        const percentage = (total / (subjects.length * 100)) * 100;
        
        let grade = 'F';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B';
        else if (percentage >= 60) grade = 'C';
        else if (percentage >= 50) grade = 'D';

        const resultId = `${studentId}_${selectedTerm}_${examType.replace(/\s+/g, '_')}`;
        return setDoc(doc(db, 'results', resultId), {
          studentId,
          examType,
          term: selectedTerm,
          marks: studentMarks,
          submittedPapers: submittedPapers[studentId] || {},
          examPaperIds: examPaperIds[studentId] || {},
          totalMarks: total,
          percentage: parseFloat(percentage.toFixed(2)),
          grade,
          position: 0,
          weightage,
          campusId: profile?.campusId || 'main',
          updatedAt: new Date().toISOString()
        });
      });
      await Promise.all(promises);
      alert(`Results saved successfully! (Weightage: ${weightage}%)`);
    } catch (error) {
      console.error("Error saving results:", error);
      alert('Failed to save results.');
    } finally {
      setSaving(false);
    }
  };

  const generateReportCard = async (student: Student) => {
    setSelectedStudentForReport(student);
    setTimeout(async () => {
      if (reportCardRef.current) {
        const canvas = await html2canvas(reportCardRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${student.name}_Report.pdf`);
        setSelectedStudentForReport(null);
      }
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Examination Portal</h1>
          <p className="text-slate-500 text-sm">Enter marks and manage student results</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5 flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Class</span>
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option>9th</option>
            <option>10th</option>
            <option>11th</option>
            <option>12th</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Term</span>
          <select 
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option>First Term</option>
            <option>Mid Term</option>
            <option>Final Term</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Exam</span>
          <input 
            type="text"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Parent/Guardian</th>
                {subjects.map(sub => (
                  <th key={sub} className="px-6 py-4 text-sm font-semibold text-slate-600">{sub}</th>
                ))}
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={subjects.length + 3} className="px-6 py-8 text-center animate-pulse text-slate-400 font-medium">Loading students...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={subjects.length + 3} className="px-6 py-8 text-center text-slate-400 font-medium">No students found for this class.</td></tr>
              ) : students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-slate-900">{student.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Roll: {student.rollNumber}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{student.parentName || '-'}</td>
                  {subjects.map(sub => (
                    <td key={sub} className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          max={100}
                          min={0}
                          className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={marks[student.id!]?.[sub] || 0}
                          onChange={(e) => setMarks({
                            ...marks,
                            [student.id!]: { ...marks[student.id!], [sub]: Number(e.target.value) }
                          })}
                        />
                        <button
                          onClick={() => {
                            setLinkingPaper({ studentId: student.id!, subject: sub });
                            setPaperUrlInput(submittedPapers[student.id!]?.[sub] || '');
                          }}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            submittedPapers[student.id!]?.[sub] || examPaperIds[student.id!]?.[sub]
                              ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100" 
                              : "text-slate-400 hover:bg-slate-100"
                          )}
                          title={submittedPapers[student.id!]?.[sub] || examPaperIds[student.id!]?.[sub] ? "View/Edit Linked Paper" : "Link Submitted Paper"}
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => generateReportCard(student)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Download Report Card"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-6 border-t border-slate-100 flex justify-end">
            <button 
              onClick={saveResults}
              disabled={saving || students.length === 0}
              className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Submit All Results
            </button>
          </div>
        </div>
      </div>
      
      {/* Hidden Report Card for PDF generation */}
      {selectedStudentForReport && (
        <div className="hidden">
          <div ref={reportCardRef}>
            <ReportCard 
              student={selectedStudentForReport} 
              marks={marks[selectedStudentForReport.id!]} 
              term={selectedTerm} 
              examType={examType} 
            />
          </div>
        </div>
      )}

      {/* Link Paper Modal */}
      <AnimatePresence>
        {linkingPaper && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setLinkingPaper(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Link Exam Paper</h2>
                </div>
                <button onClick={() => setLinkingPaper(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-sm text-slate-600">
                  Linking paper for <span className="font-bold text-slate-900">{linkingPaper.subject}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Internal Exam Paper</label>
                <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <select
                    value={examPaperIds[linkingPaper.studentId]?.[linkingPaper.subject] || ''}
                    onChange={(e) => {
                      setExamPaperIds({
                        ...examPaperIds,
                        [linkingPaper.studentId]: {
                          ...examPaperIds[linkingPaper.studentId],
                          [linkingPaper.subject]: e.target.value
                        }
                      });
                    }}
                    className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none w-full"
                  >
                    <option value="">Select Internal Paper</option>
                    {examPapers
                      .filter(p => p.subject === linkingPaper.subject)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.title} ({p.date})</option>
                      ))
                    }
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Link a paper created in the Exams section</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">External Document URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/paper.pdf"
                    value={paperUrlInput}
                    onChange={(e) => setPaperUrlInput(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  {paperUrlInput && (
                    <a 
                      href={paperUrlInput} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-2xl flex items-center justify-center transition-colors"
                      title="Open Link"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Link a scanned copy or external PDF</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    setSubmittedPapers({
                      ...submittedPapers,
                      [linkingPaper.studentId]: {
                        ...submittedPapers[linkingPaper.studentId],
                        [linkingPaper.subject]: ''
                      }
                    });
                    setExamPaperIds({
                      ...examPaperIds,
                      [linkingPaper.studentId]: {
                        ...examPaperIds[linkingPaper.studentId],
                        [linkingPaper.subject]: ''
                      }
                    });
                    setLinkingPaper(null);
                  }} 
                  className="flex-1 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors"
                >
                  Remove All Links
                </button>
                <button 
                  onClick={() => {
                    setSubmittedPapers({
                      ...submittedPapers,
                      [linkingPaper.studentId]: {
                        ...submittedPapers[linkingPaper.studentId],
                        [linkingPaper.subject]: paperUrlInput
                      }
                    });
                    setLinkingPaper(null);
                  }} 
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                >
                  Save Links
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
