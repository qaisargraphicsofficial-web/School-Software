import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile } from '../types';
import { LayoutDashboard, Save, Upload, Link as LinkIcon, Video, Phone, Mail, Instagram, Facebook, MessageCircle } from 'lucide-react';

interface SchoolWebsiteProps {
  profile: UserProfile | null;
}

export default function SchoolWebsite({ profile }: SchoolWebsiteProps) {
  const [data, setData] = useState<any>({
    schoolWebAddress: '', tagline: '', announcement: '', about: '',
    phone: '', whatsapp: '', email: '', facebookUrl: '', instagramUrl: '',
    coverPhotos: ['', '', '', ''],
    spotlight: { heading: '', photoUrl: '', name: '', title: '', message: '' },
    mainVideoUrl: '', moreVideos: '',
    customLinks: [{ label: '', url: '' }, { label: '', url: '' }, { label: '', url: '' }, { label: '', url: '' }]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.campusId) return;
      const docRef = doc(db, 'school_websites', profile.campusId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setData(docSnap.data());
      }
      setLoading(false);
    };
    fetchData();
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.campusId) return;
    await setDoc(doc(db, 'school_websites', profile.campusId), { ...data, campusId: profile.campusId });
    alert('Settings saved!');
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-black text-slate-900 mb-8">My School Website</h1>
      <form onSubmit={handleSave} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">BASIC INFO</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="School Web Address (slug)" value={data.schoolWebAddress} onChange={e => setData({...data, schoolWebAddress: e.target.value})} className="p-3 border rounded-xl" />
            <input placeholder="Tagline" value={data.tagline} onChange={e => setData({...data, tagline: e.target.value})} className="p-3 border rounded-xl" />
            <input placeholder="Announcement" value={data.announcement} onChange={e => setData({...data, announcement: e.target.value})} className="p-3 border rounded-xl md:col-span-2" />
            <textarea placeholder="About Your School" value={data.about} onChange={e => setData({...data, about: e.target.value})} className="p-3 border rounded-xl md:col-span-2" rows={4} />
          </div>
        </div>

        {/* Save Button */}
        <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700">
          <Save className="w-5 h-5" /> Save Changes
        </button>
      </form>
    </div>
  );
}
