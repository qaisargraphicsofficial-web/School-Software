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
  useTransport?: boolean;
}

export interface Staff {
  id?: string;
  name: string;
  staffId: string;
  role: string;
  photoUrl?: string;
  whatsappNumber?: string;
  secondaryContact?: string;
  salary: number;
  joiningDate: string;
  leavingDate?: string;
  classIncharge?: string;
  totalSalaryReceived?: number;
  remainingDues?: number;
  status: 'active' | 'inactive';
  campusId: string;
  bankAccount?: string;
  bankDetails?: {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
  };
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

export interface SubjectMark {
  subjectName: string;
  maxMarks: number;
  passMarks: number;
  obtainedMarks: number;
}

export interface TermData {
  termName: string;
  weightage: number; // e.g., 0.3 for 30%
  subjects: SubjectMark[];
}

export interface ReportCard {
  id?: string;
  studentId: string;
  academicSession: string;
  terms: TermData[];
  overallRemarks?: string;
  campusId: string;
  createdAt: string;
}

export interface ExamResult {
  id?: string;
  studentId: string;
  examTypeId: string;
  class: string;
  section: string;
  marks: Record<string, { obtained: number; total: number; pass: number }>;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string;
  remarks?: string;
  position?: number;
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
  feeType?: string;
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
  details?: string;
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
  studentName: string;
  parentName?: string;
  type: 'achievement' | 'completion' | 'participation' | 'excellence' | 'custom';
  title: string;
  subTitle: string;
  date: string;
  content: string;
  signature1Label: string;
  signature2Label: string;
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
  template: 'formal' | 'minimal' | 'board';
  schoolName: string;
  class: string;
  subject: string;
  date: string;
  time: string;
  duration: number; // in minutes
  totalMarks: number;
  examTypeId?: string;
  term?: string;
  sections: {
    id: string;
    title: string;
    questions: {
      id: string;
      question: string;
      marks: number;
      options?: string[];
      answer?: string;
      type: 'multiple_choice' | 'short_answer' | 'long_answer' | 'fill_in_blank' | 'true_false';
      difficulty: 'Easy' | 'Medium' | 'Hard';
    }[];
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
  bankAccountDetails?: string;
  customPaymentNote?: string;
  voucherSettings?: {
    vouchersPerPage: number;
    fontFamily: string;
    bankAccounts: {
      bankName: string;
      accountTitle: string;
      accountNumber: string;
      logo?: string;
    }[];
    customNote: string;
  };
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

export interface ClassSection {
  id: string;
  name: string;
  teacherIds: string[];
}

export interface ClassGroup {
  id?: string;
  className: string;
  sections: ClassSection[];
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

