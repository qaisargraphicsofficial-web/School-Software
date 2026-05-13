import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Timetable, TimetablePeriod, TimetableRow, TimetableCell, TimetableNote, TimetableSignature, SchoolSettings, ClassGroup } from '../types';
import { 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  Printer, 
  Download, 
  Copy, 
  Save, 
  ArrowLeft, 
  ArrowRight,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  School,
  FileText,
  User,
  Settings,
  MoreVertical,
  Layout,
  Clock,
  Check,
  PlusCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, onSnapshot, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface ScheduleProps {
  profile: UserProfile | null;
}

export default function Schedule({ profile }: ScheduleProps) {
  const [loading, setLoading] = useState(true);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [activeTimetable, setActiveTimetable] = useState<Timetable | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
  
  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string, periodId: string } | null>(null);
  const [editCellForm, setEditCellForm] = useState<TimetableCell>({ subject: '', teacher: '', notes: '' });

  // Refs for printing
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.campusId) return;

    // Fetch School Settings
    const fetchSettings = async () => {
      try {
        const settingsSnap = await getDocs(collection(db, 'school_settings'));
        if (!settingsSnap.empty) {
          setSchoolSettings(settingsSnap.docs[0].data() as SchoolSettings);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'school_settings');
      }
    };

    // Fetch Classes
    const fetchClasses = async () => {
      try {
        const q = query(collection(db, 'classes'), where('campusId', '==', profile.campusId));
        const snap = await getDocs(q);
        const classNames = snap.docs.map(doc => (doc.data() as ClassGroup).className);
        setClasses(classNames);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'classes');
      }
    };

    // Listen for Timetables
    const q = query(collection(db, 'timetables'), where('campusId', '==', profile.campusId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Timetable));
      setTimetables(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'timetables');
      setLoading(false);
    });

    fetchSettings();
    fetchClasses();

    return () => unsubscribe();
  }, [profile?.campusId]);

  const handleCreateNew = () => {
    const newTimetable: Timetable | any = {
      campusId: profile?.campusId || '',
      className: classes[0] || 'Unassigned',
      mode: 'class-monthly',
      title: 'New Schedule',
      subtitle: 'Session 2026-27',
      periods: [
        { id: 'p1', name: 'Column 1', startTime: '', endTime: '' },
        { id: 'p2', name: 'Column 2', startTime: '', endTime: '' },
      ],
      rows: [
        { id: 'r1', label: 'Row 1', cells: {} }
      ],
      notes: [],
      signatures: [],
      updatedAt: new Date().toISOString(),
      schoolInfo: {
        name: schoolSettings?.schoolName || 'Our School',
        logo: schoolSettings?.logoUrl || ''
      }
    };
    setActiveTimetable(newTimetable);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!activeTimetable) return;
    setSaving(true);
    try {
      const data = {
        ...activeTimetable,
        updatedAt: new Date().toISOString()
      };
      
      if (activeTimetable.id) {
        await setDoc(doc(db, 'timetables', activeTimetable.id), data);
      } else {
        const docRef = await addDoc(collection(db, 'timetables'), data);
        setActiveTimetable({ ...data, id: docRef.id });
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving timetable:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    try {
      await deleteDoc(doc(db, 'timetables', id));
      if (activeTimetable?.id === id) {
        setActiveTimetable(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
    }
  };

  const updateActive = (updates: Partial<Timetable>) => {
    if (!activeTimetable) return;
    setActiveTimetable({ ...activeTimetable, ...updates });
  };

  function getDayName(dateStr: string | Date) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Row Management
  const addRow = () => {
    if (!activeTimetable) return;
    const newRow: TimetableRow = {
      id: Math.random().toString(36).substr(2, 9),
      label: `New Row ${activeTimetable.rows.length + 1}`,
      cells: {}
    };

    if (activeTimetable.mode === 'class-monthly') {
      const lastRow = activeTimetable.rows[activeTimetable.rows.length - 1];
      let nextDate = new Date();
      if (lastRow?.date) {
        nextDate = new Date(lastRow.date);
        nextDate.setDate(nextDate.getDate() + 1);
      }
      newRow.date = nextDate.toISOString().split('T')[0];
      newRow.day = getDayName(nextDate);
    }

    updateActive({ rows: [...activeTimetable.rows, newRow] });
  };

  const duplicateRow = (rowId: string) => {
    if (!activeTimetable) return;
    const row = activeTimetable.rows.find(r => r.id === rowId);
    if (!row) return;
    const newRow = { 
      ...row, 
      id: Math.random().toString(36).substr(2, 9),
      label: `${row.label || 'Row'} (Copy)`
    };
    updateActive({ rows: [...activeTimetable.rows, newRow] });
  };

  const moveRow = (id: string, dir: 'up' | 'down') => {
    if (!activeTimetable) return;
    const idx = activeTimetable.rows.findIndex(r => r.id === id);
    if (idx === -1) return;
    const newRows = [...activeTimetable.rows];
    if (dir === 'up' && idx > 0) {
      [newRows[idx - 1], newRows[idx]] = [newRows[idx], newRows[idx - 1]];
    } else if (dir === 'down' && idx < newRows.length - 1) {
      [newRows[idx], newRows[idx + 1]] = [newRows[idx + 1], newRows[idx]];
    }
    updateActive({ rows: newRows });
  };

  const removeRow = (rowId: string) => {
    if (!activeTimetable) return;
    updateActive({ rows: activeTimetable.rows.filter(r => r.id !== rowId) });
  };

  // Period Management
  const addPeriod = () => {
    if (!activeTimetable) return;
    const newPeriod: TimetablePeriod = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Period ${activeTimetable.periods.length + 1}`,
      startTime: '',
      endTime: ''
    };
    updateActive({ periods: [...activeTimetable.periods, newPeriod] });
  };

  const removePeriod = (periodId: string) => {
    if (!activeTimetable) return;
    updateActive({ periods: activeTimetable.periods.filter(p => p.id !== periodId) });
  };

  // Cell Editing
  const openCellEdit = (rowId: string, periodId: string) => {
    if (!activeTimetable) return;
    const row = activeTimetable.rows.find(r => r.id === rowId);
    const cell = row?.cells[periodId] || { subject: '', teacher: '', notes: '' };
    setEditCellForm(cell);
    setEditingCell({ rowId, periodId });
  };

  const saveCellEdit = () => {
    if (!activeTimetable || !editingCell) return;
    const newRows = activeTimetable.rows.map(row => {
      if (row.id === editingCell.rowId) {
        return {
          ...row,
          cells: {
            ...row.cells,
            [editingCell.periodId]: editCellForm
          }
        };
      }
      return row;
    });
    updateActive({ rows: newRows });
    setEditingCell(null);
  };

  // Note Management
  const addNote = () => {
    if (!activeTimetable) return;
    const newNote: TimetableNote = {
      id: Math.random().toString(36).substr(2, 9),
      text: 'New Note',
      isVisible: true
    };
    updateActive({ notes: [...activeTimetable.notes, newNote] });
  };

  // Signature Management
  const addSignature = () => {
    if (!activeTimetable) return;
    const newSig: TimetableSignature = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'Designation',
      name: 'Full Name'
    };
    updateActive({ signatures: [...activeTimetable.signatures, newSig] });
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Timetables...</p>
      </div>
    );
  }

  const filteredTimetables = timetables.filter(t => selectedClassFilter === 'All' || t.className === selectedClassFilter);

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Class Schedules</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Manage and print school timetables</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
          >
            <option value="All">All Classes</option>
            <option value="School Wide">School Wide</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button 
            onClick={handleCreateNew}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
          >
            <Plus className="w-4 h-4" /> Create New
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Timetable List (Sidebar) */}
        <div className={cn("lg:col-span-1 space-y-4 no-print", (isEditing || activeTimetable) ? "hidden lg:block" : "block")}>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saved Timetables</p>
            </div>
            <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
              {filteredTimetables.length === 0 ? (
                <div className="p-8 text-center space-y-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                    <Calendar className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">No schedules found for this class.</p>
                </div>
              ) : (
                filteredTimetables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTimetable(t); setIsEditing(false); }}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all group",
                      activeTimetable?.id === t.id 
                        ? "bg-blue-50 border-blue-200" 
                        : "bg-white border-transparent hover:bg-slate-50 border-slate-50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className={cn("text-xs font-black uppercase tracking-tight", activeTimetable?.id === t.id ? "text-blue-900" : "text-slate-900")}>
                          {t.className}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.title}</p>
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">{new Date(t.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                          onClick={(e) => { e.stopPropagation(); setActiveTimetable(t); setIsEditing(true); }}
                          className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg"
                         >
                            <Edit2 className="w-3.5 h-3.5" />
                         </button>
                         <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(t.id!); }}
                          className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                         </button>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Timetable Editor/Viewer */}
        <div className={cn("lg:col-span-3", !activeTimetable && "hidden lg:flex items-center justify-center bg-slate-50 rounded-3xl border border-dashed border-slate-200")}>
          {!activeTimetable ? (
            <div className="text-center p-12 space-y-6">
               <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                 <Layout className="w-8 h-8 text-slate-200" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">Select a schedule</h3>
                 <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Choose from the list or create a new class schedule</p>
               </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between no-print overflow-x-auto gap-4">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveTimetable(null)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 lg:hidden"
                  >
                    <ChevronLeft />
                  </button>
                  <div className="h-4 w-px bg-slate-100 mx-2 hidden lg:block"></div>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                       <select 
                        className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                        value={activeTimetable.mode}
                        onChange={e => updateActive({ mode: e.target.value as any })}
                      >
                        <option value="class-monthly">Class Monthly</option>
                        <option value="school-daily">School Daily</option>
                        <option value="custom">Custom Grid</option>
                      </select>
                      <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save Changes
                      </button>
                      <button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                        Discard
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-100 transition-all">
                        <Edit2 className="w-3 h-3" /> Edit Schedule
                      </button>
                      <button onClick={() => window.print()} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                        <Printer className="w-3 h-3" /> Print PDF
                      </button>
                      <button 
                        onClick={() => {
                          const duplicate = { ...activeTimetable, id: undefined, updatedAt: new Date().toISOString(), title: `${activeTimetable.title} (Copy)` };
                          setActiveTimetable(duplicate);
                          setIsEditing(true);
                        }} 
                        className="px-6 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all"
                      >
                        <Copy className="w-3 h-3" /> Duplicate
                      </button>
                    </div>
                  )}
                </div>
                
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <button onClick={addRow} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all">
                      + Add Row
                    </button>
                    <button onClick={addPeriod} className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all">
                      + Add Column
                    </button>
                  </div>
                )}
              </div>

              {/* TIMETABLE CONTENT */}
              <div ref={printRef} className="bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100 print:shadow-none print:border-none print:p-0">
                
                {/* School Header */}
                <div className="text-center space-y-6 mb-12 border-b-2 border-slate-900 pb-12">
                   {activeTimetable.schoolInfo.logo && (
                     <img src={activeTimetable.schoolInfo.logo} alt="Logo" className="w-24 h-24 object-contain mx-auto mb-4" />
                   )}
                   <div className="space-y-2">
                     <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">{activeTimetable.schoolInfo.name}</h1>
                     {isEditing ? (
                       <div className="space-y-2 max-w-lg mx-auto">
                         <input 
                           className="w-full text-center text-xl font-black uppercase tracking-tight outline-none border-b border-transparent focus:border-blue-600 bg-slate-50 px-4 py-2 rounded-xl"
                           value={activeTimetable.title || ''}
                           onChange={e => updateActive({ title: e.target.value })}
                           placeholder="Schedule Title"
                         />
                         <input 
                           className="w-full text-center text-xs font-bold uppercase tracking-widest text-slate-400 outline-none border-b border-transparent focus:border-blue-600 bg-slate-50 px-4 py-1 rounded-xl"
                           value={activeTimetable.subtitle || ''}
                           onChange={e => updateActive({ subtitle: e.target.value })}
                           placeholder="Schedule Subtitle"
                         />
                       </div>
                     ) : (
                       <>
                        <h2 className="text-2xl font-black text-slate-700 uppercase tracking-tight">{activeTimetable.title}</h2>
                        {activeTimetable.subtitle && <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{activeTimetable.subtitle}</p>}
                       </>
                     )}
                   </div>
                   <div className="pt-4 flex items-center justify-center gap-8">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class / Group</p>
                        {isEditing ? (
                          <select 
                            className="text-lg font-black uppercase tracking-tight bg-slate-50 px-3 py-1 rounded-lg outline-none"
                            value={activeTimetable.className}
                            onChange={e => updateActive({ className: e.target.value })}
                          >
                             {classes.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{activeTimetable.className}</p>
                        )}
                      </div>
                      <div className="h-10 w-px bg-slate-200"></div>
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revision Date</p>
                        <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{new Date(activeTimetable.updatedAt).toLocaleDateString()}</p>
                      </div>
                   </div>
                </div>

                {/* Main Table */}
                <div className="overflow-x-auto mb-16">
                  {(() => {
                    const isClassMonthly = activeTimetable.mode === 'class-monthly' || !activeTimetable.mode;
                    return (
                      <table className="w-full border-collapse border-2 border-slate-900 border-spacing-0">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border-2 border-slate-900 p-4 text-[10px] font-black uppercase tracking-widest text-slate-600 min-w-[120px]">
                              {isClassMonthly ? 'Date / Day' : 'Row Label'}
                            </th>
                            {activeTimetable.periods.map((period) => (
                              <th key={period.id} className="border-2 border-slate-900 p-4 min-w-[180px] group relative">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <input 
                                        className="w-full text-center text-xs font-black uppercase tracking-tight bg-white border border-slate-200 rounded-lg p-1.5 focus:border-blue-600 outline-none"
                                        value={period.name || ''}
                                        onChange={e => updateActive({ periods: activeTimetable.periods.map(p => p.id === period.id ? {...p, name: e.target.value} : p)})}
                                      />
                                      <button onClick={() => removePeriod(period.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded bg-white">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                      <div className="flex flex-col gap-0.5">
                                         <button 
                                           onClick={() => {
                                             const idx = activeTimetable.periods.findIndex(p => p.id === period.id);
                                             if (idx > 0) {
                                               const newPeriods = [...activeTimetable.periods];
                                               [newPeriods[idx-1], newPeriods[idx]] = [newPeriods[idx], newPeriods[idx-1]];
                                               updateActive({ periods: newPeriods });
                                             }
                                           }}
                                           className="p-0.5 hover:bg-slate-200 rounded bg-white"
                                         >
                                           <ChevronLeft className="w-2.5 h-2.5" />
                                         </button>
                                         <button 
                                           onClick={() => {
                                             const idx = activeTimetable.periods.findIndex(p => p.id === period.id);
                                             if (idx < activeTimetable.periods.length - 1) {
                                               const newPeriods = [...activeTimetable.periods];
                                               [newPeriods[idx], newPeriods[idx+1]] = [newPeriods[idx+1], newPeriods[idx]];
                                               updateActive({ periods: newPeriods });
                                             }
                                           }}
                                           className="p-0.5 hover:bg-slate-200 rounded bg-white"
                                         >
                                           <ChevronRight className="w-2.5 h-2.5" />
                                         </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <input 
                                        type="time"
                                        className="w-full text-[9px] font-black bg-white border border-slate-200 rounded-lg p-1 focus:border-blue-600 outline-none"
                                        value={period.startTime || ''}
                                        placeholder="Start"
                                        onChange={e => updateActive({ periods: activeTimetable.periods.map(p => p.id === period.id ? {...p, startTime: e.target.value} : p)})}
                                      />
                                      <span className="text-[9px]">-</span>
                                      <input 
                                        type="time"
                                        className="w-full text-[9px] font-black bg-white border border-slate-200 rounded-lg p-1 focus:border-blue-600 outline-none"
                                        value={period.endTime || ''}
                                        placeholder="End"
                                        onChange={e => updateActive({ periods: activeTimetable.periods.map(p => p.id === period.id ? {...p, endTime: e.target.value} : p)})}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{period.name}</p>
                                    {period.startTime && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{period.startTime} - {period.endTime}</p>}
                                  </div>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-900">
                          {activeTimetable.rows.map((row, idx) => (
                            <tr key={row.id}>
                              <td className="border-2 border-slate-900 p-4 bg-slate-50/50 group relative min-w-[160px]">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                       <div className="flex items-center gap-0.5">
                                          <button onClick={() => moveRow(row.id, 'up')} disabled={idx === 0} className="p-1 hover:bg-slate-200 rounded-lg disabled:opacity-30">
                                            <ChevronUp className="w-3 h-3" />
                                          </button>
                                          <button onClick={() => moveRow(row.id, 'down')} disabled={idx === activeTimetable.rows.length - 1} className="p-1 hover:bg-slate-200 rounded-lg disabled:opacity-30">
                                            <ChevronDown className="w-3 h-3" />
                                          </button>
                                       </div>
                                       <div className="flex items-center gap-1">
                                          <button onClick={() => duplicateRow(row.id)} title="Duplicate Row" className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg">
                                            <Copy className="w-3 h-3" />
                                          </button>
                                          <button onClick={() => removeRow(row.id)} title="Delete Row" className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg">
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                       </div>
                                    </div>
                                    {isClassMonthly ? (
                                      <>
                                        <input 
                                          type="date"
                                          className="w-full text-[10px] font-black bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-600"
                                          value={row.date || ''}
                                          onChange={e => {
                                            const date = e.target.value;
                                            updateActive({ rows: activeTimetable.rows.map(r => r.id === row.id ? {...r, date, day: getDayName(date)} : r)});
                                          }}
                                        />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">{row.day}</p>
                                      </>
                                    ) : (
                                      <input 
                                        className="w-full text-[10px] font-black bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-600"
                                        value={row.label || ''}
                                        onChange={e => updateActive({ rows: activeTimetable.rows.map(r => r.id === row.id ? {...r, label: e.target.value} : r)})}
                                        placeholder="e.g. Class 10A"
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {isClassMonthly && row.date ? (
                                      <>
                                        <p className="text-sm font-black text-slate-900">{new Date(row.date).toLocaleDateString('en-GB')}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{row.day}</p>
                                      </>
                                    ) : (
                                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{row.label || '-'}</p>
                                    )}
                                  </div>
                                )}
                              </td>
                              {activeTimetable.periods.map((period) => {
                                const cell = row.cells[period.id];
                                return (
                                  <td 
                                    key={period.id} 
                                    onClick={() => isEditing && openCellEdit(row.id, period.id)}
                                    className={cn(
                                      "border-2 border-slate-900 p-4 text-center transition-colors align-middle",
                                      isEditing ? "cursor-pointer hover:bg-blue-50/30" : ""
                                    )}
                                  >
                                    {cell?.subject || cell?.teacher ? (
                                      <div className="space-y-2">
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">{cell.subject || '-'}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{cell.teacher || '-'}</p>
                                        {cell.notes && <p className="text-[9px] text-slate-300 font-medium italic">"{cell.notes}"</p>}
                                      </div>
                                    ) : (
                                      <span className="text-slate-200 font-black">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>

                {/* Notes and Signatures Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                   {/* Notes */}
                   <div className="space-y-6">
                      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Important Notes
                        </h3>
                        {isEditing && (
                          <button onClick={addNote} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-4">
                        {activeTimetable.notes.filter(n => isEditing || n.isVisible).map((note) => (
                          <div key={note.id} className="group relative flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 shrink-0"></div>
                            {isEditing ? (
                              <div className="flex-1 space-y-2">
                                <textarea 
                                  className="w-full text-sm font-medium bg-slate-50 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                  value={note.text}
                                  onChange={e => updateActive({ notes: activeTimetable.notes.map(n => n.id === note.id ? {...n, text: e.target.value} : n)})}
                                  rows={2}
                                />
                                <div className="flex items-center justify-between">
                                  <button 
                                    onClick={() => updateActive({ notes: activeTimetable.notes.map(n => n.id === note.id ? {...n, isVisible: !n.isVisible} : n)})}
                                    className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-colors", note.isVisible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400")}
                                  >
                                    {note.isVisible ? 'Visible' : 'Hidden'}
                                  </button>
                                  <button onClick={() => updateActive({ notes: activeTimetable.notes.filter(n => n.id !== note.id) })} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm font-medium text-slate-600 leading-relaxed italic">{note.text}</p>
                            )}
                          </div>
                        ))}
                      </div>
                   </div>

                   {/* Signatures */}
                   <div className="space-y-12">
                      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-2">
                          <Check className="w-4 h-4" /> Verification
                        </h3>
                        {isEditing && (
                          <button onClick={addSignature} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-12">
                         {activeTimetable.signatures.map((sig) => (
                           <div key={sig.id} className="space-y-4 group relative">
                              <div className="h-20 border-b-2 border-slate-900 flex items-end justify-center pb-2">
                                <span className="text-[10px] text-slate-300 font-black uppercase tracking-[0.4em] mb-4">Official Stamp / Seal</span>
                              </div>
                              <div className="space-y-1 text-center">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <input 
                                      className="w-full text-center text-[10px] font-black uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg"
                                      value={sig.label || ''}
                                      onChange={e => updateActive({ signatures: activeTimetable.signatures.map(s => s.id === sig.id ? {...s, label: e.target.value} : s)})}
                                    />
                                    <input 
                                      className="w-full text-center text-xs font-bold bg-slate-50 px-2 py-1 rounded-lg"
                                      value={sig.name || ''}
                                      onChange={e => updateActive({ signatures: activeTimetable.signatures.map(s => s.id === sig.id ? {...s, name: e.target.value} : s)})}
                                    />
                                    <button onClick={() => updateActive({ signatures: activeTimetable.signatures.filter(s => s.id !== sig.id) })} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity mx-auto block">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">{sig.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{sig.label}</p>
                                  </>
                                )}
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Footer Software Branding */}
                <div className="mt-24 pt-8 border-t border-slate-100 flex items-center justify-between text-slate-300 text-[8px] font-bold uppercase tracking-[0.3em]">
                   <p>Authorized Document - {activeTimetable.id || 'Draft'}</p>
                   <p>EduManage Pro Software</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cell Editor Modal */}
      <AnimatePresence>
        {editingCell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden"
             >
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Edit Cell Entry</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      {activeTimetable?.periods.find(p => p.id === editingCell.periodId)?.name} Entry
                    </p>
                  </div>
                  <button 
                    onClick={() => setEditingCell(null)}
                    className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 text-slate-400 rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xl shadow-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 space-y-8">
                   <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Subject Name</label>
                     <input 
                       className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                       placeholder="e.g. Mathematics"
                       value={editCellForm.subject || ''}
                       onChange={e => setEditCellForm({...editCellForm, subject: e.target.value})}
                     />
                   </div>
                   <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Teacher / Instructor</label>
                     <input 
                       className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                       placeholder="e.g. Mr. James Miller"
                       value={editCellForm.teacher || ''}
                       onChange={e => setEditCellForm({...editCellForm, teacher: e.target.value})}
                     />
                   </div>
                   <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Short Note (Optional)</label>
                     <input 
                       className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                       placeholder="e.g. Bring calculators"
                       value={editCellForm.notes || ''}
                       onChange={e => setEditCellForm({...editCellForm, notes: e.target.value})}
                     />
                   </div>
                </div>

                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-4">
                  <button 
                    onClick={() => setEditingCell(null)}
                    className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={saveCellEdit}
                    className="px-10 py-5 bg-blue-600 text-white rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    Confirm Entry
                  </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 2px solid #000 !important;
          }
          .bg-slate-100 { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
          .bg-slate-50 { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
        }
      `}} />
    </div>
  );
}
