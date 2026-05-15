import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, ExamResult, UserProfile, ExamPaper, ExamType, SchoolSettings, ClassGroup } from '../types';
import { Search, FileText, Calendar, Award, Download, Eye, XCircle, Upload, Check, AlertCircle, Loader2, Printer, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '../lib/utils';
import { doc, getDoc, addDoc, writeBatch, where } from 'firebase/firestore';
import Papa from 'papaparse';
import { ReportCard } from './ReportCard';

export default function Results({ profile }: { profile: UserProfile | null }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [examPapers, setExamPapers] = useState<Record<string, ExamPaper>>({});
  const [selectedPaper, setSelectedPaper] = useState<ExamPaper | null>(null);
  const [resultFilters, setResultFilters] = useState({
    studentId: '',
    examTypeId: '',
    class: '',
    section: ''
  });
  const [loading, setLoading] = useState(true);
  const reportCardRef = useRef<HTMLDivElement>(null);
  const bulkReportRef = useRef<HTMLDivElement>(null);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  // CSV Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    studentId: '',
    examTypeId: '',
    class: '',
    section: '',
    totalObtained: '',
    totalMax: '',
    percentage: '',
    grade: '',
    position: ''
  });
  const [isUploading, setIsUploading] = useState(false);

  // Manual Entry State
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryFilters, setEntryFilters] = useState({
    examTypeId: '',
    class: '',
    section: '',
    subject: '' // Optional, can be used for summary
  });
  const [entryMarks, setEntryMarks] = useState<Record<string, { obtained: string, total: string, grade: string }>>({});
  const [isSavingEntries, setIsSavingEntries] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchResults();
    fetchExamTypes();
    fetchClasses();
    fetchSchoolSettings();
  }, [profile]);

  const fetchClasses = async () => {
    try {
      const qConstraints = [where('campusId', '==', profile?.campusId || 'main')];
      if (profile?.schoolId) {
        qConstraints.push(where('schoolId', '==', profile.schoolId));
      }
      const q = query(collection(db, 'classes'), ...qConstraints);
      const snap = await getDocs(q);
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassGroup)));
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchSchoolSettings = async () => {
    try {
      const campusId = profile?.campusId || 'main';
      const qConstraints = [where('campusId', '==', campusId)];
      if (profile?.schoolId) {
        qConstraints.push(where('schoolId', '==', profile.schoolId));
      }
      const snap = await getDocs(query(collection(db, 'settings'), ...qConstraints));
      if (!snap.empty) {
        setSchoolSettings(snap.docs[0].data() as SchoolSettings);
      }
    } catch (error) {
      console.error("Error fetching school settings:", error);
    }
  };

  const fetchExamTypes = async () => {
    try {
      const qConstraints = [where('campusId', '==', profile?.campusId || 'main')];
      if (profile?.schoolId) {
        qConstraints.push(where('schoolId', '==', profile.schoolId));
      }
      const q = query(collection(db, 'exam_types'), ...qConstraints);
      const snap = await getDocs(q);
      setExamTypes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamType)));
    } catch (error) {
      console.error("Error fetching exam types:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      const qConstraints = [];
      if (profile?.schoolId) {
        qConstraints.push(where('schoolId', '==', profile.schoolId));
      }
      const q = query(collection(db, 'students'), ...qConstraints);
      const snap = await getDocs(q);
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchResults = async () => {
    try {
      const qConstraints = [];
      if (profile?.schoolId) {
        qConstraints.push(where('schoolId', '==', profile.schoolId));
      }
      const q = query(collection(db, 'exam_results'), ...qConstraints);
      const snap = await getDocs(q);
      const resultsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult));
      setResults(resultsData);
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(result => {
    if (resultFilters.studentId && result.studentId !== resultFilters.studentId) return false;
    if (resultFilters.examTypeId && result.examTypeId !== resultFilters.examTypeId) return false;
    if (resultFilters.class && result.class !== resultFilters.class) return false;
    if (resultFilters.section && result.section !== resultFilters.section) return false;
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
          pdf.save(`Report_Card_${student?.name || 'Student'}_${result.examTypeId}.pdf`);
        } catch (error) {
          console.error("Error generating report card:", error);
          alert("Failed to generate report card PDF.");
        } finally {
          setSelectedResult(null);
        }
      }
    }, 500);
  };

  const handleBulkDownload = async () => {
    if (filteredResults.length === 0) return;
    setIsBulkGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      for (let i = 0; i < filteredResults.length; i++) {
        const result = filteredResults[i];
        setSelectedResult(result);
        
        // Wait for render
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (reportCardRef.current) {
          const canvas = await html2canvas(reportCardRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/png');
          const imgProps = pdf.getImageProperties(imgData);
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }
      }
      
      pdf.save(`Bulk_Report_Cards_${resultFilters.examTypeId || 'Results'}.pdf`);
    } catch (error) {
      console.error("Bulk generation error:", error);
      alert("Failed to generate bulk report cards.");
    } finally {
      setSelectedResult(null);
      setIsBulkGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setCsvData(results.data);
          setCsvHeaders(Object.keys(results.data[0]));
          // Try to auto-map
          const newMapping = { ...columnMapping };
          const headers = Object.keys(results.data[0]);
          headers.forEach(header => {
            const h = header.toLowerCase().replace(/[^a-z]/g, '');
            if (h.includes('studentid') || h.includes('rollno') || h.includes('id')) newMapping.studentId = header;
            if (h.includes('examtype') || h.includes('exam')) newMapping.examTypeId = header;
            if (h.includes('class')) newMapping.class = header;
            if (h.includes('section')) newMapping.section = header;
            if (h.includes('totalobtained') || h.includes('obtained')) newMapping.totalObtained = header;
            if (h.includes('totalmax') || h.includes('total')) newMapping.totalMax = header;
            if (h.includes('percentage') || h.includes('percent')) newMapping.percentage = header;
            if (h.includes('grade')) newMapping.grade = header;
            if (h.includes('position') || h.includes('rank')) newMapping.position = header;
          });
          setColumnMapping(newMapping);
        }
      },
      error: (error) => {
        console.error("CSV Parsing Error:", error);
        alert("Failed to parse CSV file.");
      }
    });
  };

  const handleBulkUpload = async () => {
    if (!columnMapping.studentId || !columnMapping.examTypeId) {
      alert("Please map at least Student ID and Exam Type ID.");
      return;
    }

    setIsUploading(true);
    try {
      const batch = writeBatch(db);
      const campusId = profile?.campusId || 'main';

      csvData.forEach((row) => {
        const resultData: Omit<ExamResult, 'id'> = {
          studentId: row[columnMapping.studentId],
          examTypeId: row[columnMapping.examTypeId],
          class: row[columnMapping.class] || '',
          section: row[columnMapping.section] || '',
          totalObtained: Number(row[columnMapping.totalObtained]) || 0,
          totalMax: Number(row[columnMapping.totalMax]) || 0,
          percentage: Number(row[columnMapping.percentage]) || 0,
          grade: row[columnMapping.grade] || 'F',
          position: Number(row[columnMapping.position]) || 0,
          marks: {}, 
          campusId,
          schoolId: profile?.schoolId || '',
          updatedAt: new Date().toISOString()
        };
        const newDocRef = doc(collection(db, 'exam_results'));
        batch.set(newDocRef, resultData);
      });

      await batch.commit();
      alert(`Successfully uploaded ${csvData.length} results.`);
      setIsUploadModalOpen(false);
      setCsvData([]);
      fetchResults();
    } catch (error) {
      console.error("Error uploading results:", error);
      alert("Failed to upload results.");
    } finally {
      setIsUploading(false);
    }
  };

  const calculateGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  };

  const handleSaveManualMarks = async () => {
    if (!entryFilters.examTypeId || !entryFilters.class) {
      alert("Please select Exam Type and Class.");
      return;
    }

    setIsSavingEntries(true);
    try {
      const batch = writeBatch(db);
      const campusId = profile?.campusId || 'main';
      const schoolId = profile?.schoolId || '';

      const entriesToSave = Object.entries(entryMarks).filter(([_, data]) => 
        (data as any).obtained !== '' && (data as any).total !== ''
      );

      for (const [studentId, data] of entriesToSave as [string, { obtained: string, total: string, grade: string }][]) {
        const obtained = parseFloat(data.obtained);
        const total = parseFloat(data.total);
        const percentage = total > 0 ? (obtained / total) * 100 : 0;
        
        // Find existing result to update or create new
        const existingResult = results.find(r => 
          r.studentId === studentId && 
          r.examTypeId === entryFilters.examTypeId
        );

        const resultData: Omit<ExamResult, 'id'> = {
          studentId,
          examTypeId: entryFilters.examTypeId,
          class: entryFilters.class,
          section: entryFilters.section,
          totalObtained: obtained,
          totalMax: total,
          percentage,
          grade: data.grade || calculateGrade(percentage),
          marks: existingResult?.marks || {}, // Preserve existing per-subject marks if any
          campusId,
          schoolId,
          updatedAt: new Date().toISOString()
        };

        if (existingResult?.id) {
          batch.update(doc(db, 'exam_results', existingResult.id), resultData);
        } else {
          batch.set(doc(collection(db, 'exam_results')), resultData);
        }
      }

      await batch.commit();
      alert(`Successfully saved marks for ${entriesToSave.length} students.`);
      setIsEntryModalOpen(false);
      setEntryMarks({});
      fetchResults();
    } catch (error) {
      console.error("Error saving marks:", error);
      alert("Failed to save marks.");
    } finally {
      setIsSavingEntries(false);
    }
  };

  const studentsInFilteredClass = students.filter(s => 
    s.class === entryFilters.class && 
    (!entryFilters.section || s.section === entryFilters.section)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Results</h1>
          <p className="text-slate-500 text-sm">View and download student exam results</p>
        </div>
        <div className="flex items-center gap-3">
          {filteredResults.length > 0 && (
            <button
              onClick={handleBulkDownload}
              disabled={isBulkGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm font-medium disabled:opacity-50"
            >
              {isBulkGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              {isBulkGenerating ? 'Generating...' : 'Bulk Download PDF'}
            </button>
          )}
          {(profile?.role === 'admin' || profile?.role === 'staff') && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Upload CSV
            </button>
          )}
          {(profile?.role === 'admin' || profile?.role === 'staff') && (
            <button
              onClick={() => {
                setEntryFilters({ ...entryFilters, examTypeId: resultFilters.examTypeId, class: resultFilters.class, section: resultFilters.section });
                setIsEntryModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors shadow-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Enter Marks
            </button>
          )}
        </div>
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
            value={resultFilters.examTypeId}
            onChange={(e) => setResultFilters({...resultFilters, examTypeId: e.target.value})}
            className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none w-full"
          >
            <option value="">All Exam Types</option>
            {examTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex-1 min-w-[200px]">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={resultFilters.class}
            onChange={(e) => setResultFilters({...resultFilters, class: e.target.value, section: ''})}
            className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none w-full"
          >
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.className}>{c.className}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex-1 min-w-[200px]">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={resultFilters.section}
            onChange={(e) => setResultFilters({...resultFilters, section: e.target.value})}
            className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none w-full"
          >
            <option value="">All Sections</option>
            {classes.find(c => c.className === resultFilters.class)?.sections.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        {(resultFilters.studentId || resultFilters.examTypeId || resultFilters.class || resultFilters.section) && (
          <button
            onClick={() => setResultFilters({ studentId: '', examTypeId: '', class: '', section: '' })}
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
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</th>
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
                      <td className="p-4 text-sm text-slate-700">{result.examTypeId}</td>
                      <td className="p-4 text-sm text-slate-700">{result.class}</td>
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{result.totalObtained} / {result.totalMax}</div>
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

      {/* CSV Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !isUploading && setIsUploadModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Upload Results via CSV</h2>
                <button onClick={() => setIsUploadModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {!csvData.length ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                    <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">Select a CSV file containing exam results</p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer font-bold"
                    >
                      Browse Files
                    </label>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                      <p className="text-sm text-amber-800">
                        Map the columns from your CSV to the required fields. Ensure Student IDs match existing records.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.keys(columnMapping).map((field) => (
                        <div key={field} className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {field.replace(/([A-Z])/g, ' $1').trim()}
                          </label>
                          <select
                            value={columnMapping[field]}
                            onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="">Select Column</option>
                            {csvHeaders.map(header => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setCsvData([])}
                        className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        onClick={handleBulkUpload}
                        disabled={isUploading}
                        className="flex-2 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5" />
                            Confirm Upload ({csvData.length} rows)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Entry Modal */}
      <AnimatePresence>
        {isEntryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !isSavingEntries && setIsEntryModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Manual Marks Entry</h2>
                <button onClick={() => setIsEntryModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Exam Type</label>
                  <select
                    value={entryFilters.examTypeId}
                    onChange={(e) => setEntryFilters({ ...entryFilters, examTypeId: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Exam</option>
                    {examTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Class</label>
                  <select
                    value={entryFilters.class}
                    onChange={(e) => setEntryFilters({ ...entryFilters, class: e.target.value, section: '' })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.className}>{c.className}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Section</label>
                  <select
                    value={entryFilters.section}
                    onChange={(e) => setEntryFilters({ ...entryFilters, section: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">All Sections</option>
                    {classes.find(c => c.className === entryFilters.class)?.sections.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!entryFilters.examTypeId || !entryFilters.class ? (
                <div className="text-center py-20 text-slate-400">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Please select an exam type and class to begin entry</p>
                </div>
              ) : studentsInFilteredClass.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <p>No students found for this class/section</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase">Roll #</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase">Student Name</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase">Obtained Marks</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase">Total Marks</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {studentsInFilteredClass.map((student) => {
                          const result = results.find(r => r.studentId === student.id && r.examTypeId === entryFilters.examTypeId);
                          const entry = entryMarks[student.id!] || { 
                            obtained: result?.totalObtained?.toString() || '', 
                            total: result?.totalMax?.toString() || '', 
                            grade: result?.grade || '' 
                          };

                          return (
                            <tr key={student.id} className="hover:bg-slate-50/50">
                              <td className="p-4 text-sm font-bold text-indigo-600">{student.rollNumber}</td>
                              <td className="p-4">
                                <div className="text-sm font-medium text-slate-900">{student.name}</div>
                                <div className="text-xs text-slate-500">S/O {student.parentName}</div>
                              </td>
                              <td className="p-4">
                                <input
                                  type="number"
                                  value={entry.obtained}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updated = { ...entry, obtained: val };
                                    // Auto-calculate grade if total exists
                                    if (updated.total) {
                                      updated.grade = calculateGrade((parseFloat(val) / parseFloat(updated.total)) * 100);
                                    }
                                    setEntryMarks({ ...entryMarks, [student.id!]: updated });
                                  }}
                                  className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                              </td>
                              <td className="p-4">
                                <input
                                  type="number"
                                  value={entry.total}
                                  placeholder="100"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updated = { ...entry, total: val };
                                    if (updated.obtained) {
                                      updated.grade = calculateGrade((parseFloat(updated.obtained) / parseFloat(val)) * 100);
                                    }
                                    setEntryMarks({ ...entryMarks, [student.id!]: updated });
                                  }}
                                  className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                              </td>
                              <td className="p-4">
                                <select
                                  value={entry.grade}
                                  onChange={(e) => setEntryMarks({ ...entryMarks, [student.id!]: { ...entry, grade: e.target.value } })}
                                  className="w-20 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                  <option value="">-</option>
                                  <option value="A+">A+</option>
                                  <option value="A">A</option>
                                  <option value="B">B</option>
                                  <option value="C">C</option>
                                  <option value="D">D</option>
                                  <option value="E">E</option>
                                  <option value="F">F</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <button
                      onClick={() => setIsEntryModalOpen(false)}
                      disabled={isSavingEntries}
                      className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveManualMarks}
                      disabled={isSavingEntries}
                      className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2"
                    >
                      {isSavingEntries ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Saving Marks...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Save All Marks
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Result Card Preview (Hidden for PDF generation) */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none">
        <div ref={reportCardRef}>
          {selectedResult && (
            <ReportCard 
              student={students.find(s => s.id === selectedResult.studentId)!}
              result={selectedResult}
              allResults={results}
              examTypes={examTypes}
              schoolSettings={schoolSettings}
              selectedExamTypeId={selectedResult.examTypeId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
