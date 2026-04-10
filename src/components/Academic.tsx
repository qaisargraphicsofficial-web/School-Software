import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, query, where, orderBy, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, Attendance, ExamResult, UserProfile, Staff } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  FileText, 
  Download, 
  GraduationCap,
  ChevronRight,
  Save,
  QrCode,
  Scan,
  Upload,
  Loader2,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ReportCard } from './ReportCard';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import Papa from 'papaparse';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface AcademicProps {
  profile: UserProfile | null;
}

export default function Academic({ profile }: AcademicProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'exams' | 'qr-scan' | 'stats'>('attendance');
  const [students, setStudents] = useState<Student[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isPrintingIDCards, setIsPrintingIDCards] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [selectedClass, setSelectedClass] = useState('10th');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [selectedTerm, setSelectedTerm] = useState('First Term');
  const [examType, setExamType] = useState('Monthly Test - April');
  const [marks, setMarks] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const reportCardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const subjects = ['Mathematics', 'Science', 'English', 'History', 'Geography'];

  useEffect(() => {
    if (activeTab === 'qr-scan' || (activeTab === 'attendance' && showScanner)) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render(onScanSuccess, onScanError);
      return () => {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      };
    }
  }, [activeTab, showScanner]);

  const onScanSuccess = async (decodedText: string) => {
    try {
      const date = new Date().toISOString().split('T')[0];
      let targetType: 'student' | 'staff' = 'student';
      let targetName = '';
      
      // Check if student
      const student = students.find(s => s.id === decodedText || s.rollNumber === decodedText);
      if (student) {
        setAttendance(prev => ({ ...prev, [student.id!]: 'present' }));
        targetName = student.name;
        targetType = 'student';
      } else {
        // Check if staff
        const staff = staffList.find(s => s.staffId === decodedText);
        if (staff) {
          targetName = staff.name;
          targetType = 'staff';
        }
      }

      if (targetName) {
        setScanResult(`Marked Present: ${targetName} (${targetType})`);
        
        try {
          await addDoc(collection(db, 'attendance'), {
            date,
            targetId: decodedText,
            targetType,
            status: 'present',
            method: 'qr',
            campusId: profile?.campusId || 'main',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'attendance');
        }
      } else {
        setScanResult(`Scanned: ${decodedText} (Not found in Students or Staff)`);
      }
      
      setTimeout(() => setScanResult(null), 3000);
    } catch (error) {
      console.error("QR Scan Error:", error);
    }
  };

  const onScanError = (err: any) => {
    // console.warn(err);
  };

  useEffect(() => {
    if (profile) {
      fetchStudents();
      fetchStaff();
    }
  }, [selectedClass, profile]);

  const fetchStaff = async () => {
    try {
      const q = query(collection(db, 'staff'));
      const snap = await getDocs(q);
      setStaffList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  useEffect(() => {
    if (students.length > 0) {
      fetchExistingResults();
    }
  }, [students, selectedTerm, examType]);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchAttendanceStats();
    }
  }, [activeTab, selectedClass, selectedDate]);

  const fetchAttendanceStats = async () => {
    setLoading(true);
    try {
      // First get students of the selected class to filter attendance by their IDs
      const sQuery = query(collection(db, 'students'), where('class', '==', selectedClass));
      const sSnap = await getDocs(sQuery);
      const classStudentIds = sSnap.docs.map(doc => doc.id);

      if (classStudentIds.length === 0) {
        setAttendanceStats({ present: 0, absent: 0, late: 0, total: 0 });
        return;
      }

      const aQuery = query(
        collection(db, 'attendance'),
        where('date', '==', selectedDate)
      );
      const aSnap = await getDocs(aQuery);
      
      const stats = { present: 0, absent: 0, late: 0, total: 0 };
      
      aSnap.docs.forEach(doc => {
        const data = doc.data();
        if (classStudentIds.includes(data.targetId)) {
          stats.total++;
          if (data.status === 'present') stats.present++;
          else if (data.status === 'absent') stats.absent++;
          else if (data.status === 'late') stats.late++;
        }
      });

      setAttendanceStats(stats);
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'students'), where('class', '==', selectedClass));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(data);
      
      // Initialize attendance
      const initialAttendance: Record<string, 'present' | 'absent' | 'late'> = {};
      data.forEach(s => {
        initialAttendance[s.id!] = 'present';
      });
      setAttendance(initialAttendance);
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
      
      // Initialize with 0s first
      students.forEach(s => {
        existingMarks[s.id!] = subjects.reduce((acc, sub) => ({ ...acc, [sub]: 0 }), {});
      });

      // Overlay existing data
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (existingMarks[data.studentId]) {
          existingMarks[data.studentId] = data.marks;
        }
      });
      
      setMarks(existingMarks);
    } catch (error) {
      console.error("Error fetching existing results:", error);
    }
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      const promises = Object.entries(attendance).map(([studentId, status]) => 
        addDoc(collection(db, 'attendance'), {
          date,
          targetId: studentId,
          targetType: 'student',
          status,
          campusId: profile?.campusId || 'main'
        })
      );
      await Promise.all(promises);
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert('Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status: 'present' | 'absent' | 'late') => {
    const newAttendance = { ...attendance };
    students.forEach(s => {
      newAttendance[s.id!] = status;
    });
    setAttendance(newAttendance);
  };

  const handleImportAttendanceCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          const newAttendance = { ...attendance };
          
          data.forEach(row => {
            const rollNo = row['Roll No'] || row['rollNumber'];
            const status = (row['Status'] || row['status'] || 'present').toLowerCase() as any;
            
            const student = students.find(s => s.rollNumber === rollNo);
            if (student && ['present', 'absent', 'late'].includes(status)) {
              newAttendance[student.id!] = status;
            }
          });

          setAttendance(newAttendance);
          alert('CSV parsed. Review the grid and click Submit to save.');
        } catch (error) {
          console.error("Error importing attendance CSV:", error);
          alert("Failed to parse CSV.");
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  const saveResults = async () => {
    try {
      const promises = Object.entries(marks).map(([studentId, studentMarks]) => {
        const total = Object.values(studentMarks).reduce((a, b) => (a as number) + (b as number), 0) as number;
        const percentage = (total / (subjects.length * 100)) * 100;
        let grade = 'F';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B';
        else if (percentage >= 60) grade = 'C';
        else if (percentage >= 50) grade = 'D';

        // Use a deterministic ID to prevent duplicates and allow updates
        const resultId = `${studentId}_${selectedTerm}_${examType.replace(/\s+/g, '_')}`;
        return setDoc(doc(db, 'results', resultId), {
          studentId,
          examType,
          term: selectedTerm,
          marks: studentMarks,
          totalMarks: total,
          percentage: parseFloat(percentage.toFixed(2)),
          grade,
          position: 0,
          updatedAt: new Date().toISOString()
        });
      });
      await Promise.all(promises);
      alert('Results saved/updated successfully!');
    } catch (error) {
      console.error("Error saving results:", error);
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
      {/* Tabs */}
      <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200/50 shadow-inner">
        <button
          onClick={() => {
            setActiveTab('attendance');
            setShowScanner(false);
          }}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
            activeTab === 'attendance' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Daily Attendance
        </button>
        <button
          onClick={() => {
            setActiveTab('qr-scan');
            setShowScanner(true);
          }}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
            activeTab === 'qr-scan' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <QrCode className="w-4 h-4" />
          QR Scanner
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
            activeTab === 'stats' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Attendance Stats
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
            activeTab === 'exams' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Examination Portal
        </button>
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
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Date</span>
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
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
        {activeTab === 'exams' && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Exam</span>
            <input 
              type="text"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        )}
        {activeTab === 'attendance' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPrintingIDCards(true)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Print ID Cards
            </button>
          </div>
        )}
      </div>

      {/* ID Cards Modal */}
      <AnimatePresence>
        {isPrintingIDCards && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsPrintingIDCards(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-5xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <QrCode className="w-6 h-6" />
                  <h2 className="text-2xl font-black tracking-tight">Student ID Cards: Class {selectedClass}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-colors"
                  >
                    Print All
                  </button>
                  <button onClick={() => setIsPrintingIDCards(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2">
                  {students.map((student) => (
                    <div key={student.id} className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm print:shadow-none print:border-slate-300">
                      <div className="bg-indigo-600 p-4 text-white text-center">
                        <h3 className="font-black text-sm uppercase tracking-widest">Student ID Card</h3>
                      </div>
                      <div className="p-6 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full mb-4 flex items-center justify-center text-slate-400">
                          <Users className="w-10 h-10" />
                        </div>
                        <h4 className="text-lg font-black text-slate-900 mb-1">{student.name}</h4>
                        <p className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest">Roll No: {student.rollNumber}</p>
                        
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
                          <QRCodeSVG value={student.id || student.rollNumber} size={100} />
                        </div>
                        
                        <div className="w-full grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <div className="text-left">
                            <p>Class</p>
                            <p className="text-slate-900">{student.class}</p>
                          </div>
                          <div className="text-right">
                            <p>Section</p>
                            <p className="text-slate-900">{student.section}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 border-t border-slate-100 text-center">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">EduManage Pro School System</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      <div className="card">
        {activeTab === 'stats' ? (
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-slate-500 text-sm font-medium mb-1">Total Students</p>
                <h4 className="text-2xl font-bold text-slate-900">{attendanceStats.total}</h4>
              </div>
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-sm font-medium">Present</p>
                </div>
                <h4 className="text-2xl font-bold text-emerald-700">{attendanceStats.present}</h4>
              </div>
              <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
                <div className="flex items-center gap-2 text-rose-600 mb-1">
                  <XCircle className="w-4 h-4" />
                  <p className="text-sm font-medium">Absent</p>
                </div>
                <h4 className="text-2xl font-bold text-rose-700">{attendanceStats.absent}</h4>
              </div>
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <p className="text-sm font-medium">Late</p>
                </div>
                <h4 className="text-2xl font-bold text-amber-700">{attendanceStats.late}</h4>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <GraduationCap className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Attendance Summary for {selectedClass}</h3>
              <p className="text-slate-500 max-w-md">
                Showing statistics for {new Date(selectedDate).toLocaleDateString(undefined, { dateStyle: 'long' })}. 
                {attendanceStats.total > 0 
                  ? ` Attendance rate is ${((attendanceStats.present / attendanceStats.total) * 100).toFixed(1)}%.`
                  : " No attendance records found for this selection."}
              </p>
            </div>
          </div>
        ) : activeTab === 'qr-scan' ? (
          <div className="p-8 flex flex-col items-center justify-center space-y-6">
            <div className="w-full max-w-md bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
              <div id="reader" className="overflow-hidden rounded-2xl"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Scan Student QR Code</h3>
              <p className="text-slate-500 text-sm">Position the QR code within the frame to mark attendance</p>
            </div>
            <AnimatePresence>
              {scanResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-100 text-emerald-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {scanResult}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : activeTab === 'attendance' ? (
          <div className="flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-slate-400" />
                <h3 className="font-bold text-slate-900">Bulk Actions</h3>
                <div className="h-4 w-px bg-slate-200 mx-2"></div>
                <button 
                  onClick={() => markAll('present')}
                  className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  Mark All Present
                </button>
                <button 
                  onClick={() => markAll('absent')}
                  className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                >
                  Mark All Absent
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowScanner(!showScanner)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
                    showScanner ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Scan className="w-3.5 h-3.5" />
                  {showScanner ? "Hide Scanner" : "Scan QR"}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportAttendanceCSV} 
                  accept=".csv" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Import CSV
                </button>
              </div>
            </div>

            {showScanner && (
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex flex-col items-center justify-center space-y-6">
                <div className="w-full max-w-md bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
                  <div id="reader" className="overflow-hidden rounded-2xl"></div>
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-bold text-slate-900">Scan Student QR Code</h3>
                  <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mt-1">Marking attendance for {selectedDate}</p>
                </div>
                <AnimatePresence>
                  {scanResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-emerald-100 text-emerald-700 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {scanResult}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Roll No</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center animate-pulse">Loading students...</td></tr>
                  ) : students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{student.name} S/O {student.parentName}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{student.rollNumber}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {[
                            { id: 'present', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                            { id: 'absent', icon: XCircle, color: 'text-rose-600 bg-rose-50' },
                            { id: 'late', icon: Clock, color: 'text-amber-600 bg-amber-50' }
                          ].map((btn) => (
                            <button
                              key={btn.id}
                              onClick={() => setAttendance({ ...attendance, [student.id!]: btn.id as any })}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                attendance[student.id!] === btn.id ? btn.color : "text-slate-400 hover:bg-slate-100"
                              )}
                            >
                              <btn.icon className="w-4 h-4" />
                              <span className="capitalize">{btn.id}</span>
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={saveAttendance}
                  disabled={saving || students.length === 0}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Submit Attendance
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student</th>
                  {subjects.map(sub => (
                    <th key={sub} className="px-6 py-4 text-sm font-semibold text-slate-600">{sub}</th>
                  ))}
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={subjects.length + 2} className="px-6 py-8 text-center animate-pulse">Loading students...</td></tr>
                ) : students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{student.name} S/O {student.parentName}</td>
                    {subjects.map(sub => (
                      <td key={sub} className="px-6 py-4">
                        <input
                          type="number"
                          max={100}
                          min={0}
                          className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={marks[student.id!]?.[sub] || 0}
                          onChange={(e) => setMarks({
                            ...marks,
                            [student.id!]: { ...marks[student.id!], [sub]: Number(e.target.value) }
                          })}
                        />
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
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm"
              >
                <Save className="w-5 h-5" />
                Submit All Results
              </button>
            </div>
          </div>
        )}
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
    </div>
  );
}
