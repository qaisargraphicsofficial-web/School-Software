import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, UserRole, UserStatus } from './types';
import { Clock, LogIn, Loader2 } from 'lucide-react';

const Login = lazy(() => import('./components/Login'));
const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Students = lazy(() => import('./components/Students'));
const Staff = lazy(() => import('./components/Staff'));
const Academic = lazy(() => import('./components/Academic'));
const FeesManagement = lazy(() => import('./components/FeesManagement'));
const PayrollManagement = lazy(() => import('./components/PayrollManagement'));
const ExpensesManagement = lazy(() => import('./components/ExpensesManagement'));
const Inventory = lazy(() => import('./components/Inventory'));
const Communication = lazy(() => import('./components/Communication'));
const Curriculum = lazy(() => import('./components/Curriculum'));
const Exams = lazy(() => import('./components/Exams'));
const Results = lazy(() => import('./components/Results'));
const Library = lazy(() => import('./components/Library'));
const Certificates = lazy(() => import('./components/Certificates'));
const Campuses = lazy(() => import('./components/Campuses'));
const Tasks = lazy(() => import('./components/Tasks'));
const TeacherAttendance = lazy(() => import('./components/TeacherAttendance'));
const Settings = lazy(() => import('./components/Settings'));
const Reports = lazy(() => import('./components/Reports'));
const Classes = lazy(() => import('./components/Classes'));
const Schedule = lazy(() => import('./components/Schedule'));
const Leave = lazy(() => import('./components/Leave'));
const Transport = lazy(() => import('./components/Transport'));
const SubjectsManagement = lazy(() => import('./components/Subjects'));
const TeachersPortal = lazy(() => import('./components/TeachersPortal'));
const SchoolWebsite = lazy(() => import('./components/SchoolWebsite'));
const SchoolShop = lazy(() => import('./components/SchoolShop'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const Registration = lazy(() => import('./components/Registration'));
const PublicWebsite = lazy(() => import('./components/PublicWebsite'));
const PublicResultView = lazy(() => import('./components/PublicResultView'));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-12">
    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
    <p className="text-slate-500 font-bold animate-pulse">Loading Module...</p>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [checkingSchool, setCheckingSchool] = useState(false);

  useEffect(() => {
    // Warm up connectivity
    const warmUp = async () => {
      try {
        await getDoc(doc(db, 'test', 'connection'));
        console.log("Firestore connection warmed up.");
      } catch (e) {
        console.warn("Warm up failed, but proceeding...", e);
      }
    };
    warmUp();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const docRef = doc(db, 'users', firebaseUser.uid);
          let docSnap;
          let retries = 0;
          const maxRetries = 3;
          
          while (retries < maxRetries) {
            try {
              // Standard getDoc will use cache if offline, but first load might fail
              docSnap = await getDoc(docRef);
              break; // Success
            } catch (error: any) {
              retries++;
              const isConnectivity = error.message?.includes('offline') || error.code === 'unavailable' || error.message?.includes('Cloud Firestore backend');
              
              if (isConnectivity && retries < maxRetries) {
                console.warn(`Firestore unreachable (attempt ${retries}/${maxRetries}), retrying in ${retries * 2}s...`);
                await new Promise(resolve => setTimeout(resolve, retries * 2000));
              } else {
                handleFirestoreError(error, OperationType.GET, 'users/' + firebaseUser.uid);
                return;
              }
            }
          }
          
          if (docSnap && docSnap.exists()) {
            const existingProfile = docSnap.data() as UserProfile;
            
            // Ensure primary admin always has admin role and is approved
            if (firebaseUser.email?.toLowerCase() === "qaisarabbas6496@gmail.com" && (existingProfile.role !== 'admin' || existingProfile.status !== 'approved')) {
              const updatedProfile = { 
                ...existingProfile, 
                role: 'admin' as UserRole,
                status: 'approved' as UserStatus,
                schoolId: existingProfile.schoolId || 'main-hq'
              };
              try {
                await updateDoc(docRef, { role: 'admin', status: 'approved' });
              } catch (e) {
                console.warn("Failed to update admin profile status:", e);
              }
              setProfile(updatedProfile);
              if (!activeSchoolId) setActiveSchoolId(updatedProfile.schoolId);
            } else {
              setProfile(existingProfile);
              if (!activeSchoolId) setActiveSchoolId(existingProfile.schoolId);
            }
          } else {
            // If profile doesn't exist, check if this email is pre-authorized
            try {
              const authQuery = query(collection(db, 'authorized_emails'), where('email', '==', firebaseUser.email));
              const authSnap = await getDocs(authQuery);
              
              if (!authSnap.empty) {
                const authData = authSnap.docs[0].data();
                const newProfile: UserProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  role: authData.role || 'staff',
                  status: 'approved',
                  schoolId: authData.schoolId,
                  campusId: authData.campusId || '',
                  isSubscribed: false,
                };
                await setDoc(docRef, newProfile);
                setProfile(newProfile);
                setActiveSchoolId(authData.schoolId);
              } else if (firebaseUser.email?.toLowerCase() === "qaisarabbas6496@gmail.com") {
                const schoolId = 'main-hq';
                // Ensure school record exists
                const schoolRef = doc(db, 'schools', schoolId);
                const schoolSnap = await getDoc(schoolRef);
                if (!schoolSnap.exists()) {
                  await setDoc(schoolRef, {
                    name: 'Education HQ',
                    domain: 'admin',
                    email: firebaseUser.email,
                    createdAt: new Date().toISOString()
                  });
                }

                // Super admin auto-creation
                const newProfile: UserProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  role: 'admin',
                  status: 'approved',
                  isSubscribed: true,
                  schoolId: schoolId
                };
                await setDoc(docRef, newProfile);
                setProfile(newProfile);
                setActiveSchoolId(schoolId);
              } else {
                // Not authorized
                setProfile(null);
              }
            } catch (err) {
              console.error("Authorization check failed:", err);
              setProfile(null);
            }
          }
        } else {
          setUser(null);
          setProfile(null);
          setActiveSchoolId(null);
        }
      } catch (globalErr) {
        console.error("Auth state processing error:", globalErr);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [activeSchoolId]);

  const handleSwitchSchool = (schoolId: string) => {
    setActiveSchoolId(schoolId);
    if (profile) {
      setProfile({ ...profile, schoolId, campusId: 'all' });
    }
  };

  const handleSwitchCampus = (campusId: string) => {
    if (profile) {
      setProfile({ ...profile, campusId });
    }
  };

  useEffect(() => {
    const checkSchoolStatus = async () => {
      if (!activeSchoolId) return;
      setCheckingSchool(true);
      try {
        const schoolSnap = await getDoc(doc(db, 'schools', activeSchoolId));
        if (schoolSnap.exists()) {
          setSchoolData(schoolSnap.data());
        }
      } catch (error) {
        console.error("Error checking school status:", error);
      } finally {
        setCheckingSchool(false);
      }
    };
    checkSchoolStatus();
  }, [activeSchoolId]);

  const isSystemAdmin = user?.email?.toLowerCase() === "qaisarabbas6496@gmail.com";

  const isTrialExpired = schoolData?.isTrial && schoolData?.trialExpiresAt && new Date(schoolData.trialExpiresAt) < new Date();
  const isSuspended = schoolData?.isActive === false;

  if (loading || checkingSchool) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Handle expired trial or suspended school
  if (user && profile && !isSystemAdmin && (isTrialExpired || isSuspended)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
            {isTrialExpired ? <Clock className="w-10 h-10" /> : <LogIn className="w-10 h-10" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {isTrialExpired ? 'Trial Period Expired' : 'Access Suspended'}
          </h2>
          <p className="text-slate-600 mb-8">
            {isTrialExpired 
              ? 'Your 15-day free trial has ended. To continue using the system, please complete your subscription payment.'
              : 'Your school\'s access to the system has been suspended. Please contact the administrator for more information.'
            }
          </p>
          {isTrialExpired && (
             <div className="bg-indigo-50 p-4 rounded-xl mb-8 text-left border border-indigo-100">
               <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-2">Next Steps</h4>
               <ul className="text-xs text-indigo-700 space-y-1 font-medium list-disc ml-4">
                 <li>Review subscription plans</li>
                 <li>Complete payment via bank transfer or mobile</li>
                 <li>Send proof of payment to support</li>
               </ul>
             </div>
          )}
          <button 
            onClick={() => auth.signOut()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Handle unauthorized access
  if (user && !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-8">
            Your email is not authorized to access this school. Please contact your school administrator to request access.
          </p>
          <button 
            onClick={() => auth.signOut()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Switch Account
          </button>
        </div>
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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/register" element={<Registration />} />
          <Route path="/school/:slug" element={<PublicWebsite />} />
          <Route path="/school/:slug/results/:resultId" element={<PublicResultView />} />
          {!user ? (
            <Route path="*" element={<Login />} />
          ) : (
            <Route path="/" element={<Layout 
              profile={profile} 
              onSwitchSchool={isSystemAdmin ? handleSwitchSchool : undefined} 
              onSwitchCampus={profile?.role === 'admin' ? handleSwitchCampus : undefined}
            />}>
              <Route index element={<Dashboard profile={profile} />} />
              <Route path="students" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Students profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="classes" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Classes profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="attendance" element={<Academic profile={profile} />} />
              <Route path="examination-portal" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Exams profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="results" element={<Results profile={profile} />} />
              
              <Route path="teachers" element={<TeachersPortal profile={profile} />}>
                <Route index element={profile?.role === 'admin' || profile?.role === 'staff' ? <Staff profile={profile} /> : <Navigate to="/" replace />} />
                <Route path="schedule" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Schedule profile={profile} /> : <Navigate to="/" replace />} />
                <Route path="leave" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Leave profile={profile} /> : <Navigate to="/" replace />} />
                <Route path="tasks" element={<Tasks profile={profile} />} />
                <Route path="attendance" element={<TeacherAttendance profile={profile} />} />
              </Route>
  
              <Route path="subjects" element={profile?.role === 'admin' || profile?.role === 'staff' ? <SubjectsManagement profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="fees" element={profile?.role === 'admin' || profile?.role === 'staff' ? <FeesManagement profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="payroll" element={profile?.role === 'admin' || profile?.role === 'staff' ? <PayrollManagement profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="expenses" element={profile?.role === 'admin' || profile?.role === 'staff' ? <ExpensesManagement profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="inventory" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Inventory profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="communication" element={<Communication profile={profile} />} />
              <Route path="curriculum" element={<Curriculum profile={profile} />} />
              <Route path="exams" element={<Exams profile={profile} />} />
              <Route path="library" element={<Library profile={profile} />} />
              <Route path="certificates" element={<Certificates profile={profile} />} />
              <Route path="school-website" element={profile?.role === 'admin' ? <SchoolWebsite profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="school-shop" element={profile?.role === 'admin' ? <SchoolShop profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="transport" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Transport profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="campuses" element={profile?.role === 'admin' ? <Campuses profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="users" element={isSystemAdmin ? <UserManagement profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="reports" element={profile?.role === 'admin' || profile?.role === 'staff' ? <Reports profile={profile} /> : <Navigate to="/" replace />} />
              <Route path="settings" element={profile?.role === 'admin' ? <Settings profile={profile} /> : <Navigate to="/" replace />} />
              
              {/* Redirects for old routes */}
              <Route path="tasks" element={<Navigate to="/teachers/tasks" replace />} />
              <Route path="schedule" element={<Navigate to="/teachers/schedule" replace />} />
              <Route path="leave" element={<Navigate to="/teachers/leave" replace />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </Suspense>
    </Router>
  );
}
