import React, { useState } from 'react';
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
  CheckSquare
} from 'lucide-react';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import AIAssistant from './AIAssistant';

interface LayoutProps {
  profile: UserProfile | null;
}

export default function Layout({ profile }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Students', icon: Users, path: '/students' },
    { name: 'Staff', icon: UserSquare2, path: '/staff' },
    { name: 'Academic', icon: GraduationCap, path: '/academic' },
    { name: 'Curriculum', icon: BookOpen, path: '/curriculum' },
    { name: 'Exams', icon: FileText, path: '/exams' },
    { name: 'Library', icon: Library, path: '/library' },
    { name: 'Daily Diary', icon: BookText, path: '/diary' },
    { name: 'Certificates', icon: Award, path: '/certificates' },
    { name: 'Finance', icon: Wallet, path: '/finance' },
    { name: 'Inventory', icon: Package, path: '/inventory' },
    { name: 'Tasks', icon: CheckSquare, path: '/tasks' },
    { name: 'Communication', icon: Bell, path: '/communication' },
  ];

  if (profile?.role === 'admin') {
    navItems.splice(navItems.length - 1, 0, { name: 'Campuses', icon: Building2, path: '/campuses' });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar for Desktop */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-8 flex items-center gap-4 border-b border-slate-100">
            <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <School className="w-7 h-7 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">EduManage</span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Pro Edition</span>
            </div>
          </div>

          <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group",
                  location.pathname === item.path
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                  location.pathname === item.path ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                )} />
                <span className="font-bold text-sm tracking-tight">{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="p-6 border-t border-slate-100">
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl lg:hidden transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-2xl text-xs font-bold border border-indigo-100">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.6)]"></div>
              Live Session
            </div>
            
            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all cursor-pointer">
              <Bell className="w-5 h-5" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Overlay for Mobile Sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* AI Assistant */}
      <AIAssistant profile={profile} />
    </div>
  );
}
