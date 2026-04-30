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
import { 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as ReTooltip, 
  Legend as ReLegend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { onSnapshot, collection as firestoreCollection } from 'firebase/firestore';

interface AcademicProps {
  profile: UserProfile | null;
}

export default function Academic({ profile }: AcademicProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'qr-scan' | 'stats'>('attendance');
  const [students, setStudents] = useState<Student[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [isPrintingIDCards, setIsPrintingIDCards] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [selectedClass, setSelectedClass] = useState('All');
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
    let unsubscribe: () => void;
    if (activeTab === 'stats') {
      const campusId = profile?.campusId || 'main';
      
      // Real-time listener for attendance
      const aQuery = query(
        collection(db, 'attendance'),
        where('date', '==', selectedDate),
        where('campusId', '==', campusId)
      );

      unsubscribe = onSnapshot(aQuery, async (aSnap) => {
        try {
          // Fetch students of the selected class
          const sQuery = query(collection(db, 'students'), where('class', '==', selectedClass), where('campusId', '==', campusId));
          const sSnap = await getDocs(sQuery);
          const classStudentIds = sSnap.docs.map(doc => doc.id);

          if (classStudentIds.length === 0) {
            setAttendanceStats({ present: 0, absent: 0, late: 0, total: 0 });
            return;
          }

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
          console.error("Error processing real-time stats:", error);
        }
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeTab, selectedClass, selectedDate, profile]);

  const fetchAttendanceStats = async () => {
    // This is now handled by the useEffect onSnapshot for real-time updates
  };

    // Update student fetching to allow "All Classes"
    const fetchStudents = async () => {
      setLoading(true);
      try {
        let q;
        const baseConstraints = [where('campusId', '==', profile?.campusId || 'main')];
        
        if (selectedClass !== 'All') {
          q = query(collection(db, 'students'), where('class', '==', selectedClass), ...baseConstraints);
        } else {
          q = query(collection(db, 'students'), ...baseConstraints);
        }

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
            <option value="All">All Classes</option>
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
      <div className="card min-h-[400px]">
        {activeTab === 'stats' ? (
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Students</p>
                <p className="text-3xl font-black text-slate-900">{attendanceStats.total}</p>
              </div>
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Present</p>
                <p className="text-3xl font-black text-emerald-700">{attendanceStats.present}</p>
              </div>
              <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 shadow-sm">
                <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-1">Absent</p>
                <p className="text-3xl font-black text-rose-700">{attendanceStats.absent}</p>
              </div>
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 shadow-sm">
                <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Late</p>
                <p className="text-3xl font-black text-amber-700">{attendanceStats.late}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pie Chart */}
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Attendance Distribution</h4>
                <div style={{ height: '300px', width: '100%', minWidth: '200px' }}>
                  <ResponsiveContainer width="100%" aspect={1.5}>
                    <RePieChart>
                      <Pie
                        data={[
                          { name: 'Present', value: attendanceStats.present },
                          { name: 'Absent', value: attendanceStats.absent },
                          { name: 'Late', value: attendanceStats.late },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f43f5e" />
                        <Cell fill="#f59e0b" />
                      </Pie>
                      <ReTooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <ReLegend verticalAlign="bottom" height={36}/>
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Attendance Comparison</h4>
                <div style={{ height: '300px', width: '100%', minWidth: '200px' }}>
                  <ResponsiveContainer width="100%" aspect={1.5}>
                    <BarChart
                      data={[
                        { name: 'Present', count: attendanceStats.present, fill: '#10b981' },
                        { name: 'Absent', count: attendanceStats.absent, fill: '#f43f5e' },
                        { name: 'Late', count: attendanceStats.late, fill: '#f59e0b' },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }}
                      />
                      <ReTooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
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
        ) : null}
      </div>
    </div>
  );
}
