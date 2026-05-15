import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Users, 
  Calendar, 
  FileText, 
  CheckSquare,
  ClipboardCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

interface TeachersPortalProps {
  profile: UserProfile | null;
}

export default function TeachersPortal({ profile }: TeachersPortalProps) {
  const location = useLocation();

  const tabs = [
    { name: 'Faculty', path: '/teachers', icon: Users, exact: true },
    { name: 'Schedule', path: '/teachers/schedule', icon: Calendar },
    { name: 'Leave', path: '/teachers/leave', icon: FileText },
    { name: 'Tasks', path: '/teachers/tasks', icon: CheckSquare },
    { name: 'Attendance', path: '/teachers/attendance', icon: ClipboardCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white p-1 rounded-[24px] shadow-sm border border-slate-100 flex overflow-x-auto hide-scrollbar gap-1 sticky top-0 z-30">
        {tabs.map((tab) => {
          const isActive = tab.exact 
            ? location.pathname === tab.path 
            : location.pathname.startsWith(tab.path);

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive: linkActive }) => cn(
                "flex items-center gap-2.5 px-4 py-3 rounded-2xl transition-all duration-300 relative group whitespace-nowrap shrink-0",
                isActive 
                  ? "text-indigo-600 bg-indigo-50/50" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <tab.icon className={cn(
                "w-4 h-4 transition-transform duration-300 group-hover:scale-110",
                isActive ? "text-indigo-600" : "text-slate-400"
              )} />
              <span className="font-bold text-sm tracking-tight">{tab.name}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-1 left-6 right-6 h-0.5 bg-indigo-600 rounded-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Content Area */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Outlet />
      </motion.div>
    </div>
  );
}
