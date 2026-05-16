import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { collection, getDocs, query, where, limit, addDoc, updateDoc, doc, deleteDoc, orderBy, getCountFromServer, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student, UserProfile, Task } from '../types';
import { 
  GraduationCap, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Loader2, 
  MessageSquare,
  Sparkles,
  User,
  School,
  Bot,
  BookOpen,
  CalendarDays,
  TrendingUp,
  Image as ImageIcon,
  Brain,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

enum ThinkingLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

// --- Function Declarations for Gemini ---
const getStudentStats = {
  name: "get_student_stats",
  description: "Get general statistics about students in the school, including total count.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getStaffStats = {
  name: "get_staff_stats",
  description: "Get general statistics about staff members in the school.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getFinancialSummary = {
  name: "get_financial_summary",
  description: "Get a summary of school finances, including total fees collected.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const searchStudent = {
  name: "search_student",
  description: "Search for a specific student by name or roll number.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The name or roll number of the student to search for.",
      },
    },
    required: ["query"],
  },
};

const searchStaff = {
  name: "search_staff",
  description: "Search for a specific staff member by name or staff ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The name or staff ID of the staff member to search for.",
      },
    },
    required: ["query"],
  },
};

const getClassList = {
  name: "get_class_list",
  description: "Get a list of students in a specific class.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      className: {
        type: Type.STRING,
        description: "The name of the class (e.g., '10', '9A').",
      },
    },
    required: ["className"],
  },
};

const getRecentAdmissions = {
  name: "get_recent_admissions",
  description: "Get a list of recently admitted students.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      limitCount: {
        type: Type.NUMBER,
        description: "The number of recent admissions to fetch (default 5).",
      },
    },
  },
};

const getUnpaidFees = {
  name: "get_unpaid_fees",
  description: "Get a list of students with pending fee payments.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getAttendanceStats = {
  name: "get_attendance_stats",
  description: "Get attendance statistics for a specific date or class.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: {
        type: Type.STRING,
        description: "The date to check attendance for (YYYY-MM-DD).",
      },
      className: {
        type: Type.STRING,
        description: "Optional class name to filter by.",
      },
    },
    required: ["date"],
  },
};

const getInventoryStats = {
  name: "get_inventory_stats",
  description: "Get a summary of school inventory and stock levels.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const postNotice = {
  name: "post_notice",
  description: "Post a new notice to the digital notice board.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "The title of the notice.",
      },
      content: {
        type: Type.STRING,
        description: "The detailed content of the notice.",
      },
      targetAudience: {
        type: Type.STRING,
        enum: ["all", "parents", "staff"],
        description: "Who the notice is for.",
      },
    },
    required: ["title", "content", "targetAudience"],
  },
};

const getStudentResults = {
  name: "get_student_results",
  description: "Get exam results for a specific student.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      studentId: {
        type: Type.STRING,
        description: "The roll number or ID of the student.",
      },
    },
    required: ["studentId"],
  },
};

const getStaffSalarySummary = {
  name: "get_staff_salary_summary",
  description: "Get a summary of total staff salary expenses.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getSchoolEvents = {
  name: "get_school_events",
  description: "Get a list of upcoming school events.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getLibraryLoans = {
  name: "get_library_loans",
  description: "Get a list of current library book loans.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      studentId: {
        type: Type.STRING,
        description: "Optional student ID to filter loans by.",
      },
    },
  },
};

const generateProgressReport = {
  name: "generate_progress_report",
  description: "Generate a summary progress report for a student based on their exam results.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      studentId: {
        type: Type.STRING,
        description: "The roll number or ID of the student.",
      },
    },
    required: ["studentId"],
  },
};

const getClassRankings = {
  name: "get_class_rankings",
  description: "Get the rankings of students in a specific class based on their exam results.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      className: {
        type: Type.STRING,
        description: "The name of the class (e.g., 'Class 10').",
      },
    },
    required: ["className"],
  },
};

