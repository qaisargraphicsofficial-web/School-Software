import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, query, where, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, Attendance, UserProfile, Staff } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Save,
  QrCode,
  Scan,
  Upload,
  Loader2,
  Users,
  Plus,
  FileText,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import Papa from 'papaparse';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface AcademicProps {
  profile: UserProfile | null;
}

export default function Academic({ profile }: AcademicProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'qr-scan' | 'stats' | 'subjects'>('attendance');
  const [students, setStudents] = useState<Student[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [isPrintingIDCards, setIsPrintingIDCards] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [selectedClass, setSelectedClass] = useState('10th');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    class: '',
    teacherId: '',
    teacherName: ''
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const defaultSubjects = ['Mathematics', 'Science', 'English', 'History', 'Geography'];

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
      fetchSubjects();
    }
  }, [selectedClass, profile]);

  const fetchSubjects = async () => {
    try {
      const q = query(collection(db, 'subjects'), where('campusId', '==', profile?.campusId || 'main'));
      const snap = await getDocs(q);
      setSubjectsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...subjectForm,
        campusId: profile?.campusId || 'main',
        updatedAt: new Date().toISOString()
      };

      if (editingSubject) {
        await setDoc(doc(db, 'subjects', editingSubject.id), data);
      } else {
        await addDoc(collection(db, 'subjects'), data);
      }

      setIsSubjectModalOpen(false);
      setEditingSubject(null);
      setSubjectForm({ name: '', code: '', class: '', teacherId: '', teacherName: '' });
      fetchSubjects();
    } catch (error) {
      console.error("Error saving subject:", error);
    }
  };

  const deleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      await deleteDoc(doc(db, 'subjects', id));
      fetchSubjects();
    } catch (error) {
      console.error("Error deleting subject:", error);
    }
  };

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
          onClick={() => setActiveTab('subjects')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
            activeTab === 'subjects' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Subjects
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
        {activeTab === 'subjects' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Subject Management</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Add, edit, and assign subjects to classes and teachers.</p>
            </div>
            <button 
              onClick={() => {
                setEditingSubject(null);
                setSubjectForm({ name: '', code: '', class: '', teacherId: '', teacherName: '' });
                setIsSubjectModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Subject
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjectsList.map((subject) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingSubject(subject);
                        setSubjectForm({
                          name: subject.name,
                          code: subject.code,
                          class: subject.class,
                          teacherId: subject.teacherId,
                          teacherName: subject.teacherName
                        });
                        setIsSubjectModalOpen(true);
                      }}
                      className="p-2 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteSubject(subject.id)}
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{subject.name}</h3>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Code: {subject.code}</p>
                
                <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Class</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{subject.class}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Teacher</span>
                    <span className="font-bold text-indigo-600">{subject.teacherName || 'Not Assigned'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
            {subjectsList.length === 0 && (
              <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">No subjects added yet. Click "Add Subject" to get started.</p>
              </div>
            )}
          </div>

          {/* Subject Modal */}
          <AnimatePresence>
            {isSubjectModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                    <h3 className="text-xl font-black tracking-tight">{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h3>
                    <button onClick={() => setIsSubjectModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <form onSubmit={handleSubjectSubmit} className="p-8 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Subject Name</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={subjectForm.name}
                        onChange={e => setSubjectForm({...subjectForm, name: e.target.value})}
                        placeholder="e.g. Mathematics"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Subject Code</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={subjectForm.code}
                        onChange={e => setSubjectForm({...subjectForm, code: e.target.value})}
                        placeholder="e.g. MATH101"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Assigned Class</label>
                      <select
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={subjectForm.class}
                        onChange={e => setSubjectForm({...subjectForm, class: e.target.value})}
                      >
                        <option value="">Select Class</option>
                        {['Nursery', 'KG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Responsible Teacher</label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={subjectForm.teacherId}
                        onChange={e => {
                          const t = staffList.find(s => s.id === e.target.value);
                          setSubjectForm({
                            ...subjectForm,
                            teacherId: e.target.value,
                            teacherName: t ? t.name : ''
                          });
                        }}
                      >
                        <option value="">Select Teacher</option>
                        {staffList.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsSubjectModalOpen(false)}
                        className="flex-1 px-6 py-3 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-50 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                      >
                        {editingSubject ? 'Update' : 'Save'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
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
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Parent/Guardian</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Roll No</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center animate-pulse">Loading students...</td></tr>
                  ) : students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{student.parentName || '-'}</td>
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
        ) : null}
      </div>
    </div>
  );
}
