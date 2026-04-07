import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { School, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">EduManage Pro</h1>
        <p className="text-gray-600 mb-8">Your complete digital school management partner.</p>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button>
        
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Secure Access</p>
        </div>
      </motion.div>
    </div>
  );
}
