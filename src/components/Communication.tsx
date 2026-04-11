import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Notice, UserProfile, Student, ExamResult, Attendance, BulkMessage } from '../types';
import { 
  Bell, 
  Plus, 
  Trash2, 
  X, 
  Calendar, 
  Users, 
  Megaphone,
  UserCircle,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Mail,
  MessageSquare,
  History,
  Loader2,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CommunicationProps { profile: UserProfile | null; }

export default function Communication({ profile }: CommunicationProps) {
  const [activeTab, setActiveTab] = useState<'notices' | 'bulk' | 'directory'>('notices');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [bulkMessages, setBulkMessages] = useState<BulkMessage[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linkedStudentId, setLinkedStudentId] = useState(profile?.studentId);
  const [linkingRollNumber, setLinkingRollNumber] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [sendingProgress, setSendingProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [childData, setChildData] = useState<{
    student: Student | null;
    results: ExamResult[];
    attendance: Attendance[];
  }>({ student: null, results: [], attendance: [] });

  const [formData, setFormData] = useState<Partial<Notice>>({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    targetAudience: 'all',
  });

  const [bulkFormData, setBulkFormData] = useState<Partial<BulkMessage>>({
    subject: '',
    content: '',
    type: 'email',
    targetClass: 'All',
  });

  const templates = [
    { id: 'general', name: 'General Announcement', content: 'Dear Parent, this is an important announcement from EduManage Pro regarding [TOPIC]. Please check the school portal for more details.' },
    { id: 'fee', name: 'Fee Reminder', content: 'Dear Parent, this is a reminder regarding the outstanding fees for your child. Please ensure payment is made by the due date to avoid any inconvenience.' },
    { id: 'attendance', name: 'Attendance Alert', content: 'Dear Parent, your child was marked absent today. Please provide a justification or contact the school office if this is an error.' },
    { id: 'exam', name: 'Exam Result', content: 'Dear Parent, the exam results for the recent term have been published. You can view your child\'s performance on the school portal.' },
    { id: 'emergency', name: 'Emergency: School Closed', content: 'URGENT: Dear Parent, please be informed that the school will remain closed tomorrow [DATE] due to [REASON]. We apologize for the short notice.' },
    { id: 'weather', name: 'Weather Advisory', content: 'Dear Parent, due to extreme weather conditions, school timings have been adjusted. Please check the portal for revised timings.' },
  ];

  const handleQuickBroadcast = (templateId: string, type: 'email' | 'whatsapp' | 'sms') => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setBulkFormData({
        subject: template.name,
        content: template.content,
        type: type,
        targetClass: 'All'
      });
      setIsBulkModalOpen(true);
      setSelectedTemplate(templateId);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setBulkFormData({ ...bulkFormData, content: template.content });
      setSelectedTemplate(templateId);
    } else {
      setSelectedTemplate('');
    }
  };

  useEffect(() => {
    fetchNotices();
    if (profile?.role === 'admin') {
      fetchBulkMessages();
    }
    if (profile?.role === 'admin' || profile?.role === 'staff') {
      fetchStudents();
    }
    if (profile?.role === 'parent' && linkedStudentId) {
      fetchChildData(linkedStudentId);
    }
  }, [profile, linkedStudentId]);

  const fetchNotices = async () => {
    try {
      const q = query(collection(db, 'notices'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setNotices(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Notice)));
    } catch (error) {
      console.error("Error fetching notices:", error);
    }
  };

  const fetchBulkMessages = async () => {
    try {
      const q = query(collection(db, 'bulk_messages'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setBulkMessages(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as BulkMessage)));
    } catch (error) {
      console.error("Error fetching bulk messages:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      const snap = await getDocs(collection(db, 'students'));
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Student)));
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildData = async (studentId: string) => {
    try {
      const sSnap = await getDocs(query(collection(db, 'students'), where('rollNumber', '==', studentId)));
      if (!sSnap.empty) {
        const student = { id: sSnap.docs[0].id, ...sSnap.docs[0].data() } as Student;
        const rSnap = await getDocs(query(collection(db, 'results'), where('studentId', '==', student.id)));
        const aSnap = await getDocs(query(collection(db, 'attendance'), where('targetId', '==', student.id)));
        
        setChildData({
          student,
          results: rSnap.docs.map(doc => doc.data() as ExamResult),
          attendance: aSnap.docs.map(doc => doc.data() as Attendance)
        });
      }
    } catch (error) {
      console.error("Error fetching child data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'notices'), formData);
      setIsModalOpen(false);
      setFormData({ title: '', content: '', date: new Date().toISOString().split('T')[0], targetAudience: 'all' });
      fetchNotices();
    } catch (error) {
      console.error("Error adding notice:", error);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let recipients = students.filter(s => s.status === 'active');
      if (bulkFormData.targetClass !== 'All') {
        recipients = recipients.filter(s => s.class === bulkFormData.targetClass);
      }

      if (recipients.length === 0) {
        alert("No active students found for the selected criteria.");
        return;
      }

      setSendingProgress({ current: 0, total: recipients.length });

      // Simulate sending progress
      for (let i = 1; i <= recipients.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for visual effect
        setSendingProgress(prev => prev ? { ...prev, current: i } : null);
      }

      if (bulkFormData.type === 'email') {
        const emails = recipients.map(s => s.email).filter(Boolean) as string[];
        if (emails.length === 0) {
          setSendingProgress(null);
          alert("No parent emails found for the selected students.");
          return;
        }

        const response = await fetch('/api/send-bulk-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: bulkFormData.subject,
            content: bulkFormData.content,
            recipients: emails
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to send emails");
        }
      } else if (bulkFormData.type === 'sms') {
        const phoneNumbers = recipients.map(s => s.contact).filter(Boolean) as string[];
        if (phoneNumbers.length === 0) {
          setSendingProgress(null);
          alert("No parent contact numbers found for the selected students.");
          return;
        }

        const response = await fetch('/api/send-bulk-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: bulkFormData.content,
            recipients: phoneNumbers
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to send SMS");
        }
      } else if (bulkFormData.type === 'whatsapp') {
        const phoneNumbers = recipients.map(s => s.whatsappNumber || s.contact).filter(Boolean) as string[];
        if (phoneNumbers.length === 0) {
          setSendingProgress(null);
          alert("No parent WhatsApp numbers found for the selected students.");
          return;
        }

        const response = await fetch('/api/send-bulk-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: bulkFormData.content,
            recipients: phoneNumbers
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to send WhatsApp messages");
        }
      }

      await addDoc(collection(db, 'bulk_messages'), {
        ...bulkFormData,
        date: new Date().toISOString().split('T')[0],
        recipientsCount: recipients.length,
        status: 'sent'
      });

      setSendingProgress(null);
      setIsBulkModalOpen(false);
      setBulkFormData({ subject: '', content: '', type: 'email', targetClass: 'All' });
      fetchBulkMessages();
      alert(`Bulk ${bulkFormData.type} sent successfully to ${recipients.length} parents!`);
    } catch (error) {
      setSendingProgress(null);
      console.error("Error sending bulk message:", error);
      alert("Failed to send bulk message. Check console for details.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this notice?')) {
      await deleteDoc(doc(db, 'notices', id));
      fetchNotices();
    }
  };

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid || !linkingRollNumber) return;

    setIsLinking(true);
    setLinkError(null);
    try {
      // Find student by roll number
      const q = query(collection(db, 'students'), where('rollNumber', '==', linkingRollNumber.trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setLinkError("No student found with this Roll Number. Please check and try again.");
        setIsLinking(false);
        return;
      }

      // Update user profile in Firestore
      await updateDoc(doc(db, 'users', profile.uid), {
        studentId: linkingRollNumber.trim()
      });

      setLinkedStudentId(linkingRollNumber.trim());
      alert("Student linked successfully!");
    } catch (error) {
      console.error("Error linking student:", error);
      setLinkError("An error occurred while linking. Please try again.");
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('notices')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'notices' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Notice Board
        </button>
        {profile?.role === 'admin' && (
          <>
            <button
              onClick={() => setActiveTab('bulk')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === 'bulk' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Bulk Messaging
            </button>
            <button
              onClick={() => setActiveTab('directory')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === 'directory' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Student Directory
            </button>
          </>
        )}
      </div>

      {activeTab === 'directory' ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Student Directory</h2>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                {students.length} Students
              </span>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Parent/Guardian</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Phone</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">WhatsApp</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Other</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{student.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{student.parentName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{student.email || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{student.contact || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{student.whatsappNumber || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{student.emergencyContact || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : activeTab === 'notices' ? (
        <>
          {/* Notice Board Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg">
                  <Megaphone className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Digital Notice Board</h2>
              </div>
              {profile?.role === 'admin' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                  Post Notice
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full py-12 text-center animate-pulse">Loading notices...</div>
              ) : notices.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
                  No active notices at the moment.
                </div>
              ) : (
                notices.map((notice) => (
                  <motion.div
                    layout
                    key={notice.id}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        notice.targetAudience === 'all' ? "bg-indigo-100 text-indigo-700" :
                        notice.targetAudience === 'parents' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {notice.targetAudience}
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {notice.date}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{notice.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">{notice.content}</p>
                    {profile?.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(notice.id!)}
                        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* Parent Portal Section */}
          {profile?.role === 'parent' && (
            <section className="space-y-6 pt-8 border-t border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-lg">
                  <UserCircle className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Parent Portal - Child Progress</h2>
              </div>

              {!linkedStudentId ? (
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 max-w-2xl mx-auto text-center space-y-6">
                  <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto text-indigo-600">
                    <LinkIcon className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Link Your Child's Account</h3>
                    <p className="text-slate-500 font-medium">Enter your child's Roll Number to access their academic progress, attendance, and fee details.</p>
                  </div>
                  
                  <form onSubmit={handleLinkStudent} className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter Roll Number (e.g., STU-001)"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg text-center"
                        value={linkingRollNumber}
                        onChange={(e) => setLinkingRollNumber(e.target.value)}
                        required
                      />
                    </div>
                    
                    {linkError && (
                      <div className="flex items-center gap-2 text-rose-600 text-sm font-bold justify-center bg-rose-50 p-3 rounded-xl">
                        <AlertCircle className="w-4 h-4" />
                        {linkError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLinking || !linkingRollNumber}
                      className="w-full btn-primary py-4 text-lg shadow-lg shadow-indigo-200 disabled:opacity-50"
                    >
                      {isLinking ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Linking Account...
                        </>
                      ) : (
                        <>
                          <LinkIcon className="w-6 h-6" />
                          Link Student ID
                        </>
                      )}
                    </button>
                  </form>
                  
                  <p className="text-xs text-slate-400 font-medium">
                    Can't find the roll number? Please check your child's ID card or contact the school administration.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-700 text-2xl font-black">
                        {childData.student?.name?.[0]}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{childData.student?.name} S/O {childData.student?.parentName}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-full tracking-widest">
                            Roll: {childData.student?.rollNumber}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded-full tracking-widest">
                            Class {childData.student?.class} - {childData.student?.section}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => linkedStudentId && fetchChildData(linkedStudentId)}
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                        title="Refresh Data"
                      >
                        <History className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to unlink this student?")) {
                            if (profile?.uid) {
                              await updateDoc(doc(db, 'users', profile.uid), { studentId: null });
                              setLinkedStudentId(undefined);
                              setChildData({ student: null, results: [], attendance: [] });
                            }
                          }
                        }}
                        className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                        title="Unlink Student"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Attendance Summary */}
                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          Attendance
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent 5 Days</span>
                      </div>
                      <div className="space-y-3">
                        {childData.attendance.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-sm font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            No attendance records yet.
                          </div>
                        ) : (
                          childData.attendance.slice(0, 5).map((a, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-bold text-slate-600">{a.date}</span>
                              </div>
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                a.status === 'present' ? "bg-emerald-100 text-emerald-700" :
                                a.status === 'absent' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                              )}>
                                {a.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Exam Results */}
                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-6 lg:col-span-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          Academic Performance
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latest Results</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {childData.results.length === 0 ? (
                          <div className="col-span-full py-12 text-center text-slate-400 text-sm font-medium bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                            No exam results published yet.
                          </div>
                        ) : (
                          childData.results.slice(0, 4).map((r, idx) => (
                            <div key={idx} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
                              <div className="flex justify-between items-center mb-4">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{r.term}</span>
                                  <span className="text-sm font-black text-slate-900">{r.examType}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-2xl font-black text-indigo-600">{r.percentage}%</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Grade: {r.grade}</span>
                                </div>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${r.percentage}%` }}
                                  className="bg-indigo-600 h-full rounded-full"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      ) : (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Send className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Bulk Messaging Center</h2>
            </div>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              New Bulk Message
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Broadcast Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-600" />
                  Quick Broadcast (One-Click)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-900">Emergency Closure</h4>
                    </div>
                    <p className="text-xs text-slate-500">Send an urgent notice about school closure to all parents immediately.</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleQuickBroadcast('emergency', 'whatsapp')}
                        className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </button>
                      <button 
                        onClick={() => handleQuickBroadcast('emergency', 'email')}
                        className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Mail className="w-3 h-3" /> Email
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-900">Fee Reminder</h4>
                    </div>
                    <p className="text-xs text-slate-500">Send a gentle reminder to all parents regarding outstanding fee payments.</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleQuickBroadcast('fee', 'whatsapp')}
                        className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </button>
                      <button 
                        onClick={() => handleQuickBroadcast('fee', 'email')}
                        className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Mail className="w-3 h-3" /> Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-400" />
                  Message History
                </h3>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Type</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Subject/Preview</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Recipients</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bulkMessages.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No history found.</td></tr>
                      ) : bulkMessages.map((msg) => (
                        <tr key={msg.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              msg.type === 'email' ? "bg-blue-100 text-blue-600" : 
                              msg.type === 'sms' ? "bg-amber-100 text-amber-600" :
                              "bg-emerald-100 text-emerald-600"
                            )}>
                              {msg.type === 'email' ? <Mail className="w-4 h-4" /> : 
                               msg.type === 'sms' ? <Bell className="w-4 h-4" /> :
                               <MessageSquare className="w-4 h-4" />}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-900">{msg.subject || 'WhatsApp Message'}</p>
                            <p className="text-xs text-slate-500">Target: {msg.targetClass || 'All'}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{msg.content}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{msg.recipientsCount} Parents</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{msg.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Quick Stats</h3>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">Emails Sent</span>
                  </div>
                  <span className="text-xl font-bold text-slate-900">
                    {bulkMessages.filter(m => m.type === 'email').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">WhatsApp Sent</span>
                  </div>
                  <span className="text-xl font-bold text-slate-900">
                    {bulkMessages.filter(m => m.type === 'whatsapp').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <Bell className="w-5 h-5 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">SMS Sent</span>
                  </div>
                  <span className="text-xl font-bold text-slate-900">
                    {bulkMessages.filter(m => m.type === 'sms').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Add Notice Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <h2 className="text-xl font-bold">Post New Notice</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Notice Title</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Target Audience</label>
                  <select
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.targetAudience}
                    onChange={e => setFormData({...formData, targetAudience: e.target.value as any})}
                  >
                    <option value="all">All</option>
                    <option value="parents">Parents Only</option>
                    <option value="staff">Staff Only</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Content</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
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
                    className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Post Notice
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Message Modal */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsBulkModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <h2 className="text-xl font-bold">New Bulk Message</h2>
                <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleBulkSubmit} className="p-6 space-y-6">
                <div className="flex p-1 bg-slate-100 rounded-xl w-full">
                  <button
                    type="button"
                    onClick={() => setBulkFormData({...bulkFormData, type: 'email'})}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                      bulkFormData.type === 'email' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkFormData({...bulkFormData, type: 'whatsapp'})}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                      bulkFormData.type === 'whatsapp' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkFormData({...bulkFormData, type: 'sms'})}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                      bulkFormData.type === 'sms' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    <Bell className="w-4 h-4" />
                    SMS
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Message Template (Optional)</label>
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={selectedTemplate}
                    onChange={e => handleTemplateSelect(e.target.value)}
                  >
                    <option value="">Select a template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Target Audience (Class)</label>
                  <select
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={bulkFormData.targetClass}
                    onChange={e => setBulkFormData({...bulkFormData, targetClass: e.target.value})}
                  >
                    <option value="All">All Parents</option>
                    {Array.from(new Set(students.map(s => s.class))).sort().map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                </div>

                {bulkFormData.type === 'email' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Subject</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={bulkFormData.subject}
                      onChange={e => setBulkFormData({...bulkFormData, subject: e.target.value})}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Message Content</label>
                  <textarea
                    required
                    rows={6}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Type your message here..."
                    value={bulkFormData.content}
                    onChange={e => setBulkFormData({...bulkFormData, content: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-400">
                    This message will be sent to all {students.filter(s => s.status === 'active').length} active student parents.
                  </p>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    disabled={!!sendingProgress}
                    onClick={() => setIsBulkModalOpen(false)}
                    className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!!sendingProgress || !bulkFormData.content}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {sendingProgress ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending ({sendingProgress.current}/{sendingProgress.total})...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Bulk {bulkFormData.type === 'email' ? 'Emails' : bulkFormData.type === 'sms' ? 'SMS' : 'WhatsApp'}
                      </>
                    )}
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
