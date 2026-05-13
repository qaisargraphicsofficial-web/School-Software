import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamResult, Student, ExamType } from '../types';
import { Loader2, ArrowLeft, Printer, School, GraduationCap, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function PublicResultView() {
  const { slug, resultId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ result: ExamResult; student: Student; examType: ExamType } | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const resDoc = await getDoc(doc(db, 'exam_results', resultId!));
        if (resDoc.exists()) {
          const resData = resDoc.data() as ExamResult;
          const [stuDoc, etDoc] = await Promise.all([
            getDoc(doc(db, 'students', resData.studentId)),
            getDoc(doc(db, 'exam_types', resData.examTypeId))
          ]);
          
          if (stuDoc.exists() && etDoc.exists()) {
            setData({
              result: resData,
              student: { id: stuDoc.id, ...stuDoc.data() } as Student,
              examType: { id: etDoc.id, ...etDoc.data() } as ExamType
            });
          }
        }
      } catch (error) {
        console.error("Error fetching public result:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [resultId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Generating Report Card...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <h1 className="text-xl font-black text-slate-900 mb-4">Result Not Found</h1>
        <Link to={`/school/${slug}`} className="text-indigo-600 font-bold uppercase tracking-widest text-xs hover:underline">Back to School Site</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between no-print">
          <Link to={`/school/${slug}`} className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Website
          </Link>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all text-[10px] uppercase tracking-widest"
          >
            <Printer className="w-4 h-4" /> Print Marksheet
          </button>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden p-12 print:shadow-none print:border-none print:p-0">
          {/* School Header */}
          <div className="text-center space-y-4 border-b-4 border-double border-slate-100 pb-12 mb-12">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-2xl">
              <School className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">The {slug}</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em]">Academic Progress Report</p>
            </div>
            <div className="inline-block px-6 py-2 bg-indigo-50 text-indigo-700 rounded-full font-black text-sm uppercase tracking-widest">
              {data.examType.name} ({data.examType.term})
            </div>
          </div>

          {/* Student Profile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Name</p>
                  <p className="text-xl font-black text-slate-900 uppercase">{data.student.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Roll Number</p>
                  <p className="text-xl font-black text-slate-900">{data.student.rollNumber}</p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col items-center justify-center text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Final Grade</p>
                 <p className="text-6xl font-black text-indigo-600">{data.result.grade}</p>
                 <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest">{data.result.percentage.toFixed(1)}% Score</p>
              </div>
            </div>
          </div>

          {/* Marks Table */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest pl-2">Subject Performance</h3>
            <div className="overflow-hidden border border-slate-100 rounded-[32px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Obtained</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Total</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {Object.entries(data.result.marks || {}).map(([subject, marks]: [string, any]) => (
                    <tr key={subject}>
                      <td className="px-8 py-4 font-black uppercase text-slate-700">{subject}</td>
                      <td className="px-8 py-4 text-center font-black text-slate-900">{marks.obtained}</td>
                      <td className="px-8 py-4 text-center text-slate-400">{marks.total}</td>
                      <td className="px-8 py-4 text-right">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                          marks.obtained >= marks.pass ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {marks.obtained >= marks.pass ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/50">
                    <td className="px-8 py-6 font-black uppercase text-slate-900 text-lg">Grand Total</td>
                    <td className="px-8 py-6 text-center font-black text-indigo-600 text-2xl" colSpan={2}>
                      {data.result.totalObtained} / {data.result.totalMax}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <span className="text-xl font-black text-slate-900">{data.result.percentage.toFixed(1)}%</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-16 pt-12 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-8">
             <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Issue Date</p>
                <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
             </div>
             <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Result Status</p>
                <p className="text-sm font-black text-emerald-600 uppercase">Promoted</p>
             </div>
             <div className="col-span-2 flex flex-col items-center justify-end">
                <div className="w-48 border-b-2 border-slate-900 mb-2"></div>
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">School Controller Signature</p>
             </div>
          </div>
        </div>

        <div className="text-center no-print">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Marksheet generated by EduManage Pro</p>
        </div>
      </div>
    </div>
  );
}
