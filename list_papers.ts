import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function listPapers() {
  const papersRef = collection(db, 'exam_papers');
  const snapshot = await getDocs(papersRef);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data().title, doc.data().class, doc.data().subject);
  });
  process.exit(0);
}

listPapers();
