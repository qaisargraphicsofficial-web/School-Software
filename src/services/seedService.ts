import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';

const CLASSES = ['Playgroup', 'Nursery', 'KG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'];
const SECTIONS = ['A', 'B'];
const SUBJECTS = ['English', 'Math', 'Physics', 'Chemistry', 'Biology', 'Science', 'Islamiyat', 'Urdu'];

export const seedData = async (campusId: string = 'main') => {
  const batch = writeBatch(db);

  // 1. Seed Classes
  const classDocs: any[] = [];
  for (const className of CLASSES) {
    for (const section of SECTIONS) {
      const classRef = doc(collection(db, 'classes'));
      const classData = {
        className,
        section,
        campusId,
        studentCount: 0,
        createdAt: new Date().toISOString()
      };
      batch.set(classRef, classData);
      classDocs.push({ ...classData, id: classRef.id });
    }
  }

  // 2. Seed Subjects
  for (const className of CLASSES) {
    for (const subName of SUBJECTS) {
      // Logic for high school subjects vs primary
      if ((className === 'Class 4' || className === 'Class 5') || !['Physics', 'Chemistry', 'Biology'].includes(subName)) {
        const subRef = doc(collection(db, 'subjects'));
        batch.set(subRef, {
          name: subName,
          class: className,
          campusId,
          code: `${subName.substring(0, 3).toUpperCase()}-${className.replace(' ', '')}`,
          creditHours: 4
        });
      }
    }
  }

  // 3. Seed Transport
  const routes = [
    { name: 'Route Alpha', area: 'Downtown', fee: 2000 },
    { name: 'Route Beta', area: 'Suburb Area', fee: 2500 },
    { name: 'Route Gamma', area: 'East Side', fee: 1800 }
  ];
  const routeRefs: string[] = [];
  for (const r of routes) {
    const rRef = doc(collection(db, 'transport_routes'));
    batch.set(rRef, { ...r, campusId, driverName: 'John Driver', phone: '123456789' });
    routeRefs.push(rRef.id);
  }

  // 4. Seed Vehicles
  const vehicles = ['Bus-01', 'Van-22', 'Coaster-09'];
  for (const v of vehicles) {
    const vRef = doc(collection(db, 'transport_vehicles'));
    batch.set(vRef, { vehicleNumber: v, model: '2022', capacity: 30, campusId });
  }

  // 5. Seed Staff (Teachers)
  const staffRefs: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const sRef = doc(collection(db, 'staff'));
    const staffData = {
      staffId: `STF-${1000 + i}`,
      name: `Teacher ${i}`,
      email: `teacher${i}@school.com`,
      phone: `+92300000000${i}`,
      role: 'staff',
      designation: 'Senior Teacher',
      joiningDate: '2023-01-01',
      status: 'active',
      campusId,
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Staff${i}`
    };
    batch.set(sRef, staffData);
    staffRefs.push(sRef.id);
  }

  // 6. Seed Students
  for (let i = 1; i <= 40; i++) {
    const studentClass = CLASSES[Math.floor(Math.random() * CLASSES.length)];
    const studentSection = SECTIONS[Math.floor(Math.random() * SECTIONS.length)];
    const sRef = doc(collection(db, 'students'));
    batch.set(sRef, {
      rollNumber: `SID-${2000 + i}`,
      name: `Student ${i}`,
      fatherName: `Parent ${i}`,
      class: studentClass,
      section: studentSection,
      campusId,
      admissionDate: '2024-01-15',
      address: `${i}st Street, City`,
      transportId: routeRefs[i % routeRefs.length],
      phone: `+92311000000${i}`,
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Student${i}`
    });
  }

  // 7. Seed Library
  for (let i = 1; i <= 15; i++) {
    const bRef = doc(collection(db, 'library_books'));
    batch.set(bRef, {
      title: `Academic Book ${i}`,
      author: `Author ${i}`,
      isbn: `ISBN-${9000 + i}`,
      category: i % 2 === 0 ? 'Science' : 'Literature',
      quantity: 5,
      campusId
    });
  }

  // 8. Seed Syllabi & Diaries
  for (const className of CLASSES) {
    const sylRef = doc(collection(db, 'syllabus'));
    batch.set(sylRef, {
      class: className,
      subject: 'English',
      title: 'Term 1 Syllabus',
      content: 'Chapter 1-5 with exercises and grammar.',
      campusId,
      createdAt: new Date().toISOString()
    });
  }

  await batch.commit();
  console.log('Seeding completed successfully');
};
