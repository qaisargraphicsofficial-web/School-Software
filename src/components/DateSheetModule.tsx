import React, { useState, useEffect } from 'react';
import { DateSheet, DateSheetRow } from '../types';
import { Plus, Trash2, Printer, Save, Download, FileText, X } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';

export default function DateSheetModule({ campusId }: { campusId: string }) {
  const [dateSheet, setDateSheet] = useState<DateSheet>({
    title: 'Date Sheet for 1st Term Exam May, 2026',
    classes: ['One', 'Two', 'Three'],
    rows: [{ id: '1', date: '2026-05-15', day: 'Monday', subjects: { 'One': 'Math', 'Two': 'Science', 'Three': 'English' } }],
    notes: [{ id: 'n1', text: 'Please arrive on time.' }],
    signatures: [{ id: 's1', label: 'Principal', name: 'Dr. John Doe' }],
    campusId,
    updatedAt: new Date().toISOString()
  });

  const [dateSheets, setDateSheets] = useState<DateSheet[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [printWarning, setPrintWarning] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const loadDateSheets = async () => {
    try {
      const q = query(collection(db, 'dateSheets'), where('campusId', '==', campusId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(docData => ({ ...docData.data() as DateSheet, id: docData.id }));
        docs.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setDateSheets(docs);
        if (!dateSheet.id && docs.length > 0) {
          setDateSheet(docs[0]);
        }
      } else {
        setDateSheets([]);
      }
    } catch (error) {
      console.error("Error loading date sheet:", error);
    }
  };

  useEffect(() => {
    loadDateSheets();
  }, [campusId]);

  const saveDateSheet = async () => {
    setIsSaving(true);
    try {
      if (dateSheet.id) {
        await updateDoc(doc(db, 'dateSheets', dateSheet.id), { ...dateSheet, updatedAt: new Date().toISOString() });
      } else {
        const docRef = await addDoc(collection(db, 'dateSheets'), { ...dateSheet, updatedAt: new Date().toISOString() });
        setDateSheet(prev => ({ ...prev, id: docRef.id }));
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      loadDateSheets();
    } catch (error) {
      console.error("Error saving date sheet:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const createNewDateSheet = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateSheet({
      title: 'New Exam Date Sheet',
      classes: ['One', 'Two', 'Three'],
      rows: [{ id: Date.now().toString(), date: today, day: getDayName(today), subjects: {} }],
      notes: [],
      signatures: [],
      campusId,
      updatedAt: new Date().toISOString()
    });
  };

  const handlePrint = () => {
    try {
      if (window.self !== window.top) {
        setPrintWarning(true);
        setTimeout(() => setPrintWarning(false), 5000);
      }
      window.print();
    } catch (e) {
      console.error(e);
      setPrintWarning(true);
      setTimeout(() => setPrintWarning(false), 5000);
    }
  };

  const addRow = () => {
    const today = new Date().toISOString().split('T')[0];
    const newRow: DateSheetRow = { 
      id: Date.now().toString(), 
      date: today, 
      day: getDayName(today), 
      subjects: {} 
    };
    setDateSheet({...dateSheet, rows: [...dateSheet.rows, newRow]});
  };

  const confirmAddColumn = () => {
    if (newClassName.trim() && !dateSheet.classes.includes(newClassName.trim())) {
      setDateSheet({...dateSheet, classes: [...dateSheet.classes, newClassName.trim()]});
      setNewClassName('');
      setShowAddClass(false);
    }
  };

  return (
    <div className="space-y-6">
      {printWarning && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200 p-4 rounded-xl flex items-start gap-3 print:hidden">
          <div className="mt-0.5">⚠️</div>
          <div>
            <h3 className="font-bold">Printing from Preview</h3>
            <p className="text-sm">The print feature may be blocked by your browser while inside this preview window. To print successfully, please open the app in a new tab by clicking the ↗️ icon in the top right corner.</p>
          </div>
          <button onClick={() => setPrintWarning(false)} className="ml-auto text-amber-500 hover:text-amber-800">
            <X size={16} />
          </button>
        </div>
      )}
      <style>
        {`
          @media print {
            body {
              -webkit-print-color-adjust: exact;
            }
            input[type="date"]::-webkit-calendar-picker-indicator {
              display: none !important;
            }
            input::-webkit-outer-spin-button,
            input::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
          }
        `}
      </style>
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h2 className="text-xl font-bold">Exam Date Sheet</h2>
          <div className="flex gap-2">
              <button onClick={createNewDateSheet} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50"><Plus size={16}/> Create New</button>
              <button onClick={saveDateSheet} disabled={isSaving || isSaved} className={`flex items-center gap-2 px-4 py-2 ${isSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg disabled:opacity-50 transition-colors`}>
                {isSaving ? <Save size={16} className="animate-pulse" /> : <Save size={16}/>}
                {isSaving ? 'Saving...' : isSaved ? 'Saved!' : 'Save'}
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50"><Printer size={16}/> Print</button>
          </div>
        </div>
      
      <div className="mb-4">
        <input className="text-2xl font-bold w-full border-b border-dashed border-slate-300 outline-none print:border-none print:text-center shrink-0" value={dateSheet.title} onChange={e => setDateSheet({...dateSheet, title: e.target.value})} />
      </div>

      <div className="overflow-x-auto w-full print:overflow-visible">
        <table className="w-full border-collapse border border-slate-300 min-w-max print:min-w-0">
          <thead>
              <tr className="bg-slate-100 print:bg-white text-left">
                  <th className="border border-slate-300 p-2 whitespace-nowrap">Date</th>
                  <th className="border border-slate-300 p-2 whitespace-nowrap">Day</th>
                  {dateSheet.classes.map(c => (
                    <th key={c} className="border border-slate-300 p-2 whitespace-nowrap min-w-[120px]">
                      <div className="flex items-center justify-between">
                        <span>{c}</span>
                        <button 
                          onClick={() => setDateSheet({...dateSheet, classes: dateSheet.classes.filter(cls => cls !== c)})}
                          className="text-red-500 hover:text-red-700 print:hidden ml-2"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="border border-slate-300 p-2 w-10 print:hidden">Actions</th>
              </tr>
          </thead>
          <tbody>
              {dateSheet.rows.map(row => (
                  <tr key={row.id}>
                      <td className="border border-slate-300 p-2">
                        <input 
                          type="date" 
                          value={row.date} 
                          className="w-full outline-none bg-transparent" 
                          onChange={e => {
                            const newDate = e.target.value;
                            const updated = dateSheet.rows.map(r => r.id === row.id ? {...r, date: newDate, day: getDayName(newDate)} : r);
                            setDateSheet({...dateSheet, rows: updated});
                          }}
                        />
                      </td>
                      <td className="border border-slate-300 p-2">
                        <input 
                          value={row.day} 
                          className="w-full outline-none bg-transparent"
                          onChange={e => {
                            const updated = dateSheet.rows.map(r => r.id === row.id ? {...r, day: e.target.value} : r);
                            setDateSheet({...dateSheet, rows: updated});
                          }}
                        />
                      </td>
                      {dateSheet.classes.map(c => (
                          <td key={c} className="border border-slate-300 p-2">
                            <input 
                              value={row.subjects[c] || ''} 
                              className="w-full outline-none bg-transparent"
                              placeholder="-"
                              onChange={e => {
                                const updated = dateSheet.rows.map(r => 
                                  r.id === row.id ? {...r, subjects: {...r.subjects, [c]: e.target.value}} : r
                                );
                                setDateSheet({...dateSheet, rows: updated});
                              }}
                            />
                          </td>
                      ))}
                      <td className="border border-slate-300 p-2 text-center print:hidden">
                        <button onClick={() => setDateSheet({...dateSheet, rows: dateSheet.rows.filter(r => r.id !== row.id)})} className="text-red-500 hover:bg-slate-50 p-1 rounded"><Trash2 size={16}/></button>
                      </td>
                  </tr>
              ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 flex flex-col gap-4 print:hidden">
        <div className="flex gap-2">
          <button onClick={addRow} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"><Plus size={16}/> Add Row</button>
          
          {showAddClass ? (
            <div className="flex items-center gap-2 ml-4">
              <input 
                type="text" 
                autoFocus
                placeholder="Class name..." 
                className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmAddColumn()}
              />
              <button onClick={confirmAddColumn} className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700">Add</button>
              <button onClick={() => setShowAddClass(false)} className="px-3 py-2 border rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowAddClass(true)} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50"><Plus size={16}/> Add Class Column</button>
          )}
        </div>
      </div>
      </div>

      {/* Saved Date Sheets List */}
      {dateSheets.length > 0 && (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 print:hidden">
          <h2 className="text-xl font-bold mb-4">Saved Date Sheets</h2>
          <div className="space-y-3">
            {dateSheets.map(ds => (
              <div 
                key={ds.id} 
                onClick={() => setDateSheet(ds)}
                className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${
                  dateSheet.id === ds.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <h3 className="font-bold text-slate-900">{ds.title || 'Untitled Date Sheet'}</h3>
                  <p className="text-sm text-slate-500">Updated: {new Date(ds.updatedAt).toLocaleDateString()} at {new Date(ds.updatedAt).toLocaleTimeString()}</p>
                </div>
                <div className="text-indigo-600 font-medium text-sm">
                  {dateSheet.id === ds.id ? 'Currently Editing' : 'Click to Edit'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
