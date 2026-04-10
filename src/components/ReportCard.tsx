import React from 'react';
import { Student, ExamResult } from '../types';

interface ReportCardProps {
  student: Student;
  marks: Record<string, number>;
  term: string;
  examType: string;
}

export const ReportCard: React.FC<ReportCardProps> = ({ student, marks, term, examType }) => {
  const subjects = Object.keys(marks);
  const totalMarks: number = subjects.length * 100;
  const obtainedMarks: number = (Object.values(marks) as number[]).reduce((a, b) => a + b, 0);
  const percentage: number = (obtainedMarks / totalMarks) * 100;
  
  let grade = 'F';
  if (percentage >= 90) grade = 'A+';
  else if (percentage >= 80) grade = 'A';
  else if (percentage >= 70) grade = 'B';
  else if (percentage >= 60) grade = 'C';
  else if (percentage >= 50) grade = 'D';

  return (
    <div className="p-8 bg-white text-slate-900 w-[210mm] min-h-[297mm] mx-auto border border-slate-200">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold uppercase">Chenab College Shorkot</h1>
        <h2 className="text-xl font-semibold mt-2">TERM WISE REPORT, 2025-26</h2>
      </div>

      {/* Student Info */}
      <div className="grid grid-cols-2 gap-4 mb-6 border-b border-slate-300 pb-4">
        <div className="border border-slate-400 p-2 font-bold text-lg">{student.name}</div>
        <div className="space-y-1">
          <div className="flex justify-between"><span>Class | Section</span><span className="font-bold">{student.class} - {student.section}</span></div>
          <div className="flex justify-between"><span>Position in Section</span><span className="font-bold">36</span></div>
        </div>
      </div>

      <h3 className="text-center font-bold text-lg mb-4">{term} Exams Feb, 2026</h3>

      {/* Exam Table */}
      <table className="w-full border-collapse border border-slate-400 mb-6">
        <thead>
          <tr className="bg-slate-200">
            <th className="border border-slate-400 p-2">Subject</th>
            <th className="border border-slate-400 p-2">Max Marks</th>
            <th className="border border-slate-400 p-2">Pass Marks</th>
            <th className="border border-slate-400 p-2">Obtained Marks</th>
            <th className="border border-slate-400 p-2">%Age</th>
            <th className="border border-slate-400 p-2">Grade</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map(sub => (
            <tr key={sub}>
              <td className="border border-slate-400 p-2">{sub}</td>
              <td className="border border-slate-400 p-2 text-center">100</td>
              <td className="border border-slate-400 p-2 text-center">40</td>
              <td className="border border-slate-400 p-2 text-center">{marks[sub]}</td>
              <td className="border border-slate-400 p-2 text-center">{marks[sub]}</td>
              <td className="border border-slate-400 p-2 text-center">{grade}</td>
            </tr>
          ))}
          <tr className="bg-slate-200 font-bold">
            <td className="border border-slate-400 p-2">Total</td>
            <td className="border border-slate-400 p-2 text-center">{totalMarks}</td>
            <td className="border border-slate-400 p-2 text-center">-</td>
            <td className="border border-slate-400 p-2 text-center">{obtainedMarks}</td>
            <td className="border border-slate-400 p-2 text-center">{percentage.toFixed(2)}</td>
            <td className="border border-slate-400 p-2 text-center">{grade}</td>
          </tr>
        </tbody>
      </table>

      {/* Result Summary */}
      <h3 className="font-bold mb-2">Result Summary</h3>
      <table className="w-full border-collapse border border-slate-400 mb-6">
        <thead>
          <tr className="bg-slate-200">
            <th className="border border-slate-400 p-2">Exams</th>
            <th className="border border-slate-400 p-2">Total Marks</th>
            <th className="border border-slate-400 p-2">Obtained Marks</th>
            <th className="border border-slate-400 p-2">Term wise %</th>
            <th className="border border-slate-400 p-2">Weightage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-slate-400 p-2">{term}</td>
            <td className="border border-slate-400 p-2 text-center">{totalMarks}</td>
            <td className="border border-slate-400 p-2 text-center">{obtainedMarks}</td>
            <td className="border border-slate-400 p-2 text-center">{percentage.toFixed(2)}</td>
            <td className="border border-slate-400 p-2 text-center">40%</td>
          </tr>
        </tbody>
      </table>

      {/* Final Result */}
      <div className="border border-slate-400 p-4 mb-8">
        <h3 className="font-bold mb-2">Final Result</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-slate-400 p-2 text-center">COMBINED PERCENTAGE: {percentage.toFixed(2)}</div>
          <div className="border border-slate-400 p-2 text-center">STATUS: {percentage >= 40 ? 'Promoted' : 'Not Promoted'}</div>
        </div>
      </div>

      {/* Remarks */}
      <div className="border border-slate-400 p-4 mb-12">
        <h3 className="font-bold mb-2">REMARKS</h3>
        <div className="h-16"></div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="border-t border-slate-400 pt-2">Class Incharge</div>
        <div className="border-t border-slate-400 pt-2">Section Head</div>
        <div className="border-t border-slate-400 pt-2">Principal</div>
      </div>
    </div>
  );
};
