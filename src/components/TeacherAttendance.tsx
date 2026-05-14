import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Attendance } from '../types';
import { QrCode, Scan, Clock, CheckCircle2, History, X } from 'lucide-react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface TeacherAttendanceProps {
  profile: UserProfile | null;
}

export default function TeacherAttendance({ profile }: TeacherAttendanceProps) {
  const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark');
  const [attendanceMode, setAttendanceMode] = useState<'qr' | 'manual' | 'show-qr' | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [manualTime, setManualTime] = useState<string>(new Date().toTimeString().slice(0,5));

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, profile]);

  const fetchHistory = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const qConstraints = [
        where('targetId', '==', profile.uid),
        where('targetType', '==', 'staff')
      ];
      if (profile?.schoolId) {
        qConstraints.push(where('schoolId', '==', profile.schoolId));
      }
      const q = query(collection(db, 'attendance'), ...qConstraints);
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(records);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (attendanceMode === 'qr') {
      const scanner = new Html5QrcodeScanner("teacher-reader", { fps: 10, qrbox: 250 }, false);
      scanner.render(onScanSuccess, onScanError);
      return () => {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      };
    }
  }, [attendanceMode]);

  const onScanSuccess = async (decodedText: string) => {
    if (loading) return;
    if (decodedText !== profile?.uid) {
      setScanResult("Invalid QR Code: Does not match your profile.");
      return;
    }
    setLoading(true);
    try {
      await markAttendance('qr', new Date().toTimeString().slice(0,5));
      setScanResult("Attendance marked successfully via QR!");
      setTimeout(() => {
        setScanResult(null);
        setAttendanceMode(null);
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'attendance');
    } finally {
      setLoading(false);
    }
  };

  const onScanError = (err: any) => {
    // ignore
  };

  const markAttendance = async (method: 'manual' | 'qr', time: string) => {
    if (!profile) return;
    
    // Add attendance to Firestore
    const data: Partial<Attendance> = {
      date: new Date().toISOString().split('T')[0],
      targetId: profile.uid,
      targetType: 'staff',
      status: 'present',
      campusId: profile.campusId || 'main',
      schoolId: profile.schoolId || '',
      method: method,
    };
    
    // Attach time or create custom field if not in Attendance interface
    const attendanceExt = {
      ...data,
      timestamp: new Date().toISOString(),
      time: time,
      verified: method === 'qr',
    };

    const attendanceRef = collection(db, 'attendance');
    await addDoc(attendanceRef, attendanceExt);
  };

  const handleManualSubmit = async () => {
    setLoading(true);
    try {
      await markAttendance('manual', manualTime);
      setScanResult("Manual attendance marked successfully!");
      setTimeout(() => {
        setScanResult(null);
        setAttendanceMode(null);
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Attendance System</h2>
          <p className="text-slate-500 font-medium mt-1">Mark and track your daily attendance</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('mark')}
          className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'mark' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Mark Attendance
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          History
        </button>
      </div>

      {activeTab === 'mark' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-lg text-slate-800">Select Mode</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setAttendanceMode('qr')}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${
                  attendanceMode === 'qr' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <Scan className="w-8 h-8" />
                <span className="font-bold">Scan QR Code</span>
              </button>

              <button
                onClick={() => setAttendanceMode('manual')}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${
                  attendanceMode === 'manual' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <Clock className="w-8 h-8" />
                <span className="font-bold">Manual Entry</span>
              </button>
            </div>
            
            <button
                onClick={() => setAttendanceMode('show-qr')}
                className="w-full text-indigo-600 font-bold hover:underline py-2"
            >
               Show My QR ID Card
            </button>

            {scanResult && (
              <div className={`p-4 rounded-xl ${scanResult.includes('Error') || scanResult.includes('Invalid') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'} font-bold`}>
                {scanResult}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-center min-h-[300px]">
             {attendanceMode === 'show-qr' && (
                <div className="text-center space-y-4">
                  <h4 className="font-bold text-slate-800">Your ID Card Area</h4>
                  <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm mx-auto w-fit">
                    <QRCodeSVG value={profile?.uid || ''} size={150} />
                  </div>
                  <p className="text-sm text-slate-500">Scan this QR code to mark your attendance</p>
                </div>
             )}

             {attendanceMode === 'qr' && (
               <div className="w-full space-y-4">
                 <div id="teacher-reader" className="w-full overflow-hidden rounded-xl border-2 border-indigo-100"></div>
                 <p className="text-sm text-slate-500 text-center">Scan your ID Card QR Code. Time and date will be recorded securely.</p>
               </div>
             )}

             {attendanceMode === 'manual' && (
               <div className="w-full max-w-sm space-y-6">
                 <div>
                   <label className="text-sm font-bold text-slate-700 block mb-2">Time</label>
                   <input
                     type="time"
                     className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                     value={manualTime}
                     onChange={(e) => setManualTime(e.target.value)}
                   />
                 </div>
                 <button
                   onClick={handleManualSubmit}
                   disabled={loading}
                   className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition"
                 >
                   <CheckCircle2 className="w-5 h-5" />
                   Submit Attendance
                 </button>
               </div>
             )}

             {!attendanceMode && (
               <div className="text-center text-slate-400 font-medium">
                 <QrCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
                 Select an attendance mode from the left
               </div>
             )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Date & Time</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Method</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((record: any) => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{record.date}</div>
                        <div className="text-sm text-slate-500">{record.time || '00:00'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold capitalize">
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase">
                          {record.method === 'qr' ? <Scan className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {record.method || 'manual'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {record.verified ? (
                          <span className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Verified
                          </span>
                        ) : (
                          <span className="text-amber-600 font-bold text-sm flex items-center gap-1">
                            <Clock className="w-4 h-4" /> Unverified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-bold">No attendance records found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
