import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from './types';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Staff from './components/Staff';
import Academic from './components/Academic';
import Finance from './components/Finance';
import Inventory from './components/Inventory';
import Communication from './components/Communication';
import Curriculum from './components/Curriculum';
import Exams from './components/Exams';
import Library from './components/Library';
import DailyDiary from './components/DailyDiary';
import Certificates from './components/Certificates';
import Campuses from './components/Campuses';
import Tasks from './components/Tasks';

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
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Default to parent or staff if not set, but admin for the specific email
          const defaultRole: UserRole = firebaseUser.email === "qaisarabbas6496@gmail.com" ? 'admin' : 'parent';
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: defaultRole,
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

  return (
    <Router>
      <Routes>
        {!user ? (
          <Route path="*" element={<Login />} />
        ) : (
          <Route path="/" element={<Layout profile={profile} />}>
            <Route index element={<Dashboard profile={profile} />} />
            <Route path="students" element={<Students profile={profile} />} />
            <Route path="staff" element={<Staff profile={profile} />} />
            <Route path="academic" element={<Academic profile={profile} />} />
            <Route path="finance" element={<Finance profile={profile} />} />
            <Route path="inventory" element={<Inventory profile={profile} />} />
            <Route path="communication" element={<Communication profile={profile} />} />
            <Route path="curriculum" element={<Curriculum profile={profile} />} />
            <Route path="exams" element={<Exams profile={profile} />} />
            <Route path="library" element={<Library profile={profile} />} />
            <Route path="diary" element={<DailyDiary profile={profile} />} />
            <Route path="certificates" element={<Certificates profile={profile} />} />
            <Route path="campuses" element={<Campuses profile={profile} />} />
            <Route path="tasks" element={<Tasks profile={profile} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </Router>
  );
}
