import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { FileText, Users, UserPlus, ArrowUp, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface ClassesProps {
  profile: UserProfile | null;
}

interface ClassData {
  id: string;
  name: string;
  section: string;
  studentCount: number;
  teachers: any[];
}

export default function Classes({ profile }: ClassesProps) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching classes
    const mockClasses: ClassData[] = [
      { id: '1', name: 'Class 1', section: 'Section A', studentCount: 0, teachers: [] },
      { id: '2', name: 'Class 2', section: 'Section A', studentCount: 0, teachers: [] },
      { id: '3', name: 'Class 3', section: 'Section A', studentCount: 0, teachers: [] },
      { id: '4', name: 'Class 4', section: 'Section A', studentCount: 0, teachers: [] },
      { id: '5', name: 'Class 5', section: 'Section A', studentCount: 0, teachers: [] },
    ];
    setClasses(mockClasses);
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Classes</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">{classes.length} classes</p>
          <p className="text-amber-600 text-xs font-bold mt-2">Pilot limit reached: 2 classes for the current academic year.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-[#00a669] text-white rounded-lg hover:bg-[#008f5a] transition-colors font-bold text-sm shadow-sm">
            <ArrowUp className="w-4 h-4" />
            Promote Students
          </button>
          <button disabled className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 text-white rounded-lg cursor-not-allowed font-bold text-sm">
            <Plus className="w-4 h-4" />
            Add Class
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {classes.map((cls, index) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2.5 bg-indigo-50 text-indigo-500 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">{cls.name}</h3>
                <p className="text-slate-400 text-sm">{cls.section}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
              <Users className="w-4 h-4" />
              {cls.studentCount} students
            </div>

            <div className="mt-auto pt-5 border-t border-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Teachers</p>
              {cls.teachers.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-300 font-medium">No teachers assigned</p>
                  <button className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-600 font-bold text-xs transition-colors">
                    <UserPlus className="w-3.5 h-3.5" />
                    Assign Teacher
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Teacher list would go here */}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
