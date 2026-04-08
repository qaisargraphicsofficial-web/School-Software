import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { FileText, Users, UserPlus, ArrowUp, Plus, Edit2, Trash2, X, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ClassesProps {
  profile: UserProfile | null;
}

interface ClassSection {
  id: string;
  name: string;
  studentCount: number;
  teachers: string[];
}

interface ClassGroup {
  id: string;
  className: string;
  sections: ClassSection[];
}

export default function Classes({ profile }: ClassesProps) {
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');

  useEffect(() => {
    // Simulate fetching classes with sections
    const mockClassGroups: ClassGroup[] = [
      {
        id: '1',
        className: 'Class 1',
        sections: [
          { id: '1-a', name: 'Section A', studentCount: 24, teachers: ['Mr. Smith'] },
          { id: '1-b', name: 'Section B', studentCount: 22, teachers: ['Ms. Johnson'] },
        ]
      },
      {
        id: '2',
        className: 'Class 2',
        sections: [
          { id: '2-a', name: 'Section A', studentCount: 20, teachers: ['Dr. Brown'] },
        ]
      },
      {
        id: '3',
        className: 'Class 3',
        sections: [
          { id: '3-a', name: 'Section A', studentCount: 25, teachers: ['Mrs. Davis'] },
        ]
      },
    ];
    setClassGroups(mockClassGroups);
    setLoading(false);
  }, []);

  const handleAddClass = () => {
    if (!newClassName.trim() || !newSectionName.trim()) return;

    const newGroup: ClassGroup = {
      id: Date.now().toString(),
      className: newClassName,
      sections: [
        {
          id: `${Date.now()}-sec`,
          name: newSectionName,
          studentCount: 0,
          teachers: []
        }
      ]
    };

    setClassGroups([...classGroups, newGroup]);
    setNewClassName('');
    setNewSectionName('');
    setIsModalOpen(false);
  };

  const handleAddSection = (groupId: string) => {
    const sectionName = prompt('Enter section name (e.g., Section C):');
    if (!sectionName) return;

    setClassGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          sections: [
            ...group.sections,
            {
              id: `${Date.now()}-sec`,
              name: sectionName,
              studentCount: 0,
              teachers: []
            }
          ]
        };
      }
      return group;
    }));
  };

  const handleDeleteSection = (groupId: string, sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    setClassGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const updatedSections = group.sections.filter(s => s.id !== sectionId);
        return { ...group, sections: updatedSections };
      }
      return group;
    }).filter(group => group.sections.length > 0));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Classes & Sections</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Manage {classGroups.length} classes and their respective sections
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-[#00a669] text-white rounded-lg hover:bg-[#008f5a] transition-colors font-bold text-sm shadow-sm">
            <ArrowUp className="w-4 h-4" />
            Promote Students
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Class
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {classGroups.map((group, index) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden"
          >
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{group.className}</h3>
              </div>
              <button 
                onClick={() => handleAddSection(group.id)}
                className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                title="Add Section"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {group.sections.map((section) => (
                <div 
                  key={section.id} 
                  className="p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-md hover:shadow-blue-50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-slate-800">{section.name}</h4>
                      <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                        <Users className="w-3 h-3" />
                        {section.studentCount} Students
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSection(group.id, section.id)}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Teachers</p>
                    {section.teachers.length === 0 ? (
                      <button className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 font-bold text-xs transition-colors">
                        <UserPlus className="w-3.5 h-3.5" />
                        Assign Teacher
                      </button>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {section.teachers.map((t, i) => (
                          <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Class Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">Add New Class</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Class Name</label>
                  <input 
                    type="text"
                    placeholder="e.g., Class 10"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Initial Section</label>
                  <input 
                    type="text"
                    placeholder="e.g., Section A"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddClass}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  Create Class
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

