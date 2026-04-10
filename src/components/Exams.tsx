import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamPaper, UserProfile, ExamType, Student, ExamResult, ExamSchedule, Staff } from '../types';
import { FileText, Plus, Search, Calendar, Clock, ChevronRight, FilePlus, Sparkles, Loader2, Printer, Settings, X, Trash2, Award, Download, Users, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '../lib/utils';

export default function Exams({ profile }: { profile: UserProfile | null }) {
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [activeTab, setActiveTab] = useState<'papers' | 'results' | 'schedule'>('papers');
  
  // Filters for results
  const [resultFilters, setResultFilters] = useState({
    studentId: '',
    examType: '',
    term: ''
  });

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIGenModalOpen, setIsAIGenModalOpen] = useState(false);
  const [isExamTypesModalOpen, setIsExamTypesModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [generatedPaperData, setGeneratedPaperData] = useState<any>(null);
  const [viewingPaper, setViewingPaper] = useState<ExamPaper | null>(null);
  
  const [newExamType, setNewExamType] = useState({ name: '', term: '' });

  const [subjectMarks, setSubjectMarks] = useState<{subject: string, score: number}[]>([{subject: '', score: 0}]);
  const [newResult, setNewResult] = useState<Partial<ExamResult>>({
    studentId: '',
    examType: '',
    term: '',
    totalMarks: 100,
    position: 1
  });

  const [newSchedule, setNewSchedule] = useState<Partial<ExamSchedule>>({
    examTypeId: '',
    class: '',
    subject: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: 180,
    invigilatorIds: [],
    roomNumber: ''
  });

  const [newPaper, setNewPaper] = useState<Partial<ExamPaper>>({
    title: '',
    class: '',
    subject: '',
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    examTypeId: '',
    questions: [],
  });

  const [aiPrompt, setAiPrompt] = useState({
    class: '',
    subject: '',
    topic: '',
    duration: 60,
    numQuestions: 10,
    difficulty: 'Medium',
    examTypeId: ''
  });

  useEffect(() => {
    fetchPapers();
    fetchExamTypes();
    fetchStudents();
    fetchResults();
    fetchSchedules();
    fetchStaff();
  }, []);

  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
  const reportCardRef = useRef<HTMLDivElement>(null);

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
    }
  };

  const fetchSchedules = async () => {
    try {
      const q = query(collection(db, 'exam_schedules'));
      const snap = await getDocs(q);
      setSchedules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSchedule)));
    } catch (error) {
      console.error("Error fetching schedules:", error);
    }
  };

  const fetchStaff = async () => {
    try {
      const q = query(collection(db, 'staff'), where('status', '==', 'active'));
      const snap = await getDocs(q);
      setStaff(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const calculateGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const filteredResults = results.filter(result => {
    if (resultFilters.studentId && result.studentId !== resultFilters.studentId) return false;
    if (resultFilters.examType && result.examType !== resultFilters.examType) return false;
    if (resultFilters.term && result.term !== resultFilters.term) return false;
    return true;
  });

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const marksRecord: Record<string, number> = {};
      let obtainedMarks = 0;
      subjectMarks.forEach(sm => {
        if (sm.subject) {
          marksRecord[sm.subject] = sm.score;
          obtainedMarks += sm.score;
        }
      });
      
      const percentage = (obtainedMarks / (newResult.totalMarks || 100)) * 100;
      const grade = calculateGrade(percentage);

      await addDoc(collection(db, 'results'), {
        ...newResult,
        marks: marksRecord,
        percentage,
        grade,
        campusId: profile?.campusId || 'main'
      });
      setIsResultModalOpen(false);
      setSubjectMarks([{subject: '', score: 0}]);
      setNewResult({ studentId: '', examType: '', term: '', totalMarks: 100, position: 1 });
      fetchResults();
    } catch (error) {
      console.error("Error saving result:", error);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingScheduleId) {
        await updateDoc(doc(db, 'exam_schedules', editingScheduleId), {
          ...newSchedule,
          campusId: profile?.campusId || 'main'
        });
      } else {
        await addDoc(collection(db, 'exam_schedules'), {
          ...newSchedule,
          campusId: profile?.campusId || 'main'
        });
      }
      setIsScheduleModalOpen(false);
      setEditingScheduleId(null);
      setNewSchedule({
        examTypeId: '',
        class: '',
        subject: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        duration: 180,
        invigilatorIds: [],
        roomNumber: ''
      });
      fetchSchedules();
    } catch (error) {
      console.error("Error saving schedule:", error);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this exam schedule?')) {
      try {
        await deleteDoc(doc(db, 'exam_schedules', id));
        fetchSchedules();
      } catch (error) {
        console.error("Error deleting schedule:", error);
      }
    }
  };

  const fetchExamTypes = async () => {
    try {
      const q = query(collection(db, 'exam_types'));
      const snap = await getDocs(q);
      setExamTypes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamType)));
    } catch (error) {
      console.error("Error fetching exam types:", error);
    }
  };

  const handleAddExamType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'exam_types'), {
        ...newExamType,
        campusId: profile?.campusId || 'main',
      });
      setNewExamType({ name: '', term: '' });
      fetchExamTypes();
    } catch (error) {
      console.error("Error adding exam type:", error);
    }
  };

  const handleDeleteExamType = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this exam type?')) {
      try {
        await deleteDoc(doc(db, 'exam_types', id));
        fetchExamTypes();
      } catch (error) {
        console.error("Error deleting exam type:", error);
      }
    }
  };

  const fetchPapers = async () => {
    try {
      const q = query(collection(db, 'exam_papers'));
      const snap = await getDocs(q);
      setPapers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamPaper)));
    } catch (error) {
      console.error("Error fetching papers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPaperId) {
        await updateDoc(doc(db, 'exam_papers', editingPaperId), {
          ...newPaper,
          campusId: profile?.campusId || 'main',
        });
        alert('Exam paper updated successfully!');
      } else {
        await addDoc(collection(db, 'exam_papers'), {
          ...newPaper,
          campusId: profile?.campusId || 'main',
        });
        alert('Exam paper created successfully!');
      }
      setIsModalOpen(false);
      setEditingPaperId(null);
      setNewPaper({
        title: '',
        class: '',
        subject: '',
        date: new Date().toISOString().split('T')[0],
        duration: 60,
        examTypeId: '',
        questions: [],
      });
      fetchPapers();
    } catch (error) {
      handleFirestoreError(error, editingPaperId ? OperationType.UPDATE : OperationType.CREATE, 'exam_papers');
    }
  };

  const handleDeletePaper = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this exam paper?')) {
      try {
        await deleteDoc(doc(db, 'exam_papers', id));
        fetchPapers();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'exam_papers');
      }
    }
  };

  const handleEditPaper = (paper: ExamPaper) => {
    setEditingPaperId(paper.id || null);
    setNewPaper({
      title: paper.title,
      class: paper.class,
      subject: paper.subject,
      date: paper.date,
      duration: paper.duration,
      examTypeId: paper.examTypeId,
      questions: paper.questions,
    });
    setIsModalOpen(true);
  };

  const handleGenerateAIPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Generate an exam paper for Class ${aiPrompt.class} on the subject of ${aiPrompt.subject}.
      Topic: ${aiPrompt.topic}
      Duration: ${aiPrompt.duration} minutes
      Number of Questions: ${aiPrompt.numQuestions}
      Difficulty Level: ${aiPrompt.difficulty}
      
      Return the output as a JSON array of question objects. Each object should have:
      - "question": The question text
      - "marks": Suggested marks for the question (integer)
      - "type": "multiple_choice", "short_answer", or "long_answer"
      - "options": An array of strings if it's multiple choice, otherwise omit or empty array
      - "answer": The correct answer or key points expected.
      
      Ensure the total questions match ${aiPrompt.numQuestions}. Do not include markdown formatting like \`\`\`json, just return the raw JSON array.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const generatedQuestionsText = response.text;
      
      if (generatedQuestionsText) {
        const questions = JSON.parse(generatedQuestionsText);
        
        // Create the paper with generated questions
        const generatedPaper = {
          title: `${aiPrompt.subject} - ${aiPrompt.topic} (${aiPrompt.difficulty})`,
          class: aiPrompt.class,
          subject: aiPrompt.subject,
          date: new Date().toISOString().split('T')[0],
          duration: aiPrompt.duration,
          examTypeId: aiPrompt.examTypeId,
          questions: questions,
          campusId: profile?.campusId || 'main',
        };

        setGeneratedPaperData(generatedPaper);
        setReviewMode(true);
      }
    } catch (error) {
      console.error("Error generating AI paper:", error);
      alert("Failed to generate exam paper. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveGeneratedPaper = async () => {
    if (!generatedPaperData) return;
    setGenerating(true);
    try {
      await addDoc(collection(db, 'exam_papers'), generatedPaperData);
      
      setIsAIGenModalOpen(false);
      setReviewMode(false);
      setGeneratedPaperData(null);
      setAiPrompt({
        class: '',
        subject: '',
        topic: '',
        duration: 60,
        numQuestions: 10,
        difficulty: 'Medium',
        examTypeId: ''
      });
      fetchPapers();
    } catch (error) {
      console.error("Error saving AI paper:", error);
      alert("Failed to save exam paper.");
    } finally {
      setGenerating(false);
    }
  };

  const handleQuestionEdit = (index: number, field: string, value: any) => {
    const updatedQuestions = [...generatedPaperData.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setGeneratedPaperData({ ...generatedPaperData, questions: updatedQuestions });
  };

  const handleAddManualQuestion = () => {
    setNewPaper({
      ...newPaper,
      questions: [
        ...(newPaper.questions || []),
        { question: '', marks: 5, type: 'short_answer', answer: '' }
      ]
    });
  };

  const handleManualQuestionEdit = (index: number, field: string, value: any) => {
    const updatedQuestions = [...(newPaper.questions || [])];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setNewPaper({ ...newPaper, questions: updatedQuestions });
  };

  const handleRemoveManualQuestion = (index: number) => {
    const updatedQuestions = [...(newPaper.questions || [])];
    updatedQuestions.splice(index, 1);
    setNewPaper({ ...newPaper, questions: updatedQuestions });
  };

  const handlePrintPaper = () => {
    window.print();
  };

  const generateReportCard = async (result: ExamResult) => {
    setSelectedResult(result);
    // Wait for the template to render with the new result
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
    <div className="space-y-6 print:space-y-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Online Exams & Results</h1>
          <p className="text-slate-500 text-sm">Manage exam papers and student results</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'staff') && (
          <div className="flex flex-wrap gap-3">
            {profile?.role === 'admin' && (
              <button
                onClick={() => setIsExamTypesModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium shadow-sm"
              >
                <Settings className="w-5 h-5 text-slate-500" />
                Exam Types
              </button>
            )}
            {activeTab === 'papers' ? (
              <>
                <button
                  onClick={() => setIsAIGenModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors font-medium shadow-sm"
                >
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  AI Generate
                </button>
                <button
                  onClick={() => {
                    setEditingPaperId(null);
                    setNewPaper({
                      title: '',
                      class: '',
                      subject: '',
                      date: new Date().toISOString().split('T')[0],
                      duration: 60,
                      examTypeId: '',
                      questions: [],
                    });
                    setIsModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <FilePlus className="w-5 h-5" />
                  Create Paper
                </button>
              </>
            ) : activeTab === 'results' ? (
              <button
                onClick={() => setIsResultModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Award className="w-5 h-5" />
                Record Result
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingScheduleId(null);
                  setNewSchedule({
                    examTypeId: '',
                    class: '',
                    subject: '',
                    date: new Date().toISOString().split('T')[0],
                    time: '09:00',
                    duration: 180,
                    invigilatorIds: [],
                    roomNumber: ''
                  });
                  setIsScheduleModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Calendar className="w-5 h-5" />
                Schedule Exam
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-4 border-b border-slate-200 print:hidden">
        <button
          onClick={() => setActiveTab('papers')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'papers' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Exam Papers
          {activeTab === 'papers' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'results' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Student Results
          {activeTab === 'results' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'schedule' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Date Sheet
          {activeTab === 'schedule' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
      </div>

      {activeTab === 'papers' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
        {papers.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                  {p.class}
                </span>
                {p.examTypeId && (
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {examTypes.find(t => t.id === p.examTypeId)?.name || 'Exam'}
                  </span>
                )}
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{p.title}</h3>
            <p className="text-sm text-slate-500 mb-4">{p.subject}</p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                {p.date}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                {p.duration} Minutes
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setViewingPaper(p)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-indigo-600 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors font-medium"
              >
                View
              </button>
              <button 
                onClick={() => {
                  setViewingPaper(p);
                  setTimeout(() => window.print(), 100);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors font-medium"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
            {(profile?.role === 'admin' || profile?.role === 'staff') && (
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => handleEditPaper(p)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors font-medium text-sm"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeletePaper(p.id!)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors font-medium text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
      ) : activeTab === 'results' ? (
        <div className="space-y-4 print:hidden">
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
                      <td colSpan={6} className="p-8 text-center text-slate-500">No results found matching your filters.</td>
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
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                              result.grade === 'A+' || result.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                              result.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                              result.grade === 'C' ? 'bg-amber-100 text-amber-700' :
                              result.grade === 'D' ? 'bg-orange-100 text-orange-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {result.grade}
                            </span>
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-700">{result.position}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => generateReportCard(result)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Download Report Card"
                            >
                              <Download className="w-5 h-5" />
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
      ) : (
        <div className="space-y-6 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedules.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                
                <div className="flex items-start justify-between mb-4 relative">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                      {examTypes.find(t => t.id === s.examTypeId)?.name || 'Exam'}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                      Class {s.class}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-1">{s.subject}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                  <MapPin className="w-4 h-4" />
                  Room: {s.roomNumber || 'TBD'}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</p>
                    <p className="text-sm font-bold text-slate-700">{s.date}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</p>
                    <p className="text-sm font-bold text-slate-700">{s.time}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invigilators</p>
                  <div className="flex flex-wrap gap-2">
                    {s.invigilatorIds.length > 0 ? (
                      s.invigilatorIds.map(id => {
                        const sStaff = staff.find(st => st.id === id);
                        return (
                          <span key={id} className="px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium border border-slate-100 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {sStaff?.name || 'Unknown'}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-400 italic">No invigilators assigned</span>
                    )}
                  </div>
                </div>

                {(profile?.role === 'admin' || profile?.role === 'staff') && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingScheduleId(s.id!);
                        setNewSchedule(s);
                        setIsScheduleModalOpen(true);
                      }}
                      className="flex-1 py-2 bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(s.id!)}
                      className="flex-1 py-2 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          {schedules.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100">
              <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Exams Scheduled</h3>
              <p className="text-slate-500 max-w-xs mx-auto">Start by scheduling an upcoming exam for your students.</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col"
          >
            <h2 className="text-xl font-bold mb-4">{editingPaperId ? 'Edit Exam Paper' : 'Create Exam Paper (Manual)'}</h2>
            <form onSubmit={handleAddPaper} className="space-y-6 flex-1 flex flex-col">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Exam Type</label>
                  <select
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newPaper.examTypeId || ''}
                    onChange={e => {
                      const type = examTypes.find(t => t.id === e.target.value);
                      setNewPaper({...newPaper, examTypeId: e.target.value, term: type?.term});
                    }}
                  >
                    <option value="">Select Type</option>
                    {examTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.term})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Paper Title</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newPaper.title}
                    onChange={e => setNewPaper({...newPaper, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newPaper.class}
                    onChange={e => setNewPaper({...newPaper, class: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newPaper.subject}
                    onChange={e => setNewPaper({...newPaper, subject: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newPaper.date}
                    onChange={e => setNewPaper({...newPaper, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newPaper.duration}
                    onChange={e => setNewPaper({...newPaper, duration: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-900">Questions</h3>
                    <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                      Total Marks: {newPaper.questions?.reduce((acc: number, q: any) => acc + (q.marks || 0), 0)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddManualQuestion}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Question
                  </button>
                </div>
                
                {newPaper.questions?.map((q: any, index: number) => (
                  <div key={index} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 relative">
                    <button
                      type="button"
                      onClick={() => handleRemoveManualQuestion(index)}
                      className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 shrink-0 bg-white border border-slate-200 text-slate-700 rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-3 pr-8">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <textarea
                              value={q.question}
                              onChange={(e) => handleManualQuestionEdit(index, 'question', e.target.value)}
                              dir="auto"
                              className="w-full text-slate-900 font-medium bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[80px]"
                              placeholder="Question text (Supports English / Urdu)"
                            />
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <label className="text-xs text-slate-500 block mb-1">Question Type</label>
                                <select
                                  value={q.type}
                                  onChange={(e) => {
                                    const type = e.target.value;
                                    const updates: any = { type };
                                    if (type === 'multiple_choice' && (!q.options || q.options.length === 0)) {
                                      updates.options = ['', '', '', ''];
                                    }
                                    handleManualQuestionEdit(index, 'type', type);
                                    if (updates.options) handleManualQuestionEdit(index, 'options', updates.options);
                                  }}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                  <option value="multiple_choice">Multiple Choice</option>
                                  <option value="short_answer">Short Answer</option>
                                  <option value="long_answer">Long Answer</option>
                                </select>
                              </div>
                              <div className="w-24">
                                <label className="text-xs text-slate-500 block mb-1">Marks</label>
                                <input
                                  type="number"
                                  value={q.marks}
                                  onChange={(e) => handleManualQuestionEdit(index, 'marks', parseInt(e.target.value))}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-center font-bold text-indigo-600"
                                />
                              </div>
                            </div>

                            {q.type === 'multiple_choice' && q.options && (
                              <div className="space-y-2 pl-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Options</label>
                                {q.options.map((opt: string, optIndex: number) => (
                                  <div key={optIndex} className="flex items-center gap-2">
                                    <span className="w-6 text-center text-sm font-bold text-slate-400">{String.fromCharCode(65 + optIndex)}.</span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const newOptions = [...q.options];
                                        newOptions[optIndex] = e.target.value;
                                        handleManualQuestionEdit(index, 'options', newOptions);
                                      }}
                                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                      placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="pt-2">
                          <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1 block">Expected Answer / Key Points</label>
                          <textarea
                            value={q.answer}
                            onChange={(e) => handleManualQuestionEdit(index, 'answer', e.target.value)}
                            dir="auto"
                            className="w-full text-emerald-700 bg-white border border-emerald-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 resize-none min-h-[60px] text-sm"
                            placeholder="Answer text (Supports English / Urdu)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(!newPaper.questions || newPaper.questions.length === 0) && (
                  <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl">
                    No questions added yet. Click "Add Question" to start.
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPaperId(null);
                    setNewPaper({
                      title: '',
                      class: '',
                      subject: '',
                      date: new Date().toISOString().split('T')[0],
                      duration: 60,
                      examTypeId: '',
                      questions: [],
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Save Paper
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {isAIGenModalOpen && !reviewMode && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Sparkles className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold">AI Paper Generator</h2>
            </div>
            <form onSubmit={handleGenerateAIPaper} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exam Type</label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={aiPrompt.examTypeId || ''}
                  onChange={e => setAiPrompt({...aiPrompt, examTypeId: e.target.value})}
                >
                  <option value="">Select Type (Optional)</option>
                  {examTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.term})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10th"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={aiPrompt.class}
                    onChange={e => setAiPrompt({...aiPrompt, class: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Science"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={aiPrompt.subject}
                    onChange={e => setAiPrompt({...aiPrompt, subject: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Topic / Syllabus</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Thermodynamics and Laws of Motion"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={aiPrompt.topic}
                  onChange={e => setAiPrompt({...aiPrompt, topic: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    required
                    min="10"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={aiPrompt.duration}
                    onChange={e => setAiPrompt({...aiPrompt, duration: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Questions</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="50"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={aiPrompt.numQuestions}
                    onChange={e => setAiPrompt({...aiPrompt, numQuestions: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={aiPrompt.difficulty}
                  onChange={e => setAiPrompt({...aiPrompt, difficulty: e.target.value})}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAIGenModalOpen(false)}
                  disabled={generating}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {reviewMode && generatedPaperData && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Review Generated Paper</h2>
                <p className="text-slate-500 text-sm">Review and edit the questions before saving.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setReviewMode(false);
                    setGeneratedPaperData(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveGeneratedPaper}
                  disabled={generating}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus className="w-4 h-4" />}
                  Save Paper
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block mb-1">Title</span>
                  <input 
                    type="text" 
                    value={generatedPaperData.title}
                    onChange={(e) => setGeneratedPaperData({...generatedPaperData, title: e.target.value})}
                    className="font-semibold text-slate-900 bg-transparent w-full outline-none border-b border-transparent focus:border-indigo-300"
                  />
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block mb-1">Class</span>
                  <input 
                    type="text" 
                    value={generatedPaperData.class}
                    onChange={(e) => setGeneratedPaperData({...generatedPaperData, class: e.target.value})}
                    className="font-semibold text-slate-900 bg-transparent w-full outline-none border-b border-transparent focus:border-indigo-300"
                  />
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block mb-1">Subject</span>
                  <input 
                    type="text" 
                    value={generatedPaperData.subject}
                    onChange={(e) => setGeneratedPaperData({...generatedPaperData, subject: e.target.value})}
                    className="font-semibold text-slate-900 bg-transparent w-full outline-none border-b border-transparent focus:border-indigo-300"
                  />
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block mb-1">Duration (Min)</span>
                  <input 
                    type="number" 
                    value={generatedPaperData.duration}
                    onChange={(e) => setGeneratedPaperData({...generatedPaperData, duration: parseInt(e.target.value)})}
                    className="font-semibold text-slate-900 bg-transparent w-full outline-none border-b border-transparent focus:border-indigo-300"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Questions ({generatedPaperData.questions.length})</h3>
                {generatedPaperData.questions.map((q: any, index: number) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 shrink-0 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <textarea
                            value={q.question}
                            onChange={(e) => handleQuestionEdit(index, 'question', e.target.value)}
                            className="w-full text-slate-900 font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[80px]"
                            placeholder="Question text"
                          />
                          <div className="shrink-0 w-24">
                            <label className="text-xs text-slate-500 block mb-1">Marks</label>
                            <input
                              type="number"
                              value={q.marks}
                              onChange={(e) => handleQuestionEdit(index, 'marks', parseInt(e.target.value))}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-center font-bold text-indigo-600"
                            />
                          </div>
                        </div>

                        {q.type === 'multiple_choice' && q.options && (
                          <div className="space-y-2 pl-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Options</label>
                            {q.options.map((opt: string, optIndex: number) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <span className="w-6 text-center text-sm font-bold text-slate-400">{String.fromCharCode(65 + optIndex)}.</span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const newOptions = [...q.options];
                                    newOptions[optIndex] = e.target.value;
                                    handleQuestionEdit(index, 'options', newOptions);
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-2">
                          <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1 block">Expected Answer / Key Points</label>
                          <textarea
                            value={q.answer}
                            onChange={(e) => handleQuestionEdit(index, 'answer', e.target.value)}
                            className="w-full text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 resize-none min-h-[60px] text-sm"
                            placeholder="Answer text"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {isExamTypesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Manage Exam Types</h2>
              <button onClick={() => setIsExamTypesModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
              {examTypes.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No exam types defined yet.</p>
              ) : (
                examTypes.map(type => (
                  <div key={type.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">{type.name}</p>
                      <p className="text-xs text-slate-500">{type.term}</p>
                    </div>
                    <button
                      onClick={() => type.id && handleDeleteExamType(type.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddExamType} className="space-y-4 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-900">Add New Type</h3>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Exam Name (e.g. Mid-Term)</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={newExamType.name}
                  onChange={e => setNewExamType({...newExamType, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Term (e.g. First Term)</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={newExamType.term}
                  onChange={e => setNewExamType({...newExamType, term: e.target.value})}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Add Exam Type
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {isResultModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Record Exam Result</h2>
              <button onClick={() => setIsResultModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSaveResult} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Student</label>
                  <select
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newResult.studentId}
                    onChange={e => setNewResult({...newResult, studentId: e.target.value})}
                  >
                    <option value="">Select Student</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} S/O {s.parentName} ({s.class})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Exam Type</label>
                  <select
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newResult.examType}
                    onChange={e => {
                      const type = examTypes.find(t => t.name === e.target.value);
                      setNewResult({...newResult, examType: e.target.value, term: type?.term || newResult.term});
                    }}
                  >
                    <option value="">Select Exam Type</option>
                    {examTypes.map(t => (
                      <option key={t.id} value={t.name}>{t.name} ({t.term})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Term</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newResult.term}
                    onChange={e => setNewResult({...newResult, term: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Marks (Overall)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newResult.totalMarks}
                    onChange={e => setNewResult({...newResult, totalMarks: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class Position</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newResult.position}
                    onChange={e => setNewResult({...newResult, position: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Subject Marks</h3>
                  <button
                    type="button"
                    onClick={() => setSubjectMarks([...subjectMarks, {subject: '', score: 0}])}
                    className="flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-700"
                  >
                    <Plus className="w-4 h-4" /> Add Subject
                  </button>
                </div>
                
                <div className="space-y-3">
                  {subjectMarks.map((sm, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Subject Name"
                        required
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={sm.subject}
                        onChange={e => {
                          const newSm = [...subjectMarks];
                          newSm[idx].subject = e.target.value;
                          setSubjectMarks(newSm);
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Marks"
                        required
                        min="0"
                        className="w-32 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={sm.score}
                        onChange={e => {
                          const newSm = [...subjectMarks];
                          newSm[idx].score = parseInt(e.target.value) || 0;
                          setSubjectMarks(newSm);
                        }}
                      />
                      {subjectMarks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newSm = [...subjectMarks];
                            newSm.splice(idx, 1);
                            setSubjectMarks(newSm);
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResultModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Save Result
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {viewingPaper && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:bg-white print:p-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col print:shadow-none print:max-h-none print:w-full print:rounded-none print:p-8"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 print:hidden">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">View Exam Paper</h2>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setViewingPaper(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handlePrintPaper}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Print Paper
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 print:overflow-visible print:pr-0">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-widest mb-2">{viewingPaper.title}</h1>
                <div className="flex items-center justify-center gap-6 text-slate-600 font-medium">
                  <span>Class: {viewingPaper.class}</span>
                  <span>Subject: {viewingPaper.subject}</span>
                  <span>Date: {viewingPaper.date}</span>
                  <span>Duration: {viewingPaper.duration} Min</span>
                </div>
              </div>

              <div className="space-y-6">
                {viewingPaper.questions?.map((q: any, index: number) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="font-bold text-slate-900 shrink-0 w-6">
                      Q{index + 1}.
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <p className="text-slate-900 font-medium whitespace-pre-wrap" dir="auto">{q.question}</p>
                        <span className="shrink-0 text-sm font-bold text-slate-500">[{q.marks} Marks]</span>
                      </div>
                      
                      {q.type === 'multiple_choice' && q.options && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {q.options.map((opt: string, optIndex: number) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <span className="font-bold text-slate-500">{String.fromCharCode(65 + optIndex)}.</span>
                              <span className="text-slate-700">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-dashed border-slate-200 print:hidden">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">Answer Key</span>
                        <p className="text-sm text-emerald-700 whitespace-pre-wrap" dir="auto">{q.answer || 'No answer provided.'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Report Card Template (Hidden) */}
      {selectedResult && (
        <div className="fixed -left-[9999px] top-0">
          <div 
            ref={reportCardRef}
            className="w-[800px] bg-white p-12 border-[12px] border-double border-indigo-600"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-10 pb-8 border-b-2 border-slate-200">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-indigo-600 rounded-2xl flex items-center justify-center">
                  <Award className="w-14 h-14 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Academic Report Card</h1>
                  <p className="text-indigo-600 font-bold tracking-widest uppercase text-sm mt-1">Excellence in Education</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Academic Year</p>
                <p className="text-2xl font-black text-slate-900">2026 - 2027</p>
              </div>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 gap-12 mb-12">
              <div className="space-y-4">
                <div className="flex border-b border-slate-100 pb-2">
                  <span className="w-32 text-xs font-bold text-slate-400 uppercase tracking-wider">Student Name</span>
                  <span className="font-bold text-slate-900">{students.find(s => s.id === selectedResult.studentId)?.name}</span>
                </div>
                <div className="flex border-b border-slate-100 pb-2">
                  <span className="w-32 text-xs font-bold text-slate-400 uppercase tracking-wider">Parent Name</span>
                  <span className="font-bold text-slate-900">{students.find(s => s.id === selectedResult.studentId)?.parentName}</span>
                </div>
                <div className="flex border-b border-slate-100 pb-2">
                  <span className="w-32 text-xs font-bold text-slate-400 uppercase tracking-wider">Roll Number</span>
                  <span className="font-bold text-slate-900">{students.find(s => s.id === selectedResult.studentId)?.rollNumber}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex border-b border-slate-100 pb-2">
                  <span className="w-32 text-xs font-bold text-slate-400 uppercase tracking-wider">Class / Sec</span>
                  <span className="font-bold text-slate-900">
                    {students.find(s => s.id === selectedResult.studentId)?.class} - {students.find(s => s.id === selectedResult.studentId)?.section}
                  </span>
                </div>
                <div className="flex border-b border-slate-100 pb-2">
                  <span className="w-32 text-xs font-bold text-slate-400 uppercase tracking-wider">Exam Type</span>
                  <span className="font-bold text-slate-900">{selectedResult.examType}</span>
                </div>
                <div className="flex border-b border-slate-100 pb-2">
                  <span className="w-32 text-xs font-bold text-slate-400 uppercase tracking-wider">Term</span>
                  <span className="font-bold text-slate-900">{selectedResult.term}</span>
                </div>
              </div>
            </div>

            {/* Marks Table */}
            <table className="w-full mb-12 border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-widest border border-slate-800">Subject</th>
                  <th className="p-4 text-center text-xs font-bold uppercase tracking-widest border border-slate-800 w-32">Obtained</th>
                  <th className="p-4 text-center text-xs font-bold uppercase tracking-widest border border-slate-800 w-32">Total</th>
                  <th className="p-4 text-center text-xs font-bold uppercase tracking-widest border border-slate-800 w-32">Grade</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(selectedResult.marks || {}).map(([subject, score]) => (
                  <tr key={subject} className="border-b border-slate-200">
                    <td className="p-4 font-bold text-slate-700 border-x border-slate-200">{subject}</td>
                    <td className="p-4 text-center font-black text-slate-900 border-r border-slate-200">{score}</td>
                    <td className="p-4 text-center text-slate-400 border-r border-slate-200">-</td>
                    <td className="p-4 text-center font-bold text-indigo-600 border-r border-slate-200">
                      {calculateGrade((Number(score) / 100) * 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50">
                  <td className="p-4 font-black text-slate-900 uppercase tracking-wider border border-slate-200">Grand Total</td>
                  <td className="p-4 text-center font-black text-indigo-600 text-xl border border-slate-200">
                    {Object.values(selectedResult.marks || {}).reduce((a: number, b: number) => a + b, 0)}
                  </td>
                  <td className="p-4 text-center font-black text-slate-900 border border-slate-200">{selectedResult.totalMarks}</td>
                  <td className="p-4 text-center font-black text-indigo-600 border border-slate-200">{selectedResult.grade}</td>
                </tr>
              </tfoot>
            </table>

            {/* Summary Grid */}
            <div className="grid grid-cols-3 gap-6 mb-16">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Percentage</p>
                <p className="text-3xl font-black text-slate-900">{selectedResult.percentage.toFixed(1)}%</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Grade</p>
                <p className="text-3xl font-black text-indigo-600">{selectedResult.grade}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Class Position</p>
                <p className="text-3xl font-black text-slate-900">{selectedResult.position}</p>
              </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between items-end mt-20 px-4">
              <div className="text-center w-48">
                <div className="border-b-2 border-slate-900 mb-2"></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Class Teacher</p>
              </div>
              <div className="text-center w-48">
                <div className="border-b-2 border-slate-900 mb-2"></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Principal</p>
              </div>
              <div className="text-center w-48">
                <div className="border-b-2 border-slate-900 mb-2"></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Parent Signature</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-16 text-center">
              <p className="text-[10px] text-slate-300 font-medium uppercase tracking-[0.3em]">This is a computer generated document</p>
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 no-print">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsScheduleModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 bg-indigo-600 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{editingScheduleId ? 'Edit Exam Schedule' : 'Schedule New Exam'}</h2>
                  <p className="text-indigo-100 text-sm font-medium">Plan upcoming examinations and assign staff.</p>
                </div>
                <button onClick={() => setIsScheduleModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveSchedule} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">Exam Type</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={newSchedule.examTypeId}
                      onChange={e => setNewSchedule({...newSchedule, examTypeId: e.target.value})}
                    >
                      <option value="">Select Exam Type</option>
                      {examTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.term})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">Class</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. 10th"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={newSchedule.class}
                      onChange={e => setNewSchedule({...newSchedule, class: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">Subject</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Mathematics"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={newSchedule.subject}
                      onChange={e => setNewSchedule({...newSchedule, subject: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">Room Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Hall A"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={newSchedule.roomNumber}
                      onChange={e => setNewSchedule({...newSchedule, roomNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">Date</label>
                    <input
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={newSchedule.date}
                      onChange={e => setNewSchedule({...newSchedule, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">Time</label>
                    <input
                      required
                      type="time"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={newSchedule.time}
                      onChange={e => setNewSchedule({...newSchedule, time: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">Duration (Min)</label>
                    <input
                      required
                      type="number"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={newSchedule.duration}
                      onChange={e => setNewSchedule({...newSchedule, duration: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">Assign Invigilators</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {staff.map(member => (
                      <label key={member.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          checked={newSchedule.invigilatorIds?.includes(member.id!)}
                          onChange={e => {
                            const ids = newSchedule.invigilatorIds || [];
                            if (e.target.checked) {
                              setNewSchedule({...newSchedule, invigilatorIds: [...ids, member.id!]});
                            } else {
                              setNewSchedule({...newSchedule, invigilatorIds: ids.filter(id => id !== member.id)});
                            }
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900">{member.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{member.role}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="flex-1 py-4 border border-slate-200 rounded-2xl text-slate-600 font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                  >
                    {editingScheduleId ? 'Update Schedule' : 'Schedule Exam'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