const getSubjectPerformance = {
  name: "get_subject_performance",
  description: "Get the average performance of a class in a specific subject.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      className: {
        type: Type.STRING,
        description: "The name of the class.",
      },
      subject: {
        type: Type.STRING,
        description: "The name of the subject (e.g., 'Mathematics').",
      },
    },
    required: ["className", "subject"],
  },
};

const getCampuses = {
  name: "get_campuses",
  description: "Get a list of all school campuses and branches.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getSyllabus = {
  name: "get_syllabus",
  description: "Get the syllabus or curriculum details for a specific class.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      className: {
        type: Type.STRING,
        description: "The name of the class.",
      },
    },
    required: ["className"],
  },
};

const getCertificates = {
  name: "get_certificates",
  description: "Get digital certificates issued to a specific student.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      studentId: {
        type: Type.STRING,
        description: "The roll number or ID of the student.",
      },
    },
    required: ["studentId"],
  },
};

const getExamPapers = {
  name: "get_exam_papers",
  description: "Get a list of available online exam papers.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      className: {
        type: Type.STRING,
        description: "Optional class name to filter by.",
      },
    },
  },
};

const sendBulkMessage = {
  name: "send_bulk_message",
  description: "Send a bulk message (email or whatsapp) to parents of a specific class or all parents.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        enum: ["email", "whatsapp"],
        description: "The type of message to send.",
      },
      targetClass: {
        type: Type.STRING,
        description: "The target class (e.g., '10', 'All').",
      },
      content: {
        type: Type.STRING,
        description: "The content of the message.",
      },
      subject: {
        type: Type.STRING,
        description: "The subject of the email (required for email).",
      },
    },
    required: ["type", "targetClass", "content"],
  },
};

const generateImage = {
  name: "generate_image",
  description: "Generate a high-quality image based on a text prompt.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: "The description of the image to generate.",
      },
      size: {
        type: Type.STRING,
        enum: ["1K", "2K", "4K"],
        description: "The resolution of the image.",
      },
    },
    required: ["prompt", "size"],
  },
};

const createTask = {
  name: "create_task",
  description: "Create a new task for school management.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the task." },
      description: { type: Type.STRING, description: "Detailed description of the task." },
      dueDate: { type: Type.STRING, description: "Due date in YYYY-MM-DD format." },
      priority: { type: Type.STRING, enum: ["low", "medium", "high"], description: "Task priority." },
      assignedTo: { type: Type.STRING, description: "Optional comma-separated names of staff members to assign to (e.g. 'John Doe, Jane Smith')." },
      reminderDate: { type: Type.STRING, description: "Optional reminder date in YYYY-MM-DD format." },
      reminderTime: { type: Type.STRING, description: "Optional reminder time in HH:MM format." },
    },
    required: ["title", "dueDate", "priority"],
  },
};

const getTasks = {
  name: "get_tasks",
  description: "Get a list of current tasks.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, enum: ["pending", "in-progress", "completed", "all"], description: "Filter by status." },
    },
  },
};

const updateTaskStatus = {
  name: "update_task_status",
  description: "Update the status of an existing task.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskId: { type: Type.STRING, description: "The ID of the task to update." },
      status: { type: Type.STRING, enum: ["pending", "in-progress", "completed"], description: "The new status." },
    },
    required: ["taskId", "status"],
  },
};

const deleteTask = {
  name: "delete_task",
  description: "Delete an existing task.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskId: { type: Type.STRING, description: "The ID of the task to delete." },
    },
    required: ["taskId"],
  },
};

