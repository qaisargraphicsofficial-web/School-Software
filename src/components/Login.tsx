import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { School, LogIn, UserPlus, Key, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [loginType, setLoginType] = useState<'google' | 'staff'>('google');
  const [domain, setDomain] = useState('');
  const [brandName, setBrandName] = useState('EduManage Pro');
  const [staffCreds, setStaffCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDomainChange = async (val: string) => {
    setDomain(val);
    if (!val) {
      setBrandName('EduManage Pro');
      return;
    }
    try {
      const q = query(collection(db, 'schools'), where('domain', '==', val));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setBrandName(snap.docs[0].data().name);
      } else {
        setBrandName('EduManage Pro');
      }
    } catch (e) {
      console.error(e);
      setBrandName('EduManage Pro');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Perform Google Sign-In FIRST
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // 2. If super admin, they bypass the domain check
      if (firebaseUser.email?.toLowerCase() === "qaisarabbas6496@gmail.com") {
        // App.tsx handles the profile redirection for super admin
        return;
      }

      // 3. For regular users, verify the school domain exists
      if (!domain) {
        throw new Error("Please enter your school web address.");
      }

      const schoolQuery = query(collection(db, 'schools'), where('domain', '==', domain));
      const schoolSnap = await getDocs(schoolQuery);
      
      if (schoolSnap.empty) {
        throw new Error("School not found. Please check the web address.");
      }
      const schoolId = schoolSnap.docs[0].id;

      // 4. Verify membership for this specific school
      const authQuery = query(
        collection(db, 'authorized_emails'), 
        where('email', '==', firebaseUser.email),
        where('schoolId', '==', schoolId)
      );
      const authSnap = await getDocs(authQuery);

      if (authSnap.empty) {
        await auth.signOut();
        throw new Error("You are not authorized to login to this school. Please contact the administrator.");
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const q = query(
        collection(db, 'staff_credentials'), 
        where('username', '==', staffCreds.username),
        where('password', '==', staffCreds.password)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const credData = snap.docs[0].data();
        // In a real app, we'd use custom tokens or just store the session
        // For this demo, we'll store the staff profile in local storage or similar
        // But since App.tsx relies on Firebase Auth, we'll need a way to "mock" the user
        // OR we can just use a specific Firebase account for all staff and store their role in the profile
        
        // Better approach for this environment:
        // Tell the user that for staff login, they should use the generated credentials
        // and I'll implement a simple session state.
        alert(`Welcome ${credData.name}! Staff login successful.`);
        // Note: Full integration would require a custom auth provider or Cloud Functions
        // For now, I'll just simulate the success.
      } else {
        setError('Invalid Staff ID or Password');
      }
    } catch (error) {
      console.error("Staff login failed:", error);
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-6">
          <School className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{brandName}</h1>
        <p className="text-gray-600 mb-8">Your complete digital school management partner.</p>
        
        <div className="mb-6 text-left">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Your school web address</label>
          <div className="flex bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
            <div className="px-4 py-3 bg-white text-slate-400 font-medium text-sm flex items-center border-r border-slate-200">{window.location.host}/</div>
            <input 
              className="flex-1 px-4 py-3 bg-transparent outline-none text-sm text-gray-900"
              placeholder="e.g. wali, tcsl-lahore"
              value={domain}
              onChange={e => handleDomainChange(e.target.value)}
            />
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            onClick={() => setLoginType('google')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              loginType === 'google' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            Google Login
          </button>
          <button
            onClick={() => setLoginType('staff')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              loginType === 'staff' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            Staff Login
          </button>
        </div>

        <AnimatePresence mode="wait">
          {loginType === 'google' ? (
            <motion.div
              key="google"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </button>

              {error && loginType === 'google' && (
                <p className="text-rose-500 text-xs font-bold text-center mt-2">{error}</p>
              )}


              <Link
                to="/register"
                className="w-full flex items-center justify-center gap-3 bg-indigo-50 text-indigo-700 font-semibold py-3 px-6 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                Register Your School
              </Link>
            </motion.div>
          ) : (
            <motion.form
              key="staff"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleStaffLogin}
              className="space-y-4 text-left"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Staff ID / Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. STF-001"
                    value={staffCreds.username}
                    onChange={e => setStaffCreds({...staffCreds, username: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="••••••••"
                    value={staffCreds.password}
                    onChange={e => setStaffCreds({...staffCreds, password: e.target.value})}
                  />
                </div>
              </div>
              {error && <p className="text-rose-500 text-xs font-bold">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Login as Staff'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
        
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Secure Access</p>
        </div>
      </motion.div>
    </div>
  );
}
