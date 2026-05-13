import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SchoolWebsiteConfig, PublicAdmission, ExamType, ExamResult, Student } from '../types';
import { 
  Phone, 
  Mail, 
  Instagram, 
  Facebook, 
  MessageCircle, 
  Youtube,
  Globe,
  Loader2,
  Send,
  Search,
  School,
  ArrowRight,
  GraduationCap,
  Calendar,
  ChevronRight,
  Menu,
  X,
  Play,
  Plus,
  CheckCircle2,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function PublicWebsite() {
  const { slug } = useParams();
  const [data, setData] = useState<SchoolWebsiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({
    studentName: '',
    parentName: '',
    contact: '',
    whatsapp: '',
    class: '',
    previousSchool: '',
    address: ''
  });
  const [submittingAdmission, setSubmittingAdmission] = useState(false);
  const [admissionSuccess, setAdmissionSuccess] = useState(false);

  // Results search
  const [resultSearch, setResultSearch] = useState({ rollNumber: '', examTypeId: '' });
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [searchingResults, setSearchingResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundResult, setFoundResult] = useState<any>(null);

  useEffect(() => {
    const fetchWebsite = async () => {
      try {
        // First try to find campusId from slug
        const slugQuery = query(collection(db, 'website_slugs'), where('slug', '==', slug));
        const slugSnap = await getDocs(slugQuery);
        
        let campusId = slug;
        if (!slugSnap.empty) {
          campusId = slugSnap.docs[0].data().campusId;
        }

        const docRef = doc(db, 'school_websites', campusId!);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const websiteData = docSnap.data() as SchoolWebsiteConfig;
          setData(websiteData);
          
          // Fetch exam types for results portal
          try {
            const etSnap = await getDocs(query(collection(db, 'exam_types'), where('campusId', '==', websiteData.campusId)));
            setExamTypes(etSnap.docs.map(d => ({ id: d.id, ...d.data() } as ExamType)));
          } catch (etError) {
            handleFirestoreError(etError, OperationType.LIST, 'exam_types');
          }
        }
      } catch (error) {
        console.error("Error fetching public website:", error);
        handleFirestoreError(error, OperationType.GET, 'school_websites');
      } finally {
        setLoading(false);
      }
    };
    fetchWebsite();
  }, [slug]);

  const handleAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.campusId) return;
    setSubmittingAdmission(true);
    try {
      const path = 'public_admissions';
      await addDoc(collection(db, path), {
        ...admissionForm,
        campusId: data.campusId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setAdmissionSuccess(true);
      setAdmissionForm({
        studentName: '', parentName: '', contact: '', whatsapp: '', class: '', previousSchool: '', address: ''
      });
      setTimeout(() => setAdmissionSuccess(false), 5000);
    } catch (error) {
      console.error("Admission submission failed:", error);
      handleFirestoreError(error, OperationType.CREATE, 'public_admissions');
    } finally {
      setSubmittingAdmission(false);
    }
  };

  const handleResultSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.campusId || !resultSearch.rollNumber || !resultSearch.examTypeId) return;
    setSearchingResults(true);
    setSearchError(null);
    setFoundResult(null);

    try {
      // Find student by roll number
      const sQuery = query(
        collection(db, 'students'), 
        where('campusId', '==', data.campusId),
        where('rollNumber', '==', resultSearch.rollNumber)
      );
      const sSnap = await getDocs(sQuery);
      
      if (sSnap.empty) {
        setSearchError('No student found with this roll number.');
        return;
      }

      const student = { id: sSnap.docs[0].id, ...sSnap.docs[0].data() } as Student;

      // Find result
      const rQuery = query(
        collection(db, 'exam_results'),
        where('campusId', '==', data.campusId),
        where('studentId', '==', student.id),
        where('examTypeId', '==', resultSearch.examTypeId)
      );
      const rSnap = await getDocs(rQuery);

      if (rSnap.empty) {
        setSearchError('Result not announced yet for this student.');
        return;
      }

      setFoundResult({
        student,
        result: { id: rSnap.docs[0].id, ...rSnap.docs[0].data() } as ExamResult,
        examType: examTypes.find(t => t.id === resultSearch.examTypeId)
      });
    } catch (error) {
      console.error("Result search failed:", error);
      setSearchError('Something went wrong. Please try again.');
      handleFirestoreError(error, OperationType.LIST, 'exam_results');
    } finally {
      setSearchingResults(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 bg-linear-to-br from-indigo-50 to-white">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Entering School Portal...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <School className="w-16 h-16 text-slate-300 mb-6" />
        <h1 className="text-2xl font-black text-slate-900 mb-2">School Portal Not Found</h1>
        <p className="text-slate-500 mb-8 max-w-md text-center">This school hasn't set up their public website yet or the web address is incorrect.</p>
        <Link to="/" className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 scroll-smooth">
      {/* Announcement Bar */}
      {data.announcement && (
        <div className="bg-slate-900 text-white py-2.5 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
            <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-center whitespace-nowrap overflow-hidden">
              {data.announcement}
            </p>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              {data.slug?.[0].toUpperCase() || <School className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">The {data.slug || 'School'}</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{data.tagline || 'Education for Future'}</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#home" className="text-sm font-black text-slate-900 uppercase tracking-widest hover:text-indigo-600 transition-colors">Home</a>
            <a href="#about" className="text-sm font-black text-slate-900 uppercase tracking-widest hover:text-indigo-600 transition-colors">About</a>
            <a href="#admissions" className="text-sm font-black text-slate-900 uppercase tracking-widest hover:text-indigo-600 transition-colors">Admissions</a>
            <a href="#results" className="text-sm font-black text-slate-900 uppercase tracking-widest hover:text-indigo-600 transition-colors">Results</a>
            <a href="#contact" className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">Contact Us</a>
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-slate-900 bg-slate-50 rounded-xl">
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden bg-white border-t border-slate-100 mt-4 px-2 pb-6 space-y-2 flex flex-col pt-4"
            >
              <a onClick={() => setIsMenuOpen(false)} href="#home" className="p-4 text-xs font-black text-slate-900 uppercase tracking-widest bg-slate-50 rounded-2xl">Home</a>
              <a onClick={() => setIsMenuOpen(false)} href="#about" className="p-4 text-xs font-black text-slate-900 uppercase tracking-widest hover:bg-slate-50 rounded-2xl">About</a>
              <a onClick={() => setIsMenuOpen(false)} href="#admissions" className="p-4 text-xs font-black text-slate-900 uppercase tracking-widest hover:bg-slate-50 rounded-2xl">Admissions</a>
              <a onClick={() => setIsMenuOpen(false)} href="#results" className="p-4 text-xs font-black text-slate-900 uppercase tracking-widest hover:bg-slate-50 rounded-2xl">Results</a>
              <a onClick={() => setIsMenuOpen(false)} href="#contact" className="p-4 text-xs font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 rounded-2xl">Contact</a>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative h-[80vh] min-h-[600px] overflow-hidden">
        <div className="grid grid-cols-2 h-full gap-2 p-2">
          {data.coverPhotos.map((photo, i) => (
            <div key={i} className="relative overflow-hidden rounded-[40px] shadow-2xl">
              {photo ? (
                <img src={photo} alt="" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center p-12">
                   <div className="text-center space-y-4">
                     <School className="w-12 h-12 text-slate-200 mx-auto" />
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">School Moment {i + 1}</p>
                   </div>
                </div>
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent"></div>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-6">
          <div className="bg-white/90 backdrop-blur-xl p-8 md:p-12 rounded-[50px] shadow-2xl max-w-2xl transform">
            <div className="w-16 h-1 w-20 bg-indigo-600 mx-auto mb-6 rounded-full"></div>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight uppercase leading-none">
              Welcome to <span className="text-indigo-600">{data.slug || 'Our School'}</span>
            </h2>
            <p className="text-sm md:text-lg font-bold text-slate-500 mb-8 max-w-lg mx-auto leading-relaxed">
              {data.tagline || 'Nurturing minds, building futures, and empowering the next generation of leaders.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pointer-events-auto">
              <a href="#admissions" className="px-8 py-4 bg-indigo-600 text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all">Enroll Now</a>
              <a href="#about" className="px-8 py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-[24px] text-xs font-black uppercase tracking-widest hover:bg-slate-50 hover:-translate-y-1 transition-all">Learn More</a>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                Our Story
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight">
                Empowering Students to <span className="text-indigo-600">Reach Their Potential</span>
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed font-medium">
                {data.about || "We provide a nurturing environment where students can grow academically, socially, and emotionally. Our mission is to inspire curiosity and foster a lifelong love for learning."}
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <p className="text-4xl font-black text-slate-900">25+</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Years Excellence</p>
                </div>
                <div className="space-y-2">
                  <p className="text-4xl font-black text-slate-900">1k+</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alumni</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-white rounded-[60px] shadow-2xl p-8 border border-slate-100 relative z-10">
                <div className="w-full h-full bg-slate-50 rounded-[40px] flex items-center justify-center p-12 overflow-hidden">
                  {data.coverPhotos[0] ? (
                    <img src={data.coverPhotos[0]} alt="School" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <School className="w-24 h-24 text-slate-200" />
                  )}
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-amber-400 rounded-full blur-[100px] opacity-20 -z-0"></div>
              <div className="absolute -top-8 -left-8 w-64 h-64 bg-indigo-400 rounded-full blur-[100px] opacity-20 -z-0"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Spotlight Component */}
      {(data.spotlight.heading || data.spotlight.message) && (
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-slate-900 rounded-[60px] p-8 md:p-16 relative overflow-hidden shadow-2xl text-white">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                {data.spotlight.photoUrl && (
                  <div className="w-full lg:w-1/3 aspect-square rounded-[40px] overflow-hidden border-4 border-white/10 shadow-2xl">
                    <img src={data.spotlight.photoUrl} alt={data.spotlight.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
                <div className="flex-1 space-y-8 text-center lg:text-left">
                  <div>
                    <h2 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">{data.spotlight.heading || 'Spotlight'}</h2>
                    <blockquote className="text-2xl md:text-3xl font-black leading-relaxed tracking-tight italic">
                      "{data.spotlight.message}"
                    </blockquote>
                  </div>
                  <div>
                    <p className="text-xl font-black uppercase tracking-tight">{data.spotlight.name}</p>
                    <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs mt-1">{data.spotlight.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Custom Links Section (Quick Access) */}
      {data.customLinks.some(l => l.label) && (
        <section className="py-12 px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6">
             {data.customLinks.filter(l => l.label).map((link, i) => (
                <a 
                  key={i} 
                  href={link.url}
                  className="px-8 py-5 bg-white border-2 border-slate-100 rounded-3xl flex items-center gap-4 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-1 transition-all group"
                >
                  <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-black text-slate-900 uppercase tracking-widest">{link.label}</span>
                </a>
             ))}
          </div>
        </section>
      )}

      {/* Videos Section */}
      {(data.videos.main || data.videos.others.length > 0) && (
        <section className="py-24 px-6 bg-slate-50 overflow-hidden">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em]">Watch Us in Action</h2>
              <h3 className="text-4xl font-black text-slate-900 leading-none uppercase tracking-tight">Our Video Gallery</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {data.videos.main && (
                <div className="lg:col-span-2 aspect-video bg-slate-200 rounded-[40px] overflow-hidden shadow-2xl border-8 border-white group relative">
                  <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                     <div className="p-6 bg-white text-indigo-600 rounded-full shadow-2xl">
                        <Play className="w-10 h-10 fill-current" />
                     </div>
                  </div>
                  <iframe 
                    src={data.videos.main.replace('youtu.be/', 'youtube.com/embed/').replace('watch?v=', 'embed/')} 
                    className="w-full h-full"
                    title="Main Video"
                    allowFullScreen
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
                {data.videos.others.map((url, i) => (
                  <div key={i} className="aspect-video bg-slate-200 rounded-[28px] overflow-hidden border-4 border-white shadow-lg group relative">
                    <iframe 
                      src={url.replace('youtu.be/', 'youtube.com/embed/').replace('watch?v=', 'embed/')} 
                      className="w-full h-full"
                      title={`Video ${i + 1}`}
                      allowFullScreen
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Admissions & Results Portal */}
      <section id="admissions" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Admissions Form */}
            <div className="bg-white rounded-[60px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col p-8 md:p-16 space-y-12">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-50">
                  <Plus className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Admission Inquiry</h2>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">Fill out the form below and our admissions team will contact you within 24 hours.</p>
              </div>

              {admissionSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 text-emerald-700 p-8 rounded-[40px] text-center space-y-4 border-2 border-emerald-100"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black uppercase">Application Received!</h3>
                  <p className="text-sm font-bold opacity-80 uppercase tracking-widest">We will get back to you shortly.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleAdmissionSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      required
                      placeholder="Student Name"
                      className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all"
                      value={admissionForm.studentName}
                      onChange={e => setAdmissionForm({...admissionForm, studentName: e.target.value})}
                    />
                    <input 
                      required
                      placeholder="Parent Name"
                      className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all"
                      value={admissionForm.parentName}
                      onChange={e => setAdmissionForm({...admissionForm, parentName: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      required
                      placeholder="Contact Phone"
                      className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all"
                      value={admissionForm.contact}
                      onChange={e => setAdmissionForm({...admissionForm, contact: e.target.value})}
                    />
                    <input 
                      required
                      placeholder="Admission for Class"
                      className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all"
                      value={admissionForm.class}
                      onChange={e => setAdmissionForm({...admissionForm, class: e.target.value})}
                    />
                  </div>
                  <textarea 
                    placeholder="Residential Address"
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all resize-none"
                    value={admissionForm.address}
                    onChange={e => setAdmissionForm({...admissionForm, address: e.target.value})}
                  />
                  <button 
                    disabled={submittingAdmission}
                    className="w-full h-16 bg-amber-500 text-white font-black rounded-3xl shadow-2xl shadow-amber-200 uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {submittingAdmission ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5" />}
                    Submit Inquiry
                  </button>
                </form>
              )}
            </div>

            {/* Results Search Portal */}
            <div id="results" className="bg-slate-900 rounded-[60px] shadow-2xl overflow-hidden flex flex-col p-8 md:p-16 space-y-12 text-white relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]"></div>
              
              <div className="space-y-4 relative z-10">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-xl text-indigo-400 rounded-2xl flex items-center justify-center shadow-xl">
                  <Globe className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-black tracking-tight uppercase leading-none">Result Portal</h2>
                <p className="text-sm font-medium text-slate-400 leading-relaxed uppercase tracking-wider">Check your child's academic performance online instantly.</p>
              </div>

              {!foundResult ? (
                <form onSubmit={handleResultSearch} className="space-y-6 relative z-10">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Exam Type</label>
                       <select 
                        required
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold outline-none focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none text-white"
                        value={resultSearch.examTypeId}
                        onChange={e => setResultSearch({...resultSearch, examTypeId: e.target.value})}
                       >
                         <option value="" className="text-slate-900">Select Exam Type</option>
                         {examTypes.map(t => (
                           <option key={t.id} value={t.id} className="text-slate-900">{t.name} ({t.term})</option>
                         ))}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Student Roll Number</label>
                       <input 
                        required
                        placeholder="e.g. 2024-001"
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold outline-none focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white"
                        value={resultSearch.rollNumber}
                        onChange={e => setResultSearch({...resultSearch, rollNumber: e.target.value})}
                       />
                    </div>
                  </div>

                  {searchError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-400 text-xs font-black uppercase tracking-widest px-2">
                      {searchError}
                    </motion.p>
                  )}

                  <button 
                    disabled={searchingResults}
                    className="w-full h-16 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-900/40 uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {searchingResults ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-5 h-5" />}
                    Search Result
                  </button>
                </form>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8 relative z-10"
                >
                  <div className="p-8 bg-white/5 rounded-[40px] border border-white/10 space-y-6">
                    <div className="flex items-center justify-between">
                       <div>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Student Profile</p>
                         <h3 className="text-2xl font-black uppercase tracking-tight">{foundResult.student.name}</h3>
                         <p className="text-xs font-bold text-indigo-400">{foundResult.student.rollNumber} • Class {foundResult.student.class}</p>
                       </div>
                       <button onClick={() => setFoundResult(null)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20">
                          <X className="w-5 h-5" />
                       </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                       <div className="bg-white/5 p-4 rounded-2xl text-center">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Marks</p>
                          <p className="text-xl font-black">{foundResult.result.totalObtained}/{foundResult.result.totalMax}</p>
                       </div>
                       <div className="bg-indigo-600/20 p-4 rounded-2xl text-center">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">GRADE</p>
                          <p className="text-xl font-black text-indigo-400">{foundResult.result.grade}</p>
                       </div>
                       <div className="bg-amber-400/20 p-4 rounded-2xl text-center">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">PERC</p>
                          <p className="text-xl font-black text-amber-400">{foundResult.result.percentage.toFixed(1)}%</p>
                       </div>
                    </div>

                    <div className="pt-4 flex justify-center">
                      <Link 
                        to={`/school/${slug}/results/${foundResult.result.id}`}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors"
                      >
                        Detailed Report Card <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setFoundResult(null)}
                    className="w-full p-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                  >
                    Check another result
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 pt-32 pb-16 px-6 text-white overflow-hidden relative">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] -z-0"></div>
        
        <div className="max-w-7xl mx-auto space-y-24 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
            <div className="space-y-8 col-span-1 md:col-span-2">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-900 shadow-2xl">
                  {data.slug?.[0].toUpperCase() || <School className="w-8 h-8" />}
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight uppercase">The {data.slug || 'School'}</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">{data.tagline || 'Excellence in Education'}</p>
                </div>
              </div>
              <p className="text-slate-400 font-medium leading-relaxed max-w-md">
                Dedicated to providing high-quality education and building a strong foundation for the future of our students.
              </p>
              <div className="flex gap-4">
                {data.socialLinks.facebook && (
                  <a href={data.socialLinks.facebook} className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:border-indigo-600 transition-all">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {data.socialLinks.instagram && (
                  <a href={data.socialLinks.instagram} className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-rose-600 hover:border-rose-600 transition-all">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {data.socialLinks.youtube && (
                  <a href={data.socialLinks.youtube} className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all">
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Contact Details</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/5 rounded-2xl text-indigo-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Phone</p>
                    <p className="text-sm font-black">{data.phone || 'Contact school office'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/5 rounded-2xl text-emerald-400">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">WhatsApp</p>
                    <p className="text-sm font-black">{data.whatsapp || 'Chat with us'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Email Address</h3>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/5 rounded-2xl text-amber-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email</p>
                  <p className="text-sm font-black break-all">{data.email || 'info@school.edu'}</p>
                </div>
              </div>
              <div className="pt-8">
                <div className="p-6 bg-white/5 border border-white/10 rounded-[32px] space-y-4">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Powered by</p>
                   <p className="text-lg font-black tracking-tight uppercase leading-none">EduManage <span className="text-indigo-600">Pro</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <p>© {new Date().getFullYear()} The {data.slug || 'School'}. All rights reserved.</p>
            <div className="flex gap-8">
              <Link to="/" className="hover:text-white transition-colors">Software Login</Link>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
