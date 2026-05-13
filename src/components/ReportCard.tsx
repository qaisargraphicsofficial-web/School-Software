import React, { useState, useEffect } from 'react';
import { Student, ExamResult, SchoolSettings, ExamType } from '../types';
import { Printer } from 'lucide-react';

interface ReportCardProps {
  student: Student;
  result: ExamResult | undefined;
  allResults: ExamResult[];
  examTypes: ExamType[];
  schoolSettings: SchoolSettings | null;
  selectedExamTypeId: string;
}

export const ReportCard: React.FC<ReportCardProps> = ({ 
  student, 
  result, 
  allResults, 
  examTypes, 
  schoolSettings,
  selectedExamTypeId
}) => {
  const [editedResult, setEditedResult] = useState<ExamResult | undefined>(result);
  const [studentName, setStudentName] = useState(student.name);

  useEffect(() => {
    setEditedResult(result);
    setStudentName(student.name);
  }, [result, student]);

  if (!editedResult) return <div className="p-10 text-center">No result found.</div>;

  const calculateGrade = (percentage: number) => {
    if (percentage < 40) return 'F';
    if (percentage < 50) return 'E';
    if (percentage < 60) return 'D';
    if (percentage < 70) return 'C';
    if (percentage < 80) return 'B';
    return 'A';
  };

  const handleMarkChange = (subject: string, field: 'total' | 'obtained', value: number) => {
    if (!editedResult) return;
    const newMarks = { ...editedResult.marks };
    newMarks[subject] = { ...newMarks[subject], [field]: value };
    
    // Recalculate
    let totalObtained = 0;
    let totalMax = 0;
    Object.values(newMarks).forEach((m: any) => {
      totalObtained += m.obtained;
      totalMax += m.total;
    });

    setEditedResult({
      ...editedResult,
      marks: newMarks,
      totalObtained,
      totalMax,
      percentage: (totalObtained / totalMax) * 100
    });
  };

  const PreviewContent = () => (
    <div className="w-[210mm] mx-auto bg-white p-8 border border-slate-300 shadow-lg font-serif text-slate-900 min-h-[297mm]">
      {/* School Header */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <img src={schoolSettings?.logoUrl || "https://picsum.photos/seed/school/100/100"} alt="Logo" className="w-20 h-20 object-contain" />
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-1">{schoolSettings?.schoolName || "Chenab College Shorkot"}</h1>
          <p className="text-xl font-medium uppercase tracking-widest border-b-2 border-slate-900 inline-block">TERM WISE REPORT</p>
        </div>
      </div>
      
      {/* Student/Exam Info */}
      <div className="flex justify-between mb-6">
        <div className="border border-slate-900 p-2 w-48 font-bold">{studentName}</div>
        <div className="text-right">
          <div>Class: {student.class}-{student.section}</div>
        </div>
      </div>

      {/* Marks Table */}
      <table className="w-full border-collapse border border-slate-900 mb-6 text-center">
        <thead>
          <tr className="bg-slate-200">
            <th className="border border-slate-900 p-1">Subject</th>
            <th className="border border-slate-900 p-1">Max</th>
            <th className="border border-slate-900 p-1">Obtained</th>
            <th className="border border-slate-900 p-1">%</th>
            <th className="border border-slate-900 p-1">Grade</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(editedResult.marks).map(([subject, m]: [string, any]) => (
            <tr key={subject}>
              <td className="border border-slate-900 p-1 text-left">{subject}</td>
              <td className="border border-slate-900 p-1">{m.total}</td>
              <td className="border border-slate-900 p-1 font-bold">{m.obtained}</td>
              <td className="border border-slate-900 p-1">{((m.obtained / m.total) * 100).toFixed(1)}%</td>
              <td className="border border-slate-900 p-1 font-bold">{calculateGrade((m.obtained / m.total) * 100)}</td>
            </tr>
          ))}
          <tr className="bg-slate-200 font-bold">
            <td className="border border-slate-900 p-1">Total</td>
            <td className="border border-slate-900 p-1">{editedResult.totalMax}</td>
            <td className="border border-slate-900 p-1">{editedResult.totalObtained}</td>
            <td className="border border-slate-900 p-1">{editedResult.percentage.toFixed(1)}%</td>
            <td className="border border-slate-900 p-1">{editedResult.percentage >= 40 ? 'PASS' : 'FAIL'}</td>
          </tr>
        </tbody>
      </table>

      {/* Result Summary */}
      <div className="mb-6">
        <div className="bg-slate-300 text-center py-1 border border-slate-900">
          <h4 className="font-bold uppercase">Result Summary</h4>
        </div>
        <table className="w-full border-collapse border border-slate-900 text-center text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-900 p-1">Term</th>
              <th className="border border-slate-900 p-1">Total</th>
              <th className="border border-slate-900 p-1">Obtained</th>
              <th className="border border-slate-900 p-1">%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-900 p-1">Current</td>
              <td className="border border-slate-900 p-1">{editedResult.totalMax}</td>
              <td className="border border-slate-900 p-1">{editedResult.totalObtained}</td>
              <td className="border border-slate-900 p-1">{editedResult.percentage.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="font-bold text-center text-xl mt-4">
        RESULT: {editedResult.percentage >= 40 ? 'PROMOTED' : 'NOT PROMOTED'}
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 p-0 md:p-8 flex justify-center items-center min-h-screen print:bg-white print:block print:p-0">
      <div className="print:block">
        <PreviewContent />
      </div>
    </div>
  );
};
