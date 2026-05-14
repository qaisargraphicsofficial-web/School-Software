import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  CalendarCheck,
  CreditCard,
  Menu
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function MobileNavigation() {
  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Home" },
    { to: "/students", icon: Users, label: "Students" },
    { to: "/academic", icon: CalendarCheck, label: "Attendance" },
    { to: "/fees", icon: CreditCard, label: "Fees" },
    { to: "/classes", icon: GraduationCap, label: "Classes" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-50">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-2 shadow-2xl flex items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all relative overflow-hidden group",
              isActive ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  isActive ? "scale-110" : "group-hover:scale-110"
                )} />
                <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                {isActive && (
                  <div className="absolute inset-0 bg-indigo-500/10 -z-10 rounded-2xl" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
