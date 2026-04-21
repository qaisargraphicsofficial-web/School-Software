import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, writeBatch, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Student, Staff, ClassGroup, ClassSection } from '../types';
import { FileText, Users, UserPlus, ArrowUp, Plus, Edit2, Trash2, X, LayoutGrid, Loader2, CheckCircle2, User, ChevronDown, ChevronRight, GraduationCap, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ClassesProps {
  profile: UserProfile | null;
}

interface DisplaySection extends ClassSection {
  studentCount: number;
}

interface DisplayGroup extends Omit<ClassGroup, 'sections'> {
  sections: DisplaySection[];
}

export default function Classes({ profile }: ClassesProps) {
  const [classGroups, setClassGroups] = useState<DisplayGroup[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<{groupId: string, sectionId: string} | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [promotionSuccess, setPromotionSuccess] = useState(false);
  const [promotionData, setPromotionData] = useState({ fromClass: '', toClass: '' });
  const [editingGroup, setEditingGroup] = useState<DisplayGroup | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);

  const classes = ['Nursery', 'KG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

  useEffect(() => {
    if (profile) {
      fetchClasses();
    }
  }, [profile]);

  const toggleClass = (classId: string) => {
    setExpandedClasses(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId) 
        : [...prev, classId]
    );
  };

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const campusId = profile?.campusId || 'main';
      
      // 1. Fetch Class Definitions
      const classesQ = query(collection(db, 'classes'), where('campusId', '==', campusId));
      const classesSnap = await getDocs(classesQ);
      let classDefs = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassGroup));

      // 2. Fetch Students for counts
      const studentsQ = query(collection(db, 'students'), where('campusId', '==', campusId));
      const studentsSnap = await getDocs(studentsQ);
      const students = studentsSnap.docs.map(doc => doc.data() as Student);

      // 3. Fetch Staff for teacher names
      const staffQ = query(collection(db, 'staff'), where('campusId', '==', campusId));
      const staffSnap = await getDocs(staffQ);
      const staffList = staffSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      setStaff(staffList);

      // 4. If no classes exist, initialize from students
      if (classDefs.length === 0 && students.length > 0) {
        const initialGroups: Record<string, ClassGroup> = {};
        students.forEach(s => {
          if (!initialGroups[s.class]) {
            initialGroups[s.class] = {
              className: s.class,
              sections: [],
              campusId
            };
          }
          if (!initialGroups[s.class].sections.find(sec => sec.name === s.section)) {
            initialGroups[s.class].sections.push({
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: s.section,
              teacherIds: []
            });
          }
        });
        
        // Save these initial classes to Firestore
        const batch = writeBatch(db);
        Object.values(initialGroups).forEach(group => {
          const newDocRef = doc(collection(db, 'classes'));
          batch.set(newDocRef, group);
        });
        await batch.commit();
        
        // Refetch
        const newClassesSnap = await getDocs(classesQ);
        classDefs = newClassesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassGroup));
      }

      // 5. Merge data
      const mergedGroups: DisplayGroup[] = classDefs.map(group => {
        return {
          ...group,
          sections: group.sections.map(section => {
            const studentCount = students.filter(s => s.class === group.className && s.section === section.name).length;
            return {
              ...section,
              studentCount
            };
          })
        };
      });

      // Sort classes
      const sortedGroups = mergedGroups.sort((a, b) => {
        return classes.indexOf(a.className) - classes.indexOf(b.className);
      });

      setClassGroups(sortedGroups);
      // Expand all by default initially
      setExpandedClasses(sortedGroups.map(g => g.id!));
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

  const handleEditClass = (group: DisplayGroup) => {
    setEditingGroup(group);
    setNewClassName(group.className);
    setNewSectionName(''); // Not needed for editing class name
    setIsModalOpen(true);
  };

  const handleDeleteClass = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this class and all its sections?')) return;
    
    try {
      await deleteDoc(doc(db, 'classes', groupId));
      fetchClasses();
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Failed to delete class");
    }
  };

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;
    if (!editingGroup && !newSectionName.trim()) {
      alert("Please provide an initial section name.");
      return;
    }
    
    setIsSaving(true);
    try {
      const campusId = profile?.campusId || 'main';
      
      if (editingGroup) {
        await updateDoc(doc(db, 'classes', editingGroup.id!), {
          className: newClassName
        });
      } else {
        const newGroup: Omit<ClassGroup, 'id'> = {
          className: newClassName,
          sections: [
            {
              id: `${Date.now()}-sec`,
              name: newSectionName,
              teacherIds: []
            }
          ],
          campusId
        };
        await addDoc(collection(db, 'classes'), newGroup);
      }

      setNewClassName('');
      setNewSectionName('');
      setIsModalOpen(false);
      setEditingGroup(null);
      fetchClasses();
    } catch (error) {
      console.error("Error adding class:", error);
      alert("Failed to save class");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSection = async (groupId: string) => {
    const sectionName = prompt('Enter section name (e.g., C):');
    if (!sectionName) return;

    const group = classGroups.find(g => g.id === groupId);
    if (!group) return;

    try {
      const updatedSections = [
        ...group.sections.map(({ studentCount, ...s }) => s),
        {
          id: `${Date.now()}-sec`,
          name: sectionName,
          teacherIds: []
        }
      ];

      await updateDoc(doc(db, 'classes', groupId), {
        sections: updatedSections
      });
      fetchClasses();
    } catch (error) {
      console.error("Error adding section:", error);
      alert("Failed to add section");
    }
  };

  const handleDeleteSection = async (groupId: string, sectionId: string) => {
    const group = classGroups.find(g => g.id === groupId);
    if (!group) return;

    try {
      const updatedSections = group.sections
        .filter(s => s.id !== sectionId)
        .map(({ studentCount, ...s }) => s);

      if (updatedSections.length === 0) {
        await deleteDoc(doc(db, 'classes', groupId));
      } else {
        await updateDoc(doc(db, 'classes', groupId), {
          sections: updatedSections
        });
      }
      fetchClasses();
    } catch (error) {
      console.error("Error deleting section:", error);
      alert("Failed to delete section");
    }
  };

  const handleAssignTeacher = async (teacherId: string) => {
    if (!selectedSection) return;
    const { groupId, sectionId } = selectedSection;
    const group = classGroups.find(g => g.id === groupId);
    if (!group) return;

    try {
      const updatedSections = group.sections.map(({ studentCount, ...s }) => {
        if (s.id === sectionId) {
          // Add teacher if not already assigned
          const teacherIds = s.teacherIds.includes(teacherId) 
            ? s.teacherIds 
            : [...s.teacherIds, teacherId];
          return { ...s, teacherIds };
        }
        return s;
      });

      await updateDoc(doc(db, 'classes', groupId), {
        sections: updatedSections
      });
      setIsAssignModalOpen(false);
      setSelectedSection(null);
      fetchClasses();
    } catch (error) {
      console.error("Error assigning teacher:", error);
      alert("Failed to assign teacher");
    }
  };

  const handleRemoveTeacher = async (groupId: string, sectionId: string, teacherId: string) => {
    const group = classGroups.find(g => g.id === groupId);
    if (!group) return;

    try {
      const updatedSections = group.sections.map(({ studentCount, ...s }) => {
        if (s.id === sectionId) {
          return { ...s, teacherIds: s.teacherIds.filter(id => id !== teacherId) };
        }
        return s;
      });

      await updateDoc(doc(db, 'classes', groupId), {
        sections: updatedSections
      });
      fetchClasses();
    } catch (error) {
      console.error("Error removing teacher:", error);
    }
  };

  const assignJohnDoeToClass10A = async () => {
    try {
      // 1. Find John Doe
      const staffQ = query(collection(db, 'staff'), where('name', '==', 'John Doe'));
      const staffSnap = await getDocs(staffQ);
      if (staffSnap.empty) {
        alert("John Doe not found in staff records.");
        return;
      }
      const johnDoeId = staffSnap.docs[0].id;

      // 2. Find Class 10
      const classQ = query(collection(db, 'classes'), where('className', '==', 'Class 10'));
      const classSnap = await getDocs(classQ);
      if (classSnap.empty) {
        alert("Class 10 not found.");
        return;
      }
      const classDoc = classSnap.docs[0];
      const classData = classDoc.data() as ClassGroup;

      // 3. Find Section A and update
      let sectionFound = false;
      const updatedSections = classData.sections.map(section => {
        if (section.name === 'A') {
          sectionFound = true;
          const teacherIds = section.teacherIds.includes(johnDoeId)
            ? section.teacherIds
            : [...section.teacherIds, johnDoeId];
          return { ...section, teacherIds };
        }
        return section;
      });

      if (!sectionFound) {
        alert("Section A not found in Class 10.");
        return;
      }

      await updateDoc(doc(db, 'classes', classDoc.id), {
        sections: updatedSections
      });

      alert("Successfully assigned John Doe to Class 10 Section A!");
      fetchClasses();
    } catch (error) {
      console.error("Error assigning John Doe:", error);
      alert("Failed to assign John Doe.");
    }
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
          {profile?.role === 'admin' && (
            <button 
              onClick={assignJohnDoeToClass10A}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-bold text-sm shadow-sm"
            >
              <UserCheck className="w-4 h-4" />
              Assign John Doe (10A)
            </button>
          )}
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
        <div className="grid grid-cols-1 gap-6">
          {classGroups.map((group, index) => {
            const isExpanded = expandedClasses.includes(group.id!);
            const totalStudents = group.sections.reduce((acc, s) => acc + s.studentCount, 0);
            
            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
              >
                <div 
                  onClick={() => toggleClass(group.id!)}
                  className="p-6 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{group.className}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-indigo-100">
                          <Users className="w-3 h-3" />
                          {group.sections.length} Sections
                        </span>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-emerald-100">
                          <GraduationCap className="w-3 h-3" />
                          {totalStudents} Total Students
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {profile?.role === 'admin' && (
                      <div className="flex items-center gap-2 mr-2 border-r border-slate-200 pr-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClass(group);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit Class Name"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClass(group.id!);
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Class"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSection(group.id!);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all font-bold text-xs"
                    >
                      <Plus className="w-4 h-4" />
                      Add Section
                    </button>
                    <div className={cn(
                      "p-2 rounded-full transition-transform duration-300",
                      isExpanded ? "rotate-180 bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400"
                    )}>
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 pt-2 border-t border-slate-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {group.sections.map((section) => (
                            <motion.div 
                              key={section.id} 
                              whileHover={{ y: -4, scale: 1.02 }}
                              className="p-5 bg-slate-50/50 border border-slate-100 rounded-[24px] hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50 transition-all group relative"
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center font-black text-indigo-600">
                                    {section.name}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-900">Section {section.name}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <div className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                        <Users className="w-2.5 h-2.5" />
                                        {section.studentCount} Students
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                  <button 
                                    onClick={() => {
                                      setEditingGroup(group);
                                      setNewClassName(group.className);
                                      setNewSectionName(section.name);
                                      setIsModalOpen(true);
                                    }}
                                    className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteSection(group.id!, section.id)}
                                    className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Teachers</p>
                                  <button 
                                    onClick={() => {
                                      setSelectedSection({ groupId: group.id!, sectionId: section.id });
                                      setIsAssignModalOpen(true);
                                    }}
                                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                  >
                                    <UserPlus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 min-h-[32px]">
                                  {section.teacherIds.length > 0 ? (
                                    section.teacherIds.map((tid) => {
                                      const t = staff.find(st => st.id === tid);
                                      return (
                                        <motion.span 
                                          key={tid} 
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 text-slate-700 rounded-xl text-xs font-bold group/teacher shadow-sm group-hover:border-indigo-100 group-hover:bg-indigo-50/30 transition-all"
                                        >
                                          <div className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px]">
                                            {t?.name?.[0] || '?'}
                                          </div>
                                          {t?.name || 'Unknown'}
                                          <button 
                                            onClick={() => handleRemoveTeacher(group.id!, section.id, tid)}
                                            className="text-slate-300 hover:text-rose-500 transition-colors"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </motion.span>
                                      );
                                    })
                                  ) : (
                                    <p className="text-[10px] text-slate-400 italic">No teachers assigned</p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
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
                <h3 className="text-lg font-bold text-slate-900">{editingGroup ? 'Edit Class' : 'Add New Class'}</h3>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingGroup(null);
                    setNewClassName('');
                    setNewSectionName('');
                  }}
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

                {!editingGroup && (
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
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingGroup(null);
                    setNewClassName('');
                    setNewSectionName('');
                  }}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddClass}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingGroup ? 'Save Changes' : 'Create Class'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Teacher Modal */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Assign Teacher</h2>
                <button onClick={() => setIsAssignModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {staff.filter(s => s.status === 'active').map(teacher => (
                  <button
                    key={teacher.id}
                    onClick={() => handleAssignTeacher(teacher.id!)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-100 transition-all text-left group"
                  >
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                      {teacher.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{teacher.name}</p>
                      <p className="text-xs text-slate-500">{teacher.role}</p>
                    </div>
                    <Plus className="w-4 h-4 ml-auto text-slate-300 group-hover:text-indigo-600" />
                  </button>
                ))}
                {staff.filter(s => s.status === 'active').length === 0 && (
                  <p className="text-center py-4 text-slate-500 text-sm italic">No active staff found.</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl"
                >
                  Cancel
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

