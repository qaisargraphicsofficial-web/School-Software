import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole, UserStatus } from './types';
import { Clock } from 'lucide-react';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Staff from './components/Staff';
import Academic from './components/Academic';
import FeesManagement from './components/FeesManagement';
import PayrollManagement from './components/PayrollManagement';
import ExpensesManagement from './components/ExpensesManagement';
import Inventory from './components/Inventory';
import Communication from './components/Communication';
import Curriculum from './components/Curriculum';
import Exams from './components/Exams';
import Results from './components/Results';
import Library from './components/Library';
import DailyDiary from './components/DailyDiary';
import Certificates from './components/Certificates';
import Campuses from './components/Campuses';
import Tasks from './components/Tasks';
import Settings from './components/Settings';
import Reports from './components/Reports';
import Classes from './components/Classes';
import Schedule from './components/Schedule';
import Leave from './components/Leave';
import Transport from './components/Transport';
import SubjectsManagement from './components/Subjects';

import Registration from './components/Registration';
import ExaminationPortal from './components/ExaminationPortal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const existingProfile = docSnap.data() as UserProfile;
          // Ensure primary admin always has admin role and is approved
          if (firebaseUser.email === "qaisarabbas6496@gmail.com" && (existingProfile.role !== 'admin' || existingProfile.status !== 'approved')) {
            const updatedProfile = { 
              ...existingProfile, 
              role: 'admin' as UserRole,
              status: 'approved' as UserStatus 
            };
            await updateDoc(docRef, { role: 'admin', status: 'approved' });
            setProfile(updatedProfile);
          } else {
            setProfile(existingProfile);
          }
        } else {
          // Default to parent or staff if not set, but admin for the specific email
          const defaultRole: UserRole = firebaseUser.email === "qaisarabbas6496@gmail.com" ? 'admin' : 'parent';
          const defaultStatus: UserStatus = firebaseUser.email === "qaisarabbas6496@gmail.com" ? 'approved' : 'pending';
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: defaultRole,
            status: defaultStatus,
            isSubscribed: firebaseUser.email === "qaisarabbas6496@gmail.com",
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Handle pending approval
  if (user && profile?.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Pending Approval</h2>
          <p className="text-slate-600 mb-8">
            Your account is currently under review. Once our team manually approves your application, you will gain full access to the system.
          </p>
          <button 
            onClick={() => auth.signOut()}
            className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/register" element={<Registration />} />
        {!user ? (
          <Route path="*" element={<Login />} />
        ) : (
          <Route path="/" element={<Layout profile={profile} />}>
            <Route index element={<Dashboard profile={profile} />} />
            <Route path="students" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Students profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="classes" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Classes profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="attendance" element={<Academic profile={profile} />} />
            <Route path="examination-portal" element={profile?.role === 'admin' || profile?.role === 'staff' ? <ExaminationPortal profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="results" element={<Results profile={profile} />} />
            <Route path="teachers" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Staff profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="schedule" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Schedule profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="leave" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Leave profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="subjects" element={profile?.role === 'admin' || profile?.role === 'staff' ? <SubjectsManagement profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="fees" element={profile?.role === 'admin' || profile?.role === 'staff' ? <FeesManagement profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="payroll" element={profile?.role === 'admin' || profile?.role === 'staff' ? <PayrollManagement profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="expenses" element={profile?.role === 'admin' || profile?.role === 'staff' ? <ExpensesManagement profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="inventory" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Inventory profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="communication" element={<Communication profile={profile} />} />
            <Route path="curriculum" element={<Curriculum profile={profile} />} />
            <Route path="exams" element={<Exams profile={profile} />} />
            <Route path="library" element={<Library profile={profile} />} />
            <Route path="diary" element={<DailyDiary profile={profile} />} />
            <Route path="certificates" element={<Certificates profile={profile} />} />
            <Route path="transport" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Transport profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="campuses" element={profile?.role === 'admin' ? <Campuses profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="tasks" element={<Tasks profile={profile} />} />
            <Route path="reports" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Reports profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="settings" element={profile?.role === 'admin' ? <Settings profile={profile} /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </Router>
  );
}
