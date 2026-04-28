import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamPaper, UserProfile, ExamType, Student, ExamResult, ExamSchedule, Staff, Subject, ClassGroup, SchoolSettings } from '../types';
import { FileText, Plus, Search, Calendar, Clock, ChevronRight, FilePlus, Sparkles, Loader2, Printer, Settings, X, Trash2, Award, Download, Users, MapPin, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '../lib/utils';

import { ReportCard } from './ReportCard';

export default function Exams({ profile }: { profile: UserProfile | null }) {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [examPapers, setExamPapers] = useState<ExamPaper[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);

  const addOption = (questionIndex: number, isGenerated: boolean = false) => {
    if (isGenerated) {
      if (!generatedPaperData) return;
      const updatedQuestions = [...generatedPaperData.questions];
      updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex] };
      if (!updatedQuestions[questionIndex].options) updatedQuestions[questionIndex].options = [];
      if (updatedQuestions[questionIndex].options.length < 5) {
        updatedQuestions[questionIndex].options = [...updatedQuestions[questionIndex].options, ""];
        setGeneratedPaperData({ ...generatedPaperData, questions: updatedQuestions });
      }
    } else {
      const updatedQuestions = [...(newPaper.questions || [])];
      updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex] };
      if (!updatedQuestions[questionIndex].options) updatedQuestions[questionIndex].options = [];
      if (updatedQuestions[questionIndex].options.length < 5) {
        updatedQuestions[questionIndex].options = [...updatedQuestions[questionIndex].options, ""];
        setNewPaper({ ...newPaper, questions: updatedQuestions });
      }
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number, isGenerated: boolean = false) => {
    if (isGenerated) {
      if (!generatedPaperData) return;
      const updatedQuestions = [...generatedPaperData.questions];
      updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex] };
      updatedQuestions[questionIndex].options = updatedQuestions[questionIndex].options.filter((_, i) => i !== optionIndex);
      setGeneratedPaperData({ ...generatedPaperData, questions: updatedQuestions });
    } else {
      const updatedQuestions = [...(newPaper.questions || [])];
      updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex] };
      updatedQuestions[questionIndex].options = updatedQuestions[questionIndex].options.filter((_, i) => i !== optionIndex);
      setNewPaper({ ...newPaper, questions: updatedQuestions });
    }
  };
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [selectedResultClass, setSelectedResultClass] = useState('');
  const [selectedResultSection, setSelectedResultSection] = useState('');
  const [selectedResultExamType, setSelectedResultExamType] = useState('');
  const [viewingResultCard, setViewingResultCard] = useState<Student | null>(null);
  const resultCardRef = useRef<HTMLDivElement>(null);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [isMarksEntryModalOpen, setIsMarksEntryModalOpen] = useState(false);
  const [selectedStudentForMarks, setSelectedStudentForMarks] = useState<Student | null>(null);
  const [marksEntryData, setMarksEntryData] = useState<Record<string, { obtained: number; total: number; pass: number }>>({});
  const [resultRemarks, setResultRemarks] = useState('');
  const [savingResults, setSavingResults] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIGenModalOpen, setIsAIGenModalOpen] = useState(false);
  const [isExamTypesModalOpen, setIsExamTypesModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [generatedPaperData, setGeneratedPaperData] = useState<any>(null);
  const [viewingPaper, setViewingPaper] = useState<ExamPaper | null>(null);
  const [paperToDelete, setPaperToDelete] = useState<string | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [examTypeToDelete, setExamTypeToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [scheduleView, setScheduleView] = useState<'cards' | 'grid'>('cards');
  
  const [newExamType, setNewExamType] = useState({ name: '', term: '' });

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

  const [activeTab, setActiveTab] = useState<'types' | 'papers' | 'schedules' | 'results'>('types');
  const [examResults, setExamResults] = useState<ExamResult[]>([]);

  const [aiPrompt, setAiPrompt] = useState({
    class: '',
    subject: '',
    topic: '',
    duration: 60,
    examTypeId: '',
    easyCount: 4,
    mediumCount: 4,
    hardCount: 2,
    mcqCount: 5,
    shortCount: 3,
    longCount: 2,
    mcqMarks: 1,
    shortMarks: 4,
    longMarks: 10,
    detailedAnswers: true,
    language: 'English' as 'English' | 'Urdu' | 'Bilingual'
  });

  useEffect(() => {
    if (profile) {
      fetchExamPapers();
      fetchExamTypes();
      fetchStudents();
      fetchSchedules();
      fetchStaff();
      fetchSubjects();
      fetchClasses();
      fetchExamResults();
      fetchSchoolSettings();
    }
  }, [profile]);

  const fetchSchoolSettings = async () => {
    try {
      const campusId = profile?.campusId || 'main';
      const q = query(collection(db, 'settings'), where('campusId', '==', campusId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setSchoolSettings(snap.docs[0].data() as SchoolSettings);
      }
    } catch (error) {
      console.error("Error fetching school settings:", error);
    }
  };

  const fetchExamResults = async () => {
    try {
      const campusId = profile?.campusId || 'main';
      const q = query(collection(db, 'exam_results'), where('campusId', '==', campusId));
      const snap = await getDocs(q);
      setExamResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'exam_results');
    }
  };

  useEffect(() => {
    if (examResults.length > 0 && selectedResultExamType && selectedResultClass) {
      // Calculate positions for the selected class/section/examtype
      const filteredResults = examResults.filter(r => 
        r.examTypeId === selectedResultExamType && 
        r.class === selectedResultClass &&
        (!selectedResultSection || r.section === selectedResultSection)
      );

      if (filteredResults.length > 0) {
        // Sort by totalObtained descending
        const sorted = [...filteredResults].sort((a, b) => b.totalObtained - a.totalObtained);
        
        // Update positions in state (mapping back to original results)
        const updatedResults = examResults.map(r => {
          if (r.examTypeId === selectedResultExamType && r.class === selectedResultClass && (!selectedResultSection || r.section === selectedResultSection)) {
            const rank = sorted.findIndex(sr => sr.id === r.id) + 1;
            if (r.position !== rank) {
              return { ...r, position: rank };
            }
          }
          return r;
        });

        const hasChanges = updatedResults.some((r, i) => r !== examResults[i]);
        if (hasChanges) {
          setExamResults(updatedResults);
        }
      }
    }
  }, [examResults.length, selectedResultExamType, selectedResultClass, selectedResultSection]);

  const handleEnterMarks = (student: Student) => {
    if (!selectedResultExamType) {
      // alert("Please select an exam type first.");
      return;
    }
    setSelectedStudentForMarks(student);
    const existingResult = examResults.find(r => r.studentId === student.id && r.examTypeId === selectedResultExamType);
    
    if (existingResult) {
      setMarksEntryData(existingResult.marks);
      setResultRemarks(existingResult.remarks || '');
    } else {
      // Initialize with subjects for the class
      const classSubjects = subjects.filter(s => s.class === student.class);
      const initialMarks: Record<string, { obtained: number; total: number; pass: number }> = {};
      classSubjects.forEach(s => {
        initialMarks[s.name] = { obtained: 0, total: 100, pass: 40 };
      });
      setMarksEntryData(initialMarks);
      setResultRemarks('');
    }
    setIsMarksEntryModalOpen(true);
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

  const getGradeDescription = (grade: string) => {
    switch (grade) {
      case 'A+': return 'OUTSTANDING';
      case 'A': return 'EXCELLENT';
      case 'B': return 'VERY GOOD';
      case 'C': return 'GOOD';
      case 'D': return 'SATISFACTORY';
      case 'E': return 'UNSATISFACTORY';
      case 'F': return 'FAIL';
      default: return '';
    }
  };

  const handleSaveResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForMarks || !selectedResultExamType) return;

    setSavingResults(true);
    try {
      const campusId = profile?.campusId || 'main';
      let totalObtained = 0;
      let totalMax = 0;

      Object.values(marksEntryData).forEach((m: any) => {
        totalObtained += Number(m.obtained);
        totalMax += Number(m.total);
      });

      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const grade = calculateGrade(percentage);

      const resultData: Partial<ExamResult> = {
        studentId: selectedStudentForMarks.id!,
        examTypeId: selectedResultExamType,
        class: selectedStudentForMarks.class,
        section: selectedStudentForMarks.section,
        marks: marksEntryData,
        totalObtained,
        totalMax,
        percentage,
        grade,
        remarks: resultRemarks,
        campusId,
        updatedAt: new Date().toISOString()
      };

      const existingResult = examResults.find(r => r.studentId === selectedStudentForMarks.id && r.examTypeId === selectedResultExamType);

      if (existingResult) {
        await updateDoc(doc(db, 'exam_results', existingResult.id!), resultData);
      } else {
        await addDoc(collection(db, 'exam_results'), resultData);
      }

      await fetchExamResults();
      setIsMarksEntryModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'exam_results');
    } finally {
      setSavingResults(false);
    }
  };

  const fetchExamPapers = async () => {
    try {
      const campusId = profile?.campusId || 'main';
      const q = query(collection(db, 'exam_papers'), where('campusId', '==', campusId));
      const snap = await getDocs(q);
      setExamPapers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamPaper)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'exam_papers');
    }
  };

  const [editingPaper, setEditingPaper] = useState<ExamPaper | null>(null);
  const [isEditingPaper, setIsEditingPaper] = useState(false);
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const dateSheetRef = useRef<HTMLDivElement>(null);
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [filterPaperClass, setFilterPaperClass] = useState<string>('All');
  const [filterPaperSubject, setFilterPaperSubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSavePaper = async () => {
    if (!editingPaper || !editingPaper.id) return;
    try {
      const paperRef = doc(db, 'exam_papers', editingPaper.id);
      await updateDoc(paperRef, {
        title: editingPaper.title,
        class: editingPaper.class,
        subject: editingPaper.subject,
        date: editingPaper.date,
        duration: editingPaper.duration,
        examTypeId: editingPaper.examTypeId,
        questions: editingPaper.questions
      });
      setViewingPaper(editingPaper);
      setIsEditingPaper(false);
      fetchExamPapers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'exam_papers');
    }
  };

  const updateQuestion = (index: number, updatedQuestion: any) => {
    if (!editingPaper) return;
    const newQuestions = [...editingPaper.questions];
    newQuestions[index] = updatedQuestion;
    setEditingPaper({ ...editingPaper, questions: newQuestions });
  };

  const deleteQuestion = (index: number) => {
    if (!editingPaper) return;
    const newQuestions = editingPaper.questions.filter((_, i) => i !== index);
    setEditingPaper({ ...editingPaper, questions: newQuestions });
  };

  const reorderQuestions = (fromIndex: number, toIndex: number) => {
    if (!editingPaper) return;
    const newQuestions = [...editingPaper.questions];
    const [movedQuestion] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, movedQuestion);
    setEditingPaper({ ...editingPaper, questions: newQuestions });
  };

  const fetchStudents = async () => {
    try {
      const campusId = profile?.campusId || 'main';
      const q = query(collection(db, 'students'), where('campusId', '==', campusId));
      const snap = await getDocs(q);
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
  };

  const fetchSchedules = async () => {
    try {
      const campusId = profile?.campusId || 'main';
      const q = query(collection(db, 'exam_schedules'), where('campusId', '==', campusId));
      const snap = await getDocs(q);
      setSchedules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSchedule)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'exam_schedules');
    }
  };

  const fetchStaff = async () => {
    try {
      const campusId = profile?.campusId || 'main';
      const q = query(collection(db, 'staff'), where('status', '==', 'active'), where('campusId', '==', campusId));
      const snap = await getDocs(q);
      setStaff(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'staff');
    }
  };

  const fetchSubjects = async () => {
    try {
      const q = query(collection(db, 'subjects'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
      setSubjects(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'subjects');
    }
  };

  const fetchClasses = async () => {
    try {
      const campusId = profile?.campusId || 'main';
      const q = query(collection(db, 'classes'), where('campusId', '==', campusId));
      const snap = await getDocs(q);
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassGroup)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'classes');
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const campusId = profile?.campusId || 'main';
      if (editingScheduleId) {
        await updateDoc(doc(db, 'exam_schedules', editingScheduleId), {
          ...newSchedule,
          campusId
        });
      } else {
        await addDoc(collection(db, 'exam_schedules'), {
          ...newSchedule,
          campusId
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
      handleFirestoreError(error, editingScheduleId ? OperationType.UPDATE : OperationType.CREATE, 'exam_schedules');
    }
  };

  const handleDeleteSchedule = (id: string) => {
    setScheduleToDelete(id);
  };

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'exam_schedules', scheduleToDelete));
      fetchSchedules();
      setScheduleToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'exam_schedules');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchExamTypes = async () => {
    try {
      const campusId = profile?.campusId || 'main';
      const q = query(collection(db, 'exam_types'), where('campusId', '==', campusId));
      const snap = await getDocs(q);
      setExamTypes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamType)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'exam_types');
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

  const handleDeleteExamType = (id: string) => {
    setExamTypeToDelete(id);
  };

  const confirmDeleteExamType = async () => {
    if (!examTypeToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'exam_types', examTypeToDelete));
      fetchExamTypes();
      setExamTypeToDelete(null);
    } catch (error) {
      console.error("Error deleting exam type:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadResultCard = async () => {
    if (!resultCardRef.current || !viewingResultCard) return;
    
    try {
      const canvas = await html2canvas(resultCardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      pdf.addImage(imgData, 'PNG', (pdfWidth - finalWidth) / 2, 10, finalWidth, finalHeight);
      pdf.save(`Result_Card_${viewingResultCard.name}_${selectedResultExamType}.pdf`);
    } catch (error) {
      console.error("Error generating result card PDF:", error);
    }
  };

  const handleAddPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPaperId) {
        await updateDoc(doc(db, 'exam_papers', editingPaperId), {
          ...newPaper,
          examTypeId: newPaper.examTypeId || '',
          campusId: profile?.campusId || 'main',
        });
        alert('Exam paper updated successfully!');
      } else {
        await addDoc(collection(db, 'exam_papers'), {
          ...newPaper,
          examTypeId: newPaper.examTypeId || '',
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
      fetchExamPapers();
    } catch (error) {
      handleFirestoreError(error, editingPaperId ? OperationType.UPDATE : OperationType.CREATE, 'exam_papers');
    }
  };

  const handleDeletePaper = (id: string) => {
    setPaperToDelete(id);
  };

  const confirmDeletePaper = async () => {
    if (!paperToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'exam_papers', paperToDelete));
      fetchExamPapers();
      setPaperToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'exam_papers');
    } finally {
      setIsDeleting(false);
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

  const handleGenerateAIPaper = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGenerating(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const examTypeName = examTypes.find(t => t.id === aiPrompt.examTypeId)?.name || 'General';
      const totalQuestions = aiPrompt.mcqCount + aiPrompt.shortCount + aiPrompt.longCount;

      const prompt = `You are an expert educator. Generate a high-quality, comprehensive exam paper for Class ${aiPrompt.class} on the subject of ${aiPrompt.subject}.
      
      SPECIFICATIONS:
      - Exam Type: ${examTypeName}
      - Topic/Syllabus: ${aiPrompt.topic}
      - Duration: ${aiPrompt.duration} minutes
      - Primary Language: ${aiPrompt.language} ${aiPrompt.language === 'Bilingual' ? '(English and Urdu)' : ''}
      
      QUESTION DISTRIBUTION AND MARKS:
      - Multiple Choice (MCQ): ${aiPrompt.mcqCount} questions (${aiPrompt.mcqMarks} marks each)
      - Short Answer: ${aiPrompt.shortCount} questions (${aiPrompt.shortMarks} marks each)
      - Long Answer: ${aiPrompt.longCount} questions (${aiPrompt.longMarks} marks each)
      
      DIFFICULTY TARGETS:
      - Easy: ~${Math.round((aiPrompt.easyCount / (aiPrompt.easyCount + aiPrompt.mediumCount + aiPrompt.hardCount)) * 100)}%
      - Medium: ~${Math.round((aiPrompt.mediumCount / (aiPrompt.easyCount + aiPrompt.mediumCount + aiPrompt.hardCount)) * 100)}%
      - Hard: ~${Math.round((aiPrompt.hardCount / (aiPrompt.easyCount + aiPrompt.mediumCount + aiPrompt.hardCount)) * 100)}%
      
      Total Questions to generate: ${totalQuestions}
      
      ANSWER KEY REQUIREMENTS:
      ${aiPrompt.detailedAnswers ? 
        '- GENERATE A HIGHLY DETAILED ANSWER KEY: For MCQs, provide the correct option. For short answers, provide complete concise answers. For long answers, provide a detailed step-by-step solution, grading rubric, or comprehensive key points.' : 
        '- Provide brief correct answers or key points for each question.'}
      
      INSTRUCTIONS:
      - Questions should be challenging and test conceptual understanding appropriate for Class ${aiPrompt.class}.
      - ${aiPrompt.language === 'Urdu' ? 'The entire paper must be in Urdu.' : aiPrompt.language === 'Bilingual' ? 'Provide questions and options in both English and Urdu where applicable.' : 'The entire paper must be in English.'}
      
      OUTPUT FORMAT:
      Return the output as a JSON array of question objects. Each object MUST have:
      - "question": The question text.
      - "marks": The marks specified above for this question type.
      - "type": One of "multiple_choice", "short_answer", or "long_answer".
      - "options": An array of 4 strings if type is "multiple_choice", otherwise an empty array [].
      - "answer": The correct answer or detailed answer key as requested.
      - "difficulty": The difficulty level assigned to this question ("Easy", "Medium", or "Hard").
      
      Return ONLY the raw JSON array. Do not include any markdown formatting or explanations.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
          title: `${aiPrompt.subject} - ${aiPrompt.topic} (${examTypeName})`,
          class: aiPrompt.class,
          subject: aiPrompt.subject,
          date: new Date().toISOString().split('T')[0],
          duration: aiPrompt.duration,
          examTypeId: aiPrompt.examTypeId,
          questions: questions,
          originalQuestions: JSON.parse(JSON.stringify(questions)), // Deep copy for reference
          campusId: profile?.campusId || 'main',
        };

        setGeneratedPaperData(generatedPaper);
        setReviewMode(true);
        setShowCriteriaInReview(false);
      }
    } catch (error) {
      console.error("Error generating AI paper:", error);
      alert("Failed to generate exam paper. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const [showCriteriaInReview, setShowCriteriaInReview] = useState(false);

  const handleSaveGeneratedPaper = async () => {
    if (!generatedPaperData) return;
    setGenerating(true);
    try {
      // Save the final paper
      const finalPaper = {
        ...generatedPaperData,
        isAIGenerated: true,
        savedAt: new Date().toISOString(),
        // We can store the original draft as a field for reference
        originalDraft: generatedPaperData.originalQuestions || generatedPaperData.questions 
      };
      
      await addDoc(collection(db, 'exam_papers'), finalPaper);
      
      setIsAIGenModalOpen(false);
      setReviewMode(false);
      setGeneratedPaperData(null);
      setShowCriteriaInReview(false);
      setAiPrompt({
        class: '',
        subject: '',
        topic: '',
        duration: 60,
        examTypeId: '',
        easyCount: 4,
        mediumCount: 4,
        hardCount: 2,
        mcqCount: 5,
        shortCount: 3,
        longCount: 2
      });
      fetchExamPapers();
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

  const handleAddQuestionToGenerated = () => {
    const updatedQuestions = [...generatedPaperData.questions];
    updatedQuestions.push({
      question: '',
      marks: 5,
      type: 'short_answer',
      options: [],
      answer: '',
      difficulty: 'Easy'
    });
    setGeneratedPaperData({ ...generatedPaperData, questions: updatedQuestions });
  };

  const handleRemoveQuestionFromGenerated = (index: number) => {
    const updatedQuestions = [...generatedPaperData.questions];
    updatedQuestions.splice(index, 1);
    setGeneratedPaperData({ ...generatedPaperData, questions: updatedQuestions });
  };

  const handleAddManualQuestion = () => {
    setNewPaper({
      ...newPaper,
      questions: [
        ...(newPaper.questions || []),
        { question: '', marks: 5, type: 'short_answer', answer: '', difficulty: 'Easy' }
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

  const generateDateSheet = async () => {
    if (!dateSheetRef.current) return;

    try {
      const canvas = await html2canvas(dateSheetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Content
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, imgHeight);

      // Footer
      pdf.setFontSize(8);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });

      pdf.save(`Date_Sheet_${filterClass}_${filterSubject}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error generating date sheet:", error);
      // alert("Failed to generate date sheet PDF.");
    }
  };

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {activeTab === 'papers' ? 'Paper Generator' : 
             activeTab === 'schedule' ? 'Examination Portal' : 
             'Student results'}
          </h1>
          <p className="text-slate-500 text-sm">
            {activeTab === 'papers' ? 'Create and manage exam papers with AI' : 
             activeTab === 'schedule' ? 'Manage exam schedules and date sheets' : 
             'View and manage student exam results'}
          </p>
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
              <div className="flex gap-2">
                <button
                  onClick={() => setIsAIGenModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm font-bold"
                >
                  <Sparkles className="w-5 h-5" />
                  AI Generate
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <FilePlus className="w-5 h-5" />
                  Create Paper
                </button>
              </div>
            ) : activeTab === 'schedule' ? (
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
            ) : (
              <button
                onClick={() => setIsResultsModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Add Results
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
        <button
          onClick={() => setActiveTab('results')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'results' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Exam Results
          {activeTab === 'results' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
      </div>

      {activeTab === 'papers' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm print:hidden">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search papers..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                value={filterPaperClass}
                onChange={(e) => {
                  setFilterPaperClass(e.target.value);
                  setFilterPaperSubject('All');
                }}
              >
                <option value="All">All Classes</option>
                {classes.sort((a, b) => a.className.localeCompare(b.className)).map(c => (
                  <option key={c.id} value={c.className}>{c.className}</option>
                ))}
              </select>
              <select
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                value={filterPaperSubject}
                onChange={(e) => setFilterPaperSubject(e.target.value)}
              >
                <option value="All">All Subjects</option>
                {subjects
                  .filter(s => filterPaperClass === 'All' || s.class === filterPaperClass)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
          {examPapers
            .filter(p => {
              const matchesClass = filterPaperClass === 'All' || p.class === filterPaperClass;
              const matchesSubject = filterPaperSubject === 'All' || p.subject === filterPaperSubject;
              const matchesSearch = (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                                   (p.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
              return matchesClass && matchesSubject && matchesSearch;
            })
            .map((p) => (
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
                  setTimeout(() => window.print(), 500);
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
        {examPapers.filter(p => {
          const matchesClass = filterPaperClass === 'All' || p.class === filterPaperClass;
          const matchesSubject = filterPaperSubject === 'All' || p.subject === filterPaperSubject;
          const matchesSearch = (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                               (p.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
          return matchesClass && matchesSubject && matchesSearch;
        }).length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100">
            <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Papers Found</h3>
            <p className="text-slate-500 max-w-xs mx-auto">Try adjusting your filters or search query to find what you're looking for.</p>
          </div>
        )}
      </div>
    </div>
    ) : activeTab === 'schedule' ? (
        <div className="space-y-6 print:hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <select
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                value={filterClass}
                onChange={(e) => {
                  setFilterClass(e.target.value);
                  setFilterSubject('All');
                }}
              >
                <option value="All">All Classes</option>
                {classes.sort((a, b) => a.className.localeCompare(b.className)).map(c => (
                  <option key={c.id} value={c.className}>{c.className}</option>
                ))}
              </select>
              <select
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
              >
                <option value="All">All Subjects</option>
                {subjects
                  .filter(s => filterClass === 'All' || s.class === filterClass)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
              </select>
              <button
                onClick={generateDateSheet}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-bold"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setScheduleView('cards')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    scheduleView === 'cards' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Cards
                </button>
                <button
                  onClick={() => setScheduleView('grid')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    scheduleView === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Grid
                </button>
              </div>
            </div>
            {(profile?.role === 'admin' || profile?.role === 'staff') && (
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold uppercase tracking-widest text-xs"
              >
                <Plus className="w-4 h-4" />
                Schedule Exam
              </button>
            )}
          </div>

          {scheduleView === 'grid' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date / Day</th>
                      {Array.from(new Set(schedules.map(s => s.class))).sort().map(c => (
                        <th key={c} className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[120px]">
                          Class {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(Array.from(new Set(schedules.map(s => s.date))) as string[])
                      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                      .map(date => {
                        const dateObj = new Date(date);
                        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                        const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                        const uniqueClasses = Array.from(new Set(schedules.map(s => s.class))).sort();

                        return (
                          <tr key={date} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900">{formattedDate}</span>
                                <span className="text-[10px] text-slate-500 uppercase font-medium">{dayName}</span>
                              </div>
                            </td>
                            {uniqueClasses.map(c => {
                              const classSchedules = schedules.filter(s => s.date === date && s.class === c);
                              return (
                                <td key={c} className="p-4">
                                  {classSchedules.length > 0 ? (
                                    <div className="space-y-2">
                                      {classSchedules.map((s, idx) => (
                                        <div key={idx} className="bg-indigo-50/50 border border-indigo-100/50 rounded-lg p-2 text-center">
                                          <p className="text-xs font-bold text-indigo-700 truncate" title={s.subject}>{s.subject}</p>
                                          <div className="flex items-center justify-center gap-1 mt-1">
                                            <Clock className="w-2.5 h-2.5 text-indigo-400" />
                                            <span className="text-[10px] text-indigo-500 font-medium">{s.time}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-2">
                                      <span className="text-[10px] text-slate-300 font-medium">---</span>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {schedules
                .filter(s => (filterClass === 'All' || s.class === filterClass) && (filterSubject === 'All' || s.subject === filterSubject))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((s) => (
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
          )}
          {schedules.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100">
              <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Exams Scheduled</h3>
              <p className="text-slate-500 max-w-xs mx-auto">Start by scheduling an upcoming exam for your students.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm print:hidden">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <select
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                value={selectedResultClass}
                onChange={(e) => {
                  setSelectedResultClass(e.target.value);
                  setSelectedResultSection('');
                }}
              >
                <option value="">Select Class</option>
                {classes.sort((a, b) => a.className.localeCompare(b.className)).map(c => (
                  <option key={c.id} value={c.className}>{c.className}</option>
                ))}
              </select>
              <select
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                value={selectedResultSection}
                onChange={(e) => setSelectedResultSection(e.target.value)}
              >
                <option value="">Select Section</option>
                {classes.find(c => c.className === selectedResultClass)?.sections.map(s => (
                  <option key={s.id} value={s.sectionName}>{s.sectionName}</option>
                ))}
              </select>
              <select
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                value={selectedResultExamType}
                onChange={(e) => setSelectedResultExamType(e.target.value)}
              >
                <option value="">Select Exam Type</option>
                {examTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.term})</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                disabled={!selectedResultClass || !selectedResultExamType}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" />
                Print All Class
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Student</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Roll No</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Total Marks</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Obtained</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Percentage</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Grade</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Position</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students
                  .filter(s => 
                    (!selectedResultClass || s.class === selectedResultClass) && 
                    (!selectedResultSection || s.section === selectedResultSection)
                  )
                  .map((student) => {
                    const result = examResults.find(r => r.studentId === student.id && r.examTypeId === selectedResultExamType);
                    return (
                      <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{student.name}</p>
                              <p className="text-xs text-slate-500">{student.parentName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{student.rollNo}</td>
                        <td className="px-6 py-4 text-center text-slate-600">{result?.totalMax || '-'}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-900">{result?.totalObtained || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          {result ? (
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-xs font-bold",
                              result.percentage >= 40 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                              {result.percentage.toFixed(2)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {result ? (
                            <span className="font-bold text-slate-900">{result.grade}</span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {result ? (
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">
                              {result.position || '-'}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {result ? (
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-xs font-bold",
                              result.percentage >= 40 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                              {result.percentage >= 40 ? 'PASS' : 'FAIL'}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setViewingResultCard(student);
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="View Result Card"
                            >
                              <Award className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                handleEnterMarks(student);
                              }}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                              title="Enter Marks"
                            >
                              <FilePlus className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {students.filter(s => (!selectedResultClass || s.class === selectedResultClass) && (!selectedResultSection || s.section === selectedResultSection)).length === 0 && (
              <div className="py-20 text-center">
                <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500">No students found for the selected filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{editingPaperId ? 'Edit Exam Paper' : 'Create Exam Paper (Manual)'}</h2>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewMode('edit')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                    previewMode === 'edit' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('preview')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                    previewMode === 'preview' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Live Preview
                </button>
              </div>
            </div>
            
            {previewMode === 'preview' ? (
              <div className="flex-1 overflow-y-auto pr-2 space-y-8 p-8 border border-slate-100 rounded-3xl bg-slate-50/30">
                {/* Paper Header Preview */}
                <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
                  <h1 className="text-3xl font-black text-slate-900 uppercase tracking-[0.2em] mb-3">{newPaper.title || 'EXAM PAPER TITLE'}</h1>
                  <div className="flex items-center justify-center gap-12 text-slate-800 font-bold uppercase tracking-wider text-sm">
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] text-slate-400">CLASS</span>
                      <span>{newPaper.class || '---'}</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] text-slate-400">SUBJECT</span>
                      <span>{newPaper.subject || '---'}</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] text-slate-400">DATE</span>
                      <span>{newPaper.date || '---'}</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] text-slate-400">TIME</span>
                      <span>{newPaper.duration || '---'} MIN</span>
                    </div>
                  </div>
                </div>

                {/* Questions Preview */}
                <div className="space-y-8">
                  {newPaper.questions?.map((q: any, idx: number) => (
                    <div key={idx} className="space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex gap-4">
                          <span className="font-bold text-slate-900 shrink-0">Q{idx + 1}.</span>
                          <p className="text-slate-900 font-medium whitespace-pre-wrap leading-relaxed" dir="auto">{q.question || '...'}</p>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-slate-500">[{q.marks} Marks]</span>
                      </div>
                      
                      {q.type === 'multiple_choice' && q.options && (
                        <div className="grid grid-cols-2 gap-y-3 gap-x-12 ml-10">
                          {q.options.map((opt: string, optIdx: number) => (
                            <div key={optIdx} className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                                {String.fromCharCode(65 + optIdx)}
                              </div>
                              <span className="text-slate-700 font-medium">{opt || '...'}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'long_answer' && (
                        <div className="ml-10 space-y-2">
                          {[1, 2, 3, 4, 5].map(line => (
                            <div key={line} className="w-full h-px bg-slate-200 border-b border-dashed border-slate-300" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                  End of Examination Paper
                </div>
              </div>
            ) : (
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
                  <select
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newPaper.class}
                    onChange={e => setNewPaper({...newPaper, class: e.target.value, subject: ''})}
                  >
                    <option value="">Select Class</option>
                    {classes.sort((a, b) => a.className.localeCompare(b.className)).map(c => (
                      <option key={c.id} value={c.className}>{c.className}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <select
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newPaper.subject}
                    onChange={e => setNewPaper({...newPaper, subject: e.target.value})}
                  >
                    <option value="">Select Subject</option>
                    {(() => {
                      const filtered = subjects
                        .filter(s => s.class.trim().toLowerCase() === newPaper.class.trim().toLowerCase())
                        .sort((a, b) => a.name.localeCompare(b.name));
                      return filtered.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ));
                    })()}
                  </select>
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
                                <label className="text-xs text-slate-500 block mb-1">Difficulty</label>
                                <select
                                  value={q.difficulty}
                                  onChange={(e) => handleManualQuestionEdit(index, 'difficulty', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                  <option value="Easy">Easy</option>
                                  <option value="Medium">Medium</option>
                                  <option value="Hard">Hard</option>
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

                            {q.type === 'multiple_choice' && (
                              <div className="space-y-4 pl-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Options</label>
                                  <button 
                                    type="button"
                                    onClick={() => addOption(index, false)}
                                    className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" /> Add Option
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {(q.options || []).map((opt: string, optIndex: number) => (
                                    <div key={optIndex} className="flex items-center gap-2">
                                      <div className="w-8 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                                        {String.fromCharCode(65 + optIndex)}
                                      </div>
                                      <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                          const newOptions = [...(q.options || [])];
                                          newOptions[optIndex] = e.target.value;
                                          handleManualQuestionEdit(index, 'options', newOptions);
                                        }}
                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                        placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                      />
                                      {(q.options || []).length > 2 && (
                                        <button
                                          type="button"
                                          onClick={() => removeOption(index, optIndex, false)}
                                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
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
            )}
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
                  <select
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={aiPrompt.class}
                    onChange={e => setAiPrompt({...aiPrompt, class: e.target.value, subject: ''})}
                  >
                    <option value="">Select Class</option>
                    {classes.sort((a, b) => a.className.localeCompare(b.className)).map(c => (
                      <option key={c.id} value={c.className}>{c.className}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <select
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={aiPrompt.subject}
                    onChange={e => setAiPrompt({...aiPrompt, subject: e.target.value})}
                  >
                    <option value="">Select Subject</option>
                    {subjects
                      .filter(s => s.class === aiPrompt.class)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                  </select>
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
              
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Question Distribution</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Easy</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={aiPrompt.easyCount}
                      onChange={e => setAiPrompt({...aiPrompt, easyCount: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Medium</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={aiPrompt.mediumCount}
                      onChange={e => setAiPrompt({...aiPrompt, mediumCount: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hard</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={aiPrompt.hardCount}
                      onChange={e => setAiPrompt({...aiPrompt, hardCount: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">MCQs</label>
                    <div className="flex gap-1">
                      <input 
                        type="number" 
                        min="0"
                        placeholder="Count"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        value={aiPrompt.mcqCount}
                        onChange={e => setAiPrompt({...aiPrompt, mcqCount: parseInt(e.target.value) || 0})}
                      />
                      <input 
                        type="number" 
                        min="1"
                        placeholder="Marks"
                        title="Marks per question"
                        className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-600 font-bold"
                        value={aiPrompt.mcqMarks}
                        onChange={e => setAiPrompt({...aiPrompt, mcqMarks: parseInt(e.target.value) || 1})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Short</label>
                    <div className="flex gap-1">
                      <input 
                        type="number" 
                        min="0"
                        placeholder="Count"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        value={aiPrompt.shortCount}
                        onChange={e => setAiPrompt({...aiPrompt, shortCount: parseInt(e.target.value) || 0})}
                      />
                      <input 
                        type="number" 
                        min="1"
                        placeholder="Marks"
                        title="Marks per question"
                        className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-600 font-bold"
                        value={aiPrompt.shortMarks}
                        onChange={e => setAiPrompt({...aiPrompt, shortMarks: parseInt(e.target.value) || 1})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Long</label>
                    <div className="flex gap-1">
                      <input 
                        type="number" 
                        min="0"
                        placeholder="Count"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        value={aiPrompt.longCount}
                        onChange={e => setAiPrompt({...aiPrompt, longCount: parseInt(e.target.value) || 0})}
                      />
                      <input 
                        type="number" 
                        min="1"
                        placeholder="Marks"
                        title="Marks per question"
                        className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-600 font-bold"
                        value={aiPrompt.longMarks}
                        onChange={e => setAiPrompt({...aiPrompt, longMarks: parseInt(e.target.value) || 1})}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Language</label>
                    <select
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={aiPrompt.language}
                      onChange={e => setAiPrompt({...aiPrompt, language: e.target.value as any})}
                    >
                      <option value="English">English</option>
                      <option value="Urdu">Urdu</option>
                      <option value="Bilingual">Bilingual</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setAiPrompt({...aiPrompt, detailedAnswers: !aiPrompt.detailedAnswers})}
                      className={cn(
                        "w-5 h-5 rounded border transition-colors flex items-center justify-center",
                        aiPrompt.detailedAnswers ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
                      )}
                    >
                      {aiPrompt.detailedAnswers && <div className="w-2 h-2 bg-white rounded-full" />}
                    </button>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Detailed Key</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Questions</span>
                  <span className="text-sm font-black text-indigo-600">{aiPrompt.easyCount + aiPrompt.mediumCount + aiPrompt.hardCount}</span>
                </div>
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
                  onClick={() => setShowCriteriaInReview(!showCriteriaInReview)}
                  className={cn(
                    "px-4 py-2 border rounded-xl transition-colors flex items-center gap-2 font-medium",
                    showCriteriaInReview ? "bg-indigo-600 text-white border-indigo-600" : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  )}
                >
                  <Settings className="w-4 h-4" />
                  {showCriteriaInReview ? "Hide Criteria" : "Update Criteria"}
                </button>
                <button
                  onClick={() => handleGenerateAIPaper()}
                  disabled={generating}
                  className="px-4 py-2 border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors flex items-center gap-2"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Regenerate
                </button>
                <button
                  onClick={() => {
                    setReviewMode(false);
                    setGeneratedPaperData(null);
                    setShowCriteriaInReview(false);
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
                  Save Final Paper
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {showCriteriaInReview && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mb-6"
                >
                  <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-widest mb-4">Update Generation Criteria</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Class</label>
                      <input 
                        type="text" 
                        value={aiPrompt.class}
                        onChange={(e) => setAiPrompt({...aiPrompt, class: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Subject</label>
                      <input 
                        type="text" 
                        value={aiPrompt.subject}
                        onChange={(e) => setAiPrompt({...aiPrompt, subject: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Topic</label>
                      <input 
                        type="text" 
                        value={aiPrompt.topic}
                        onChange={(e) => setAiPrompt({...aiPrompt, topic: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-white/50 rounded-xl border border-indigo-100">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Easy / Med / Hard</label>
                        <div className="flex gap-1">
                          <input type="number" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded" value={aiPrompt.easyCount} onChange={e => setAiPrompt({...aiPrompt, easyCount: parseInt(e.target.value) || 0})} />
                          <input type="number" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded" value={aiPrompt.mediumCount} onChange={e => setAiPrompt({...aiPrompt, mediumCount: parseInt(e.target.value) || 0})} />
                          <input type="number" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded" value={aiPrompt.hardCount} onChange={e => setAiPrompt({...aiPrompt, hardCount: parseInt(e.target.value) || 0})} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">MCQ / Short / Long counts</label>
                        <div className="flex gap-1">
                          <input type="number" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded" value={aiPrompt.mcqCount} onChange={e => setAiPrompt({...aiPrompt, mcqCount: parseInt(e.target.value) || 0})} />
                          <input type="number" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded" value={aiPrompt.shortCount} onChange={e => setAiPrompt({...aiPrompt, shortCount: parseInt(e.target.value) || 0})} />
                          <input type="number" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded" value={aiPrompt.longCount} onChange={e => setAiPrompt({...aiPrompt, longCount: parseInt(e.target.value) || 0})} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Marks per Type</label>
                        <div className="flex gap-1">
                          <input type="number" title="MCQ Marks" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded font-bold text-indigo-600" value={aiPrompt.mcqMarks} onChange={e => setAiPrompt({...aiPrompt, mcqMarks: parseInt(e.target.value) || 0})} />
                          <input type="number" title="Short Marks" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded font-bold text-indigo-600" value={aiPrompt.shortMarks} onChange={e => setAiPrompt({...aiPrompt, shortMarks: parseInt(e.target.value) || 0})} />
                          <input type="number" title="Long Marks" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded font-bold text-indigo-600" value={aiPrompt.longMarks} onChange={e => setAiPrompt({...aiPrompt, longMarks: parseInt(e.target.value) || 0})} />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                           <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Language</label>
                           <select 
                             className="w-full px-2 py-1 text-xs border border-indigo-100 rounded"
                             value={aiPrompt.language}
                             onChange={e => setAiPrompt({...aiPrompt, language: e.target.value as any})}
                           >
                             <option value="English">English</option>
                             <option value="Urdu">Urdu</option>
                             <option value="Bilingual">Bilingual</option>
                           </select>
                        </div>
                        <button
                          onClick={() => setAiPrompt({...aiPrompt, detailedAnswers: !aiPrompt.detailedAnswers})}
                          className={cn(
                            "w-8 h-8 rounded-lg border transition-colors flex items-center justify-center mt-4",
                            aiPrompt.detailedAnswers ? "bg-indigo-600 border-indigo-600 text-white" : "border-indigo-200 text-indigo-400"
                          )}
                          title="Detailed Answer Key"
                        >
                          <Award className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="md:col-span-4 flex justify-end">
                      <button
                        onClick={() => handleGenerateAIPaper()}
                        disabled={generating}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-bold shadow-lg shadow-indigo-200"
                      >
                        {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        Regenerate Paper with New Criteria
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
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
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Questions ({generatedPaperData.questions.length})</h3>
                  <button
                    onClick={handleAddQuestionToGenerated}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Question
                  </button>
                </div>
                {generatedPaperData.questions.map((q: any, index: number) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative group">
                    <button
                      onClick={() => handleRemoveQuestionFromGenerated(index)}
                      className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 shrink-0 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <textarea
                              value={q.question}
                              onChange={(e) => handleQuestionEdit(index, 'question', e.target.value)}
                              className="w-full text-slate-900 font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[80px]"
                              placeholder="Question text"
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
                                    handleQuestionEdit(index, 'type', type);
                                    if (updates.options) handleQuestionEdit(index, 'options', updates.options);
                                  }}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                  <option value="multiple_choice">Multiple Choice</option>
                                  <option value="short_answer">Short Answer</option>
                                  <option value="long_answer">Long Answer</option>
                                </select>
                              </div>
                              <div className="w-24">
                                <label className="text-xs text-slate-500 block mb-1">Difficulty</label>
                                <select
                                  value={q.difficulty}
                                  onChange={(e) => handleQuestionEdit(index, 'difficulty', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                  <option value="Easy">Easy</option>
                                  <option value="Medium">Medium</option>
                                  <option value="Hard">Hard</option>
                                </select>
                              </div>
                              <div className="w-24">
                                <label className="text-xs text-slate-500 block mb-1">Marks</label>
                                <input
                                  type="number"
                                  value={q.marks}
                                  onChange={(e) => handleQuestionEdit(index, 'marks', parseInt(e.target.value))}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-center font-bold text-indigo-600"
                                />
                              </div>
                            </div>
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

      {viewingPaper && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:bg-white print:p-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col print:shadow-none print:max-h-none print:w-full print:rounded-none print:p-8"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 print:hidden">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {isEditingPaper ? (
                    <input
                      className="text-2xl font-bold text-slate-900 border-b border-slate-300 outline-none"
                      value={editingPaper?.title || ''}
                      onChange={e => setEditingPaper({...editingPaper!, title: e.target.value})}
                    />
                  ) : (
                    viewingPaper.title
                  )}
                </h2>
              </div>
              <div className="flex gap-3">
                {isEditingPaper ? (
                  <>
                    <button
                      onClick={() => setIsEditingPaper(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePaper}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingPaper(viewingPaper);
                        setIsEditingPaper(true);
                      }}
                      className="px-4 py-2 border border-indigo-200 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      Edit Paper
                    </button>
                    <button
                      onClick={() => setViewingPaper(null)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        window.print();
                      }}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Print Paper
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditingPaper && (
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-2xl print:hidden">
                <input className="px-3 py-2 rounded-lg border border-slate-200" value={editingPaper?.class} onChange={e => setEditingPaper({...editingPaper!, class: e.target.value})} placeholder="Class" />
                <input className="px-3 py-2 rounded-lg border border-slate-200" value={editingPaper?.subject} onChange={e => setEditingPaper({...editingPaper!, subject: e.target.value})} placeholder="Subject" />
                <input type="date" className="px-3 py-2 rounded-lg border border-slate-200" value={editingPaper?.date} onChange={e => setEditingPaper({...editingPaper!, date: e.target.value})} />
                <input type="number" className="px-3 py-2 rounded-lg border border-slate-200" value={editingPaper?.duration} onChange={e => setEditingPaper({...editingPaper!, duration: parseInt(e.target.value)})} placeholder="Duration (min)" />
              </div>
            )}

            {/* Printable Area */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 print:overflow-visible print:pr-0">
              {!isEditingPaper && (
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-black text-slate-900 uppercase tracking-widest mb-2">{viewingPaper.title}</h1>
                  <div className="flex items-center justify-center gap-6 text-slate-600 font-medium">
                    <span>Class: {viewingPaper.class}</span>
                    <span>Subject: {viewingPaper.subject}</span>
                    <span>Date: {viewingPaper.date}</span>
                    <span>Duration: {viewingPaper.duration} Min</span>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {(isEditingPaper ? editingPaper?.questions : viewingPaper.questions)?.map((q: any, index: number) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <div className="font-bold text-slate-900 shrink-0 w-6 mt-2">
                      Q{index + 1}.
                    </div>
                    <div className="flex-1">
                      {isEditingPaper ? (
                        <div className="space-y-4">
                          <textarea className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={q.question} onChange={e => updateQuestion(index, {...q, question: e.target.value})} placeholder="Question text" />
                          <div className="grid grid-cols-2 gap-4">
                            <input type="number" className="p-3 border border-slate-200 rounded-xl" value={q.marks} onChange={e => updateQuestion(index, {...q, marks: parseInt(e.target.value)})} placeholder="Marks" />
                            <select className="p-3 border border-slate-200 rounded-xl" value={q.difficulty} onChange={e => updateQuestion(index, {...q, difficulty: e.target.value})}>
                              <option>Easy</option>
                              <option>Medium</option>
                              <option>Hard</option>
                            </select>
                          </div>
                          <select className="w-full p-3 border border-slate-200 rounded-xl" value={q.type} onChange={e => updateQuestion(index, {...q, type: e.target.value})}>
                            <option value="long_answer">Long Answer</option>
                            <option value="multiple_choice">Multiple Choice</option>
                          </select>
                          {q.type === 'multiple_choice' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Options</label>
                                <button 
                                  type="button"
                                  onClick={() => addOption(index, false)}
                                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> Add Option
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(q.options || ['','','','']).map((opt: string, optIdx: number) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <span className="w-6 text-center text-sm font-bold text-slate-400 shrink-0">{String.fromCharCode(65 + optIdx)}.</span>
                                    <input
                                      type="text"
                                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                      value={opt}
                                      onChange={(e) => {
                                        const newOpts = [...(q.options || ['','','',''])];
                                        newOpts[optIdx] = e.target.value;
                                        handleManualQuestionEdit(index, 'options', newOpts);
                                      }}
                                      placeholder={`Option ${optIdx + 1}`}
                                    />
                                    {(q.options || []).length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => removeOption(index, optIdx, false)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <textarea className="w-full p-3 border border-slate-200 rounded-xl" value={q.answer} onChange={e => updateQuestion(index, {...q, answer: e.target.value})} placeholder="Answer" />
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                    
                    {isEditingPaper && (
                      <div className="flex flex-col gap-2 print:hidden">
                        <button onClick={() => reorderQuestions(index, index - 1)} disabled={index === 0} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">↑</button>
                        <button onClick={() => reorderQuestions(index, index + 1)} disabled={index === (editingPaper?.questions.length || 0) - 1} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">↓</button>
                        <button onClick={() => deleteQuestion(index)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                ))}
                {isEditingPaper && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingPaper({
                          ...editingPaper!,
                          questions: [...editingPaper!.questions, { question: '', marks: 0, type: 'long_answer', difficulty: 'Medium', answer: '' }]
                        });
                      }}
                      className="flex-1 py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 font-bold"
                    >
                      <Plus className="w-5 h-5" />
                      Add Long Answer
                    </button>
                    <button
                      onClick={() => {
                        setEditingPaper({
                          ...editingPaper!,
                          questions: [...editingPaper!.questions, { question: '', marks: 0, type: 'multiple_choice', difficulty: 'Medium', answer: '', options: [''] }]
                        });
                      }}
                      className="flex-1 py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 font-bold"
                    >
                      <Plus className="w-5 h-5" />
                      Add MCQ
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Date Sheet Template (Hidden) */}
      <div className="fixed -left-[9999px] top-0">
        <div 
          ref={dateSheetRef}
          className="w-[1000px] bg-white p-8"
        >
          {/* Header */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="w-20 h-20 flex items-center justify-center">
              <GraduationCap className="w-16 h-16 text-[#1e3a8a]" />
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-normal text-slate-900 tracking-tight mb-1">Chenab College Shorkot</h1>
              <p className="text-slate-900 border-b border-slate-900 inline-block pb-0.5 text-lg">Date Sheet for Final Term Exam Feb. 2026</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border border-slate-800 text-center">
            <thead>
              <tr className="bg-[#4a6b8c] text-white">
                <th className="p-2 border border-slate-800 font-normal">Date:</th>
                <th className="p-2 border border-slate-800 font-normal">Day:</th>
                {Array.from(new Set(schedules.filter(s => (filterClass === 'All' || s.class === filterClass) && (filterSubject === 'All' || s.subject === filterSubject)).map(s => s.class))).sort().map(c => (
                  <th key={c} className="p-2 border border-slate-800 font-normal">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(new Set(schedules.filter(s => (filterClass === 'All' || s.class === filterClass) && (filterSubject === 'All' || s.subject === filterSubject)).map(s => s.date))).sort((a, b) => new Date(a as string).getTime() - new Date(b as string).getTime()).map(date => {
                const dateObj = new Date(date as string);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
                const filteredSchedules = schedules.filter(s => (filterClass === 'All' || s.class === filterClass) && (filterSubject === 'All' || s.subject === filterSubject));
                const uniqueClasses = Array.from(new Set(filteredSchedules.map(s => s.class))).sort();
                
                return (
                  <tr key={date}>
                    <td className="p-2 border border-slate-800 font-bold bg-slate-200/50">{formattedDate}</td>
                    <td className="p-2 border border-slate-800">{dayName}</td>
                    {uniqueClasses.map(c => {
                      const schedule = filteredSchedules.find(s => s.date === date && s.class === c);
                      return (
                        <td key={c} className="p-2 border border-slate-800">
                          {schedule ? schedule.subject : '---'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Notes */}
          <div className="mt-4 text-left">
            <p className="font-bold text-lg mb-2">NOTES:-</p>
            <ul className="space-y-1 pl-4">
              <li className="flex items-start gap-2">
                <span className="mt-1">➤</span>
                <span>Fee defaulters will not be allowed to sit in the examination.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">➤</span>
                <span>Parents / Teacher meeting will be held on <span className="bg-black text-white px-1">Wednesday the 11th of March 2026</span>.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

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
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={newSchedule.class}
                      onChange={e => setNewSchedule({...newSchedule, class: e.target.value, subject: ''})}
                    >
                      <option value="">Select Class</option>
                      {classes.sort((a, b) => a.className.localeCompare(b.className)).map(c => (
                        <option key={c.id} value={c.className}>{c.className}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">Subject</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={newSchedule.subject}
                      onChange={e => setNewSchedule({...newSchedule, subject: e.target.value})}
                    >
                      <option value="">Select Subject</option>
                      {subjects
                        .filter(s => s.class === newSchedule.class)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                    </select>
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
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">Assign Invigilators</label>
                    <div className="relative w-48">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search staff..."
                        className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        value={staffSearch}
                        onChange={e => setStaffSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {staff
                      .filter(member => (member.name || '').toLowerCase().includes(staffSearch.toLowerCase()))
                      .map(member => (
                      <label 
                        key={member.id} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer",
                          newSchedule.invigilatorIds?.includes(member.id!)
                            ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200"
                            : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                        )}
                      >
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
                    {staff.filter(member => (member.name || '').toLowerCase().includes(staffSearch.toLowerCase())).length === 0 && (
                      <div className="col-span-full py-8 text-center text-slate-400 text-sm italic">
                        No staff members found matching your search.
                      </div>
                    )}
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

        {/* Marks Entry Modal */}
        {isMarksEntryModalOpen && selectedStudentForMarks && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 no-print">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMarksEntryModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden"
            >
              <div className="p-8 bg-amber-600 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Enter Marks</h2>
                  <p className="text-amber-100 text-sm font-medium">{selectedStudentForMarks.name} - {selectedStudentForMarks.rollNo}</p>
                </div>
                <button onClick={() => setIsMarksEntryModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveResults} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Subject</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Total Marks</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Pass Marks</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Obtained Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(marksEntryData).map(([subject, m]: [string, any]) => (
                        <tr key={subject} className="border-b border-slate-50">
                          <td className="px-6 py-4 font-bold text-slate-900">{subject}</td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center outline-none focus:ring-2 focus:ring-indigo-500"
                              value={m.total}
                              onChange={e => setMarksEntryData({...marksEntryData, [subject]: {...m, total: Number(e.target.value)}})}
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center outline-none focus:ring-2 focus:ring-indigo-500"
                              value={m.pass}
                              onChange={e => setMarksEntryData({...marksEntryData, [subject]: {...m, pass: Number(e.target.value)}})}
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              required
                              className="w-24 px-4 py-2 bg-white border-2 border-indigo-100 rounded-xl text-center font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                              value={m.obtained}
                              onChange={e => setMarksEntryData({...marksEntryData, [subject]: {...m, obtained: Number(e.target.value)}})}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">Remarks</label>
                  <textarea
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                    placeholder="Enter teacher's remarks..."
                    value={resultRemarks}
                    onChange={e => setResultRemarks(e.target.value)}
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsMarksEntryModalOpen(false)}
                    className="flex-1 py-4 border border-slate-200 rounded-2xl text-slate-600 font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingResults}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                  >
                    {savingResults ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Results'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Result Card Modal */}
        {viewingResultCard && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto no-print">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setViewingResultCard(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-5xl my-8"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-[32px] z-10">
                <h2 className="text-xl font-bold text-slate-900">Result Card Preview</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownloadResultCard}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-bold text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => setViewingResultCard(null)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-x-auto bg-slate-50">
                <div ref={resultCardRef}>
                  <ReportCard 
                    student={viewingResultCard}
                    result={examResults.find(r => r.studentId === viewingResultCard.id && r.examTypeId === selectedResultExamType)}
                    allResults={examResults}
                    examTypes={examTypes}
                    schoolSettings={schoolSettings}
                    selectedExamTypeId={selectedResultExamType}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {/* Deletion Confirmation Modal */}
        {paperToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !isDeleting && setPaperToDelete(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Delete Exam Paper?</h2>
              <p className="text-slate-500 mb-8 font-medium">
                Are you sure you want to delete this exam paper? This action cannot be undone and all associated data will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPaperToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeletePaper}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Paper'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Schedule Deletion Confirmation */}
        {scheduleToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !isDeleting && setScheduleToDelete(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Delete Schedule?</h2>
              <p className="text-slate-500 mb-8 font-medium">
                Are you sure you want to delete this exam schedule? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setScheduleToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSchedule}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Schedule'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Exam Type Deletion Confirmation */}
        {examTypeToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !isDeleting && setExamTypeToDelete(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Delete Exam Type?</h2>
              <p className="text-slate-500 mb-8 font-medium">
                Are you sure you want to delete this exam type? This may affect results and schedules associated with it.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setExamTypeToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteExamType}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Type'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable All Result Cards */}
      <div className="hidden print:block">
        {students
          .filter(s => 
            (!selectedResultClass || s.class === selectedResultClass) && 
            (!selectedResultSection || s.section === selectedResultSection)
          )
          .map((student) => {
            const result = examResults.find(r => r.studentId === student.id && r.examTypeId === selectedResultExamType);
            if (!result) return null;
            return (
              <div key={student.id} className="break-after-page p-10 bg-white min-h-screen">
                <ReportCard 
                  student={student}
                  result={result}
                  allResults={examResults}
                  examTypes={examTypes}
                  schoolSettings={schoolSettings}
                  selectedExamTypeId={selectedResultExamType}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}
