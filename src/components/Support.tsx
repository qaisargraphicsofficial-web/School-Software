import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  HelpCircle, 
  LifeBuoy, 
  Mail, 
  Phone,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { sendSystemNotification } from '../lib/notifications';
import { cn } from '../lib/utils';

interface SupportProps {
  profile: UserProfile | null;
}

export default function Support({ profile }: SupportProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [complaintType, setComplaintType] = useState<'issue' | 'feedback' | 'billing' | 'feature'>('issue');
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendSystemNotification('complaint', {
        schoolId: profile?.schoolId,
        schoolName: profile?.schoolId || 'Unknown School', // Ideally we fetch the name
        email: profile?.email,
        type: complaintType,
        subject: formData.subject,
        message: formData.message
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting support request:", error);
      alert("Failed to send request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-10 h-10" />
        </motion.div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">Message Received!</h2>
        <p className="text-slate-600 max-w-md mx-auto mb-8 font-medium">
          Thank you for reaching out. Your request has been sent directly to our support team and we will get back to you at {profile?.email} within 24 hours.
        </p>
        <button 
          onClick={() => setSubmitted(false)}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="space-y-6 flex-1">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100 mb-2">
            <LifeBuoy className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Support Center</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">How can we help?</h1>
          <p className="text-lg text-slate-500 font-medium leading-relaxed">
            Have a question, feedback, or found a technical issue? Our dedicated support team is here to ensure your school runs smoothly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm group hover:border-indigo-100 transition-all">
              <Mail className="w-8 h-8 text-indigo-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-black text-slate-900 mb-1">Email Support</h3>
              <p className="text-xs text-slate-500 font-medium">qaisarabbas6496@gmail.com</p>
            </div>
            <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm group hover:border-emerald-100 transition-all">
              <Phone className="w-8 h-8 text-emerald-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-black text-slate-900 mb-1">Direct Hotline</h3>
              <p className="text-xs text-slate-500 font-medium">Available 24/7 for urgent issues</p>
            </div>
          </div>
        </div>

        <div className="w-full md:w-[400px] bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            Send a Ticket
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Request Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'issue', label: 'Technical Issue', icon: AlertTriangle, color: 'rose' },
                  { id: 'feedback', label: 'General Feedback', icon: CheckCircle2, color: 'emerald' },
                  { id: 'billing', label: 'Billing/Payment', icon: HelpCircle, color: 'amber' },
                  { id: 'feature', label: 'Feature Request', icon: FileText, color: 'indigo' }
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setComplaintType(type.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-bold border transition-all",
                      complaintType === type.id 
                        ? `bg-${type.color}-50 border-${type.color}-200 text-${type.color}-700`
                        : "bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    <type.icon className="w-3.5 h-3.5" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Subject</label>
              <input
                type="text"
                required
                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-200 outline-none transition-all font-medium text-sm"
                placeholder="Brief summary of your request"
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Message</label>
              <textarea
                required
                rows={4}
                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-200 outline-none transition-all font-medium text-sm resize-none"
                placeholder="Describe your issue or feedback in detail..."
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? 'Sending...' : (
                <>
                  Send Support Ticket
                  <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
