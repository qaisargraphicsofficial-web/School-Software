import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Certificate, UserProfile, Student } from '../types';
import { Award, Plus, Search, Download, User, Calendar, FileCheck, Edit2, Trash2, X, Printer, Loader2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function Certificates({ profile }: { profile: UserProfile | null }) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState<Partial<Certificate>>({
    studentId: '',
    studentName: '',
    parentName: '',
    type: 'achievement',
    title: 'CERTIFICATE',
    subTitle: 'OF ACHIEVEMENT',
    date: new Date().toISOString().split('T')[0],
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin bibendum diam purus, vitae condimentum ipsum scelerisque eu. Suspendisse id elementum diam. Nulla rhoncus nulla nisl, non posuere massa accumsan quis. Donec ut augue blandit, fermentum purus eget, vehicula odio.',
    signature1Label: 'Signature',
    signature2Label: 'Signature',
  });

  useEffect(() => {
    fetchCertificates();
    fetchStudents();
  }, []);

  const fetchCertificates = async () => {
    try {
      const q = query(collection(db, 'certificates'), where('campusId', '==', profile?.campusId || 'main'));
      const snap = await getDocs(q);
      setCertificates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certificate)));
    } catch (error) {
      console.error("Error fetching certificates:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, 'students'), where('campusId', '==', profile?.campusId || 'main'));
      const snap = await getDocs(q);
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const handleStudentChange = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setFormData({
        ...formData,
        studentId,
        studentName: student.name,
        parentName: student.parentName,
      });
    } else {
      setFormData({
        ...formData,
        studentId: '',
        studentName: '',
        parentName: '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        campusId: profile?.campusId || 'main',
        updatedAt: new Date().toISOString(),
      };

      if (editingCert) {
        await updateDoc(doc(db, 'certificates', editingCert.id!), data);
      } else {
        await addDoc(collection(db, 'certificates'), data);
      }
      
      setIsModalOpen(false);
      setEditingCert(null);
      resetForm();
      fetchCertificates();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'certificates');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      studentId: '',
      studentName: '',
      parentName: '',
      type: 'achievement',
      title: 'CERTIFICATE',
      subTitle: 'OF ACHIEVEMENT',
      date: new Date().toISOString().split('T')[0],
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin bibendum diam purus, vitae condimentum ipsum scelerisque eu. Suspendisse id elementum diam. Nulla rhoncus nulla nisl, non posuere massa accumsan quis. Donec ut augue blandit, fermentum purus eget, vehicula odio.',
      signature1Label: 'Signature',
      signature2Label: 'Signature',
    });
  };

  const handleEdit = (cert: Certificate) => {
    setEditingCert(cert);
    setFormData(cert);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this certificate?')) return;
    try {
      await deleteDoc(doc(db, 'certificates', id));
      fetchCertificates();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'certificates');
    }
  };

  const downloadCertificate = async (cert: Certificate) => {
    const element = document.getElementById(`cert-preview-${cert.id}`);
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 3, // High quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${cert.studentName}-Certificate.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const printCertificate = (cert: Certificate) => {
    const printContent = document.getElementById(`cert-preview-${cert.id}`);
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('');
        } catch (e) {
          return '';
        }
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Certificate</title>
          <style>
            ${styles}
            @page { size: landscape; margin: 0; }
            body { margin: 0; padding: 0; }
            .print-container { width: 297mm; height: 210mm; }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent.outerHTML}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredCertificates = certificates.filter(cert => 
    (cert.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cert.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Certificates</h1>
          <p className="text-slate-500 text-sm font-medium">Design and issue professional certificates</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search certificates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-64"
            />
          </div>
          {profile?.role === 'admin' && (
            <button
              onClick={() => {
                setEditingCert(null);
                resetForm();
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm"
            >
              <Plus className="w-5 h-5" />
              New Certificate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {filteredCertificates.map((cert) => (
          <motion.div
            key={cert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-500"
          >
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 leading-tight">{cert.studentName}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cert.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printCertificate(cert)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  title="Print"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => downloadCertificate(cert)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  title="Download PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(cert)}
                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cert.id!)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-8 bg-slate-100/50">
              {/* Certificate Preview */}
              <div 
                id={`cert-preview-${cert.id}`}
                className="relative w-full aspect-[1.414/1] bg-white shadow-2xl overflow-hidden font-serif"
                style={{ minHeight: '400px' }}
              >
                {/* Background Design Elements */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  {/* Top Right Triangle */}
                  <div className="absolute top-0 right-0 w-[40%] h-[40%]" style={{ backgroundColor: '#1e1b4b', clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
                  <div className="absolute top-0 right-0 w-[35%] h-[35%]" style={{ backgroundColor: '#fbbf24', clipPath: 'polygon(100% 0, 20% 0, 100% 80%)' }}></div>
                  
                  {/* Bottom Left Triangle */}
                  <div className="absolute bottom-0 left-0 w-[40%] h-[40%]" style={{ backgroundColor: '#1e1b4b', clipPath: 'polygon(0 100%, 0 0, 100% 100%)' }}></div>
                  <div className="absolute bottom-0 left-0 w-[35%] h-[35%]" style={{ backgroundColor: '#fbbf24', clipPath: 'polygon(0 100%, 0 20%, 80% 100%)' }}></div>
                  
                  {/* Border Frame */}
                  <div className="absolute inset-8 border-[1px]" style={{ borderColor: '#e2e8f0' }}></div>
                  <div className="absolute inset-10 border-[1px]" style={{ borderColor: '#e2e8f0' }}></div>
                </div>

                {/* Content */}
                <div className="relative h-full flex flex-col items-center justify-center px-16 py-12 text-center">
                  <h1 className="text-5xl font-black tracking-[0.2em] mb-2" style={{ color: '#1e293b' }}>{cert.title}</h1>
                  <h2 className="text-xl font-bold tracking-[0.3em] mb-8" style={{ color: '#475569' }}>{cert.subTitle}</h2>
                  
                  {/* Decorative Diamonds */}
                  <div className="flex items-center gap-2 mb-8">
                    <div className="w-2 h-2 rotate-45" style={{ backgroundColor: '#fbbf24' }}></div>
                    <div className="w-3 h-3 rotate-45" style={{ backgroundColor: '#1e1b4b' }}></div>
                    <div className="w-2 h-2 rotate-45" style={{ backgroundColor: '#fbbf24' }}></div>
                  </div>

                  <p className="text-sm italic mb-6" style={{ color: '#64748b' }}>This certificate is proudly presented to</p>
                  
                  <h3 className="text-5xl font-serif italic mb-8" style={{ fontFamily: 'Playfair Display, serif', color: '#0f172a' }}>
                    {cert.studentName}
                  </h3>

                  <div className="max-w-xl mx-auto mb-12">
                    <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
                      {cert.content}
                    </p>
                  </div>

                  {/* Bottom Section */}
                  <div className="w-full flex justify-between items-end mt-auto px-12">
                    <div className="text-center">
                      <div className="w-40 border-b mb-2" style={{ borderColor: '#94a3b8' }}></div>
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#94a3b8' }}>{cert.signature1Label}</p>
                    </div>

                    {/* Badge */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-xl" style={{ backgroundColor: '#1e1b4b', borderColor: '#fbbf24' }}>
                        <div className="text-center">
                          <p className="text-[8px] font-black uppercase leading-none" style={{ color: '#fbbf24' }}>TOP</p>
                          <p className="text-[10px] font-black text-white uppercase leading-none">BRAND</p>
                          <p className="text-[8px] font-black uppercase leading-none" style={{ color: '#fbbf24' }}>AWARD</p>
                        </div>
                      </div>
                      {/* Ribbons */}
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                        <div className="w-4 h-8" style={{ backgroundColor: '#fbbf24', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}></div>
                        <div className="w-4 h-8" style={{ backgroundColor: '#fbbf24', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}></div>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="w-40 border-b mb-2" style={{ borderColor: '#94a3b8' }}></div>
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#94a3b8' }}>{cert.signature2Label}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6" />
                  <h2 className="text-2xl font-black tracking-tight">
                    {editingCert ? 'Edit Certificate' : 'Issue New Certificate'}
                  </h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Details */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recipient Details</h3>
                    
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Select Student</label>
                      <select
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={formData.studentId}
                        onChange={e => handleStudentChange(e.target.value)}
                      >
                        <option value="">Select a student</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Certificate Type</label>
                      <select
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as any})}
                      >
                        <option value="achievement">Achievement</option>
                        <option value="completion">Completion</option>
                        <option value="participation">Participation</option>
                        <option value="excellence">Excellence</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Date</label>
                      <input
                        type="date"
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                      />
                    </div>

                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pt-4">Certificate Content</h3>
                    
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Main Title</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Sub Title</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={formData.subTitle}
                        onChange={e => setFormData({...formData, subTitle: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Description / Content</label>
                      <textarea
                        required
                        rows={5}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                        value={formData.content}
                        onChange={e => setFormData({...formData, content: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Left Signature Label</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          value={formData.signature1Label}
                          onChange={e => setFormData({...formData, signature1Label: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Right Signature Label</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          value={formData.signature2Label}
                          onChange={e => setFormData({...formData, signature2Label: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Preview */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Preview</h3>
                    <div className="sticky top-0 border-2 border-slate-100 rounded-[32px] overflow-hidden shadow-xl">
                      {/* Preview Render */}
                      <div className="relative w-full aspect-[1.414/1] bg-white overflow-hidden font-serif scale-[0.9] origin-top">
                        {/* Background Design Elements */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                          <div className="absolute top-0 right-0 w-[40%] h-[40%]" style={{ backgroundColor: '#1e1b4b', clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
                          <div className="absolute top-0 right-0 w-[35%] h-[35%]" style={{ backgroundColor: '#fbbf24', clipPath: 'polygon(100% 0, 20% 0, 100% 80%)' }}></div>
                          <div className="absolute bottom-0 left-0 w-[40%] h-[40%]" style={{ backgroundColor: '#1e1b4b', clipPath: 'polygon(0 100%, 0 0, 100% 100%)' }}></div>
                          <div className="absolute bottom-0 left-0 w-[35%] h-[35%]" style={{ backgroundColor: '#fbbf24', clipPath: 'polygon(0 100%, 0 20%, 80% 100%)' }}></div>
                          <div className="absolute inset-8 border-[1px]" style={{ borderColor: '#e2e8f0' }}></div>
                          <div className="absolute inset-10 border-[1px]" style={{ borderColor: '#e2e8f0' }}></div>
                        </div>

                        {/* Content */}
                        <div className="relative h-full flex flex-col items-center justify-center px-12 py-8 text-center">
                          <h1 className="text-3xl font-black tracking-[0.2em] mb-1" style={{ color: '#1e293b' }}>{formData.title}</h1>
                          <h2 className="text-sm font-bold tracking-[0.3em] mb-4" style={{ color: '#475569' }}>{formData.subTitle}</h2>
                          
                          <div className="flex items-center gap-1.5 mb-4">
                            <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: '#fbbf24' }}></div>
                            <div className="w-2 h-2 rotate-45" style={{ backgroundColor: '#1e1b4b' }}></div>
                            <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: '#fbbf24' }}></div>
                          </div>

                          <p className="text-[10px] italic mb-3" style={{ color: '#64748b' }}>This certificate is proudly presented to</p>
                          
                          <h3 className="text-3xl font-serif italic mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#0f172a' }}>
                            {formData.studentName || 'Name Surname'}
                          </h3>

                          <div className="max-w-md mx-auto mb-6">
                            <p className="text-[10px] leading-relaxed" style={{ color: '#475569' }}>
                              {formData.content}
                            </p>
                          </div>

                          <div className="w-full flex justify-between items-end mt-auto px-8">
                            <div className="text-center">
                              <div className="w-24 border-b mb-1" style={{ borderColor: '#94a3b8' }}></div>
                              <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#94a3b8' }}>{formData.signature1Label}</p>
                            </div>

                            <div className="relative">
                              <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-lg" style={{ backgroundColor: '#1e1b4b', borderColor: '#fbbf24' }}>
                                <div className="text-center">
                                  <p className="text-[5px] font-black uppercase leading-none" style={{ color: '#fbbf24' }}>TOP</p>
                                  <p className="text-[6px] font-black text-white uppercase leading-none">BRAND</p>
                                  <p className="text-[5px] font-black uppercase leading-none" style={{ color: '#fbbf24' }}>AWARD</p>
                                </div>
                              </div>
                            </div>

                            <div className="text-center">
                              <div className="w-24 border-b mb-1" style={{ borderColor: '#94a3b8' }}></div>
                              <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#94a3b8' }}>{formData.signature2Label}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-[2] px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {editingCert ? 'Update Certificate' : 'Issue Certificate'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
