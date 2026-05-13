import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, uploadFile, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, SchoolWebsiteConfig, PublicAdmission } from '../types';
import { 
  LayoutDashboard, 
  Save, 
  Upload, 
  Link as LinkIcon, 
  Video, 
  Phone, 
  Mail, 
  Instagram, 
  Facebook, 
  MessageCircle,
  Globe,
  Camera,
  Play,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Clock,
  X,
  User,
  School,
  Youtube
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SchoolWebsiteProps {
  profile: UserProfile | null;
}

export default function SchoolWebsite({ profile }: SchoolWebsiteProps) {
  const [data, setData] = useState<SchoolWebsiteConfig>({
    campusId: '',
    slug: '',
    tagline: '',
    announcement: '',
    about: '',
    phone: '',
    whatsapp: '',
    email: '',
    socialLinks: { facebook: '', instagram: '', youtube: '', tiktok: '' },
    coverPhotos: ['', '', '', ''],
    spotlight: { heading: '', name: '', role: '', message: '', photoUrl: '' },
    videos: { main: '', others: [] },
    customLinks: [{ label: '', url: '' }, { label: '', url: '' }, { label: '', url: '' }, { label: '', url: '' }],
    updatedAt: new Date().toISOString()
  });

  const [admissions, setAdmissions] = useState<PublicAdmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'admissions'>('editor');

  const coverFileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const spotlightFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.campusId) return;
      try {
        const docRef = doc(db, 'school_websites', profile.campusId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fetchedData = docSnap.data() as SchoolWebsiteConfig;
          // Merge with default to ensure all fields exist
          setData(prev => ({
            ...prev,
            ...fetchedData,
            socialLinks: { ...prev.socialLinks, ...fetchedData.socialLinks },
            spotlight: { ...prev.spotlight, ...fetchedData.spotlight },
            videos: { ...prev.videos, ...fetchedData.videos },
            customLinks: fetchedData.customLinks?.length ? fetchedData.customLinks : prev.customLinks
          }));
        }

        // Fetch admissions
        const q = query(collection(db, 'public_admissions'), where('campusId', '==', profile.campusId));
        const admSnap = await getDocs(q);
        setAdmissions(admSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicAdmission)));

      } catch (error) {
        console.error("Error fetching website data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile?.campusId) return;
    setSaving(true);
    try {
      const configToSave = {
        ...data,
        campusId: profile.campusId,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'school_websites', profile.campusId), configToSave);
      
      // Also update settings global slug mapping if possible (pseudo-logic for routing)
      // In a real app, you'd have a global registry of slugs
      await setDoc(doc(db, 'website_slugs', data.slug || profile.campusId), { 
        campusId: profile.campusId,
        slug: data.slug || profile.campusId
      });

      alert('Website settings saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'school_websites');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'cover' | 'spotlight', index?: number) => {
    if (!profile?.campusId) return;
    const uploadId = type === 'cover' ? `cover-${index}` : 'spotlight';
    setUploadingImage(uploadId);
    try {
      const path = `websites/${profile.campusId}/${type}_${index || 0}_${Date.now()}`;
      const url = await uploadFile(file, path);
      
      if (type === 'cover' && typeof index === 'number') {
        const newCovers = [...data.coverPhotos];
        newCovers[index] = url;
        setData({ ...data, coverPhotos: newCovers });
      } else {
        setData({ ...data, spotlight: { ...data.spotlight, photoUrl: url } });
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleAdmissionStatusChange = async (id: string, status: PublicAdmission['status']) => {
    try {
      await updateDoc(doc(db, 'public_admissions', id), { status });
      setAdmissions(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, 'public_admissions');
    }
  };

  const handleDeleteAdmission = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admission request?')) return;
    try {
      await deleteDoc(doc(db, 'public_admissions', id));
      setAdmissions(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'public_admissions');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Website Configuration...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 rounded-2xl shadow-xl">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none mb-1">My School Website</h1>
            <p className="text-sm font-bold text-slate-400">
              Free forever — <span className="text-indigo-600">no subscription required</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab(activeTab === 'editor' ? 'admissions' : 'editor')}
            className={cn(
              "px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
              activeTab === 'admissions' 
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {activeTab === 'editor' ? `View Admissions (${admissions.length})` : 'Website Editor'}
          </button>
          <button 
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-2.5 bg-amber-500 text-white font-black rounded-2xl shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
          <a 
            href={`/school/${data.slug || profile?.campusId}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'editor' ? (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* BASIC INFO */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-8 space-y-8">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Basic Info</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Your school web address</label>
                  <div className="flex items-center group">
                    <div className="h-12 px-4 flex items-center bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl text-slate-400 font-medium text-sm">
                      pakeducate.com/
                    </div>
                    <input 
                      className="flex-1 h-12 bg-white border border-slate-200 rounded-r-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all group-focus-within:border-indigo-500"
                      placeholder="e.g. wali, tcsl-lahore"
                      value={data.slug}
                      onChange={e => setData({...data, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Tagline (shown under school name)</label>
                    <input 
                      className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="e.g. Quality education since 1995"
                      value={data.tagline}
                      onChange={e => setData({...data, tagline: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Announcement (shown at top of page)</label>
                    <input 
                      className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="e.g. Admissions open for 2025-26"
                      value={data.announcement}
                      onChange={e => setData({...data, announcement: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">About Your School</label>
                  <textarea 
                    className="w-full h-32 bg-white border border-slate-200 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                    placeholder="Tell families about your school, values, and what makes you special..."
                    value={data.about}
                    onChange={e => setData({...data, about: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* CONTACT & SOCIAL */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-8 space-y-8">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Contact & Social</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="+92 300 0000000"
                      value={data.phone}
                      onChange={e => setData({...data, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">WhatsApp</label>
                  <div className="relative">
                    <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="+92 300 0000000"
                      value={data.whatsapp}
                      onChange={e => setData({...data, whatsapp: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="school@example.com"
                      value={data.email}
                      onChange={e => setData({...data, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Facebook Page URL</label>
                  <div className="relative">
                    <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://facebook.com/..."
                      value={data.socialLinks.facebook}
                      onChange={e => setData({...data, socialLinks: {...data.socialLinks, facebook: e.target.value}})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Instagram URL</label>
                  <div className="relative">
                    <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://instagram.com/..."
                      value={data.socialLinks.instagram}
                      onChange={e => setData({...data, socialLinks: {...data.socialLinks, instagram: e.target.value}})}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* COVER PHOTOS */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-8 space-y-6">
              <div>
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Cover Photos (Up to 4)</h2>
                <p className="text-xs text-slate-400 font-medium">Shown as a 2×2 grid on your public page. Old photos auto-deleted when replaced.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {data.coverPhotos.map((photo, index) => (
                  <div 
                    key={index}
                    onClick={() => coverFileInputRefs[index].current?.click()}
                    className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] overflow-hidden group cursor-pointer hover:border-indigo-400 transition-colors"
                  >
                    {photo ? (
                      <img src={photo} alt={`Cover ${index + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Upload className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Cover {index + 1}</span>
                      </div>
                    )}
                    {uploadingImage === `cover-${index}` && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                      </div>
                    )}
                    {photo && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const newCovers = [...data.coverPhotos];
                          newCovers[index] = '';
                          setData({ ...data, coverPhotos: newCovers });
                        }}
                        className="absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <input 
                      type="file" 
                      ref={coverFileInputRefs[index]} 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover', index)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* SPOTLIGHT CARD */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-8 space-y-8">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Spotlight Card</h2>
              
              <div className="bg-slate-50 rounded-[28px] p-6 space-y-3">
                <p className="text-sm font-black text-slate-900">Multi-purpose featured section</p>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Use this for <span className="font-bold">Principal's message, district competition winner, star student of the month, founder's note</span> — anything you want to spotlight on your public page.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Section Heading (shown on public page)</label>
                  <input 
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Principal's Message, District Winner, Star Student..."
                    value={data.spotlight.heading}
                    onChange={e => setData({...data, spotlight: {...data.spotlight, heading: e.target.value}})}
                  />
                </div>

                <div className="flex gap-6 items-start">
                  <div 
                    onClick={() => spotlightFileInputRef.current?.click()}
                    className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl shrink-0 cursor-pointer overflow-hidden group hover:border-indigo-400 transition-all flex items-center justify-center relative"
                  >
                    {data.spotlight.photoUrl ? (
                      <img src={data.spotlight.photoUrl} alt="Spotlight" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <Upload className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Photo</span>
                      </div>
                    )}
                    {uploadingImage === 'spotlight' && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={spotlightFileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'spotlight')}
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Name</label>
                      <input 
                        className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. Mr. Muhammad Arif / Ahmed Ali (Class 8)"
                        value={data.spotlight.name}
                        onChange={e => setData({...data, spotlight: {...data.spotlight, name: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Title / Role (optional)</label>
                      <input 
                        className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. Principal, محتم, Owner, District Topper..."
                        value={data.spotlight.role}
                        onChange={e => setData({...data, spotlight: {...data.spotlight, role: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Message / Caption</label>
                  <textarea 
                    className="w-full h-32 bg-white border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="e.g. 'Our school is proud to announce...' or 'Ahmed secured 1st position in District Science Competition 2025'"
                    value={data.spotlight.message}
                    onChange={e => setData({...data, spotlight: {...data.spotlight, message: e.target.value}})}
                  />
                </div>
              </div>
            </div>

            {/* VIDEOS */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-8 space-y-8">
              <div>
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Videos</h2>
                <p className="text-xs text-slate-400 font-medium">Paste a video URL from YouTube, TikTok, Facebook, Instagram, or Vimeo. We'll embed it on your public page automatically.</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Main video URL</label>
                  <input 
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://youtu.be/... or https://tiktok.com/@school/video/... or https://facebook.com/.../v"
                    value={data.videos.main}
                    onChange={e => setData({...data, videos: {...data.videos, main: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">More videos (one URL per line, up to 6)</label>
                  <textarea 
                    className="w-full h-32 bg-white border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="https://youtu.be/...\nhttps://tiktok.com/@school/video/...\nhttps://instagram.com/reel/..."
                    value={data.videos.others.join('\n')}
                    onChange={e => setData({...data, videos: {...data.videos, others: e.target.value.split('\n').filter(url => url.trim() !== '')}})}
                  />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">These appear as a thumbnail grid on your page</p>
                </div>
              </div>
            </div>

            {/* CUSTOM LINKS */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-8 space-y-8">
              <div>
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Custom Links (Up to 4)</h2>
                <p className="text-xs text-slate-400 font-medium">Add links to anything — admissions form, results portal, fee slip, location map, etc.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.customLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <input 
                      className="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      placeholder={`Button ${index + 1} label`}
                      value={link.label}
                      onChange={e => {
                        const newLinks = [...data.customLinks];
                        newLinks[index].label = e.target.value;
                        setData({...data, customLinks: newLinks});
                      }}
                    />
                    <input 
                      className="flex-[2] h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://..."
                      value={link.url}
                      onChange={e => {
                        const newLinks = [...data.customLinks];
                        newLinks[index].url = e.target.value;
                        setData({...data, customLinks: newLinks});
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center pt-8">
              <button 
                onClick={() => handleSave()}
                disabled={saving}
                className="flex items-center gap-3 px-10 py-4 bg-amber-500 text-white font-black rounded-3xl shadow-2xl shadow-amber-200 hover:bg-amber-600 transition-all disabled:opacity-50 text-sm uppercase tracking-[0.2em]"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save All Changes
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="admissions"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
              <div className="p-8 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Admission Requests</h2>
                  <p className="text-sm text-slate-500 font-medium">Students who applied through your public website.</p>
                </div>
                <div className="bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                  {admissions.length} Total Applications
                </div>
              </div>

              {admissions.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <User className="w-10 h-10 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold">No admission requests yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-100">
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Class</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {admissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(admission => (
                        <tr key={admission.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-5">
                            <p className="font-black text-slate-900 leading-none mb-1">{admission.studentName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parent: {admission.parentName}</p>
                          </td>
                          <td className="px-8 py-5">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black uppercase tracking-widest">
                              Class {admission.class}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-sm font-bold text-slate-900">{admission.contact}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(admission.createdAt).toLocaleDateString()}</p>
                          </td>
                          <td className="px-8 py-5">
                            <select 
                              value={admission.status}
                              onChange={(e) => handleAdmissionStatusChange(admission.id!, e.target.value as any)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border-2",
                                admission.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                admission.status === 'contacted' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                admission.status === 'admitted' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                "bg-rose-50 text-rose-700 border-rose-200"
                              )}
                            >
                              <option value="pending">Pending</option>
                              <option value="contacted">Contacted</option>
                              <option value="admitted">Admitted</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleDeleteAdmission(admission.id!)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
