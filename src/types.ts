export type UserRole = 'admin' | 'staff' | 'parent' | 'student';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  studentId?: string; // For parents/students
  staffId?: string; // For staff
  campusId?: string; // For multi-campus/school isolation
  status: UserStatus;
  isSubscribed?: boolean;
  schoolId?: string; // Unique ID for the school
}

export interface SchoolApplication {
  id?: string;
  schoolName: string;
  adminName: string;
  email: string;
  phone: string;
  address: string;
  status: UserStatus;
  createdAt: string;
  paymentStatus: 'pending' | 'paid';
  plan: 'basic' | 'premium';
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
  // New fields
  contactPerson?: string;
  emergencyContact?: string;
  previousSchool?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  whatsappNumber?: string;
  caste?: string;
  busNumber?: string;
  route?: string;
  pickupPoint?: string;
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
  submittedPapers?: Record<string, string>; // Subject -> File URL
  examPaperIds?: Record<string, string>; // Subject -> ExamPaper ID
  totalMarks: number;
  percentage: number;
  grade: string;
  position: number;
  weightage?: number;
  campusId: string;
  updatedAt?: string;
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

export interface FeeType {
  id?: string;
  name: string;
  defaultAmount: number;
  defaultDueDate: string;
  campusId: string;
}

export interface FeeRecord {
  id?: string;
  studentId: string;
  feeTypeId: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  paidAmount: number;
  discountAmount?: number;
  discountReason?: string;
  waiverAmount?: number;
  waiverReason?: string;
  termOrYear: string;
  campusId: string;
}

export interface PaymentHistory {
  id?: string;
  feeRecordId: string;
  studentId: string;
  amount: number;
  date: string;
  method: 'cash' | 'online' | 'bank_transfer';
  transactionId?: string;
  campusId: string;
}

export interface Expense {
  id?: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  campusId: string;
  taxAmount?: number;
  invoiceNumber?: string;
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

export interface ExamType {
  id?: string;
  name: string;
  term: string;
  campusId: string;
}

export interface ExamPaper {
  id?: string;
  title: string;
  class: string;
  subject: string;
  date: string;
  duration: number; // in minutes
  examTypeId?: string;
  term?: string;
  questions: {
    question: string;
    options?: string[];
    answer?: string;
    type: 'mcq' | 'descriptive';
  }[];
  campusId: string;
}

export interface ExamSchedule {
  id?: string;
  examTypeId: string;
  class: string;
  subject: string;
  date: string;
  time: string;
  duration: number; // in minutes
  invigilatorIds: string[]; // staffIds
  roomNumber?: string;
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
  assignedToIds?: string[]; // array of staffIds or uids
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

export interface TransportVehicle {
  id?: string;
  vehicleNumber: string;
  capacity: number;
  driverName: string;
  driverContact: string;
  status: 'active' | 'maintenance' | 'inactive';
  campusId: string;
}

export interface TransportRoute {
  id?: string;
  routeName: string;
  vehicleId: string;
  stops: string[];
  campusId: string;
}

export interface Subject {
  id?: string;
  name: string;
  code: string;
  class: string;
  teacherId?: string;
  campusId: string;
}

export interface LeaveRequest {
  id?: string;
  staffId: string;
  staffName: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedOn: string;
  campusId: string;
}

export interface LeaveBalance {
  id?: string;
  staffId: string;
  sickLeave: number;
  casualLeave: number;
  paidLeave: number;
  campusId: string;
}

