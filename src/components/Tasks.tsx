import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, UserProfile, Staff } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Tag,
  CheckSquare,
  Square,
  MoreVertical,
  Bell,
  BellRing,
  X,
  Loader2,
  ArrowUpDown,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface TasksProps {
  profile: UserProfile | null;
}

export default function Tasks({ profile }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority'>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTasksText, setBulkTasksText] = useState('');
  
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    status: 'pending',
    assignedToIds: [],
    reminderDate: '',
    reminderTime: '',
  });

  useEffect(() => {
    if (profile) {
      fetchTasks();
      fetchStaff();
    }
  }, [profile]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let q;
      if (profile?.role === 'admin' || profile?.role === 'staff') {
        q = query(
          collection(db, 'tasks'),
          where('campusId', '==', profile?.campusId || 'main'),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'tasks'),
          where('campusId', '==', profile?.campusId || 'main'),
          where('assignedToIds', 'array-contains', profile?.uid),
          orderBy('createdAt', 'desc')
        );
      }
      const snap = await getDocs(q);
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Task)));
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (profile?.role !== 'admin' && profile?.role !== 'staff') return;
    try {
      const snap = await getDocs(collection(db, 'staff'));
      setStaff(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Staff)));
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      if (editingTask?.id) {
        await updateDoc(doc(db, 'tasks', editingTask.id), {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...formData,
          createdBy: profile.uid,
          campusId: profile.campusId || 'main',
          createdAt: new Date().toISOString(),
        });
      }
      setIsModalOpen(false);
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
        status: 'pending',
        assignedToIds: [],
        reminderDate: '',
        reminderTime: '',
      });
      fetchTasks();
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      assignedToIds: task.assignedToIds || [],
      reminderDate: task.reminderDate || '',
      reminderTime: task.reminderTime || '',
    });
    setIsModalOpen(true);
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const taskTitles = bulkTasksText.split('\n').filter(t => t.trim().length > 0);
    if (taskTitles.length === 0) return;

    setLoading(true);
    try {
      const batch = taskTitles.map(title => 
        addDoc(collection(db, 'tasks'), {
          title: title.trim(),
          description: 'Bulk created task',
          dueDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
          status: 'pending',
          assignedToIds: [],
          createdBy: profile.uid,
          campusId: profile.campusId || 'main',
          createdAt: new Date().toISOString(),
        })
      );
      await Promise.all(batch);
      setIsBulkModalOpen(false);
      setBulkTasksText('');
      fetchTasks();
    } catch (error) {
      console.error("Error bulk adding tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'medium',
      status: 'pending',
      assignedToIds: [],
      reminderDate: '',
      reminderTime: '',
    });
    setIsModalOpen(true);
  };

  const deleteTask = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteDoc(doc(db, 'tasks', id));
        fetchTasks();
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesAssignee = filterAssignee === 'all' || task.assignedTo === filterAssignee;
    return matchesSearch && matchesStatus && matchesAssignee;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    percent: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'dueDate') {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const weightA = priorityWeight[a.priority] || 0;
      const weightB = priorityWeight[b.priority] || 0;
      return sortDirection === 'asc' ? weightA - weightB : weightB - weightA;
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-500 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      case 'low': return 'bg-emerald-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
            <CheckSquare className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Task Management</h1>
            <p className="text-slate-500 font-medium">Organize and track school operations</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="btn-secondary flex items-center gap-2 px-6 py-3"
          >
            <CheckSquare className="w-5 h-5" />
            Bulk Create
          </button>
          <button
            onClick={openCreateModal}
            className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-indigo-100"
          >
            <Plus className="w-5 h-5" />
            Create New Task
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Overall Progress</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Task Completion Rate</p>
            </div>
            <div className="text-3xl font-black text-indigo-600">{stats.percent}%</div>
          </div>
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${stats.percent}%` }}
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600"
            />
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>0%</span>
            <span>{stats.completed} of {stats.total} Tasks Completed</span>
            <span>100%</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">{stats.pending}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Loader2 className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">{stats.inProgress}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In Progress</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="relative md:col-span-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative md:col-span-2">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 appearance-none text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="relative md:col-span-2">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 appearance-none text-sm"
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="all">All Assignees</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="relative md:col-span-2">
          <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 appearance-none text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="dueDate">Due Date</option>
            <option value="priority">Priority</option>
          </select>
        </div>
        <button
          onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
          className="md:col-span-2 flex items-center justify-center gap-3 px-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all font-bold text-slate-700 text-sm"
        >
          {sortDirection === 'asc' ? <SortAsc className="w-5 h-5 text-indigo-600" /> : <SortDesc className="w-5 h-5 text-indigo-600" />}
          <span>{sortDirection === 'asc' ? 'Asc' : 'Desc'}</span>
        </button>
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-bold">Loading your tasks...</p>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
              <CheckSquare className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No tasks found</h3>
            <p className="text-slate-500 font-medium">Start by creating a new task for your team.</p>
          </div>
        ) : (
          sortedTasks.map((task) => (
            <motion.div
              layout
              key={task.id}
              className={cn(
                "group relative bg-white p-6 rounded-[32px] border transition-all duration-300 hover:shadow-xl hover:shadow-indigo-50/50",
                task.status === 'completed' ? "border-emerald-100 bg-emerald-50/10" : "border-slate-100"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => task.id && updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    task.status === 'completed' ? "text-emerald-600 bg-emerald-100" : "text-slate-300 hover:text-indigo-600 hover:bg-indigo-50"
                  )}
                >
                  <AnimatePresence mode="wait">
                    {task.status === 'completed' ? (
                      <motion.div
                        key="completed"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                      >
                        <CheckCircle2 className="w-6 h-6" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="pending"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                      >
                        <Square className="w-6 h-6" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    getPriorityColor(task.priority)
                  )}>
                    {task.priority}
                  </span>
                  <button
                    onClick={() => openEditModal(task)}
                    className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => task.id && deleteTask(task.id)}
                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className={cn(
                "text-lg font-black text-slate-900 mb-2 tracking-tight",
                task.status === 'completed' && "line-through text-slate-400"
              )}>
                {task.title}
              </h3>
              <p className={cn(
                "text-sm text-slate-500 font-medium mb-6 line-clamp-2",
                task.status === 'completed' && "text-slate-400"
              )}>
                {task.description}
              </p>

              <div className="space-y-3 pt-4 border-t border-slate-50">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Due: {task.dueDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <User className="w-3.5 h-3.5" />
                      <div className="flex -space-x-2">
                        {task.assignedToIds && task.assignedToIds.length > 0 ? (
                          task.assignedToIds.map((id, idx) => {
                            const s = staff.find(st => st.id === id);
                            return (
                              <div 
                                key={id} 
                                title={s?.name || 'Unknown'}
                                className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-indigo-600"
                              >
                                {s?.name.charAt(0) || '?'}
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-[10px]">Unassigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {task.reminderDate && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg w-fit">
                      <BellRing className="w-3 h-3" />
                      <span>Reminder: {task.reminderDate} {task.reminderTime}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    task.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                    task.status === 'in-progress' ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {task.status}
                  </div>
                  
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-full">
                    {(['pending', 'in-progress', 'completed'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => task.id && updateTaskStatus(task.id, s)}
                        title={`Mark as ${s}`}
                        className={cn(
                          "p-1.5 rounded-full transition-all",
                          task.status === s 
                            ? s === 'completed' ? "bg-emerald-600 text-white" :
                              s === 'in-progress' ? "bg-indigo-600 text-white" : "bg-slate-600 text-white"
                            : "text-slate-300 hover:bg-slate-200"
                        )}
                      >
                        {s === 'pending' && <Clock className="w-3 h-3" />}
                        {s === 'in-progress' && <Loader2 className={cn("w-3 h-3", task.status === s && "animate-spin")} />}
                        {s === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Bulk Create Modal */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsBulkModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-6 h-6" />
                  <h2 className="text-2xl font-black tracking-tight">Bulk Create Tasks</h2>
                </div>
                <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleBulkSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Task List (One per line)</label>
                  <textarea
                    required
                    rows={8}
                    placeholder="Enter task titles here..."
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={bulkTasksText}
                    onChange={e => setBulkTasksText(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 font-bold italic">Each line will be created as a new task with default settings.</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="flex-1 px-6 py-4 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Tasks'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Task Modal */}
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
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-6 h-6" />
                  <h2 className="text-2xl font-black tracking-tight">{editingTask ? 'Edit Task' : 'New Task'}</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Task Title</label>
                  <input
                    required
                    type="text"
                    placeholder="What needs to be done?"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Due Date</label>
                    <input
                      required
                      type="date"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                      value={formData.dueDate}
                      onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Priority</label>
                    <select
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold appearance-none"
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: e.target.value as any})}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Status</label>
                    <select
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold appearance-none"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Assign To Staff Members</label>
                  <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    {staff.map(s => (
                      <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={formData.assignedToIds?.includes(s.id || '')}
                          onChange={(e) => {
                            const currentIds = formData.assignedToIds || [];
                            if (e.target.checked) {
                              setFormData({...formData, assignedToIds: [...currentIds, s.id || '']});
                            } else {
                              setFormData({...formData, assignedToIds: currentIds.filter(id => id !== s.id)});
                            }
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{s.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{s.role}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Reminder Date</label>
                    <input
                      type="date"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                      value={formData.reminderDate}
                      onChange={e => setFormData({...formData, reminderDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Reminder Time</label>
                    <input
                      type="time"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                      value={formData.reminderTime}
                      onChange={e => setFormData({...formData, reminderTime: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea
                    rows={4}
                    placeholder="Add more details about this task..."
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    {editingTask ? 'Update Task' : 'Create Task'}
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
