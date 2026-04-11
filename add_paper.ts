import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function addPaper() {
  const papersRef = collection(db, 'exam_papers');
  
  const newPaper = {
    title: 'Final Term Physics',
    class: 'Class 11',
    subject: 'Physics',
    date: new Date().toISOString().split('T')[0],
    duration: 120,
    term: 'Final Term',
    campusId: 'main',
    questions: [
      {
        question: "Which of Newton's laws of motion states that for every action, there is an equal and opposite reaction?",
        options: ["First Law", "Second Law", "Third Law", "Law of Universal Gravitation"],
        answer: "Third Law",
        type: "mcq"
      },
      {
        question: "According to Newton's Second Law of Motion, the acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its:",
        options: ["Velocity", "Mass", "Volume", "Density"],
        answer: "Mass",
        type: "mcq"
      }
    ]
  };

  try {
    const docRef = await addDoc(papersRef, newPaper);
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
  process.exit(0);
}

addPaper();
