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
  isTrial?: boolean;
  trialExpiresAt?: string;
}

export interface Campus {
  id?: string;
  name: string;
  location: string;
  contact: string;
  headOfCampusName?: string;
  headOfCampusContact?: string;
  schoolId?: string;
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
  schoolId?: string;
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
  schoolId?: string;
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
  schoolId?: string;
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
  schoolId?: string;
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
  schoolId?: string;
  updatedAt?: string;
}

export interface ExamSchedule {
  id?: string;
  examTypeId: string;
  class: string;
  subject: string;
  date: string;
  time: string;
  duration: number; // in minutes
  invigilatorIds: string[];
  roomNumber: string;
  campusId: string;
  schoolId?: string;
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
  schoolId?: string;
  taxAmount?: number;
}

export interface FeeType {
  id?: string;
  name: string;
  defaultAmount: number;
  defaultDueDate: string;
  campusId: string;
  schoolId?: string;
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
  schoolId?: string;
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
  schoolId?: string;
}

export interface Expense {
  id?: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  campusId: string;
  schoolId?: string;
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
  schoolId?: string;
}

export interface InventoryItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  details?: string;
  lastUpdated: string;
  campusId: string;
  schoolId?: string;
}

export interface Notice {
  id?: string;
  title: string;
  content: string;
  date: string;
  targetAudience: 'parents' | 'staff' | 'all' | 'students';
  campusId: string;
  schoolId?: string;
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
  schoolId?: string;
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
  schoolId?: string;
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
  schoolId?: string;
}

export interface ExamType {
  id?: string;
  name: string;
  term: string;
  campusId: string;
  schoolId?: string;
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
  schoolId?: string;
}

export interface DateSheetNote {
  id: string;
  text: string;
}

export interface DateSheetSignature {
  id: string;
  label: string;
  name: string;
  signatureUrl?: string; // Optional image upload
}

export interface DateSheetRow {
  id: string;
  date: string;
  day: string;
  subjects: Record<string, string>; // Maps ClassName -> SubjectName
}

export interface DateSheet {
  id?: string;
  title: string;
  subtitle?: string;
  classes: string[]; // List of class names for columns
  rows: DateSheetRow[];
  notes: DateSheetNote[];
  signatures: DateSheetSignature[];
  campusId: string;
  schoolId?: string;
  updatedAt: string;
}

export interface TimetablePeriod {
  id: string;
  name: string; // e.g., "Period 1" or "Class 10A"
  startTime?: string;
  endTime?: string;
  type?: 'period' | 'class';
}

export interface TimetableCell {
  subject: string;
  teacher: string;
  notes?: string;
}

export interface TimetableRow {
  id: string;
  date?: string; // Optional if using generic labels
  day?: string;  // Optional if using generic labels
  label?: string; // Generic row label (e.g., "Class 10A" or "Monday")
  cells: Record<string, TimetableCell>; // columnId -> cell data
}

export interface TimetableSignature {
  id: string;
  label: string;
  name: string;
  signatureUrl?: string;
}

export interface TimetableNote {
  id: string;
  text: string;
  isVisible: boolean;
}

export interface Timetable {
  id?: string;
  campusId: string;
  schoolId?: string;
  className: string; // "School Wide" or specific class
  mode: 'class-monthly' | 'school-daily' | 'custom';
  title: string;
  subtitle?: string;
  periods: TimetablePeriod[]; // These are columns
  rows: TimetableRow[];
  notes: TimetableNote[];
  signatures: TimetableSignature[];
  updatedAt: string;
  schoolInfo: {
    name: string;
    logo?: string;
  };
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
  schoolId?: string;
}

export interface SchoolEvent {
  id?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  campusId: string;
  schoolId?: string;
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
  schoolId?: string;
  createdAt: string;
  reminderDate?: string;
  reminderTime?: string;
}

export interface SchoolSettings {
  id?: string;
  schoolId?: string;
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
    showStudentCopy?: boolean;
    showSchoolCopy?: boolean;
    showBankCopy?: boolean;
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
  schoolId?: string;
}

export interface TransportRoute {
  id?: string;
  routeName: string;
  vehicleId: string;
  stops: string[];
  campusId: string;
  schoolId?: string;
}

export interface Subject {
  id?: string;
  name: string;
  code: string;
  class: string;
  teacherId?: string;
  campusId: string;
  schoolId?: string;
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
  schoolId?: string;
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
  schoolId?: string;
}

export interface LeaveBalance {
  id?: string;
  staffId: string;
  sickLeave: number;
  casualLeave: number;
  paidLeave: number;
  campusId: string;
  schoolId?: string;
}

export interface SubscriptionPlan {
  id?: string;
  name: 'basic' | 'premium';
  priceMonthly: number;
  priceYearly: number;
  features: string[];
}

export interface SchoolSubscription {
  id?: string;
  schoolId: string;
  planId: string;
  status: 'trial' | 'active' | 'expired';
  type: 'monthly' | 'yearly';
  startDate: string;
  expiryDate: string;
}

export type UserRole = 'admin' | 'staff' | 'parent' | 'student';

export interface SchoolWebsiteConfig {
  id?: string;
  campusId: string;
  schoolId?: string;
  slug: string;
  tagline: string;
  announcement: string;
  about: string;
  phone: string;
  whatsapp: string;
  email: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
  };
  coverPhotos: string[];
  spotlight: {
    heading: string;
    name: string;
    role: string;
    message: string;
    photoUrl?: string;
  };
  videos: {
    main: string;
    others: string[];
  };
  customLinks: {
    label: string;
    url: string;
  }[];
  updatedAt: string;
}

export interface PublicAdmission {
  id?: string;
  campusId: string;
  studentName: string;
  parentName: string;
  contact: string;
  whatsapp?: string;
  class: string;
  previousSchool?: string;
  address?: string;
  status: 'pending' | 'contacted' | 'admitted' | 'rejected';
  createdAt: string;
}

