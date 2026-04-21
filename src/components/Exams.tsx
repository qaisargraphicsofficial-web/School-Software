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

export default function Exams({ profile }: { profile: UserProfile | null }) {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [examPapers, setExamPapers] = useState<ExamPaper[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [activeTab, setActiveTab] = useState<'papers' | 'schedule' | 'results'>('results');
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
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
    longCount: 2
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
      const campusId = profile?.campusId || 'main';
      const q = query(collection(db, 'subjects'), where('campusId', '==', campusId));
      const snap = await getDocs(q);
      setSubjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
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

  const handleDeleteSchedule = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this exam schedule?')) {
      try {
        await deleteDoc(doc(db, 'exam_schedules', id));
        fetchSchedules();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'exam_schedules');
      }
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

  const handleDeletePaper = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this exam paper?')) {
      try {
        await deleteDoc(doc(db, 'exam_papers', id));
        fetchExamPapers();
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

  const handleGenerateAIPaper = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGenerating(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const examTypeName = examTypes.find(t => t.id === aiPrompt.examTypeId)?.name || 'General';
      const totalQuestions = aiPrompt.easyCount + aiPrompt.mediumCount + aiPrompt.hardCount;
      const totalByType = aiPrompt.mcqCount + aiPrompt.shortCount + aiPrompt.longCount;

      const prompt = `You are an expert educator. Generate a high-quality, comprehensive exam paper for Class ${aiPrompt.class} on the subject of ${aiPrompt.subject}.
      
      SPECIFICATIONS:
      - Exam Type: ${examTypeName}
      - Topic/Syllabus: ${aiPrompt.topic}
      - Duration: ${aiPrompt.duration} minutes
      
      QUESTION DISTRIBUTION BY DIFFICULTY:
      - Easy: ${aiPrompt.easyCount} questions
      - Medium: ${aiPrompt.mediumCount} questions
      - Hard: ${aiPrompt.hardCount} questions
      
      QUESTION DISTRIBUTION BY TYPE:
      - Multiple Choice (MCQ): ${aiPrompt.mcqCount} questions
      - Short Answer: ${aiPrompt.shortCount} questions
      - Long Answer: ${aiPrompt.longCount} questions
      
      Total Questions to generate: ${totalQuestions}
      
      INSTRUCTIONS:
      - Ensure the difficulty levels are accurately reflected in the questions.
      - Questions should be challenging and test conceptual understanding.
      - If there's a slight mismatch between total by difficulty and total by type, prioritize the total count of ${totalQuestions} and try to satisfy both distributions as closely as possible.
      
      OUTPUT FORMAT:
      Return the output as a JSON array of question objects. Each object MUST have:
      - "question": The question text.
      - "marks": Suggested marks for the question (integer).
      - "type": One of "multiple_choice", "short_answer", or "long_answer".
      - "options": An array of 4 strings if type is "multiple_choice", otherwise an empty array [].
      - "answer": The correct answer or detailed key points expected for grading.
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
                Download Date Sheet
              </button>
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
                    {subjects
                      .filter(s => s.class === newPaper.class)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
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

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MCQs</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={aiPrompt.mcqCount}
                      onChange={e => setAiPrompt({...aiPrompt, mcqCount: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Short</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={aiPrompt.shortCount}
                      onChange={e => setAiPrompt({...aiPrompt, shortCount: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Long</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={aiPrompt.longCount}
                      onChange={e => setAiPrompt({...aiPrompt, longCount: parseInt(e.target.value) || 0})}
                    />
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
                    
                    <div className="md:col-span-3 grid grid-cols-3 gap-4 p-3 bg-white/50 rounded-xl border border-indigo-100">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Easy / Med / Hard</label>
                        <div className="flex gap-1">
                          <input type="number" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded" value={aiPrompt.easyCount} onChange={e => setAiPrompt({...aiPrompt, easyCount: parseInt(e.target.value) || 0})} />
                          <input type="number" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded" value={aiPrompt.mediumCount} onChange={e => setAiPrompt({...aiPrompt, mediumCount: parseInt(e.target.value) || 0})} />
                          <input type="number" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded" value={aiPrompt.hardCount} onChange={e => setAiPrompt({...aiPrompt, hardCount: parseInt(e.target.value) || 0})} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">MCQ / Short / Long</label>
                        <div className="flex gap-1">
                          <input type="number" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded" value={aiPrompt.mcqCount} onChange={e => setAiPrompt({...aiPrompt, mcqCount: parseInt(e.target.value) || 0})} />
                          <input type="number" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded" value={aiPrompt.shortCount} onChange={e => setAiPrompt({...aiPrompt, shortCount: parseInt(e.target.value) || 0})} />
                          <input type="number" className="w-full px-2 py-1 text-xs border border-indigo-100 rounded" value={aiPrompt.longCount} onChange={e => setAiPrompt({...aiPrompt, longCount: parseInt(e.target.value) || 0})} />
                        </div>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => handleGenerateAIPaper()}
                          disabled={generating}
                          className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm font-bold"
                        >
                          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Regenerate
                        </button>
                      </div>
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
                            <textarea className="w-full p-3 border border-slate-200 rounded-xl" value={q.options?.join('\n')} onChange={e => updateQuestion(index, {...q, options: e.target.value.split('\n')})} placeholder="Options (one per line)" />
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
                <div ref={resultCardRef} className="w-[800px] mx-auto bg-white p-10 border border-slate-200 shadow-sm font-serif text-slate-900">
                  {/* School Header */}
                  <div className="flex items-center justify-center gap-8 mb-8">
                    <img 
                      src={schoolSettings?.logoUrl || "https://picsum.photos/seed/school/100/100"} 
                      alt="Logo" 
                      className="w-24 h-24 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-center">
                      <h1 className="text-5xl font-bold tracking-tight mb-2">{schoolSettings?.schoolName || "Chenab College Shorkot"}</h1>
                      <p className="text-2xl font-medium uppercase tracking-widest border-b-2 border-slate-900 inline-block pb-1">
                        TERM WISE REPORT, 2025-26
                      </p>
                    </div>
                  </div>

                  {/* Student Info Bar */}
                  <div className="flex justify-between items-end mb-8">
                    <div className="border-2 border-slate-900 p-4 min-w-[300px]">
                      <h2 className="text-2xl font-bold uppercase">{viewingResultCard.name}</h2>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center justify-end gap-4">
                        <span className="text-lg font-bold">Class | Section</span>
                        <span className="text-lg font-bold min-w-[80px] text-center">{viewingResultCard.class}-{viewingResultCard.section}</span>
                      </div>
                      <div className="flex items-center justify-end gap-4">
                        <span className="text-lg font-bold">Position in Section</span>
                        <span className="text-lg font-bold min-w-[80px] text-center">
                          {examResults.find(r => r.studentId === viewingResultCard.id && r.examTypeId === selectedResultExamType)?.position || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Exam Title */}
                  <div className="text-center mb-4">
                    <h3 className="text-2xl font-bold">
                      {examTypes.find(t => t.id === selectedResultExamType)?.name || 'Term'} Exams {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </h3>
                  </div>

                  {/* Marks Table */}
                  <table className="w-full border-collapse border-2 border-slate-900 mb-8 text-center">
                    <thead>
                      <tr className="bg-slate-200">
                        <th className="border-2 border-slate-900 p-2 font-bold uppercase">Subject</th>
                        <th className="border-2 border-slate-900 p-2 font-bold uppercase">Max Marks</th>
                        <th className="border-2 border-slate-900 p-2 font-bold uppercase">Pass Marks</th>
                        <th className="border-2 border-slate-900 p-2 font-bold uppercase">Obtained Marks</th>
                        <th className="border-2 border-slate-900 p-2 font-bold uppercase">%Age</th>
                        <th className="border-2 border-slate-900 p-2 font-bold uppercase">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const result = examResults.find(r => r.studentId === viewingResultCard.id && r.examTypeId === selectedResultExamType);
                        if (!result) return null;
                        return Object.entries(result.marks).map(([subject, m]: [string, any]) => (
                          <tr key={subject}>
                            <td className="border-2 border-slate-900 p-2 font-medium text-left">{subject}</td>
                            <td className="border-2 border-slate-900 p-2">{m.total}</td>
                            <td className="border-2 border-slate-900 p-2">{m.pass}</td>
                            <td className="border-2 border-slate-900 p-2 font-bold">{m.obtained}</td>
                            <td className="border-2 border-slate-900 p-2">{((m.obtained / m.total) * 100).toFixed(2)}</td>
                            <td className="border-2 border-slate-900 p-2 font-bold">
                              {calculateGrade((m.obtained / m.total) * 100)} {getGradeDescription(calculateGrade((m.obtained / m.total) * 100))}
                            </td>
                          </tr>
                        ));
                      })()}
                      <tr className="bg-slate-200 font-bold">
                        <td className="border-2 border-slate-900 p-2 uppercase">Total</td>
                        {(() => {
                          const result = examResults.find(r => r.studentId === viewingResultCard.id && r.examTypeId === selectedResultExamType);
                          return (
                            <>
                              <td className="border-2 border-slate-900 p-2">{result?.totalMax}</td>
                              <td className="border-2 border-slate-900 p-2">---</td>
                              <td className="border-2 border-slate-900 p-2">{result?.totalObtained}</td>
                              <td className="border-2 border-slate-900 p-2">{result?.percentage.toFixed(2)}</td>
                              <td className="border-2 border-slate-900 p-2">
                                {result?.percentage && result.percentage >= 40 ? 'PASS' : 'FAIL'}
                              </td>
                            </>
                          );
                        })()}
                      </tr>
                    </tbody>
                  </table>

                  {/* Result Summary */}
                  <div className="mb-8">
                    <div className="bg-slate-300 text-center py-1 border-2 border-slate-900 mb-0">
                      <h4 className="text-xl font-bold uppercase">Result Summary</h4>
                    </div>
                    <table className="w-full border-collapse border-2 border-slate-900 text-center text-sm">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border-2 border-slate-900 p-2 font-bold">Exams</th>
                          <th className="border-2 border-slate-900 p-2 font-bold">Total Marks</th>
                          <th className="border-2 border-slate-900 p-2 font-bold">Obtained Marks</th>
                          <th className="border-2 border-slate-900 p-2 font-bold">Term wise Percentage</th>
                          <th className="border-2 border-slate-900 p-2 font-bold">Weightage</th>
                          <th className="border-2 border-slate-900 p-2 font-bold">After Applying Weightage Obtained Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['1st Term', '2nd Term', '3rd Term'].map((term, idx) => {
                          const termResult = examResults.find(r => r.studentId === viewingResultCard.id && examTypes.find(t => t.id === r.examTypeId)?.term === term);
                          const weightage = term === '3rd Term' ? 40 : 30;
                          const weightedPercentage = termResult ? (termResult.percentage * weightage) / 100 : 0;
                          return (
                            <tr key={term}>
                              <td className="border-2 border-slate-900 p-2 font-bold">{term}</td>
                              <td className="border-2 border-slate-900 p-2">{termResult?.totalMax.toFixed(2) || '0.00'}</td>
                              <td className="border-2 border-slate-900 p-2">{termResult?.totalObtained.toFixed(2) || '0.00'}</td>
                              <td className="border-2 border-slate-900 p-2">{termResult?.percentage.toFixed(2) || '0.00'}</td>
                              <td className="border-2 border-slate-900 p-2">{weightage}%</td>
                              <td className="border-2 border-slate-900 p-2">{weightedPercentage.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Final Result */}
                  <div className="mb-8">
                    <div className="bg-slate-300 text-center py-1 border-2 border-slate-900 mb-0">
                      <h4 className="text-xl font-bold uppercase">Final Result</h4>
                    </div>
                    <table className="w-full border-collapse border-2 border-slate-900 text-center">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border-2 border-slate-900 p-2 font-bold uppercase">Combined Percentage of All Terms</th>
                          <th className="border-2 border-slate-900 p-2 font-bold uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border-2 border-slate-900 p-4 text-2xl font-bold">
                            {(() => {
                              const results = examResults.filter(r => r.studentId === viewingResultCard.id);
                              let combined = 0;
                              results.forEach(r => {
                                const term = examTypes.find(t => t.id === r.examTypeId)?.term;
                                const weightage = term === '3rd Term' ? 0.4 : 0.3;
                                combined += r.percentage * weightage;
                              });
                              return combined.toFixed(2);
                            })()}
                          </td>
                          <td className="border-2 border-slate-900 p-4 text-2xl font-bold">
                            {(() => {
                              const results = examResults.filter(r => r.studentId === viewingResultCard.id);
                              let combined = 0;
                              results.forEach(r => {
                                const term = examTypes.find(t => t.id === r.examTypeId)?.term;
                                const weightage = term === '3rd Term' ? 0.4 : 0.3;
                                combined += r.percentage * weightage;
                              });
                              return combined >= 40 ? 'PROMOTED' : 'NOT PROMOTED';
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Remarks */}
                  <div className="mb-12">
                    <div className="bg-slate-300 text-center py-1 border-2 border-slate-900 mb-0">
                      <h4 className="text-xl font-bold uppercase">Remarks</h4>
                    </div>
                    <div className="border-2 border-slate-900 p-6 min-h-[80px]">
                      <p className="text-lg italic">
                        {examResults.find(r => r.studentId === viewingResultCard.id && r.examTypeId === selectedResultExamType)?.remarks || 'No remarks provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="flex justify-between items-end mt-20 px-4">
                    <div className="text-center border-t-2 border-slate-900 pt-2 min-w-[200px]">
                      <p className="font-bold">Class Incharge</p>
                    </div>
                    <div className="text-center border-t-2 border-slate-900 pt-2 min-w-[200px]">
                      <p className="font-bold">Section Head</p>
                    </div>
                    <div className="text-center border-t-2 border-slate-900 pt-2 min-w-[200px]">
                      <p className="font-bold">Principal</p>
                    </div>
                  </div>
                </div>
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
                <div className="w-[800px] mx-auto font-serif text-slate-900">
                  {/* School Header */}
                  <div className="flex items-center justify-center gap-8 mb-8">
                    <img 
                      src={schoolSettings?.logoUrl || "https://picsum.photos/seed/school/100/100"} 
                      alt="Logo" 
                      className="w-24 h-24 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-center">
                      <h1 className="text-5xl font-bold tracking-tight mb-2">{schoolSettings?.schoolName || "Chenab College Shorkot"}</h1>
                      <p className="text-2xl font-medium uppercase tracking-widest border-b-2 border-slate-900 inline-block pb-1">
                        TERM WISE REPORT, 2025-26
                      </p>
                    </div>
                  </div>

                  {/* Student Info Bar */}
                  <div className="flex justify-between items-end mb-8">
                    <div className="border-2 border-slate-900 p-4 min-w-[300px]">
                      <h2 className="text-2xl font-bold uppercase">{student.name}</h2>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center justify-end gap-4">
                        <span className="text-lg font-bold">Class | Section</span>
                        <span className="text-lg font-bold min-w-[80px] text-center">{student.class}-{student.section}</span>
                      </div>
                      <div className="flex items-center justify-end gap-4">
                        <span className="text-lg font-bold">Position in Section</span>
                        <span className="text-lg font-bold min-w-[80px] text-center">
                          {result.position || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Exam Title */}
                  <div className="text-center mb-4">
                    <h3 className="text-2xl font-bold">
                      {examTypes.find(t => t.id === selectedResultExamType)?.name || 'Term'} Exams {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </h3>
                  </div>

                  {/* Marks Table */}
                  <table className="w-full border-collapse border-2 border-slate-900 mb-8 text-center">
                    <thead>
                      <tr className="bg-slate-200">
                        <th className="border-2 border-slate-900 p-2 font-bold uppercase">Subject</th>
                        <th className="border-2 border-slate-900 p-2 font-bold uppercase">Max Marks</th>
                        <th className="border-2 border-slate-900 p-2 font-bold uppercase">Pass Marks</th>
                        <th className="border-2 border-slate-900 p-2 font-bold uppercase">Obtained Marks</th>
                        <th className="border-2 border-slate-900 p-2 font-bold uppercase">%Age</th>
                        <th className="border-2 border-slate-900 p-2 font-bold uppercase">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result.marks).map(([subject, m]: [string, any]) => (
                        <tr key={subject}>
                          <td className="border-2 border-slate-900 p-2 font-medium text-left">{subject}</td>
                          <td className="border-2 border-slate-900 p-2">{m.total}</td>
                          <td className="border-2 border-slate-900 p-2">{m.pass}</td>
                          <td className="border-2 border-slate-900 p-2 font-bold">{m.obtained}</td>
                          <td className="border-2 border-slate-900 p-2">{((m.obtained / m.total) * 100).toFixed(2)}</td>
                          <td className="border-2 border-slate-900 p-2 font-bold">
                            {calculateGrade((m.obtained / m.total) * 100)} {getGradeDescription(calculateGrade((m.obtained / m.total) * 100))}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-200 font-bold">
                        <td className="border-2 border-slate-900 p-2 uppercase">Total</td>
                        <td className="border-2 border-slate-900 p-2">{result.totalMax}</td>
                        <td className="border-2 border-slate-900 p-2">---</td>
                        <td className="border-2 border-slate-900 p-2">{result.totalObtained}</td>
                        <td className="border-2 border-slate-900 p-2">{result.percentage.toFixed(2)}</td>
                        <td className="border-2 border-slate-900 p-2">
                          {result.percentage >= 40 ? 'PASS' : 'FAIL'}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Result Summary */}
                  <div className="mb-8">
                    <div className="bg-slate-300 text-center py-1 border-2 border-slate-900 mb-0">
                      <h4 className="text-xl font-bold uppercase">Result Summary</h4>
                    </div>
                    <table className="w-full border-collapse border-2 border-slate-900 text-center text-sm">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border-2 border-slate-900 p-2 font-bold">Exams</th>
                          <th className="border-2 border-slate-900 p-2 font-bold">Total Marks</th>
                          <th className="border-2 border-slate-900 p-2 font-bold">Obtained Marks</th>
                          <th className="border-2 border-slate-900 p-2 font-bold">Term wise Percentage</th>
                          <th className="border-2 border-slate-900 p-2 font-bold">Weightage</th>
                          <th className="border-2 border-slate-900 p-2 font-bold">After Applying Weightage Obtained Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['1st Term', '2nd Term', '3rd Term'].map((term) => {
                          const termResult = examResults.find(r => r.studentId === student.id && examTypes.find(t => t.id === r.examTypeId)?.term === term);
                          const weightage = term === '3rd Term' ? 40 : 30;
                          const weightedPercentage = termResult ? (termResult.percentage * weightage) / 100 : 0;
                          return (
                            <tr key={term}>
                              <td className="border-2 border-slate-900 p-2 font-bold">{term}</td>
                              <td className="border-2 border-slate-900 p-2">{termResult?.totalMax.toFixed(2) || '0.00'}</td>
                              <td className="border-2 border-slate-900 p-2">{termResult?.totalObtained.toFixed(2) || '0.00'}</td>
                              <td className="border-2 border-slate-900 p-2">{termResult?.percentage.toFixed(2) || '0.00'}</td>
                              <td className="border-2 border-slate-900 p-2">{weightage}%</td>
                              <td className="border-2 border-slate-900 p-2">{weightedPercentage.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Final Result */}
                  <div className="mb-8">
                    <div className="bg-slate-300 text-center py-1 border-2 border-slate-900 mb-0">
                      <h4 className="text-xl font-bold uppercase">Final Result</h4>
                    </div>
                    <table className="w-full border-collapse border-2 border-slate-900 text-center">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border-2 border-slate-900 p-2 font-bold uppercase">Combined Percentage of All Terms</th>
                          <th className="border-2 border-slate-900 p-2 font-bold uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border-2 border-slate-900 p-4 text-2xl font-bold">
                            {(() => {
                              const results = examResults.filter(r => r.studentId === student.id);
                              let combined = 0;
                              results.forEach(r => {
                                const term = examTypes.find(t => t.id === r.examTypeId)?.term;
                                const weightage = term === '3rd Term' ? 0.4 : 0.3;
                                combined += r.percentage * weightage;
                              });
                              return combined.toFixed(2);
                            })()}
                          </td>
                          <td className="border-2 border-slate-900 p-4 text-2xl font-bold">
                            {(() => {
                              const results = examResults.filter(r => r.studentId === student.id);
                              let combined = 0;
                              results.forEach(r => {
                                const term = examTypes.find(t => t.id === r.examTypeId)?.term;
                                const weightage = term === '3rd Term' ? 0.4 : 0.3;
                                combined += r.percentage * weightage;
                              });
                              return combined >= 40 ? 'PROMOTED' : 'NOT PROMOTED';
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Remarks */}
                  <div className="mb-12">
                    <div className="bg-slate-300 text-center py-1 border-2 border-slate-900 mb-0">
                      <h4 className="text-xl font-bold uppercase">Remarks</h4>
                    </div>
                    <div className="border-2 border-slate-900 p-6 min-h-[80px]">
                      <p className="text-lg italic">
                        {result.remarks || 'No remarks provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="flex justify-between items-end mt-20 px-4">
                    <div className="text-center border-t-2 border-slate-900 pt-2 min-w-[200px]">
                      <p className="font-bold">Class Incharge</p>
                    </div>
                    <div className="text-center border-t-2 border-slate-900 pt-2 min-w-[200px]">
                      <p className="font-bold">Section Head</p>
                    </div>
                    <div className="text-center border-t-2 border-slate-900 pt-2 min-w-[200px]">
                      <p className="font-bold">Principal</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
