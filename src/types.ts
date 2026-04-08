export type UserRole = 'admin' | 'staff' | 'parent' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  studentId?: string; // For parents/students
  staffId?: string; // For staff
  campusId?: string; // For multi-campus
}

export interface Campus {
  id?: string;
  name: string;
  location: string;
  contact: string;
}

export interface Student {
  id?: string;
  name: string;
  rollNumber: string;
  class: string;
  section: string;
  photoUrl?: string;
  parentName: string;
  contact: string;
  email?: string; // Parent email
  address: string;
  admissionDate: string;
  status: 'active' | 'inactive';
  campusId: string;
}

export interface Staff {
  id?: string;
  name: string;
  staffId: string;
  role: string;
  photoUrl?: string;
  contact: string;
  salary: number;
  joiningDate: string;
  leavingDate?: string;
  classIncharge?: string;
  totalSalaryReceived?: number;
  remainingDues?: number;
  status: 'active' | 'inactive';
  campusId: string;
}

export interface Attendance {
  id?: string;
  date: string;
  targetId: string;
  targetType: 'student' | 'staff';
  status: 'present' | 'absent' | 'late';
  campusId: string;
  method?: 'manual' | 'qr';
}

export interface ExamResult {
  id?: string;
  studentId: string;
  examType: string;
  term: string; // e.g., 'First Term', 'Mid Term', 'Final Term'
  marks: Record<string, number>;
  totalMarks: number;
  percentage: number;
  grade: string;
  position: number;
  campusId: string;
}

export interface Fee {
  id?: string;
  studentId: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending';
  receiptNumber?: string;
  campusId: string;
  taxAmount?: number;
}

export interface Expense {
  id?: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  campusId: string;
  taxAmount?: number;
}

export interface Payroll {
  id?: string;
  staffId: string;
  amount: number; // Gross salary
  deductions: number;
  netPay: number;
  month: string; // e.g., '2026-04'
  paymentDate: string;
  paymentMethod: 'bank' | 'mobile';
  accountDetails: string;
  status: 'pending' | 'paid';
  campusId: string;
}

export interface InventoryItem {
  id?: string;
  name: string;
  quantity: number;
  category: string;
  lastUpdated: string;
  campusId: string;
}

export interface Notice {
  id?: string;
  title: string;
  content: string;
  date: string;
  targetAudience: 'parents' | 'staff' | 'all' | 'students';
  campusId: string;
}

export interface BulkMessage {
  id?: string;
  subject: string;
  content: string;
  type: 'email' | 'whatsapp' | 'sms';
  targetClass?: string; // 'All' or specific class
  date: string;
  recipientsCount: number;
  status: 'sent' | 'failed';
  campusId: string;
}

export interface Syllabus {
  id?: string;
  class: string;
  subject: string;
  term: string;
  content: string;
  fileUrl?: string;
  linkedExams?: string[];
  campusId: string;
}

export interface DailyDiary {
  id?: string;
  date: string;
  class: string;
  section: string;
  subject: string;
  homework: string;
  campusId: string;
}

export interface Certificate {
  id?: string;
  studentId: string;
  type: 'achievement' | 'completion' | 'participation';
  date: string;
  content: string;
  campusId: string;
}

export interface ExamPaper {
  id?: string;
  title: string;
  class: string;
  subject: string;
  date: string;
  duration: number; // in minutes
  questions: {
    question: string;
    options?: string[];
    answer?: string;
    type: 'mcq' | 'descriptive';
  }[];
  campusId: string;
}

export interface LibraryLoan {
  id?: string;
  studentId: string;
  bookTitle: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
  campusId: string;
}

export interface SchoolEvent {
  id?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  campusId: string;
}

export interface Task {
  id?: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo?: string; // staffId or uid
  createdBy: string; // uid
  campusId: string;
  createdAt: string;
  reminderDate?: string;
  reminderTime?: string;
}

export interface SchoolSettings {
  id?: string;
  schoolName: string;
  schoolAddress: string;
  schoolContact: string;
  schoolEmail: string;
  academicYear: string;
  defaultAdmissionYear: string;
  academicSession: string;
  currency: string;
  timezone: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  staffPermissions: Record<string, string[]>;
  expenseCategories: string[];
  enableNotifications: boolean;
  allowParentRegistration: boolean;
  maintenanceMode: boolean;
  logoUrl?: string;
  updatedAt: string;
}
