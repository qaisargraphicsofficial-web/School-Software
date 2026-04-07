import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SchoolSettings, UserProfile } from '../types';
import { 
  Settings as SettingsIcon, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  Bell, 
  ShieldCheck, 
  Database, 
  Save,
  Globe,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SettingsProps {
  profile: UserProfile | null;
}

export default function Settings({ profile }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'academic' | 'security' | 'system'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: 'EduManage Pro',
    schoolAddress: '123 Education Way, Knowledge City',
    schoolContact: '+1 234 567 890',
    schoolEmail: 'admin@edumanage.pro',
    academicYear: '2025-2026',
    currency: 'USD',
    enableNotifications: true,
    allowParentRegistration: true,
    maintenanceMode: false,
    updatedAt: new Date().toISOString()
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SchoolSettings);
      } else {
        // Initialize with defaults if not exists
        await setDoc(docRef, settings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.role !== 'admin') return;
    
    setSaving(true);
    try {
      const docRef = doc(db, 'settings', 'global');
      const updatedSettings = {
        ...settings,
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, updatedSettings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Building2 },
    { id: 'academic', name: 'Academic', icon: Calendar },
    { id: 'security', name: 'Security', icon: ShieldCheck },
    { id: 'system', name: 'System', icon: Database },
  ];

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-slate-500 font-medium">Configure global application parameters and school information.</p>
        </div>
        
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-bold text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Settings Saved Successfully
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="bg-white rounded-[32px] border border-slate-200 p-3 space-y-1 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm transition-all duration-300",
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-white" : "text-slate-400")} />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <form onSubmit={handleSave} className="space-y-6">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-8 lg:p-10"
            >
              {activeTab === 'general' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">School Information</h3>
                      <p className="text-sm text-slate-500 font-medium">Basic details about your institution.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">School Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          className="input-field pl-11"
                          value={settings.schoolName}
                          onChange={e => setSettings({...settings, schoolName: e.target.value})}
                          placeholder="e.g. Knowledge Academy"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">School Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          className="input-field pl-11"
                          value={settings.schoolEmail}
                          onChange={e => setSettings({...settings, schoolEmail: e.target.value})}
                          placeholder="admin@school.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">School Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                        <textarea
                          rows={3}
                          className="input-field pl-11 pt-3"
                          value={settings.schoolAddress}
                          onChange={e => setSettings({...settings, schoolAddress: e.target.value})}
                          placeholder="Full physical address..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          className="input-field pl-11"
                          value={settings.schoolContact}
                          onChange={e => setSettings({...settings, schoolContact: e.target.value})}
                          placeholder="+1 234 567 890"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Currency</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          className="input-field pl-11"
                          value={settings.currency}
                          onChange={e => setSettings({...settings, currency: e.target.value})}
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="PKR">PKR (Rs)</option>
                          <option value="INR">INR (₹)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'academic' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                    <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Academic Configuration</h3>
                      <p className="text-sm text-slate-500 font-medium">Manage terms, years and sessions.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Current Academic Year</label>
                      <input
                        type="text"
                        className="input-field"
                        value={settings.academicYear}
                        onChange={e => setSettings({...settings, academicYear: e.target.value})}
                        placeholder="2025-2026"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Time Zone</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select className="input-field pl-11">
                          <option>UTC (GMT+0)</option>
                          <option>EST (GMT-5)</option>
                          <option>PST (GMT-8)</option>
                          <option>PKT (GMT+5)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Security & Permissions</h3>
                      <p className="text-sm text-slate-500 font-medium">Control access and user registration.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900">Allow Parent Registration</h4>
                        <p className="text-xs text-slate-500 font-medium">Enable parents to create their own accounts via the portal.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettings({...settings, allowParentRegistration: !settings.allowParentRegistration})}
                        className={cn(
                          "w-14 h-8 rounded-full transition-all relative",
                          settings.allowParentRegistration ? "bg-indigo-600" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
                          settings.allowParentRegistration ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900">Enable System Notifications</h4>
                        <p className="text-xs text-slate-500 font-medium">Send automated alerts for tasks, fees and attendance.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettings({...settings, enableNotifications: !settings.enableNotifications})}
                        className={cn(
                          "w-14 h-8 rounded-full transition-all relative",
                          settings.enableNotifications ? "bg-indigo-600" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
                          settings.enableNotifications ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-indigo-600" />
                        Role-Based Access Control
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Staff Permissions</p>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-600" />
                              Manage Students
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-600" />
                              Mark Attendance
                            </label>
                          </div>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-slate-100">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Student Permissions</p>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-600" />
                              View Results
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                              <input type="checkbox" className="rounded border-slate-300 text-indigo-600" />
                              Edit Profile
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                    <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">System Management</h3>
                      <p className="text-sm text-slate-500 font-medium">Maintenance and data operations.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-rose-50/50 rounded-3xl border border-rose-100">
                      <div className="flex gap-4">
                        <AlertTriangle className="w-10 h-10 text-rose-600 shrink-0" />
                        <div>
                          <h4 className="font-bold text-slate-900">Maintenance Mode</h4>
                          <p className="text-xs text-slate-500 font-medium">Restrict all user access except administrators for system updates.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
                        className={cn(
                          "w-14 h-8 rounded-full transition-all relative",
                          settings.maintenanceMode ? "bg-rose-600" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
                          settings.maintenanceMode ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <Database className="w-4 h-4 text-indigo-600" />
                        Data Backup
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">Download a full snapshot of your school database in JSON format.</p>
                      <button
                        type="button"
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-900 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                      >
                        Generate Backup
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="pt-10 flex justify-end">
                <button
                  type="submit"
                  disabled={saving || profile?.role !== 'admin'}
                  className="inline-flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {saving ? 'Saving Changes...' : 'Save All Settings'}
                </button>
              </div>
            </motion.div>
          </form>
        </div>
      </div>
    </div>
  );
}
