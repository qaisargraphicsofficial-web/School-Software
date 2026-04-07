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
  Loader2,
  Briefcase,
  GraduationCap,
  HelpCircle,
  Clock,
  Smartphone,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SettingsProps {
  profile: UserProfile | null;
}

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1">
    <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-indigo-600 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48 z-50 shadow-xl">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
    </div>
  </div>
);

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
    defaultAdmissionYear: '2025',
    academicSession: '2025-2026',
    currency: 'USD',
    timezone: 'UTC (GMT+0)',
    notificationPreferences: {
      email: true,
      push: true,
      sms: false
    },
    staffPermissions: {
      'Teacher': ['Students', 'Academic', 'Attendance', 'Diary'],
      'Administrator': ['Students', 'Staff', 'Academic', 'Finance', 'Inventory', 'Settings'],
      'Accountant': ['Finance', 'Inventory'],
      'Librarian': ['Library']
    },
    enableNotifications: true,
    allowParentRegistration: true,
    maintenanceMode: false,
    logoUrl: '',
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
    { id: 'security', name: 'Security & Access', icon: ShieldCheck },
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
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-slate-500 font-medium">Manage your institution's global configuration and access controls.</p>
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
          <div className="bg-white rounded-[32px] border border-slate-200 p-3 space-y-1 shadow-sm sticky top-6">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Logo Section */}
                    <div className="space-y-4 md:col-span-2 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">School Logo</label>
                        <Tooltip text="The official logo of your school. This will appear in the sidebar and on generated certificates/reports." />
                      </div>
                      <div className="flex gap-6 items-center">
                        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm shrink-0">
                          {settings.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Globe className="w-8 h-8 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            type="url"
                            className="input-field"
                            value={settings.logoUrl}
                            onChange={e => setSettings({...settings, logoUrl: e.target.value})}
                            placeholder="https://example.com/logo.png"
                          />
                          <p className="text-[10px] text-slate-400 font-medium italic">Provide a direct image URL (PNG or JPG recommended).</p>
                        </div>
                      </div>
                    </div>

                    {/* Basic Info Section */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">School Name</label>
                          <Tooltip text="The full official name of your institution." />
                        </div>
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
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">School Email</label>
                          <Tooltip text="Primary contact email for system communications." />
                        </div>
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
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
                          <Tooltip text="Official phone number for the school office." />
                        </div>
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
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Default Currency</label>
                          <Tooltip text="The primary currency used for fee collection and payroll." />
                        </div>
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

                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">School Address / Location</label>
                        <Tooltip text="The physical location of the main campus." />
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                        <textarea
                          rows={3}
                          className="input-field pl-11 pt-3"
                          value={settings.schoolAddress}
                          onChange={e => setSettings({...settings, schoolAddress: e.target.value})}
                          placeholder="Full physical address or location details..."
                        />
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
                      <h3 className="text-xl font-black text-slate-900">Academic & Student Configuration</h3>
                      <p className="text-sm text-slate-500 font-medium">Manage terms, sessions and student-specific defaults.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Session Section */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Current Academic Session</label>
                          <Tooltip text="The active academic period (e.g. 2025-2026)." />
                        </div>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            className="input-field pl-11"
                            value={settings.academicSession}
                            onChange={e => setSettings({...settings, academicSession: e.target.value})}
                            placeholder="2025-2026"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Default Admission Year</label>
                          <Tooltip text="The default year assigned to new student admissions." />
                        </div>
                        <div className="relative">
                          <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            className="input-field pl-11"
                            value={settings.defaultAdmissionYear}
                            onChange={e => setSettings({...settings, defaultAdmissionYear: e.target.value})}
                            placeholder="2025"
                          />
                        </div>
                      </div>
                    </div>

                    {/* System Parameters Section */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">System Time Zone</label>
                          <Tooltip text="The time zone used for all system timestamps and reminders." />
                        </div>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                            className="input-field pl-11"
                            value={settings.timezone}
                            onChange={e => setSettings({...settings, timezone: e.target.value})}
                          >
                            <option>UTC (GMT+0)</option>
                            <option>EST (GMT-5)</option>
                            <option>PST (GMT-8)</option>
                            <option>PKT (GMT+5)</option>
                            <option>IST (GMT+5:30)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Notification Channels</label>
                          <Tooltip text="Choose which channels are active for system-wide notifications." />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(['email', 'push', 'sms'] as const).map((channel) => (
                            <button
                              key={channel}
                              type="button"
                              onClick={() => setSettings({
                                ...settings,
                                notificationPreferences: {
                                  ...settings.notificationPreferences,
                                  [channel]: !settings.notificationPreferences[channel]
                                }
                              })}
                              className={cn(
                                "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                                settings.notificationPreferences[channel]
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                                  : "bg-white border-slate-100 text-slate-400"
                              )}
                            >
                              {channel === 'email' && <Mail className="w-4 h-4" />}
                              {channel === 'push' && <Smartphone className="w-4 h-4" />}
                              {channel === 'sms' && <Bell className="w-4 h-4" />}
                              <span className="text-[9px] font-black uppercase tracking-widest">{channel}</span>
                            </button>
                          ))}
                        </div>
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
                      <h3 className="text-xl font-black text-slate-900">Security & Access Control</h3>
                      <p className="text-sm text-slate-500 font-medium">Manage user permissions and system access.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">Allow Parent Registration</h4>
                            <Tooltip text="Enable parents to create their own accounts via the portal." />
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">Self-service account creation.</p>
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
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">System Notifications</h4>
                            <Tooltip text="Send automated alerts for tasks, fees and attendance." />
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">Global notification engine.</p>
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
                    </div>

                    <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 space-y-8">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
                          <Lock className="w-4 h-4 text-indigo-600" />
                          Granular Role Permissions
                        </h4>
                        <Tooltip text="Define which modules each staff role can access. This controls the sidebar visibility and page access." />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-8">
                        {Object.entries(settings.staffPermissions).map(([role, permissions]) => {
                          const perms = permissions as string[];
                          return (
                            <div key={role} className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                                  <Briefcase className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div>
                                  <h5 className="text-sm font-black text-slate-900">{role}</h5>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Module Access</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {['Students', 'Staff', 'Academic', 'Finance', 'Inventory', 'Library', 'Diary', 'Exams', 'Settings'].map((module) => (
                                  <label
                                    key={module}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                      perms.includes(module)
                                        ? "bg-white border-indigo-200 shadow-sm"
                                        : "bg-slate-100/50 border-transparent opacity-60"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                      checked={perms.includes(module)}
                                      onChange={(e) => {
                                        const newPermissions = e.target.checked
                                          ? [...perms, module]
                                          : perms.filter(p => p !== module);
                                        setSettings({
                                          ...settings,
                                          staffPermissions: {
                                            ...settings.staffPermissions,
                                            [role]: newPermissions
                                          }
                                        });
                                      }}
                                    />
                                    <span className="text-[11px] font-bold text-slate-700">{module}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
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
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">Maintenance Mode</h4>
                            <Tooltip text="Restrict all user access except administrators for system updates. Users will see a maintenance screen." />
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">Restrict all user access except administrators for system updates.</p>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 flex items-center gap-2">
                            <Database className="w-4 h-4 text-indigo-600" />
                            Data Backup
                          </h4>
                          <Tooltip text="Download a full snapshot of your school database in JSON format. Highly recommended before major changes." />
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">Download a full snapshot of your school database in JSON format.</p>
                        <button
                          type="button"
                          className="w-full px-6 py-3 bg-white border border-slate-200 text-slate-900 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                        >
                          Generate Backup
                        </button>
                      </div>

                      <div className="p-6 bg-rose-50/30 rounded-3xl border border-rose-100 space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-rose-600 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Factory Reset
                          </h4>
                          <Tooltip text="Permanently delete all records and reset the system to defaults. This action CANNOT be undone." />
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">Permanently delete all records and reset the system to defaults.</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("CRITICAL WARNING: This will delete ALL data permanently. Are you absolutely sure?")) {
                              alert("This feature is restricted for safety. Please contact system support for a full reset.");
                            }
                          }}
                          className="w-full px-6 py-3 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-all shadow-sm"
                        >
                          Reset System
                        </button>
                      </div>
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
