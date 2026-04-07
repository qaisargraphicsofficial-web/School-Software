import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { InventoryItem, UserProfile } from '../types';
import { 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  X,
  AlertTriangle,
  RefreshCw,
  Box,
  Library,
  Shirt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface InventoryProps { profile: UserProfile | null; }

export default function Inventory({ profile }: InventoryProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '',
    quantity: 0,
    category: 'Assets',
    lastUpdated: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'inventory'), orderBy('lastUpdated', 'desc'));
      const snap = await getDocs(q);
      setItems(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as InventoryItem)));
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'inventory'), formData);
      setIsModalOpen(false);
      setFormData({ name: '', quantity: 0, category: 'Assets', lastUpdated: new Date().toISOString().split('T')[0] });
      fetchInventory();
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const updateQuantity = async (id: string, newQty: number) => {
    try {
      await updateDoc(doc(db, 'inventory', id), { quantity: newQty, lastUpdated: new Date().toISOString().split('T')[0] });
      fetchInventory();
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Library': return Library;
      case 'Uniforms': return Shirt;
      default: return Box;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
        {profile?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add New Item
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search inventory..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center animate-pulse">Loading inventory...</div>
        ) : filteredItems.map((item) => {
          const Icon = getCategoryIcon(item.category);
          return (
            <motion.div
              layout
              key={item.id}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <Icon className="w-6 h-6 text-slate-600" />
                </div>
                {item.quantity < 10 && (
                  <div className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-3 h-3" />
                    Low Stock
                  </div>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{item.name}</h3>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-4">{item.category}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-medium">Quantity</span>
                  <span className="text-xl font-bold text-slate-900">{item.quantity}</span>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => updateQuantity(item.id!, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    -
                  </button>
                  <button 
                    onClick={() => updateQuantity(item.id!, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4">Last updated: {item.lastUpdated}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <h2 className="text-xl font-bold">Add Inventory Item</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Item Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Quantity</label>
                    <input
                      required
                      type="number"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.quantity}
                      onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Category</label>
                    <select
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      <option>Assets</option>
                      <option>Library</option>
                      <option>Uniforms</option>
                      <option>Stationery</option>
                      <option>Sports</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Add to Inventory
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
