import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, where, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Student, UserProfile, Attendance, ExamResult } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { handleStorageError, StorageOperationType } from '../lib/storage-errors';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  IdCard, 
  Download, 
  Upload,
  Trash2, 
  X,
  Camera,
  School,
  Bus,
  Loader2,
  Eye,
  Calendar,
  GraduationCap,
  Info,
  MapPin,
  Phone,
  Mail,
  User,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  FileText,
  Printer,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import Papa from 'papaparse';

interface StudentsProps {
  profile: UserProfile | null;
}

export default function Students({ profile }: StudentsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'academic' | 'attendance'>('info');
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentAttendance, setStudentAttendance] = useState<Attendance[]>([]);
  const [studentExamResults, setStudentExamResults] = useState<ExamResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [classFilter, setClassFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const idCardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    rollNumber: '',
    class: '',
    section: '',
    parentName: '',
    contact: '',
    email: '',
    address: '',
    admissionDate: new Date().toISOString().split('T')[0],
    status: 'active',
    campusId: profile?.campusId || 'main',
    contactPerson: '',
    emergencyContact: '',
    previousSchool: '',
    dateOfBirth: '',
    gender: 'male',
    bloodGroup: '',
    whatsappNumber: '',
    caste: '',
    busNumber: '',
    route: '',
    pickupPoint: '',
    useTransport: false,
  });

  useEffect(() => {
    if (profile) {
      fetchStudents();
    }
  }, [profile]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'students'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Student));
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError(null);
    try {
      let photoUrl = formData.photoUrl || '';
      if (photoFile) {
        // Validate file size (e.g., 2MB limit)
        if (photoFile.size > 2 * 1024 * 1024) {
          setError('File is too large. Maximum size is 2MB.');
          setUploading(false);
          return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(photoFile.type)) {
          setError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
          setUploading(false);
          return;
        }

        try {
          const photoRef = ref(storage, `students/${Date.now()}_${photoFile.name}`);
          const snapshot = await uploadBytes(photoRef, photoFile);
          photoUrl = await getDownloadURL(snapshot.ref);
        } catch (storageErr) {
          const msg = handleStorageError(storageErr, StorageOperationType.UPLOAD, `students/${photoFile.name}`);
          setError(msg);
          setUploading(false);
          return;
        }
      }

      const studentToSave = {
        ...formData,
        photoUrl,
        busNumber: formData.useTransport ? formData.busNumber : '',
        route: formData.useTransport ? formData.route : '',
        pickupPoint: formData.useTransport ? formData.pickupPoint : '',
      };

      try {
        if (isEditMode && viewingStudent?.id) {
          await setDoc(doc(db, 'students', viewingStudent.id), studentToSave, { merge: true });
        } else {
          await addDoc(collection(db, 'students'), studentToSave);
        }
      } catch (firestoreErr: any) {
        try {
          handleFirestoreError(firestoreErr, isEditMode ? OperationType.UPDATE : OperationType.CREATE, 'students');
        } catch (e: any) {
          const errData = JSON.parse(e.message);
          setError(`Database Error: ${errData.error}`);
          setUploading(false);
          return;
        }
      }

      setIsModalOpen(false);
      setIsEditMode(false);
      setPhotoFile(null);
      setFormData({
        name: '',
        rollNumber: '',
        class: '',
        section: '',
        parentName: '',
        contact: '',
        email: '',
        address: '',
        admissionDate: new Date().toISOString().split('T')[0],
        status: 'active',
        contactPerson: '',
        emergencyContact: '',
        previousSchool: '',
        dateOfBirth: '',
        gender: 'male',
        bloodGroup: '',
        busNumber: '',
        route: '',
        pickupPoint: '',
        useTransport: false,
      });
      fetchStudents();
    } catch (error) {
      console.error("Error saving student:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (student: Student) => {
    setViewingStudent(student);
    setFormData(student);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteDoc(doc(db, 'students', id));
        fetchStudents();
      } catch (error) {
        console.error("Error deleting student:", error);
      }
    }
  };
  
  const handlePrintIdCard = () => {
    const printContent = document.getElementById('printable-id-card');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Student ID Card - ${viewingStudent?.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body class="flex items-center justify-center min-h-screen bg-slate-100">
          <div class="bg-white p-8">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleViewDetails = async (student: Student) => {
    setViewingStudent(student);
    setIsDetailModalOpen(true);
    setActiveDetailTab('info');
    
    // Fetch attendance and exam results
    try {
      const attendanceQuery = query(
        collection(db, 'attendance'), 
        where('targetId', '==', student.id),
        where('targetType', '==', 'student'),
        orderBy('date', 'desc')
      );
      const attendanceSnap = await getDocs(attendanceQuery);
      setStudentAttendance(attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));

      const examsQuery = query(
        collection(db, 'results'),
        where('studentId', '==', student.id),
        orderBy('term', 'desc')
      );
      const examsSnap = await getDocs(examsQuery);
      setStudentExamResults(examsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult)));
    } catch (error) {
      console.error("Error fetching student details:", error);
    }
  };

  const generateIDCard = async (student: Student) => {
    setSelectedStudent(student);
    // Wait for modal to render
    setTimeout(async () => {
      if (idCardRef.current) {
        const canvas = await html2canvas(idCardRef.current);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(imgData, 'PNG', 10, 10, 85, 55); // Standard ID card size
        pdf.save(`${student.name}_S_O_${student.parentName}_ID_Card.pdf`);
        setSelectedStudent(null);
      }
    }, 500);
  };

  const exportToCSV = () => {
    try {
      const headers = ['Name', 'Roll Number', 'Class', 'Section', 'Parent Name', 'Contact', 'Email', 'Address', 'Admission Date', 'Status', 'Contact Person', 'Emergency Contact', 'Previous School', 'DOB', 'Gender', 'Blood Group', 'Use Transport', 'Bus Number', 'Route', 'Pickup Point'];
      const data = filteredStudents.map(s => [
        s.name,
        s.rollNumber,
        s.class,
        s.section,
        s.parentName,
        s.contact,
        s.email,
        s.address,
        s.admissionDate,
        s.status,
        s.contactPerson || '',
        s.emergencyContact || '',
        s.previousSchool || '',
        s.dateOfBirth || '',
        s.gender || '',
        s.bloodGroup || '',
        s.useTransport ? 'Yes' : 'No',
        s.busNumber || '',
        s.route || '',
        s.pickupPoint || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...data.map(row => row.map(cell => `"${cell || ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setImporting(false);
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
          setCsvData(results.data);
          
          const initialMapping: Record<string, string> = {};
          const studentFields = [
            'name', 'parentName', 'rollNumber', 'class', 'section', 'contact', 'email', 'address', 'admissionDate', 'status',
            'contactPerson', 'emergencyContact', 'previousSchool', 'dateOfBirth', 'gender', 'bloodGroup', 'useTransport', 'busNumber', 'route', 'pickupPoint'
          ];
          
          studentFields.forEach(field => {
            const match = results.meta.fields?.find(h => h.toLowerCase().replace(/\s+/g, '') === field.toLowerCase());
            if (match) {
              initialMapping[field] = match;
            } else {
              initialMapping[field] = '';
            }
          });
          
          setColumnMapping(initialMapping);
          setIsMappingModalOpen(true);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: (error) => {
        console.error("PapaParse error:", error);
        setImporting(false);
        alert("Error parsing CSV file.");
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const executeImport = async () => {
    setImporting(true);
    setIsMappingModalOpen(false);
    try {
      const batchPromises = csvData.map(async (row) => {
        const studentData: Partial<Student> = {
          name: row[columnMapping['name']] || '',
          rollNumber: row[columnMapping['rollNumber']] || '',
          class: row[columnMapping['class']] || '',
          section: row[columnMapping['section']] || '',
          parentName: row[columnMapping['parentName']] || '',
          contact: row[columnMapping['contact']] || '',
          email: row[columnMapping['email']] || '',
          address: row[columnMapping['address']] || '',
          admissionDate: row[columnMapping['admissionDate']] || new Date().toISOString().split('T')[0],
          status: (row[columnMapping['status']] || 'active').toLowerCase() as 'active' | 'inactive',
          campusId: profile?.campusId || 'main',
          contactPerson: row[columnMapping['contactPerson']] || '',
          emergencyContact: row[columnMapping['emergencyContact']] || '',
          previousSchool: row[columnMapping['previousSchool']] || '',
          dateOfBirth: row[columnMapping['dateOfBirth']] || '',
          gender: (row[columnMapping['gender']] || 'male').toLowerCase() as 'male' | 'female' | 'other',
          bloodGroup: row[columnMapping['bloodGroup']] || '',
          useTransport: (row[columnMapping['useTransport']] || '').toLowerCase() === 'yes' || (row[columnMapping['useTransport']] || '').toLowerCase() === 'true',
          busNumber: row[columnMapping['busNumber']] || '',
          route: row[columnMapping['route']] || '',
          pickupPoint: row[columnMapping['pickupPoint']] || '',
        };
        return addDoc(collection(db, 'students'), studentData);
      });

      await Promise.all(batchPromises);
      fetchStudents();
      alert(`Successfully imported ${csvData.length} students.`);
    } catch (error) {
      console.error("Error importing CSV:", error);
      alert("Failed to import students.");
    } finally {
      setImporting(false);
      setCsvData([]);
      setCsvHeaders([]);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesClass = classFilter === 'all' || s.class === classFilter;
    
    let matchesDate = true;
    if (dateFilter.start) {
      matchesDate = matchesDate && s.admissionDate >= dateFilter.start;
    }
    if (dateFilter.end) {
      matchesDate = matchesDate && s.admissionDate <= dateFilter.end;
    }

    return matchesSearch && matchesStatus && matchesClass && matchesDate;
  });

  const classes = Array.from(new Set(students.map(s => s.class))).sort();

  return (
    <div className="space-y-6 no-print">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Student Directory</h1>
          <p className="text-slate-500 font-medium">Manage and track all student records across campuses.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={fetchStudents}
            className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            title="Refresh List"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCSV}
            accept=".csv"
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-secondary px-5 py-2.5 text-sm flex items-center gap-2"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import CSV
          </button>
          <button 
            onClick={exportToCSV}
            className="btn-secondary px-5 py-2.5 text-sm flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>
          {profile?.role === 'admin' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary"
            >
              <UserPlus className="w-5 h-5" />
              Digital Admission
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-5 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or roll number..."
            className="input-field pl-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'all', label: 'All', icon: GraduationCap },
            { id: 'active', label: 'Active', icon: CheckCircle2 },
            { id: 'inactive', label: 'Inactive', icon: XCircle },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id as any)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                statusFilter === filter.id 
                  ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <filter.icon className="w-3.5 h-3.5" />
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select 
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-transparent text-xs font-bold uppercase tracking-widest text-slate-600 focus:outline-none"
            >
              <option value="all">All Classes</option>
              {classes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input 
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
              className="bg-transparent text-[10px] font-bold uppercase text-slate-600 focus:outline-none"
            />
            <span className="text-slate-300">-</span>
            <input 
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
              className="bg-transparent text-[10px] font-bold uppercase text-slate-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Parent/Guardian</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Roll No</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Class</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Admission Date</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No students found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    onClick={() => handleViewDetails(student)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        {student.photoUrl ? (
                          <img 
                            src={student.photoUrl} 
                            alt={student.name} 
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm ring-1 ring-slate-100"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg border border-indigo-100">
                            {student.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 tracking-tight">{student.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{student.rollNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-medium text-slate-700">
                      {student.parentName || '-'}
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-mono text-sm font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                        {student.rollNumber}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{student.class}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Section {student.section}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-500">{student.admissionDate}</td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        student.status === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-500 border border-slate-100"
                      )}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(student);
                          }}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit Student"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(student);
                          }}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingStudent(student);
                            setIsIdCardModalOpen(true);
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Generate ID Card"
                        >
                          <IdCard className="w-5 h-5" />
                        </button>
                        {profile?.role === 'admin' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(student.id!);
                            }}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && viewingStudent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 no-print">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsDetailModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header with Profile Info */}
              <div className="p-8 bg-indigo-600 text-white relative">
                <button 
                  onClick={() => setIsDetailModalOpen(false)} 
                  className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-32 h-32 rounded-[32px] bg-white/20 backdrop-blur-md border-4 border-white/30 overflow-hidden shadow-2xl">
                    {viewingStudent.photoUrl ? (
                      <img 
                        src={viewingStudent.photoUrl} 
                        alt={viewingStudent.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-black">
                        {viewingStudent.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <h2 className="text-3xl font-black tracking-tight mb-2">{viewingStudent.name} S/O {viewingStudent.parentName}</h2>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest border border-white/20">
                        Roll: {viewingStudent.rollNumber}
                      </span>
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest border border-white/20">
                        Class: {viewingStudent.class} - {viewingStudent.section}
                      </span>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border",
                        viewingStudent.status === 'active' ? "bg-emerald-400/20 text-emerald-100 border-emerald-400/30" : "bg-slate-400/20 text-slate-100 border-slate-400/30"
                      )}>
                        {viewingStudent.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsIdCardModalOpen(true)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white text-xs font-bold uppercase tracking-widest border border-white/20 flex items-center gap-2 transition-all"
                    >
                      <IdCard className="w-4 h-4" />
                      ID Card
                    </button>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex px-8 pt-6 bg-slate-50 border-b border-slate-200 gap-8">
                {[
                  { id: 'info', label: 'Student Info', icon: Info },
                  { id: 'academic', label: 'Academic History', icon: GraduationCap },
                  { id: 'attendance', label: 'Attendance Records', icon: Calendar },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
                      activeDetailTab === tab.id ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {activeDetailTab === tab.id && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeDetailTab === 'info' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" />
                        Personal Details
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Parent/Guardian Name</p>
                          <p className="font-bold text-slate-900">{viewingStudent.parentName}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date of Birth</p>
                          <p className="font-bold text-slate-900">{viewingStudent.dateOfBirth || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gender</p>
                          <p className="font-bold text-slate-900 capitalize">{viewingStudent.gender || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Blood Group</p>
                          <p className="font-bold text-slate-900">{viewingStudent.bloodGroup || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Caste</p>
                          <p className="font-bold text-slate-900">{viewingStudent.caste || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Previous School</p>
                          <p className="font-bold text-slate-900">{viewingStudent.previousSchool || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Admission Date</p>
                          <p className="font-bold text-slate-900">{viewingStudent.admissionDate}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Bus className="w-5 h-5 text-indigo-600" />
                        Transport Details
                      </h3>
                      {viewingStudent.useTransport ? (
                        <div className="grid grid-cols-1 gap-4">
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bus Number</p>
                            <p className="font-bold text-slate-900">{viewingStudent.busNumber || 'N/A'}</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Route</p>
                            <p className="font-bold text-slate-900">{viewingStudent.route || 'N/A'}</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pickup Point</p>
                            <p className="font-bold text-slate-900">{viewingStudent.pickupPoint || 'N/A'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 text-center">
                          <Bus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500 font-bold text-sm">No transport service assigned.</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Phone className="w-5 h-5 text-indigo-600" />
                        Contact Information
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Phone className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Phone Number</p>
                            <p className="font-bold text-slate-900">{viewingStudent.contact}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Phone className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">WhatsApp Number</p>
                            <p className="font-bold text-slate-900">{viewingStudent.whatsappNumber || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Mail className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Email Address</p>
                            <p className="font-bold text-slate-900">{viewingStudent.email || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <MapPin className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Residential Address</p>
                            <p className="font-bold text-slate-900">{viewingStudent.address}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Contact Person</p>
                            <p className="font-bold text-slate-900">{viewingStudent.contactPerson || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Phone className="w-5 h-5 text-rose-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 text-rose-500">Emergency Contact</p>
                            <p className="font-bold text-slate-900">{viewingStudent.emergencyContact || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <School className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Bus Number</p>
                            <p className="font-bold text-slate-900">{viewingStudent.busNumber || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <MapPin className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Route</p>
                            <p className="font-bold text-slate-900">{viewingStudent.route || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <MapPin className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Pickup Point</p>
                            <p className="font-bold text-slate-900">{viewingStudent.pickupPoint || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'academic' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Examination History</h3>
                      <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-widest">
                        {studentExamResults.length} Records
                      </div>
                    </div>
                    {studentExamResults.length === 0 ? (
                      <div className="py-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                        <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-bold">No examination records found for this student.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {studentExamResults.map((result) => (
                          <div key={result.id} className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-4">
                              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-widest">
                                {result.term}
                              </span>
                              <span className="text-2xl font-black text-slate-900">{result.percentage}%</span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-4">{result.examType}</h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Grade</p>
                                <p className="text-lg font-black text-indigo-600">{result.grade}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Marks</p>
                                <p className="text-lg font-black text-slate-900">{Object.values(result.marks).reduce((a: number, b: number) => a + b, 0)}/{result.totalMarks}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Position</p>
                                <p className="text-lg font-black text-amber-600">{result.position}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeDetailTab === 'attendance' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Attendance Log</h3>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Present</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Absent</span>
                        </div>
                      </div>
                    </div>
                    {studentAttendance.length === 0 ? (
                      <div className="py-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-bold">No attendance records found for this student.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {studentAttendance.map((record) => (
                          <div 
                            key={record.id} 
                            className={cn(
                              "p-4 rounded-2xl border flex items-center justify-between transition-all",
                              record.status === 'present' 
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                                : record.status === 'absent'
                                ? "bg-rose-50 border-rose-100 text-rose-700"
                                : "bg-amber-50 border-amber-100 text-amber-700"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 opacity-50" />
                              <span className="font-bold text-sm">{record.date}</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">{record.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="btn-secondary"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admission Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 no-print">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <h2 className="text-xl font-bold">{isEditMode ? 'Edit Student Profile' : 'Digital Admission Form'}</h2>
                <button onClick={() => { setIsModalOpen(false); setIsEditMode(false); setError(null); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {error && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm animate-shake">
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="font-medium">{error}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Full Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Roll Number</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.rollNumber}
                      onChange={e => setFormData({...formData, rollNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Class</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.class}
                      onChange={e => setFormData({...formData, class: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Section</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.section}
                      onChange={e => setFormData({...formData, section: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Parent/Guardian Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.parentName}
                      onChange={e => setFormData({...formData, parentName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Contact Number</label>
                    <input
                      required
                      type="tel"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.contact}
                      onChange={e => setFormData({...formData, contact: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Parent Email</label>
                    <input
                      required
                      type="email"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Date of Birth</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.dateOfBirth}
                      onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Gender</label>
                    <select
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value as any})}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Blood Group</label>
                    <input
                      type="text"
                      placeholder="e.g. A+"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.bloodGroup}
                      onChange={e => setFormData({...formData, bloodGroup: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Contact Person (Other than Parent)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.contactPerson}
                      onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Emergency Contact</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.emergencyContact}
                      onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Previous School</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.previousSchool}
                      onChange={e => setFormData({...formData, previousSchool: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">WhatsApp Contact Number</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.whatsappNumber}
                      onChange={e => setFormData({...formData, whatsappNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Caste</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.caste}
                      onChange={e => setFormData({...formData, caste: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <Bus className="w-5 h-5 text-indigo-600" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-indigo-900">School Transport Service</p>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Enable if student uses school bus</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, useTransport: !formData.useTransport})}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          formData.useTransport ? "bg-indigo-600" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          formData.useTransport ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>

                  {formData.useTransport && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Bus Number</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          value={formData.busNumber}
                          onChange={e => setFormData({...formData, busNumber: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Route</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          value={formData.route}
                          onChange={e => setFormData({...formData, route: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Pickup Point</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          value={formData.pickupPoint}
                          onChange={e => setFormData({...formData, pickupPoint: e.target.value})}
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Student Photo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                        {photoFile ? (
                          <img src={URL.createObjectURL(photoFile)} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Address</label>
                  <textarea
                    required
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {uploading ? "Saving..." : isEditMode ? "Update Record" : "Complete Admission"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSV Mapping Modal */}
      <AnimatePresence>
        {isMappingModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Map CSV Columns</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Match your CSV headers to the student fields.</p>
                </div>
                <button 
                  onClick={() => setIsMappingModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  {[
                    { key: 'name', label: 'Full Name *', required: true },
                    { key: 'rollNumber', label: 'Roll Number *', required: true },
                    { key: 'class', label: 'Class *', required: true },
                    { key: 'section', label: 'Section *', required: true },
                    { key: 'parentName', label: 'Parent Name', required: false },
                    { key: 'contact', label: 'Contact Number', required: false },
                    { key: 'email', label: 'Email Address', required: false },
                    { key: 'address', label: 'Address', required: false },
                    { key: 'admissionDate', label: 'Admission Date', required: false },
                    { key: 'status', label: 'Status (active/inactive)', required: false },
                    { key: 'useTransport', label: 'Use Transport (Yes/No)', required: false },
                    { key: 'busNumber', label: 'Bus Number', required: false },
                    { key: 'route', label: 'Route', required: false },
                    { key: 'pickupPoint', label: 'Pickup Point', required: false },
                  ].map(field => (
                    <div key={field.key} className="flex items-center gap-4">
                      <div className="w-1/3">
                        <label className="block text-sm font-bold text-slate-700">
                          {field.label}
                        </label>
                      </div>
                      <div className="w-2/3">
                        <select
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={columnMapping[field.key] || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                        >
                          <option value="">-- Skip this field --</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {csvData.length > 0 && (
                  <div className="mt-8 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Data Preview (First Row)</h3>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                      {[
                        { key: 'name', label: 'Name' },
                        { key: 'rollNumber', label: 'Roll No.' },
                        { key: 'class', label: 'Class' },
                        { key: 'section', label: 'Section' },
                      ].map(field => (
                        <div key={field.key} className="flex justify-between border-b border-slate-200 pb-1">
                          <span className="text-slate-500 font-medium">{field.label}:</span>
                          <span className="font-bold text-slate-900 truncate max-w-[150px]">
                            {columnMapping[field.key] ? csvData[0][columnMapping[field.key]] || '-' : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setIsMappingModalOpen(false)}
                  className="px-6 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-white transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={executeImport}
                  disabled={importing || !columnMapping['name'] || !columnMapping['rollNumber'] || !columnMapping['class'] || !columnMapping['section']}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {importing ? "Importing..." : "Import Students"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ID Card Modal */}
      <AnimatePresence>
        {isIdCardModalOpen && viewingStudent && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm no-print"
              onClick={() => setIsIdCardModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden print-container"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between no-print">
                <h2 className="text-xl font-bold text-slate-900">Student ID Card</h2>
                <button onClick={() => setIsIdCardModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 flex flex-col items-center gap-8">
                <div id="printable-id-card" className="w-[350px] h-[220px] bg-white border-2 border-indigo-600 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                  <div className="bg-indigo-600 p-4 flex items-center gap-3">
                    <School className="w-8 h-8 text-white" />
                    <div>
                      <h3 className="text-white font-bold text-lg leading-tight">EduManage Pro</h3>
                      <p className="text-indigo-100 text-[10px] uppercase tracking-wider font-semibold">Student Identity Card</p>
                    </div>
                  </div>
                  <div className="flex-1 p-4 flex gap-4">
                    <div className="w-24 h-24 bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center overflow-hidden">
                      {viewingStudent.photoUrl ? (
                        <img 
                          src={viewingStudent.photoUrl} 
                          alt={viewingStudent.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <Camera className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">{viewingStudent.name}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Roll Number</p>
                          <p className="text-xs font-bold text-slate-700">{viewingStudent.rollNumber}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Class</p>
                          <p className="text-xs font-bold text-slate-700">{viewingStudent.class}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Section</p>
                          <p className="text-xs font-bold text-slate-700">{viewingStudent.section}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Campus</p>
                          <p className="text-xs font-bold text-slate-700">{viewingStudent.campusId || 'Main'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="w-20 h-20 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center">
                      <QRCodeSVG 
                        value={viewingStudent.id!} 
                        size={64}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  </div>
                  <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 font-medium">Valid for Academic Year 2026-27</p>
                    <div className="w-12 h-6 bg-slate-200 rounded"></div>
                  </div>
                </div>

                <div className="flex gap-3 w-full no-print">
                  <button 
                    onClick={handlePrintIdCard}
                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    <Printer className="w-5 h-5" />
                    Print ID Card
                  </button>
                  <button 
                    onClick={() => generateIDCard(viewingStudent)}
                    className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden ID Card Template for Generation */}
      <div className="fixed -left-[9999px] top-0">
        <div 
          ref={idCardRef}
          className="w-[350px] h-[220px] bg-white border-2 border-indigo-600 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="bg-indigo-600 p-4 flex items-center gap-3">
            <School className="w-8 h-8 text-white" />
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">EduManage Pro</h3>
              <p className="text-indigo-100 text-[10px] uppercase tracking-wider font-semibold">Student Identity Card</p>
            </div>
          </div>
          <div className="flex-1 p-4 flex gap-4">
            <div className="w-24 h-24 bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center overflow-hidden">
              {selectedStudent?.photoUrl ? (
                <img 
                  src={selectedStudent.photoUrl} 
                  alt={selectedStudent.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              ) : (
                <Camera className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-xl font-black text-slate-900 tracking-tight">{selectedStudent?.name}</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Roll Number</p>
                  <p className="text-xs font-bold text-slate-700">{selectedStudent?.rollNumber}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Class</p>
                  <p className="text-xs font-bold text-slate-700">{selectedStudent?.class}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Section</p>
                  <p className="text-xs font-bold text-slate-700">{selectedStudent?.section}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Campus</p>
                  <p className="text-xs font-bold text-slate-700">{selectedStudent?.campusId || 'Main'}</p>
                </div>
              </div>
            </div>
            <div className="w-20 h-20 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center">
              {selectedStudent?.id && (
                <QRCodeSVG 
                  value={selectedStudent.id} 
                  size={64}
                  level="H"
                  includeMargin={false}
                />
              )}
            </div>
          </div>
          <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-between items-center">
            <p className="text-[10px] text-slate-400 font-medium">Valid for Academic Year 2026-27</p>
            <div className="w-12 h-6 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
