import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Student } from '../types';
import { FileText, Users, UserPlus, ArrowUp, Plus, Edit2, Trash2, X, LayoutGrid, Loader2, CheckCircle2 } from 'lucide-react';
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
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promotionSuccess, setPromotionSuccess] = useState(false);
  const [promotionData, setPromotionData] = useState({ fromClass: '', toClass: '' });
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');

  const classes = ['Nursery', 'KG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

  useEffect(() => {
    fetchClasses();
  }, [profile]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'students'), where('campusId', '==', profile?.campusId || 'main'));
      const snap = await getDocs(q);
      const students = snap.docs.map(doc => doc.data() as Student);
      
      const groups: Record<string, ClassGroup> = {};
      
      students.forEach(s => {
        if (!groups[s.class]) {
          groups[s.class] = {
            id: s.class,
            className: s.class,
            sections: []
          };
        }
        
        let section = groups[s.class].sections.find(sec => sec.name === s.section);
        if (!section) {
          section = {
            id: `${s.class}-${s.section}`,
            name: s.section,
            studentCount: 0,
            teachers: []
          };
          groups[s.class].sections.push(section);
        }
        section.studentCount++;
      });

      // Sort classes based on our defined order
      const sortedGroups = Object.values(groups).sort((a, b) => {
        return classes.indexOf(a.className) - classes.indexOf(b.className);
      });

      setClassGroups(sortedGroups.length > 0 ? sortedGroups : [
        {
          id: '1',
          className: '10th',
          sections: [{ id: '10th-A', name: 'A', studentCount: 0, teachers: [] }]
        }
      ]);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteStudents = async () => {
    if (!promotionData.fromClass || !promotionData.toClass) {
      alert('Please select both source and target classes');
      return;
    }

    if (promotionData.fromClass === promotionData.toClass) {
      alert('Source and target classes cannot be the same');
      return;
    }

    setPromoting(true);
    try {
      const q = query(
        collection(db, 'students'), 
        where('class', '==', promotionData.fromClass),
        where('campusId', '==', profile?.campusId || 'main')
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        alert(`No students found in ${promotionData.fromClass}`);
        setPromoting(false);
        return;
      }

      const batch = writeBatch(db);
      snap.docs.forEach(studentDoc => {
        batch.update(doc(db, 'students', studentDoc.id), {
          class: promotionData.toClass
        });
      });

      await batch.commit();
      setPromotionSuccess(true);
      setTimeout(() => {
        setPromotionSuccess(false);
        setIsPromoteModalOpen(false);
        fetchClasses();
      }, 2000);
    } catch (error) {
      console.error("Error promoting students:", error);
      alert('Failed to promote students');
    } finally {
      setPromoting(false);
    }
  };

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
          <button 
            onClick={() => setIsPromoteModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#00a669] text-white rounded-lg hover:bg-[#008f5a] transition-colors font-bold text-sm shadow-sm"
          >
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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
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
                        <button 
                          onClick={() => {
                            setEditingGroup(group);
                            setNewClassName(group.className);
                            setNewSectionName(section.name);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                        >
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
                        <button 
                          onClick={() => {
                            const teacherName = prompt('Enter teacher name to assign:');
                            if (teacherName) {
                              setClassGroups(prev => prev.map(g => {
                                if (g.id === group.id) {
                                  return {
                                    ...g,
                                    sections: g.sections.map(s => {
                                      if (s.id === section.id) {
                                        return { ...s, teachers: [...s.teachers, teacherName] };
                                      }
                                      return s;
                                    })
                                  };
                                }
                                return g;
                              }));
                            }
                          }}
                          className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 font-bold text-xs transition-colors"
                        >
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
      )}

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

      {/* Promote Students Modal */}
      <AnimatePresence>
        {isPromoteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Promote Students</h2>
                <button onClick={() => setIsPromoteModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {promotionSuccess ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Promotion Successful!</h3>
                    <p className="text-sm text-slate-500">Students have been promoted to {promotionData.toClass}</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-500">
                    Select the source class and the target class to promote all students.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">From Class</label>
                      <select 
                        value={promotionData.fromClass}
                        onChange={(e) => setPromotionData({ ...promotionData, fromClass: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">Select Source Class</option>
                        {classes.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">To Class</label>
                      <select 
                        value={promotionData.toClass}
                        onChange={(e) => setPromotionData({ ...promotionData, toClass: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">Select Target Class</option>
                        {classes.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button 
                      onClick={() => setIsPromoteModalOpen(false)}
                      className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handlePromoteStudents}
                      disabled={promoting}
                      className="flex items-center gap-2 px-6 py-2 bg-[#00a669] text-white rounded-xl text-sm font-bold hover:bg-[#008f5a] shadow-sm disabled:opacity-50"
                    >
                      {promoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                      Promote Now
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