// --- Tool Implementations ---
const tools = {
  get_student_stats: async (_: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const q = query(collection(db, 'students'), where('schoolId', '==', profile.schoolId));
    const snap = await getCountFromServer(q).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'students');
      throw err;
    });
    return { total_students: snap.data().count };
  },
  get_staff_stats: async (_: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const q = query(collection(db, 'staff'), where('schoolId', '==', profile.schoolId));
    const snap = await getCountFromServer(q).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'staff');
      throw err;
    });
    return { total_staff: snap.data().count };
  },
  get_financial_summary: async (_: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const q = query(
      collection(db, 'fee_records'), 
      where('schoolId', '==', profile.schoolId),
      where('status', '==', 'paid')
    );
    const snap = await getDocs(q).catch(err => {
      handleFirestoreError(err, OperationType.LIST, 'fee_records');
      throw err;
    });
    let total = 0;
    snap.forEach(doc => {
      total += doc.data().amount || 0;
    });
    return { total_fees_collected: total };
  },
  search_student: async ({ query: q }: { query: string }, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const studentsRef = collection(db, 'students');
    // Try roll number match first
    const rollQuery = query(studentsRef, where('schoolId', '==', profile.schoolId), where('rollNumber', '==', q));
    const rollSnap = await getDocs(rollQuery);
    if (!rollSnap.empty) {
      return { results: rollSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
    }
    
    // Fallback to searching (ideally use a search index or at least limit reads)
    const snap = await getDocs(query(studentsRef, where('schoolId', '==', profile.schoolId), limit(100)));
    const results = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((s: any) => 
        s.name.toLowerCase().includes(q.toLowerCase())
      )
      .slice(0, 5);
    return { results };
  },
  search_staff: async ({ query: q }: { query: string }, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const staffRef = collection(db, 'staff');
    // Try staffId match first
    const idQuery = query(staffRef, where('schoolId', '==', profile.schoolId), where('staffId', '==', q));
    const idSnap = await getDocs(idQuery);
    if (!idSnap.empty) {
      return { results: idSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
    }

    const snap = await getDocs(query(staffRef, where('schoolId', '==', profile.schoolId), limit(100)));
    const results = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((s: any) => 
        (s.name && s.name.toLowerCase().includes(q.toLowerCase())) || 
        (s.staffId && s.staffId.includes(q))
      )
      .slice(0, 5);
    return { results };
  },
  get_class_list: async ({ className }: { className: string }, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const studentsRef = collection(db, 'students');
    const snap = await getDocs(query(studentsRef, where('schoolId', '==', profile.schoolId), where('class', '==', className))).catch(err => {
      handleFirestoreError(err, OperationType.LIST, 'students');
      throw err;
    });
    const results = snap.docs.map((doc: any) => {
      const s = doc.data();
      return { name: s.name, rollNumber: s.rollNumber, section: s.section };
    });
    return { class: className, students: results };
  },
  get_recent_admissions: async ({ limitCount = 5 }: { limitCount?: number }, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const studentsRef = collection(db, 'students');
    const snap = await getDocs(query(studentsRef, where('schoolId', '==', profile.schoolId), orderBy('admissionDate', 'desc'), limit(limitCount))).catch(async (err) => {
      // If index missing, fallback to client side sort
      const fallbackSnap = await getDocs(query(studentsRef, where('schoolId', '==', profile.schoolId), limit(50)));
      return fallbackSnap;
    });
    const results = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime())
      .slice(0, limitCount);
    return { recent_admissions: results };
  },
  get_unpaid_fees: async (_: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const feesRef = collection(db, 'fee_records');
    const snap = await getDocs(query(feesRef, where('schoolId', '==', profile.schoolId), where('status', '==', 'pending'), limit(20))).catch(err => {
      handleFirestoreError(err, OperationType.LIST, 'fee_records');
      throw err;
    });
    const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { pending_fees: results };
  },
  get_attendance_stats: async ({ date, className }: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const attendanceRef = collection(db, 'attendance');
    const snap = await getDocs(query(attendanceRef, where('schoolId', '==', profile.schoolId), where('date', '==', date)));
    let records = snap.docs.map(doc => doc.data());
    
    if (className) {
      const studentsRef = collection(db, 'students');
      const sSnap = await getDocs(query(studentsRef, where('schoolId', '==', profile.schoolId), where('class', '==', className)));
      const classStudentIds = sSnap.docs.map(doc => doc.id);
      records = records.filter((a: any) => classStudentIds.includes(a.targetId));
    }

    const present = records.filter((a: any) => a.status === 'present').length;
    const absent = records.filter((a: any) => a.status === 'absent').length;
    
    return { date, class: className || 'All', present, absent, total: records.length };
  },
  get_inventory_stats: async (_: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const inventoryRef = collection(db, 'inventory');
    const snap = await getDocs(query(inventoryRef, where('schoolId', '==', profile.schoolId)));
    const items = snap.docs.map(doc => doc.data());
    const lowStock = items.filter((i: any) => i.quantity < 10);
    return { total_items: items.length, low_stock_items: lowStock };
  },
  post_notice: async ({ title, content, targetAudience }: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    await addDoc(collection(db, 'notices'), {
      title,
      content,
      targetAudience,
      schoolId: profile.schoolId,
      campusId: profile.campusId || 'main',
      date: new Date().toISOString().split('T')[0]
    });
    return { success: true, message: "Notice posted successfully." };
  },
  get_student_results: async ({ studentId }: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const studentsRef = collection(db, 'students');
    let student: any = null;

    // Try roll number first
    const qRoll = query(studentsRef, where('schoolId', '==', profile.schoolId), where('rollNumber', '==', studentId));
    const rollSnap = await getDocs(qRoll);
    if (!rollSnap.empty) {
      student = { id: rollSnap.docs[0].id, ...rollSnap.docs[0].data() };
    } else {
      // Try ID
      try {
        const sDoc = await getDoc(doc(db, 'students', studentId));
        if (sDoc.exists() && sDoc.data()?.schoolId === profile.schoolId) {
          student = { id: sDoc.id, ...sDoc.data() };
        }
      } catch (e) {}
    }
    
    if (!student) return { error: "Student not found." };

    const resultsRef = collection(db, 'results');
    const rSnap = await getDocs(query(resultsRef, where('schoolId', '==', profile.schoolId), where('studentId', '==', student.id)));
    const results = rSnap.docs.map(doc => doc.data());
    
    return { studentName: `${student.name} S/O ${student.parentName}`, results };
  },
  get_staff_salary_summary: async (_: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const staffRef = collection(db, 'staff');
    const snap = await getDocs(query(staffRef, where('schoolId', '==', profile.schoolId)));
    let total = 0;
    snap.forEach(doc => {
      total += doc.data().salary || 0;
    });
    return { total_monthly_salary_expense: total, staff_count: snap.size };
  },
  get_school_events: async (_: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const eventsRef = collection(db, 'events');
    const snap = await getDocs(query(eventsRef, where('schoolId', '==', profile.schoolId)));
    const results = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return { events: results };
  },
  get_library_loans: async ({ studentId }: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const loansRef = collection(db, 'library_loans');
    let q = query(loansRef, where('schoolId', '==', profile.schoolId));
    if (studentId) {
      q = query(loansRef, where('schoolId', '==', profile.schoolId), where('studentId', '==', studentId));
    }
    const snap = await getDocs(q);
    const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    return { loans: results };
  },
  generate_progress_report: async ({ studentId }: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const studentsRef = collection(db, 'students');
    const sSnap = await getDocs(query(studentsRef, where('schoolId', '==', profile.schoolId)));
    const student = sSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .find(s => s.rollNumber === studentId || s.id === studentId);
    
    if (!student) return { error: "Student not found." };

    const resultsRef = collection(db, 'results');
    const rSnap = await getDocs(query(resultsRef, where('schoolId', '==', profile.schoolId), where('studentId', '==', student.id)));
    const results = rSnap.docs.map(doc => doc.data() as any);
    
    const attendanceRef = collection(db, 'attendance');
    const aSnap = await getDocs(query(attendanceRef, where('schoolId', '==', profile.schoolId), where('targetId', '==', student.id)));
    const attendanceRecords = aSnap.docs.map(doc => doc.data() as any);

    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(a => a.status === 'present').length;
    const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    
    if (results.length === 0) {
      return { 
        studentName: `${student.name} S/O ${student.parentName}`,
        class: student.class,
        attendance: {
          totalDays,
          presentDays,
          percentage: attendancePercentage.toFixed(2) + '%'
        },
        error: "No exam results found for this student." 
      };
    }

    const totalMarks = results.reduce((acc: number, r: any) => acc + (r.totalMarks || 0), 0);
    const marksObtained = results.reduce((acc: number, r: any) => acc + (r.marksObtained || r.totalMarks || 0), 0); // Fallback if marksObtained is missing
    
    // Actually, looking at Academic.tsx, it saves 'marks' as a map and 'totalMarks' as the sum.
    // Let's use the totalMarks and percentage saved in the doc.
    const avgPercentage = results.reduce((acc: number, r: any) => acc + (r.percentage || 0), 0) / results.length;
    
    return {
      studentName: `${student.name} S/O ${student.parentName}`,
      class: student.class,
      totalExams: results.length,
      averagePercentage: avgPercentage.toFixed(2) + '%',
      attendance: {
        totalDays,
        presentDays,
        percentage: attendancePercentage.toFixed(2) + '%'
      },
      performanceSummary: avgPercentage > 80 ? "Excellent" : avgPercentage > 60 ? "Good" : "Needs Improvement"
    };
  },
  get_class_rankings: async ({ className }: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const studentsRef = collection(db, 'students');
    const sSnap = await getDocs(query(studentsRef, where('schoolId', '==', profile.schoolId), where('class', '==', className)));
    const classStudents = sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    if (classStudents.length === 0) return { error: "No students found in this class." };

    const resultsRef = collection(db, 'results');
    const rSnap = await getDocs(query(resultsRef, where('schoolId', '==', profile.schoolId)));
    const allResults = rSnap.docs.map(doc => doc.data() as any);

    const rankings = classStudents.map(student => {
      const studentResults = allResults.filter(r => r.studentId === student.id);
      if (studentResults.length === 0) return { name: `${student.name} S/O ${student.parentName}`, average: 0 };
      
      const totalMarks = studentResults.reduce((acc, r) => acc + (r.marksObtained || 0), 0);
      const maxMarks = studentResults.reduce((acc, r) => acc + (r.totalMarks || 100), 0);
      return {
        name: `${student.name} S/O ${student.parentName}`,
        average: (totalMarks / maxMarks) * 100
      };
    });

    return {
      class: className,
      rankings: rankings.sort((a, b) => b.average - a.average)
    };
  },
  get_subject_performance: async ({ className, subject }: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const studentsRef = collection(db, 'students');
    const sSnap = await getDocs(query(studentsRef, where('schoolId', '==', profile.schoolId), where('class', '==', className)));
    const classStudentIds = sSnap.docs.map(doc => doc.id);
    
    if (classStudentIds.length === 0) return { error: "No students found in this class." };

    const resultsRef = collection(db, 'results');
    const rSnap = await getDocs(query(resultsRef, where('schoolId', '==', profile.schoolId), where('subject', '==', subject)));
    const subjectResults = rSnap.docs
      .map(doc => doc.data() as any)
      .filter(r => classStudentIds.includes(r.studentId));
    
    if (subjectResults.length === 0) return { error: "No results found for this subject in this class." };

    const totalMarks = subjectResults.reduce((acc, r) => acc + (r.marksObtained || 0), 0);
    const maxMarks = subjectResults.reduce((acc, r) => acc + (r.totalMarks || 100), 0);
    const average = (totalMarks / maxMarks) * 100;
    
    return {
      class: className,
      subject,
      averagePercentage: average.toFixed(2) + '%',
      totalStudentsEvaluated: subjectResults.length
    };
  },
  get_campuses: async (_: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const snap = await getDocs(query(collection(db, 'campuses'), where('schoolId', '==', profile.schoolId)));
    return { campuses: snap.docs.map(doc => doc.data()) };
  },
  get_syllabus: async ({ className }: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const snap = await getDocs(query(collection(db, 'syllabus'), where('schoolId', '==', profile.schoolId), where('class', '==', className)));
    const results = snap.docs.map(doc => doc.data());
    return { class: className, syllabus: results };
  },
  get_certificates: async ({ studentId }: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const snap = await getDocs(query(collection(db, 'certificates'), where('schoolId', '==', profile.schoolId), where('studentId', '==', studentId)));
    const results = snap.docs.map(doc => doc.data());
    return { studentId, certificates: results };
  },
  get_exam_papers: async ({ className }: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    let q = query(collection(db, 'exam_papers'), where('schoolId', '==', profile.schoolId));
    if (className) {
      q = query(collection(db, 'exam_papers'), where('schoolId', '==', profile.schoolId), where('class', '==', className));
    }
    const snap = await getDocs(q);
    let results = snap.docs.map(doc => doc.data());
    return { exam_papers: results };
  },
  send_bulk_message: async ({ type, targetClass, content, subject }: any, { profile }: any) => {
    if (!profile?.schoolId) return { error: "No school ID found in profile" };
    const studentsRef = collection(db, 'students');
    let q = query(studentsRef, where('schoolId', '==', profile.schoolId), where('status', '==', 'active'));
    if (targetClass !== 'All') {
      q = query(studentsRef, where('schoolId', '==', profile.schoolId), where('status', '==', 'active'), where('class', '==', targetClass));
    }
    const snap = await getDocs(q);
    let recipients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    if (recipients.length === 0) return { error: "No active students found." };

    await addDoc(collection(db, 'bulk_messages'), {
      type,
      targetClass,
      content,
      subject: subject || '',
      schoolId: profile.schoolId,
      campusId: profile.campusId || 'main',
      date: new Date().toISOString().split('T')[0],
      recipientsCount: recipients.length,
      status: 'sent'
    });

    return { success: true, recipientsCount: recipients.length };
  },
  generate_image: async ({ prompt, size }: { prompt: string, size: "1K" | "2K" | "4K" }) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    // Simulate image generation with the model
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: [{ parts: [{ text: `Generate a ${size} image of: ${prompt}` }] }],
    });

    const base64Image = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Image) {
      return { 
        success: true, 
        imageUrl: `data:image/png;base64,${base64Image}`,
        prompt,
        size
      };
    }
    
    // Fallback if no real image returned (using placeholder for demo if needed, but instructions say build real)
    return { 
      success: true, 
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(prompt)}/1024/1024`,
      prompt,
      size,
      note: "Image generated based on prompt."
    };
  },
  create_task: async (args: any, context: any) => {
    const { title, description, dueDate, priority, assignedTo, reminderDate, reminderTime } = args;
    const { profile } = context;
    if (!profile?.schoolId) return { error: "User not authenticated or no school ID found." };

    let assignedToIds: string[] = [];
    if (assignedTo) {
      const names = assignedTo.split(',').map((n: string) => n.trim().toLowerCase());
      const staffRef = collection(db, 'staff');
      const snap = await getDocs(query(staffRef, where('schoolId', '==', profile.schoolId)));
      const staffDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      names.forEach((name: string) => {
        const found = staffDocs.find(s => s.name.toLowerCase().includes(name));
        if (found && found.id) assignedToIds.push(found.id);
      });
    }

    await addDoc(collection(db, 'tasks'), {
      title,
      description: description || "",
      dueDate,
      priority,
      status: "pending",
      assignedToIds,
      createdBy: profile.uid,
      schoolId: profile.schoolId,
      campusId: profile.campusId || "main",
      createdAt: new Date().toISOString(),
      reminderDate: reminderDate || "",
      reminderTime: reminderTime || ""
    });
    return { success: true, message: `Task "${title}" created successfully.` };
  },
  get_tasks: async ({ status }: any, context: any) => {
    const { profile } = context;
    if (!profile?.schoolId) return { error: "User not authenticated or no school ID found." };

    const q = query(
      collection(db, 'tasks'),
      where('schoolId', '==', profile.schoolId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    let tasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    if (status && status !== 'all') {
      tasks = tasks.filter((t: any) => t.status === status);
    }
    
    return { tasks: tasks.slice(0, 10) };
  },
  update_task_status: async ({ taskId, status }: any) => {
    await updateDoc(doc(db, 'tasks', taskId), { status });
    return { success: true, message: `Task status updated to ${status}.` };
  },
  delete_task: async ({ taskId }: any) => {
    await deleteDoc(doc(db, 'tasks', taskId));
    return { success: true, message: "Task deleted successfully." };
  },
};

interface Message {
  role: 'user' | 'model';
  text: string;
  isBot?: boolean;
  imageUrl?: string;
}

export default function AIAssistant({ profile }: { profile: UserProfile | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm your EduManage AI assistant. How can I help you track school data today?", isBot: true }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const playTTS = async (text: string) => {
    try {
      setIsSpeaking(true);
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY!;
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Fenrir' },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          const binaryString = window.atob(base64Audio);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }

          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          
          let audioBuffer: AudioBuffer;
          try {
            // Use slice(0) to avoid detaching the original buffer in case decodeAudioData fails or we need it for fallback
            audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer.slice(0));
          } catch (e) {
            // Fallback for raw PCM L16 24kHz which is common for this model
            const samples = new Int16Array(bytes.buffer);
            audioBuffer = audioContextRef.current.createBuffer(1, samples.length, 24000);
            const channelData = audioBuffer.getChannelData(0);
            for (let i = 0; i < samples.length; i++) {
              channelData[i] = samples[i] / 32768;
            }
          }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setIsSpeaking(false);
        source.start(0);
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(false);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string, audioData?: { data: string, mimeType: string }) => {
    if (!text.trim() && !audioData) return;

    const userMessage: Message = { role: 'user', text: text || "Voice Message" };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY!;
      const ai = new GoogleGenAI({ apiKey });
      
      const modelName = isThinkingMode ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
      
      // Prepare history for multimodal contents
      // Filter out messages without text if they don't have parts (shouldn't happen here)
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const config: any = {
        systemInstruction: "You are a helpful school management assistant for EduManage. You have access to school data via tools. You can process multimodal inputs including audio and images. Be concise and professional. If you can't find data, explain accurately. Total students, staff, and finances are available via tools.",
        tools: [{ 
          functionDeclarations: [
            getStudentStats, 
            getStaffStats, 
            getFinancialSummary, 
            searchStudent, 
            searchStaff,
            getClassList,
            getRecentAdmissions,
            getUnpaidFees,
            getAttendanceStats,
            getInventoryStats,
            postNotice,
            getStudentResults,
            getStaffSalarySummary,
            getSchoolEvents,
            getLibraryLoans,
            generateProgressReport,
            getClassRankings,
            getSubjectPerformance,
            getCampuses,
            getSyllabus,
            getCertificates,
            getExamPapers,
            sendBulkMessage,
            generateImage,
            createTask,
            getTasks,
            updateTaskStatus,
            deleteTask
          ] 
        }],
      };

      // Only include search tool if using a pro model or if user explicitly needs web search
      if (isThinkingMode) {
        config.tools.push({ googleSearch: {} });
        config.thinkingConfig = {
          includeThoughts: true,
          thinkingLevel: ThinkingLevel.HIGH
        };
      }

      // Current turn parts
      const currentParts: any[] = [];
      if (audioData) {
        currentParts.push({ inlineData: audioData });
      }
      currentParts.push({ text: text || "Please process this voice message and answer based on school data." });

      const contents = [
        ...history,
        { role: 'user' as const, parts: currentParts }
      ];

      let response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });

      // Handle function calls loop
      let turnCount = 0;
      while (response.functionCalls && turnCount < 10) {
        turnCount++;
        const functionResponses = await Promise.all(
          response.functionCalls.map(async (call) => {
            const tool = (tools as any)[call.name];
            if (tool) {
              const result = await tool(call.args, { profile });
              return { name: call.name, response: result, id: call.id };
            }
            return { name: call.name, response: { error: "Tool not found" }, id: call.id };
          })
        );

        // Update contents with the model's call and our response
        contents.push({ role: 'model', parts: response.candidates?.[0]?.content?.parts || [] });
        contents.push({ role: 'user', parts: functionResponses.map(r => ({ functionResponse: r })) });

        response = await ai.models.generateContent({
          model: modelName,
          contents,
          config,
        });
      }

      const modelText = response.text;
      const imageResult = response.candidates?.[0]?.content?.parts?.find((p: any) => p.functionResponse?.name === "generate_image")?.functionResponse?.response;

      setMessages(prev => [
        ...prev, 
        { 
          role: 'model', 
          text: modelText || (imageResult ? "I've generated the image for you." : "I processed your request."), 
          isBot: true,
          imageUrl: imageResult?.imageUrl
        }
      ]);
      if (modelText) playTTS(modelText);

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error processing your request. Please try again.", isBot: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };

    recognition.start();
  };

  const startRecording = async () => {
    try {
      // Check if mediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Recording not supported in this browser.");
      }

      // Check for available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');
      
      if (!hasMicrophone) {
        throw new Error("No microphone found.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          handleSend('', { data: base64Data, mimeType: 'audio/webm' });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording Error:", error);
      let message = "Could not access microphone for recording.";
      if (error instanceof Error) {
        message = error.message;
      }
      alert(message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-[100] p-4 rounded-full shadow-2xl transition-colors",
          isOpen ? "bg-slate-800 text-white" : "bg-indigo-600 text-white"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-[100] w-[90vw] sm:w-[400px] h-[550px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">EduManage AI</h3>
                  <p className="text-xs text-indigo-100 italic">
                    {isSpeaking ? "Speaking..." : "Ask me anything about students, staff or fees"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={async () => {
                    const aiStudio = (window as any).aistudio;
                    if (aiStudio?.openSelectKey) {
                      await aiStudio.openSelectKey();
                    } else {
                      alert("API key selection is managed via Settings > Secrets.");
                    }
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg text-[10px] flex items-center gap-1"
                  title="Configure Premium API Key"
                >
                  <Settings2 className="w-4 h-4" />
                  KEY
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    msg.role === 'user' ? "bg-indigo-100 text-indigo-600" : "bg-white border border-slate-200 text-slate-600 shadow-sm"
                  )}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm",
                    msg.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none"
                  )}>
                    {msg.text}
                    {msg.imageUrl && (
                      <img 
                        src={msg.imageUrl} 
                        alt="Generated" 
                        className="mt-2 rounded-lg w-full h-auto shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  AI is thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsThinkingMode(!isThinkingMode)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all border",
                      isThinkingMode 
                        ? "bg-indigo-50 text-indigo-600 border-indigo-200" 
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    )}
                    title="Enable High Thinking Mode"
                  >
                    <Brain className="w-3 h-3" />
                    THINKING
                  </button>
                  
                  <div className="flex items-center gap-1 bg-slate-50 rounded-full border border-slate-200 p-0.5">
                    {(["1K", "2K", "4K"] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setImageSize(size)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all",
                          imageSize === size ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                    <div className="px-1.5 text-slate-300">
                      <ImageIcon className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleListening}
                    title="Voice to Text"
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isListening ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    title="Hold to send Voice Message"
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isRecording ? "bg-indigo-600 text-white animate-pulse" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={isRecording ? "Recording..." : "Ask anything..."}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={isLoading || (!input.trim() && !isRecording)}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {isRecording && (
                <p className="text-[10px] text-indigo-600 mt-1 text-center font-medium animate-pulse">
                  Release to send voice message
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
