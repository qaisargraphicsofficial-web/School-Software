import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SchoolApplication } from '../types';
import { motion } from 'motion/react';
import { School, User, Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Registration() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: '',
    adminName: '',
    email: '',
    phone: '',
    address: '',
    plan: 'basic' as 'basic' | 'premium'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const application: SchoolApplication = {
        ...formData,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'school_applications'), application);
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting application:", error);
      alert("Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
          <p className="text-slate-600 mb-8">
            Thank you for applying. Our team will review your school information and contact you shortly for the next steps and subscription payment.
          </p>
          <Link 
            to="/"
            className="block w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Back to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl max-w-2xl w-full overflow-hidden flex flex-col md:flex-row"
      >
        <div className="bg-indigo-600 p-8 md:w-1/3 text-white flex flex-col justify-center">
          <School className="w-12 h-12 mb-6" />
          <h1 className="text-2xl font-bold mb-4">Join Our Network</h1>
          <p className="text-indigo-100 text-sm leading-relaxed">
            Register your school today to get access to the most advanced school management system.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">1</div>
              <span>Fill the form</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">2</div>
              <span>Manual Review</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">3</div>
              <span>Subscription</span>
            </div>
          </div>
        </div>

        <div className="p-8 md:w-2/3">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">School Registration</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
              <div className="relative">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="e.g. Green Valley High"
                  value={formData.schoolName}
                  onChange={e => setFormData({...formData, schoolName: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Principal Name"
                    value={formData.adminName}
                    onChange={e => setFormData({...formData, adminName: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="+1 234 567 890"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="admin@school.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">School Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <textarea
                  required
                  rows={3}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  placeholder="Full physical address"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subscription Plan</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, plan: 'basic'})}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    formData.plan === 'basic' 
                      ? 'border-indigo-600 bg-indigo-50' 
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="font-bold text-slate-900">Basic</div>
                  <div className="text-xs text-slate-500">Up to 500 students</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, plan: 'premium'})}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    formData.plan === 'premium' 
                      ? 'border-indigo-600 bg-indigo-50' 
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="font-bold text-slate-900">Premium</div>
                  <div className="text-xs text-slate-500">Unlimited students</div>
                </button>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between gap-4">
              <Link to="/" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                Already have an account? Login
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : (
                  <>
                    Submit Application
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
