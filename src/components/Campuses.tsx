import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Campus, UserProfile } from '../types';
import { School, Plus, Search, MapPin, Phone, Building2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Campuses({ profile }: { profile: UserProfile | null }) {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampus, setNewCampus] = useState<Partial<Campus>>({
    name: '',
    location: '',
    contact: '',
  });

  useEffect(() => {
    fetchCampuses();
  }, []);

  const fetchCampuses = async () => {
    try {
      const q = query(collection(db, 'campuses'));
      const snap = await getDocs(q);
      setCampuses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campus)));
    } catch (error) {
      console.error("Error fetching campuses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'campuses'), newCampus);
      setIsModalOpen(false);
      fetchCampuses();
    } catch (error) {
      console.error("Error adding campus:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Multi-Campus Management</h1>
          <p className="text-slate-500 text-sm">Manage school branches and campuses</p>
        </div>
        {profile?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Campus
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campuses.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              {profile?.campusId === c.id && (
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                  Current
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{c.name}</h3>
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4" />
                {c.location}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="w-4 h-4" />
                {c.contact}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-4">Add New Campus</h2>
            <form onSubmit={handleAddCampus} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campus Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newCampus.name}
                  onChange={e => setNewCampus({...newCampus, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newCampus.location}
                  onChange={e => setNewCampus({...newCampus, location: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Details</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newCampus.contact}
                  onChange={e => setNewCampus({...newCampus, contact: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Save Campus
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
