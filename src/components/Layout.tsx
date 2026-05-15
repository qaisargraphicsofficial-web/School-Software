import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  GraduationCap, 
  Wallet, 
  Package, 
  Bell, 
  LogOut, 
  Menu, 
  X,
  School,
  BookOpen,
  FileText,
  Library,
  BookText,
  Award,
  Building2,
  CheckSquare,
  Search,
  Settings,
  UserCircle,
  Moon,
  Sun,
  PieChart,
  Calendar,
  MessageSquare,
  CreditCard,
  Bus,
  Shield,
  MapPin,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, where, getDoc, getDocs } from 'firebase/firestore';
import { UserProfile, Task } from '../types';
import { cn } from '../lib/utils';
import AIAssistant from './AIAssistant';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  profile: UserProfile | null;
  onSwitchSchool?: (schoolId: string) => void;
  onSwitchCampus?: (campusId: string) => void;
}

export default function Layout({ profile, onSwitchSchool, onSwitchCampus }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [notifications, setNotifications] = useState<Task[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [schoolName, setSchoolName] = useState('EduManage');
  const [logoUrl, setLogoUrl] = useState('');
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [staffPermissions, setStaffPermissions] = useState<Record<string, string[]>>({});
  const [allSchools, setAllSchools] = useState<{id: string, schoolName: string}[]>([]);
  const [allCampuses, setAllCampuses] = useState<{id: string, name: string}[]>([]);
  const [showSchoolSwitcher, setShowSchoolSwitcher] = useState(false);
  const [showCampusSwitcher, setShowCampusSwitcher] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.displayName) {
      setProfileName(profile.displayName);
    }
  }, [profile]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const fetchSchoolSettings = async () => {
      if (!profile?.schoolId) return;
      try {
        const docRef = doc(db, 'settings', profile.schoolId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSchoolName(data.schoolName || 'EduManage');
          setLogoUrl(data.logoUrl || '');
          setStaffPermissions(data.staffPermissions || {});
        }
      } catch (error) {
        console.error("Error fetching school settings:", error);
      }
    };
    fetchSchoolSettings();
  }, [profile?.schoolId]);

  useEffect(() => {
    const fetchCampuses = async () => {
      if (!profile?.schoolId && profile?.role !== 'admin') return;
      try {
        let q;
        if (profile?.schoolId) {
          q = query(collection(db, 'campuses'), where('schoolId', '==', profile.schoolId));
        } else {
          // Super admin case or similar
          q = query(collection(db, 'campuses'), limit(20));
        }
        const snap = await getDocs(q as any);
        const campuses = snap.docs.map((d: any) => ({ 
          id: d.id, 
          name: d.data().name 
        }));
        setAllCampuses(campuses);
      } catch (error: any) {
        // Silently handle permission errors if profile isn't fully ready
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
          console.warn("Campus fetch delayed due to permissions");
        } else {
          console.error("Error fetching campuses:", error);
        }
      }
    };
    if (profile?.uid) {
      fetchCampuses();
    }
  }, [profile?.schoolId, profile?.uid, profile?.role]);

  useEffect(() => {
    // Fetch all schools for system admin
    if (onSwitchSchool && profile?.email?.toLowerCase() === "qaisarabbas6496@gmail.com") {
      const fetchAllSchools = async () => {
        try {
          const snap = await getDocs(collection(db, 'settings'));
          const schools = snap.docs.map(d => ({ 
            id: d.id, 
            schoolName: d.data().schoolName || d.id 
          }));
          console.log("Successfully fetched schools list:", schools.length);
          setAllSchools(schools);
        } catch (error: any) {
          if (error.message?.includes('offline') || error.code === 'unavailable') {
            console.warn("Schools list fetch skipped - offline mode");
          } else {
            console.error("Error fetching schools list:", error);
          }
          // If fail, just use the current school
          if (profile?.schoolId) {
            setAllSchools([{ id: profile.schoolId, schoolName: schoolName || 'Current School' }]);
          }
        }
      };
      fetchAllSchools();
    }
  }, [onSwitchSchool, profile?.email, profile?.schoolId, schoolName]);

  useEffect(() => {
    const fetchStaffRole = async () => {
      if (profile?.role === 'staff' && profile.staffId) {
        try {
          const staffRef = doc(db, 'staff', profile.staffId);
          const staffSnap = await getDoc(staffRef);
          if (staffSnap.exists()) {
            setStaffRole(staffSnap.data().role);
          }
        } catch (error) {
          console.error("Error fetching staff role:", error);
        }
      }
    };
    fetchStaffRole();
  }, [profile]);

  useEffect(() => {
    // Page access control
    if (!profile || profile.role === 'admin') return;
    
    const findNavItem = (items: any[], path: string): any => {
      for (const item of items) {
        if (item.path === path) return item;
        if (item.children) {
          const found = findNavItem(item.children, path);
          if (found) return found;
        }
      }
      return null;
    };
    
    const currentItem = findNavItem(navItems, location.pathname);
    if (currentItem) {
      if (profile.role === 'staff') {
        // Wait for staffRole to be loaded if it's staff
        if (staffRole && Object.keys(staffPermissions).length > 0) {
          const allowedModules = staffPermissions[staffRole] || [];
          if (!allowedModules.includes(currentItem.name)) {
            navigate('/');
          }
        }
      } else {
        // For students/parents, check hardcoded roles
        if (currentItem.roles && !currentItem.roles.includes(profile.role)) {
          navigate('/');
        }
      }
    }
  }, [location.pathname, profile, staffRole, staffPermissions]);

  useEffect(() => {
    if (!profile?.uid || !profile?.role) return;
    
    // Listen for urgent/upcoming tasks as notifications
    // Only fetch tasks for staff/admin, or filter by assignedTo for others to avoid permission errors
    if (!profile.schoolId && profile.role !== 'admin') return;

    let q;
    const taskConstraints: any[] = [orderBy('createdAt', 'desc'), limit(5)];
    
    // Force school filter if not super admin to satisfy rules more reliably
    if (profile.schoolId) {
      taskConstraints.unshift(where('schoolId', '==', profile.schoolId));
    } else if (profile.role !== 'admin') {
      // Non-admins MUST have a schoolId
      return;
    }

    if (profile.campusId && profile.campusId !== 'all') {
      taskConstraints.unshift(where('campusId', '==', profile.campusId));
    }

    try {
      if (profile.role === 'admin' || profile.role === 'staff') {
        q = query(collection(db, 'tasks'), ...taskConstraints);
      } else {
        // For students/parents, only show tasks assigned to them
        q = query(
          collection(db, 'tasks'),
          ...taskConstraints,
          where('assignedToIds', 'array-contains', profile.uid)
        );
      }
    } catch (err) {
      console.warn("Could not construct notification query:", err);
      return;
    }

    const unsubscribe = onSnapshot(q as any, (snap: any) => {
      setNotifications(snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error: any) => {
      // Only log as error if it's not a common expected failure during logout/switch
      if (profile?.uid && error.code !== 'permission-denied') {
        console.error("Error in task listener:", error);
      }
      // If permission denied, set empty notifications to avoid repeated errors
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        setNotifications([]);
      }
    });

    return () => unsubscribe();
  }, [profile?.uid, profile?.schoolId, profile?.campusId, profile?.role]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setIsSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: profileName
      });
      setIsProfileModalOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', category: 'OVERVIEW' },
    { name: 'Students', icon: Users, path: '/students', roles: ['admin', 'staff'], category: 'ACADEMICS' },
    { name: 'Classes', icon: BookOpen, path: '/classes', roles: ['admin', 'staff'], category: 'ACADEMICS' },
    { name: 'Attendance', icon: Calendar, path: '/attendance', roles: ['admin', 'staff', 'student', 'parent'], category: 'ACADEMICS' },
    { name: 'Examination Portal', icon: GraduationCap, path: '/examination-portal', roles: ['admin', 'staff'], category: 'EXAMINATIONS' },
    { name: 'Results', icon: GraduationCap, path: '/results', roles: ['admin', 'staff', 'student', 'parent'], category: 'EXAMINATIONS' },
    { name: 'Subjects', icon: BookOpen, path: '/subjects', roles: ['admin', 'staff'], category: 'ACADEMICS' },
    { name: 'Fees', icon: Wallet, path: '/fees', roles: ['admin', 'staff'], category: 'FINANCE' },
    { name: 'Payroll', icon: CreditCard, path: '/payroll', roles: ['admin', 'staff'], category: 'FINANCE' },
    { name: 'Expenses', icon: FileText, path: '/expenses', roles: ['admin', 'staff'], category: 'FINANCE' },
    { 
      name: 'Teachers', 
      icon: UserSquare2, 
      path: '/teachers', 
      roles: ['admin', 'staff'], 
      category: 'STAFF & OPS'
    },
    { name: 'Communication', icon: MessageSquare, path: '/communication', roles: ['admin', 'staff', 'student', 'parent'], category: 'COMMUNICATION' },
    { name: 'Reports', icon: PieChart, path: '/reports', roles: ['admin', 'staff'], category: 'AI & SETTINGS' },
    { name: 'User Management', icon: Shield, path: '/users', roles: ['admin'], category: 'AI & SETTINGS', systemOnly: true },
    { name: 'Settings', icon: Settings, path: '/settings', roles: ['admin'], category: 'AI & SETTINGS' },
    { name: 'Campuses', icon: Building2, path: '/campuses', roles: ['admin'], category: 'STAFF & OPS' },
    { name: 'Library', icon: Library, path: '/library', roles: ['admin', 'staff', 'student', 'parent'], category: 'ACADEMICS' },
    { name: 'Inventory', icon: Package, path: '/inventory', roles: ['admin', 'staff'], category: 'STAFF & OPS' },
    { name: 'Curriculum', icon: BookText, path: '/curriculum', roles: ['admin', 'staff'], category: 'ACADEMICS' },
    { name: 'Certificates', icon: Award, path: '/certificates', roles: ['admin', 'staff'], category: 'ACADEMICS' },
    { name: 'School Shop', icon: Package, path: '/school-shop', roles: ['admin'], category: 'STAFF & OPS' },
    { name: 'Transport', icon: Bus, path: '/transport', roles: ['admin', 'staff'], category: 'STAFF & OPS' },
    { name: 'My School Website', icon: School, path: '/school-website', roles: ['admin'], category: 'AI & SETTINGS' },
  ];

  const filteredNavItems = navItems.filter(item => {
    // Check if it's a system admin only menu
    if ((item as any).systemOnly && profile?.email?.toLowerCase() !== "qaisarabbas6496@gmail.com") return false;

    if (profile?.role === 'admin') return true;
    
    if (profile?.role === 'staff') {
      // While loading staff role or permissions, show nothing to avoid snapping
      if (!staffRole || Object.keys(staffPermissions).length === 0) return false;
      const allowedModules = staffPermissions[staffRole] || [];
      return allowedModules.includes(item.name);
    }
    
    // For parents, students, and other roles
    return !item.roles || (profile?.role && item.roles.includes(profile.role));
  });

  // Group items by category
  const groupedNavItems = filteredNavItems.reduce((acc, item) => {
    const cat = item.category || 'OTHER';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof filteredNavItems>);

  // Define category order
  const categoryOrder = ['OVERVIEW', 'ACADEMICS', 'EXAMINATIONS', 'FINANCE', 'STAFF & OPS', 'COMMUNICATION', 'AI & SETTINGS', 'OTHER'];

  return (
    <div className="h-screen print:h-auto bg-slate-50 flex overflow-hidden print:overflow-visible">
      {/* Sidebar for Desktop */}
      <aside className={cn(
        "h-screen print:hidden overflow-y-auto fixed left-0 z-50 w-72 bg-white border-r border-slate-200 transition-transform duration-300 lg:translate-x-0 lg:static no-print",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="min-h-full flex flex-col">
          <div className="p-8 flex items-center gap-4 border-b border-slate-100 shrink-0">
            <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 overflow-hidden flex items-center justify-center w-12 h-12">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <School className="w-7 h-7 text-white" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">{schoolName}</span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Pro Edition</span>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-6">
            {categoryOrder.map(category => {
              const items = groupedNavItems[category];
              if (!items || items.length === 0) return null;
              
              return (
                <div key={category} className="space-y-2">
                  <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{category}</h3>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <React.Fragment key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setIsSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300 group border-2",
                            location.pathname === item.path
                              ? "bg-[#fdf6ea] text-amber-700 border-slate-900 shadow-sm"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-transparent"
                          )}
                        >
                          <item.icon className={cn(
                            "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                            location.pathname === item.path ? "text-amber-600" : "text-slate-400 group-hover:text-slate-600"
                          )} />
                          <span className="font-bold text-sm tracking-tight">{item.name}</span>
                        </Link>
                        {(item as any).children && (
                          <div className="pl-10 space-y-1">
                            {(item as any).children.map((child: any) => (
                              <Link
                                key={child.path}
                                to={child.path}
                                onClick={() => setIsSidebarOpen(false)}
                                className={cn(
                                  "flex items-center gap-3.5 px-4 py-2 rounded-xl transition-all duration-300 group",
                                  location.pathname === child.path
                                    ? "text-amber-700 font-bold"
                                    : "text-slate-500 hover:text-slate-900"
                                )}
                              >
                                <child.icon className="w-4 h-4" />
                                <span className="text-sm">{child.name}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="p-6 border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl mb-4 border border-slate-100">
              <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                {profile?.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{profile?.email?.split('@')[0]}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{profile?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-rose-600 hover:bg-rose-50 rounded-2xl transition-all duration-200 font-bold text-sm"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen print:h-auto overflow-hidden print:overflow-visible">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-40 no-print shrink-0 print:hidden">
          <div className="flex items-center gap-8 flex-1">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl lg:hidden transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="hidden lg:block relative">
              <div 
                className={cn(
                  "flex flex-col cursor-pointer hover:opacity-80 transition-opacity p-2 rounded-xl",
                  showSchoolSwitcher && "bg-slate-100"
                )}
                onClick={() => onSwitchSchool && setShowSchoolSwitcher(!showSchoolSwitcher)}
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {(() => {
                      const findNavItem = (items: any[], path: string): any => {
                        for (const item of items) {
                          if (item.path === path) return item;
                          if (item.children) {
                            const found = findNavItem(item.children, path);
                            if (found) return found;
                          }
                        }
                        return null;
                      };
                      return findNavItem(navItems, location.pathname)?.name || 'Dashboard';
                    })()}
                  </h2>
                  {onSwitchSchool && <Building2 className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  {schoolName} • {allCampuses.find(c => c.id === profile?.campusId)?.name || (profile?.campusId === 'all' ? 'All Campuses' : 'Primary Campus')} • {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {showSchoolSwitcher && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Switch School Context</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {allSchools.map(school => (
                      <button
                        key={school.id}
                        onClick={() => {
                          onSwitchSchool?.(school.id);
                          setShowSchoolSwitcher(false);
                        }}
                        className={cn(
                          "w-full text-left px-5 py-3 hover:bg-indigo-50 transition-colors flex items-center justify-between group",
                          profile?.schoolId === school.id ? "bg-indigo-50/50" : ""
                        )}
                      >
                        <span className={cn(
                          "text-sm font-bold",
                          profile?.schoolId === school.id ? "text-indigo-600" : "text-slate-700"
                        )}>{school.schoolName}</span>
                        {profile?.schoolId === school.id && <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {profile?.role === 'admin' && allCampuses.length > 0 && (
              <div className="hidden lg:block relative ml-4">
                <button
                  onClick={() => setShowCampusSwitcher(!showCampusSwitcher)}
                  className={cn(
                    "flex flex-col cursor-pointer hover:opacity-80 transition-opacity p-2 rounded-xl border border-slate-200",
                    showCampusSwitcher && "bg-slate-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-700">
                      {allCampuses.find(c => c.id === profile?.campusId)?.name || (profile?.campusId === 'all' ? 'All Campuses' : 'Switch Campus')}
                    </span>
                  </div>
                </button>
                {showCampusSwitcher && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Campus</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <button
                        onClick={() => {
                          onSwitchCampus?.('all');
                          setShowCampusSwitcher(false);
                        }}
                        className={cn(
                          "w-full text-left px-5 py-3 hover:bg-emerald-50 transition-colors flex items-center justify-between",
                          profile?.campusId === 'all' ? "bg-emerald-50" : ""
                        )}
                      >
                        <span className={cn("text-sm font-bold", profile?.campusId === 'all' ? "text-emerald-600" : "text-slate-700")}>All Campuses</span>
                      </button>
                      {allCampuses.map(campus => (
                        <button
                          key={campus.id}
                          onClick={() => {
                            onSwitchCampus?.(campus.id);
                            setShowCampusSwitcher(false);
                          }}
                          className={cn(
                            "w-full text-left px-5 py-3 hover:bg-indigo-50 transition-colors flex items-center justify-between",
                            profile?.campusId === campus.id ? "bg-indigo-50" : ""
                          )}
                        >
                          <span className={cn("text-sm font-bold", profile?.campusId === campus.id ? "text-indigo-600" : "text-slate-700")}>{campus.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 max-w-md relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="text"
                placeholder="Global search (Students, Staff, Tasks...)"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            {isOffline ? (
              <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold border border-rose-100 animate-pulse">
                <WifiOff className="w-3.5 h-3.5" />
                Offline
                <button 
                  onClick={() => window.location.reload()}
                  className="ml-1 p-0.5 hover:bg-rose-100 rounded-lg transition-colors"
                  title="Force reconnect"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-2xl text-xs font-bold border border-indigo-100">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.6)]"></div>
                Live Session
              </div>
            )}
            
            <div className="relative">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all cursor-pointer relative"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden z-50">
                  <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Recent Tasks</h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">New</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center">
                        <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-400">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map(task => (
                        <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer">
                          <div className="flex gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-1.5 shrink-0",
                              task.priority === 'high' ? 'bg-rose-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-indigo-500'
                            )} />
                            <div>
                              <p className="text-sm font-bold text-slate-900 line-clamp-1">{task.title}</p>
                              <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Due: {task.dueDate}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Link 
                    to="/teachers/tasks" 
                    onClick={() => setShowNotifications(false)}
                    className="block p-4 text-center text-xs font-black text-indigo-600 hover:bg-indigo-50 transition-colors uppercase tracking-widest border-t border-slate-50"
                  >
                    View All Tasks
                  </Link>
                </div>
              )}
            </div>

            <div 
              onClick={() => setIsProfileModalOpen(true)}
              className="hidden sm:flex items-center gap-3 pl-5 border-l border-slate-100 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="text-right">
                <p className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1">
                  {profile?.displayName || profile?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none">{profile?.role}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100">
                {(profile?.displayName || profile?.email)?.[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto print:overflow-visible p-4 lg:p-8 print:p-0">
          <Outlet />
        </main>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsProfileModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <UserCircle className="w-6 h-6" />
                  <h2 className="text-2xl font-black tracking-tight">My Profile</h2>
                </div>
                <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-24 h-24 bg-indigo-100 rounded-[32px] flex items-center justify-center text-indigo-600 text-3xl font-black mb-4 shadow-inner">
                    {(profileName || profile?.email)?.[0].toUpperCase()}
                  </div>
                  <p className="text-sm font-bold text-slate-900">{profile?.email}</p>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">{profile?.role}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Display Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="flex-1 px-6 py-4 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="flex-1 px-6 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Overlay for Mobile Sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* AI Assistant */}
      <div className="no-print">
        <AIAssistant profile={profile} />
      </div>
    </div>
  );
}
