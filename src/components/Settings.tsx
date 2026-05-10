import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { seedData } from '../services/seedService';
import { SchoolSettings, UserProfile, SchoolApplication, UserStatus } from '../types';
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
  Layout,
  Plus,
  X,
  UserCheck,
  CreditCard,
  FileText,
  User,
  Users,
  BookOpen,
  ClipboardList,
  BarChart3,
  Wallet,
  Receipt,
  Users2,
  UserSquare2,
  Book,
  BookText,
  Package,
  ScrollText,
  Award,
  MessageSquare,
  Map,
  PieChart,
  CheckSquare,
  LayoutDashboard,
  Library,
  Landmark,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const MODULE_CATEGORIES = {
  'Core': [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Communication', icon: MessageSquare },
    { name: 'Reports', icon: PieChart },
    { name: 'Settings', icon: SettingsIcon },
    { name: 'Campuses', icon: Building2 },
  ],
  'Academic': [
    { name: 'Students', icon: Users },
    { name: 'Teachers', icon: UserSquare2 },
    { name: 'Classes', icon: BookOpen },
    { name: 'Attendance', icon: Calendar },
    { name: 'Results', icon: GraduationCap },
    { name: 'Schedule', icon: Calendar },
    { name: 'Curriculum', icon: BookText },
    { name: 'Diary', icon: BookOpen },
    { name: 'Certificates', icon: Award },
  ],
  'Finance': [
    { name: 'Fees', icon: Wallet },
    { name: 'Payroll', icon: CreditCard },
    { name: 'Expenses', icon: FileText },
  ],
  'Administrative': [
    { name: 'Leave', icon: FileText },
    { name: 'Tasks', icon: CheckSquare },
    { name: 'Library', icon: Library },
    { name: 'Inventory', icon: Package },
  ]
};

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
  const [activeTab, setActiveTab] = useState<'general' | 'academic' | 'security' | 'system' | 'applications'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [applications, setApplications] = useState<SchoolApplication[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<any>(null);

  const handleSeedData = async () => {
    if (!window.confirm("This will populate your database with dummy data for classes, subjects, students, staff, and operations. Existing data with same IDs might be overwritten. Proceed?")) return;
    
    setSeeding(true);
    setSeedStatus("Seeding data...");
    try {
      await seedData(profile?.campusId || 'main');
      setSeedStatus("Successfully seeded all dummy data!");
      setTimeout(() => setSeedStatus(null), 5000);
    } catch (error) {
      console.error("Seeding failed:", error);
      setSeedStatus("Seeding failed. Check console for details.");
    } finally {
      setSeeding(false);
    }
  };
  const [approvingId, setApprovingId] = useState<string | null>(null);
  
  const [newRoleName, setNewRoleName] = useState('');
  const [isAddingRole, setIsAddingRole] = useState(false);

  const isSuperAdmin = profile?.email === "qaisarabbas6496@gmail.com";

  useEffect(() => {
    fetchSettings();
    if (isSuperAdmin) {
      fetchApplications();
    }
  }, [isSuperAdmin]);

  const fetchApplications = async () => {
    try {
      const q = query(collection(db, 'school_applications'));
      const snap = await getDocs(q);
      setApplications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolApplication)));
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  };

  const handleApproveApplication = async (app: SchoolApplication) => {
    if (!app.id) return;
    setApprovingId(app.id);
    try {
      // 1. Update application status
      await updateDoc(doc(db, 'school_applications', app.id), {
        status: 'approved',
        paymentStatus: 'paid'
      });

      // 2. Find and update user profile
      const userQ = query(collection(db, 'users'), where('email', '==', app.email));
      const userSnap = await getDocs(userQ);
      
      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), {
          status: 'approved',
          isSubscribed: true,
          schoolId: app.id,
          campusId: app.id // Use app ID as the isolation ID
        });
      }

      alert(`Application for ${app.schoolName} approved!`);
      fetchApplications();
    } catch (error) {
      console.error("Error approving application:", error);
      alert("Failed to approve application.");
    } finally {
      setApprovingId(null);
    }
  };

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
      'Teacher': ['Dashboard', 'Students', 'Classes', 'Attendance', 'Diary', 'Results', 'Schedule', 'Communication', 'Tasks'],
      'Administrator': ['Dashboard', 'Students', 'Teachers', 'Classes', 'Attendance', 'Results', 'Fees', 'Payroll', 'Expenses', 'Schedule', 'Leave', 'Tasks', 'Communication', 'Reports', 'Settings', 'Campuses', 'Library', 'Inventory', 'Curriculum', 'Diary', 'Certificates'],
      'Accountant': ['Dashboard', 'Fees', 'Payroll', 'Expenses', 'Inventory', 'Reports'],
      'Librarian': ['Dashboard', 'Library', 'Tasks']
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for base64 storage
        alert("File is too large. Please choose an image under 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
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
    { id: 'voucher', name: 'Voucher Settings', icon: Receipt },
    { id: 'security', name: 'Security & Access', icon: ShieldCheck },
    { id: 'system', name: 'System', icon: Database },
    ...(isSuperAdmin ? [{ id: 'applications', name: 'System Applications', icon: FileText }] : []),
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
                        <div className="flex-1 space-y-3">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <input
                                type="url"
                                className="input-field"
                                value={settings.logoUrl}
                                onChange={e => setSettings({...settings, logoUrl: e.target.value})}
                                placeholder="https://example.com/logo.png"
                              />
                            </div>
                            <label className="shrink-0 cursor-pointer">
                              <div className="px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 font-bold text-sm hover:bg-indigo-100 transition-colors flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Choose File
                              </div>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileChange}
                              />
                            </label>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium italic">Provide a direct image URL or upload a local file (PNG or JPG recommended).</p>
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

                    <div className="space-y-6 md:col-span-2">
                      <div className="space-y-2">
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
                </div>
              )}

              {activeTab === 'voucher' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                    <div className="p-3 bg-violet-50 rounded-2xl text-violet-600">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Voucher Settings</h3>
                      <p className="text-sm text-slate-500 font-medium">Design and configure fee voucher layout, fonts, and payment methods.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* General Voucher Layout */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Vouchers per Page (A4)</label>
                          <Tooltip text="Dynamic layout adjusts based on selected count. Target is usually 3." />
                        </div>
                        <div className="relative">
                          <Layout className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                            className="input-field pl-11"
                            value={settings.voucherSettings?.vouchersPerPage || 3}
                            onChange={e => setSettings({
                              ...settings, 
                              voucherSettings: { ...settings.voucherSettings, vouchersPerPage: parseInt(e.target.value) } as any
                            })}
                          >
                            <option value={1}>1 Voucher per page</option>
                            <option value={2}>2 Vouchers per page</option>
                            <option value={3}>3 Vouchers per page</option>
                            <option value={4}>4 Vouchers per page</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Preferred Font</label>
                          <Tooltip text="Select typography for the vouchers." />
                        </div>
                        <div className="relative">
                          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                            className="input-field pl-11"
                            value={settings.voucherSettings?.fontFamily || 'monospace'}
                            onChange={e => setSettings({
                              ...settings, 
                              voucherSettings: { ...settings.voucherSettings, fontFamily: e.target.value } as any
                            })}
                          >
                            <option value="monospace">Default Monospace (Technical)</option>
                            <option value="ui-sans-serif, system-ui, sans-serif">Modern Sans-serif (Clean)</option>
                            <option value="ui-serif, Georgia, serif">Classic Serif (Formal)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Custom Note to Parents</label>
                          <Tooltip text="Displayed at the bottom of every voucher." />
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                          <textarea
                            rows={3}
                            className="input-field pl-11 pt-3"
                            value={settings.voucherSettings?.customNote || ''}
                            onChange={e => setSettings({
                              ...settings, 
                              voucherSettings: { ...settings.voucherSettings, customNote: e.target.value } as any
                            })}
                            placeholder="Please pay by the 10th of every month..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bank Accounts Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Bank Accounts & Wallets</h4>
                          <p className="text-xs text-slate-500">Payment details to print on vouchers</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const currentAccounts = settings.voucherSettings?.bankAccounts || [];
                            setSettings({
                              ...settings,
                              voucherSettings: {
                                ...(settings.voucherSettings as any),
                                bankAccounts: [...currentAccounts, { bankName: 'Meezan Bank', accountTitle: '', accountNumber: '' }]
                              }
                            });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Account
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(settings.voucherSettings?.bankAccounts || []).map((account, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <select
                                className="w-full text-sm font-bold bg-transparent border-none p-0 focus:ring-0 text-slate-800"
                                value={account.bankName}
                                onChange={e => {
                                  const updated = [...(settings.voucherSettings?.bankAccounts || [])];
                                  updated[idx].bankName = e.target.value;
                                  setSettings({ ...settings, voucherSettings: { ...settings.voucherSettings, bankAccounts: updated } as any });
                                }}
                              >
                                <option value="HBL">HBL - Habib Bank Limited</option>
                                <option value="Meezan Bank">Meezan Bank</option>
                                <option value="Allied Bank">Allied Bank</option>
                                <option value="MCB">MCB Bank</option>
                                <option value="UBL">UBL</option>
                                <option value="Bank Alfalah">Bank Alfalah</option>
                                <option value="Standard Chartered">Standard Chartered</option>
                                <option value="JazzCash">JazzCash (Mobile Wallet)</option>
                                <option value="EasyPaisa">EasyPaisa (Mobile Wallet)</option>
                                <option value="Nayapay">Nayapay (Mobile Wallet)</option>
                                <option value="SadaPay">SadaPay (Mobile Wallet)</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...(settings.voucherSettings?.bankAccounts || [])];
                                  updated.splice(idx, 1);
                                  setSettings({ ...settings, voucherSettings: { ...settings.voucherSettings, bankAccounts: updated } as any });
                                }}
                                className="text-rose-400 hover:text-rose-600 shrink-0 ml-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                className="input-field text-xs px-3 py-2 bg-white"
                                placeholder="Account Title"
                                value={account.accountTitle}
                                onChange={e => {
                                  const updated = [...(settings.voucherSettings?.bankAccounts || [])];
                                  updated[idx].accountTitle = e.target.value;
                                  setSettings({ ...settings, voucherSettings: { ...settings.voucherSettings, bankAccounts: updated } as any });
                                }}
                              />
                              <input
                                type="text"
                                className="input-field text-xs px-3 py-2 bg-white"
                                placeholder="Account Number / IBAN"
                                value={account.accountNumber}
                                onChange={e => {
                                  const updated = [...(settings.voucherSettings?.bankAccounts || [])];
                                  updated[idx].accountNumber = e.target.value;
                                  setSettings({ ...settings, voucherSettings: { ...settings.voucherSettings, bankAccounts: updated } as any });
                                }}
                              />
                            </div>
                          </div>
                        ))}
                        {(!settings.voucherSettings?.bankAccounts || settings.voucherSettings.bankAccounts.length === 0) && (
                          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                            <Landmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-medium text-slate-500">No bank accounts added yet.</p>
                          </div>
                        )}
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
                        <div className="flex items-center gap-4">
                          {isAddingRole ? (
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                placeholder="Role Name (e.g. Clerk)" 
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newRoleName}
                                onChange={e => setNewRoleName(e.target.value)}
                                autoFocus
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  if (newRoleName && !settings.staffPermissions[newRoleName]) {
                                    setSettings({
                                      ...settings,
                                      staffPermissions: {
                                        ...settings.staffPermissions,
                                        [newRoleName]: []
                                      }
                                    });
                                    setNewRoleName('');
                                    setIsAddingRole(false);
                                  }
                                }}
                                className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button 
                                type="button"
                                onClick={() => setIsAddingRole(false)}
                                className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => setIsAddingRole(true)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add New Role
                            </button>
                          )}
                          <Tooltip text="Define which modules each staff role can access. This controls the sidebar visibility and page access." />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-8">
                        {Object.entries(settings.staffPermissions).map(([role, permissions]) => {
                          const perms = permissions as string[];
                          return (
                            <div key={role} className="space-y-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm relative group/role">
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete role "${role}"?`)) {
                                    const newPerms = { ...settings.staffPermissions };
                                    delete newPerms[role];
                                    setSettings({ ...settings, staffPermissions: newPerms });
                                  }
                                }}
                                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-600 opacity-0 group-hover/role:opacity-100 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                                    <Briefcase className="w-4 h-4 text-indigo-600" />
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-black text-slate-900">{role}</h5>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Module Access</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allModules = Object.values(MODULE_CATEGORIES).flat().map(m => m.name);
                                    const isAllSelected = allModules.every(m => perms.includes(m));
                                    setSettings({
                                      ...settings,
                                      staffPermissions: {
                                        ...settings.staffPermissions,
                                        [role]: isAllSelected ? [] : allModules
                                      }
                                    });
                                  }}
                                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                >
                                  {Object.values(MODULE_CATEGORIES).flat().every(m => perms.includes(m.name)) ? 'Deselect All' : 'Select All'}
                                </button>
                              </div>
                              <div className="space-y-6">
                                {Object.entries(MODULE_CATEGORIES).map(([category, modules]) => (
                                  <div key={category} className="space-y-3">
                                    <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{category}</h6>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                      {modules.map((module) => (
                                        <label
                                          key={module.name}
                                          className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all group/module",
                                            perms.includes(module.name)
                                              ? "bg-indigo-50 border-indigo-200"
                                              : "bg-slate-50 border-transparent hover:bg-slate-100"
                                          )}
                                        >
                                          <div className="flex items-center gap-2">
                                            <module.icon className={cn(
                                              "w-4 h-4",
                                              perms.includes(module.name) ? "text-indigo-600" : "text-slate-400"
                                            )} />
                                            <span className={cn(
                                              "text-[11px] font-bold",
                                              perms.includes(module.name) ? "text-indigo-900" : "text-slate-600"
                                            )}>{module.name}</span>
                                          </div>
                                          <div className={cn(
                                            "w-8 h-4 rounded-full relative transition-all",
                                            perms.includes(module.name) ? "bg-indigo-600" : "bg-slate-300"
                                          )}>
                                            <div className={cn(
                                              "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm",
                                              perms.includes(module.name) ? "left-[18px]" : "left-0.5"
                                            )} />
                                          </div>
                                          <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={perms.includes(module.name)}
                                            onChange={(e) => {
                                              const newPermissions = e.target.checked
                                                ? [...perms, module.name]
                                                : perms.filter(p => p !== module.name);
                                              setSettings({
                                                ...settings,
                                                staffPermissions: {
                                                  ...settings.staffPermissions,
                                                  [role]: newPermissions
                                                }
                                              });
                                            }}
                                          />
                                        </label>
                                      ))}
                                    </div>
                                  </div>
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
                    <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
                      <Database className="w-6 h-6 text-amber-600 mt-1" />
                      <div className="space-y-2">
                        <h4 className="font-bold text-amber-900">Database Seeding</h4>
                        <p className="text-sm text-amber-700 leading-relaxed">
                          Populate your application with comprehensive dummy data for stress testing and feature validation.
                        </p>
                        <div className="pt-4 flex flex-wrap gap-4">
                          <button
                            onClick={handleSeedData}
                            disabled={seeding}
                            className="px-6 py-3 bg-white border border-amber-200 text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-100 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                          >
                            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                            Seed Dummy Data
                          </button>
                        </div>
                        {seedStatus && (
                          <p className={cn(
                            "text-xs font-bold mt-2",
                            seedStatus.includes("failed") ? "text-red-600" : "text-emerald-600"
                          )}>
                            {seedStatus}
                          </p>
                        )}
                      </div>
                    </div>

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
                          onClick={() => {
                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
                            const downloadAnchorNode = document.createElement('a');
                            downloadAnchorNode.setAttribute("href", dataStr);
                            downloadAnchorNode.setAttribute("download", `school_settings_backup_${new Date().toISOString().split('T')[0]}.json`);
                            document.body.appendChild(downloadAnchorNode);
                            downloadAnchorNode.click();
                            downloadAnchorNode.remove();
                          }}
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

              {activeTab === 'applications' && isSuperAdmin && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">School Applications</h3>
                      <p className="text-sm text-slate-500 font-medium">Review and approve new school registrations.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {applications.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        No applications found.
                      </div>
                    ) : (
                      applications.map((app) => (
                        <div key={app.id} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <h4 className="text-lg font-black text-slate-900">{app.schoolName}</h4>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                  app.status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                )}>
                                  {app.status}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <User className="w-4 h-4 text-slate-400" />
                                  <span className="font-medium">{app.adminName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Mail className="w-4 h-4 text-slate-400" />
                                  <span>{app.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Phone className="w-4 h-4 text-slate-400" />
                                  <span>{app.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <MapPin className="w-4 h-4 text-slate-400" />
                                  <span>{app.address}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 pt-2">
                                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                                  <CreditCard className="w-3.5 h-3.5" />
                                  Plan: {app.plan.toUpperCase()}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                  Applied: {new Date(app.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col justify-center gap-2 min-w-[140px]">
                              {app.status === 'pending' ? (
                                <button
                                  type="button"
                                  disabled={approvingId === app.id}
                                  onClick={() => handleApproveApplication(app)}
                                  className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                                >
                                  {approvingId === app.id ? 'Approving...' : 'Approve & Pay'}
                                </button>
                              ) : (
                                <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Approved
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
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
