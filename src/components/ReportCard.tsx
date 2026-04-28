import React from 'react';
import { Student, ExamResult, SchoolSettings, ExamType } from '../types';

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
  const calculateGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  };

  const getGradeDescription = (grade: string) => {
    switch (grade) {
      case 'A+': return 'Outstanding';
      case 'A': return 'Excellent';
      case 'B': return 'Very Good';
      case 'C': return 'Good';
      case 'D': return 'Fair';
      case 'E': return 'Satisfactory';
      default: return 'Needs Improvement';
    }
  };

  if (!result) {
    return (
      <div className="p-10 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl">
        No result data found for this exam type.
      </div>
    );
  }

  const selectedExamType = examTypes.find(t => t.id === selectedExamTypeId);

  return (
    <div className="w-[800px] mx-auto bg-white p-10 border border-slate-200 shadow-sm font-serif text-slate-900 overflow-hidden">
      {/* School Header */}
      <div className="flex items-center justify-center gap-8 mb-8">
        <img 
          src={schoolSettings?.logoUrl || "https://picsum.photos/seed/school/100/100"} 
          alt="Logo" 
          className="w-24 h-24 object-contain"
          referrerPolicy="no-referrer"
        />
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-2">{schoolSettings?.schoolName || "Chenab College Shorkot"}</h1>
          <p className="text-2xl font-medium uppercase tracking-widest border-b-2 border-slate-900 inline-block pb-1">
            TERM WISE REPORT, 2025-26
          </p>
        </div>
      </div>

      {/* Student Info Bar */}
      <div className="flex justify-between items-end mb-8">
        <div className="border-2 border-slate-900 p-4 min-w-[300px]">
          <h2 className="text-2xl font-bold uppercase">{student.name}</h2>
        </div>
        <div className="text-right space-y-1">
          <div className="flex items-center justify-end gap-4">
            <span className="text-lg font-bold">Class | Section</span>
            <span className="text-lg font-bold min-w-[80px] text-center">{student.class}-{student.section}</span>
          </div>
          <div className="flex items-center justify-end gap-4">
            <span className="text-lg font-bold">Position in Section</span>
            <span className="text-lg font-bold min-w-[80px] text-center">
              {result.position || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Exam Title */}
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold">
          {selectedExamType?.name || 'Term'} Exams {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </h3>
      </div>

      {/* Marks Table */}
      <table className="w-full border-collapse border-2 border-slate-900 mb-8 text-center">
        <thead>
          <tr className="bg-slate-200">
            <th className="border-2 border-slate-900 p-2 font-bold uppercase">Subject</th>
            <th className="border-2 border-slate-900 p-2 font-bold uppercase">Max Marks</th>
            <th className="border-2 border-slate-900 p-2 font-bold uppercase">Pass Marks</th>
            <th className="border-2 border-slate-900 p-2 font-bold uppercase">Obtained Marks</th>
            <th className="border-2 border-slate-900 p-2 font-bold uppercase">%Age</th>
            <th className="border-2 border-slate-900 p-2 font-bold uppercase">Grade</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(result.marks).map(([subject, m]: [string, any]) => (
            <tr key={subject}>
              <td className="border-2 border-slate-900 p-2 font-medium text-left">{subject}</td>
              <td className="border-2 border-slate-900 p-2">{m.total}</td>
              <td className="border-2 border-slate-900 p-2">{m.pass}</td>
              <td className="border-2 border-slate-900 p-2 font-bold">{m.obtained}</td>
              <td className="border-2 border-slate-900 p-2">{((m.obtained / m.total) * 100).toFixed(2)}</td>
              <td className="border-2 border-slate-900 p-2 font-bold">
                {calculateGrade((m.obtained / m.total) * 100)} {getGradeDescription(calculateGrade((m.obtained / m.total) * 100))}
              </td>
            </tr>
          ))}
          <tr className="bg-slate-200 font-bold">
            <td className="border-2 border-slate-900 p-2 uppercase">Total</td>
            <td className="border-2 border-slate-900 p-2">{result.totalMax}</td>
            <td className="border-2 border-slate-900 p-2">---</td>
            <td className="border-2 border-slate-900 p-2">{result.totalObtained}</td>
            <td className="border-2 border-slate-900 p-2">{result.percentage.toFixed(2)}</td>
            <td className="border-2 border-slate-900 p-2">
              {result.percentage >= 40 ? 'PASS' : 'FAIL'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Result Summary */}
      <div className="mb-8">
        <div className="bg-slate-300 text-center py-1 border-2 border-slate-900 mb-0">
          <h4 className="text-xl font-bold uppercase">Result Summary</h4>
        </div>
        <table className="w-full border-collapse border-2 border-slate-900 text-center text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-slate-900 p-2 font-bold">Exams</th>
              <th className="border-2 border-slate-900 p-2 font-bold">Total Marks</th>
              <th className="border-2 border-slate-900 p-2 font-bold">Obtained Marks</th>
              <th className="border-2 border-slate-900 p-2 font-bold">Term wise Percentage</th>
              <th className="border-2 border-slate-900 p-2 font-bold">Weightage</th>
              <th className="border-2 border-slate-900 p-2 font-bold">After Applying Weightage Obtained Percentage</th>
            </tr>
          </thead>
          <tbody>
            {['1st Term', '2nd Term', '3rd Term'].map((term) => {
              const termResult = allResults.find(r => r.studentId === student.id && examTypes.find(t => t.id === r.examTypeId)?.term === term);
              const weightage = term === '3rd Term' ? 40 : 30;
              const weightedPercentage = termResult ? (termResult.percentage * weightage) / 100 : 0;
              return (
                <tr key={term}>
                  <td className="border-2 border-slate-900 p-2 font-bold">{term}</td>
                  <td className="border-2 border-slate-900 p-2">{termResult?.totalMax.toFixed(2) || '0.00'}</td>
                  <td className="border-2 border-slate-900 p-2">{termResult?.totalObtained.toFixed(2) || '0.00'}</td>
                  <td className="border-2 border-slate-900 p-2">{termResult?.percentage.toFixed(2) || '0.00'}</td>
                  <td className="border-2 border-slate-900 p-2">{weightage}%</td>
                  <td className="border-2 border-slate-900 p-2">{weightedPercentage.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Final Result */}
      <div className="mb-8">
        <div className="bg-slate-300 text-center py-1 border-2 border-slate-900 mb-0">
          <h4 className="text-xl font-bold uppercase">Final Result</h4>
        </div>
        <table className="w-full border-collapse border-2 border-slate-900 text-center">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-slate-900 p-2 font-bold uppercase">Combined Percentage of All Terms</th>
              <th className="border-2 border-slate-900 p-2 font-bold uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-2 border-slate-900 p-4 text-2xl font-bold">
                {(() => {
                  const studentResults = allResults.filter(r => r.studentId === student.id);
                  let combined = 0;
                  studentResults.forEach(r => {
                    const term = examTypes.find(t => t.id === r.examTypeId)?.term;
                    const weightage = term === '3rd Term' ? 0.4 : 0.3;
                    combined += r.percentage * weightage;
                  });
                  return combined.toFixed(2);
                })()}
              </td>
              <td className="border-2 border-slate-900 p-4 text-2xl font-bold">
                {(() => {
                  const studentResults = allResults.filter(r => r.studentId === student.id);
                  let combined = 0;
                  studentResults.forEach(r => {
                    const term = examTypes.find(t => t.id === r.examTypeId)?.term;
                    const weightage = term === '3rd Term' ? 0.4 : 0.3;
                    combined += r.percentage * weightage;
                  });
                  return combined >= 40 ? 'PROMOTED' : 'NOT PROMOTED';
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Remarks */}
      <div className="mb-12">
        <div className="bg-slate-300 text-center py-1 border-2 border-slate-900 mb-0">
          <h4 className="text-xl font-bold uppercase">Remarks</h4>
        </div>
        <div className="border-2 border-slate-900 p-6 min-h-[80px]">
          <p className="text-lg italic">
            {result.remarks || 'No remarks provided.'}
          </p>
        </div>
      </div>

      {/* Signatures */}
      <div className="flex justify-between items-end mt-20 px-4">
        <div className="text-center border-t-2 border-slate-900 pt-2 min-w-[200px]">
          <p className="font-bold">Class Incharge</p>
        </div>
        <div className="text-center border-t-2 border-slate-900 pt-2 min-w-[200px]">
          <p className="font-bold">Section Head</p>
        </div>
        <div className="text-center border-t-2 border-slate-900 pt-2 min-w-[200px]">
          <p className="font-bold">Principal</p>
        </div>
      </div>
    </div>
  );
};
