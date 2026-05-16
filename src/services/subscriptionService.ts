import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { SchoolSubscription } from '../types';

export const getSchoolSubscription = async (schoolId: string): Promise<SchoolSubscription | null> => {
  const docRef = doc(db, 'school_subscriptions', schoolId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as SchoolSubscription;
  }
  return null;
};

export const activateTrial = async (schoolId: string) => {
  const trialDurationDays = 30;
  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(startDate.getDate() + trialDurationDays);

  const subscription: SchoolSubscription = {
    schoolId,
    planId: 'trial',
    status: 'trial',
    type: 'monthly',
    startDate: startDate.toISOString(),
    expiryDate: expiryDate.toISOString(),
  };
  await setDoc(doc(db, 'school_subscriptions', schoolId), subscription);
};

export const checkSubscriptionStatus = (sub: SchoolSubscription): 'active' | 'expired' => {
  const now = new Date();
  const expiry = new Date(sub.expiryDate);
  return now <= expiry ? 'active' : 'expired';
};
