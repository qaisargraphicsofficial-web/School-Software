import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Certificate, UserProfile, Student } from '../types';
import { Award, Plus, Search, Download, User, Calendar, FileCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Certificates({ profile }: { profile: UserProfile | null }) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCert, setNewCert] = useState<Partial<Certificate>>({
    studentId: '',
    type: 'achievement',
    date: new Date().toISOString().split('T')[0],
    content: '',
  });

  useEffect(() => {
    fetchCertificates();
    fetchStudents();
  }, []);

  const fetchCertificates = async () => {
    try {
      const q = query(collection(db, 'certificates'));
      const snap = await getDocs(q);
      setCertificates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certificate)));
    } catch (error) {
      console.error("Error fetching certificates:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    const snap = await getDocs(collection(db, 'students'));
    setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
  };

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'certificates'), {
        ...newCert,
        campusId: profile?.campusId || 'main',
      });
      setIsModalOpen(false);
      fetchCertificates();
    } catch (error) {
      console.error("Error adding certificate:", error);
    }
  };

  const downloadCertificate = async (cert: Certificate) => {
    const element = document.getElementById(`cert-${cert.id}`);
    if (!element) return;
    
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Certificate-${cert.id}.pdf`);
  };

  const getStudentName = (id: string) => {
    const s = students.find(s => s.id === id);
    return s ? `${s.name} S/O ${s.parentName}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Digital Certificates</h1>
          <p className="text-slate-500 text-sm">Generate and issue digital certificates to students</p>
        </div>
        {profile?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Issue Certificate
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {certificates.map((cert) => (
          <motion.div
            key={cert.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Award className="w-6 h-6" />
              </div>
              <button
                onClick={() => downloadCertificate(cert)}
                className="flex items-center gap-2 text-indigo-600 text-sm font-medium hover:text-indigo-700"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
            
            <div id={`cert-${cert.id}`} className="p-8 border-4 border-double border-amber-200 rounded-lg text-center bg-amber-50/30">
              <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2 uppercase tracking-widest">Certificate of {cert.type}</h2>
              <p className="text-slate-500 italic mb-6">This is to certify that</p>
              <h3 className="text-3xl font-bold text-indigo-600 mb-4 underline decoration-amber-300 underline-offset-8">{getStudentName(cert.studentId)}</h3>
              <p className="text-slate-600 max-w-md mx-auto mb-8">{cert.content}</p>
              <div className="flex justify-between items-end px-8">
                <div className="text-left">
                  <div className="w-32 border-b border-slate-400 mb-1"></div>
                  <p className="text-xs text-slate-500">Principal Signature</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{cert.date}</p>
                  <p className="text-xs text-slate-500">Date Issued</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-4">Issue Digital Certificate</h2>
            <form onSubmit={handleAddCert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Student</label>
                <select
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newCert.studentId}
                  onChange={e => setNewCert({...newCert, studentId: e.target.value})}
                >
                  <option value="">Select a student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} S/O {s.parentName} ({s.rollNumber})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Certificate Type</label>
                <select
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newCert.type}
                  onChange={e => setNewCert({...newCert, type: e.target.value as any})}
                >
                  <option value="achievement">Achievement</option>
                  <option value="completion">Completion</option>
                  <option value="participation">Participation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content/Reason</label>
                <textarea
                  required
                  rows={3}
                  placeholder="For outstanding performance in..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newCert.content}
                  onChange={e => setNewCert({...newCert, content: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newCert.date}
                  onChange={e => setNewCert({...newCert, date: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Issue Certificate
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
