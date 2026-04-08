import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Calendar, ChevronDown, X, Plus, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScheduleProps {
  profile: UserProfile | null;
}

interface Assignment {
  subject: string;
  teacher: string;
}

export default function Schedule({ profile }: ScheduleProps) {
  const [selectedClass, setSelectedClass] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ day: string, periodId: number } | null>(null);

  const classes = [
    'No Class',
    'Class 1 - A',
    'Class 2 - A',
    'Class 3 - A',
    'Class 4 - A',
    'Class 5 - A',
  ];

  const subjects = [
    'Mathematics', 'English', 'Science', 'History', 'Geography', 
    'Art', 'Physical Education', 'Computer Science', 'Music', 
    'Library', 'Drama', 'Club Activity'
  ];

  const teachers = [
    'Mr. Smith', 'Ms. Johnson', 'Dr. Brown', 'Mrs. Davis', 
    'Mr. Wilson', 'Ms. Taylor', 'Mr. Miller', 'Ms. Moore', 
    'Mr. Anderson', 'Ms. Clark', 'Ms. White', 'Various'
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [
    { id: 1, time: '08:00 - 08:45' },
    { id: 2, time: '08:45 - 09:30' },
    { id: 3, time: '09:30 - 10:15' },
    { id: 4, time: '10:15 - 11:00' },
    { id: 5, time: '11:30 - 12:15' },
    { id: 6, time: '12:15 - 13:00' },
    { id: 7, time: '13:00 - 13:45' },
    { id: 8, time: '13:45 - 14:30' },
  ];

  const [timetableData, setTimetableData] = useState<Record<string, Record<number, Assignment>>>({
    'Monday': {
      1: { subject: 'Mathematics', teacher: 'Mr. Smith' },
      2: { subject: 'English', teacher: 'Ms. Johnson' },
      3: { subject: 'Science', teacher: 'Dr. Brown' },
      4: { subject: 'History', teacher: 'Mrs. Davis' },
      5: { subject: 'Geography', teacher: 'Mr. Wilson' },
      6: { subject: 'Art', teacher: 'Ms. Taylor' },
      7: { subject: 'Physical Education', teacher: 'Mr. Miller' },
      8: { subject: 'Computer Science', teacher: 'Ms. Moore' },
    },
    'Tuesday': {
      1: { subject: 'Science', teacher: 'Dr. Brown' },
      2: { subject: 'Mathematics', teacher: 'Mr. Smith' },
      3: { subject: 'English', teacher: 'Ms. Johnson' },
      4: { subject: 'Geography', teacher: 'Mr. Wilson' },
      5: { subject: 'History', teacher: 'Mrs. Davis' },
      6: { subject: 'Music', teacher: 'Mr. Anderson' },
      7: { subject: 'Art', teacher: 'Ms. Taylor' },
      8: { subject: 'Library', teacher: 'Ms. Clark' },
    },
    'Wednesday': {
      1: { subject: 'English', teacher: 'Ms. Johnson' },
      2: { subject: 'Science', teacher: 'Dr. Brown' },
      3: { subject: 'Mathematics', teacher: 'Mr. Smith' },
      4: { subject: 'Physical Education', teacher: 'Mr. Miller' },
      5: { subject: 'Computer Science', teacher: 'Ms. Moore' },
      6: { subject: 'History', teacher: 'Mrs. Davis' },
      7: { subject: 'Geography', teacher: 'Mr. Wilson' },
      8: { subject: 'Drama', teacher: 'Ms. White' },
    },
    'Thursday': {
      1: { subject: 'Mathematics', teacher: 'Mr. Smith' },
      2: { subject: 'English', teacher: 'Ms. Johnson' },
      3: { subject: 'Science', teacher: 'Dr. Brown' },
      4: { subject: 'Art', teacher: 'Ms. Taylor' },
      5: { subject: 'History', teacher: 'Mrs. Davis' },
      6: { subject: 'Geography', teacher: 'Mr. Wilson' },
      7: { subject: 'Music', teacher: 'Mr. Anderson' },
      8: { subject: 'Physical Education', teacher: 'Mr. Miller' },
    },
    'Friday': {
      1: { subject: 'Science', teacher: 'Dr. Brown' },
      2: { subject: 'Mathematics', teacher: 'Mr. Smith' },
      3: { subject: 'English', teacher: 'Ms. Johnson' },
      4: { subject: 'Computer Science', teacher: 'Ms. Moore' },
      5: { subject: 'Geography', teacher: 'Mr. Wilson' },
      6: { subject: 'History', teacher: 'Mrs. Davis' },
      7: { subject: 'Art', teacher: 'Ms. Taylor' },
      8: { subject: 'Club Activity', teacher: 'Various' },
    },
  });

  const [editForm, setEditForm] = useState<Assignment>({ subject: '', teacher: '' });

  const handleEditCell = (day: string, periodId: number) => {
    const current = timetableData[day]?.[periodId] || { subject: '', teacher: '' };
    setEditForm(current);
    setEditingCell({ day, periodId });
  };

  const handleSaveAssignment = () => {
    if (!editingCell) return;

    setTimetableData(prev => ({
      ...prev,
      [editingCell.day]: {
        ...(prev[editingCell.day] || {}),
        [editingCell.periodId]: editForm
      }
    }));
    setEditingCell(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Schedule</h1>
        <p className="text-slate-500 text-sm mt-1">Manage class timetables and teacher schedules</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium shadow-sm">
          Class View
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center justify-between w-40 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors ${
              isDropdownOpen || selectedClass ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {selectedClass || 'Select Class'}
            <ChevronDown className="w-4 h-4 ml-2" />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10">
              <button 
                onClick={() => { setSelectedClass(''); setIsDropdownOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Select Class
              </button>
              {classes.map((cls) => (
                <button
                  key={cls}
                  onClick={() => { setSelectedClass(cls); setIsDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-100"
                >
                  {cls}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!selectedClass || selectedClass === 'No Class' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-400 text-sm font-medium">
            {selectedClass === 'No Class' ? 'No class assigned' : 'Select a class to view the timetable'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-100 w-32">
                    Time / Day
                  </th>
                  {days.map((day) => (
                    <th key={day} className="px-4 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-100 min-w-[160px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.id} className="border-b border-slate-100 last:border-0 group">
                    <td className="px-4 py-4 text-left border-r border-slate-100 bg-slate-50/30">
                      <div className="text-sm font-bold text-slate-700">Period {period.id}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{period.time}</div>
                    </td>
                    {days.map((day) => {
                      const assignment = timetableData[day]?.[period.id];
                      return (
                        <td 
                          key={`${day}-${period.id}`} 
                          onClick={() => handleEditCell(day, period.id)}
                          className="px-3 py-3 border-r border-slate-100 last:border-r-0 hover:bg-blue-50/50 transition-colors cursor-pointer relative group/cell"
                        >
                          {assignment ? (
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-blue-700 leading-tight">
                                {assignment.subject}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                {assignment.teacher}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Plus className="w-4 h-4 text-slate-200 group-hover/cell:text-blue-400 transition-colors" />
                            </div>
                          )}
                          <div className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                            <Edit2 className="w-3 h-3 text-blue-400" />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      <AnimatePresence>
        {editingCell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Assign Subject</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {editingCell.day} • Period {editingCell.periodId}
                  </p>
                </div>
                <button 
                  onClick={() => setEditingCell(null)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                  <select 
                    value={editForm.subject}
                    onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teacher</label>
                  <select 
                    value={editForm.teacher}
                    onChange={(e) => setEditForm(prev => ({ ...prev, teacher: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveAssignment}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  Save Assignment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

