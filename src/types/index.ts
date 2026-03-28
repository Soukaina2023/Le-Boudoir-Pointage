export type Lang = 'ar' | 'fr';

export type WorkStatus = 'idle' | 'working' | 'break' | 'done';

export type SpecialMode = 'normal' | 'ramadan' | 'halfDay';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Worker {
  id: string;
  name: string;
  nameFr?: string;
  role: string;
  roleFr?: string;
  pin: string;
  color: string;
  isAdmin: boolean;
}

export interface AuditEdit {
  ts: number;
  actor: string;
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
}

export interface TimeRecord {
  id: string;
  workerId: string;
  workerName: string;
  date: string;
  dateTs: number;
  startTs: number;
  endTs: number;
  breakMins: number;
  workMins: number;
  overtimeMins: number;
  notes: string;
  specialMode: SpecialMode;
  workerSig: boolean;
  managerSig: boolean;
  auditEdits: AuditEdit[];
}

export interface ActiveSession {
  status: WorkStatus;
  startTs?: number;
  breakStartTs?: number | null;
  totalBreakMins?: number;
  date?: string;
  lastRecord?: TimeRecord;
  specialMode?: SpecialMode;
}

export interface AppSettings {
  officialHoursPerDay: number;
  adminPin: string;
  language: Lang;
}

export interface AuditLogEntry {
  ts: number;
  actor: string;
  action: string;
}

export interface AppData {
  workers: Worker[];
  records: TimeRecord[];
  auditLog: AuditLogEntry[];
  settings: AppSettings;
  activeSessions: Record<string, ActiveSession>;
}

export interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

export interface Translations {
  appName: string;
  appSub: string;
  login: string;
  selectWorker: string;
  enterPin: string;
  loginBtn: string;
  dashboard: string;
  timeTracking: string;
  reports: string;
  workers: string;
  settings: string;
  history: string;
  logout: string;
  startWork: string;
  endWork: string;
  startBreak: string;
  endBreak: string;
  manualEntry: string;
  workStart: string;
  workEnd: string;
  breakDuration: string;
  notes: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  date: string;
  worker: string;
  checkIn: string;
  checkOut: string;
  break: string;
  workHours: string;
  overtime: string;
  /** Overtime before 20:00 (same day as shift start) */
  overtimeBefore8: string;
  /** Overtime at or after 20:00 */
  overtimeAfter8: string;
  /** Column: check-out after 20:00 */
  checkoutAfter8PM: string;
  totalHours: string;
  totalOvertime: string;
  month: string;
  year: string;
  export: string;
  exportPDF: string;
  exportExcel: string;
  todayStats: string;
  monthStats: string;
  currentStatus: string;
  working: string;
  onBreak: string;
  idle: string;
  done: string;
  todayHours: string;
  overtimeToday: string;
  workersCount: string;
  activeWorkers: string;
  addWorker: string;
  /** Modal title: edit employee details (Responsable only) */
  editWorker: string;
  workerName: string;
  workerRole: string;
  workerPin: string;
  adminPin: string;
  officialHours: string;
  hoursPerDay: string;
  filterMonth: string;
  allWorkers: string;
  noRecords: string;
  noRecordsDesc: string;
  addFirst: string;
  workerSignature: string;
  managerSignature: string;
  signHere: string;
  auditLog: string;
  modifiedBy: string;
  originalValue: string;
  newValue: string;
  totalWorkingDays: string;
  avgDailyHours: string;
  deleteConfirm: string;
  editRecord: string;
  specialMode: string;
  normal: string;
  ramadan: string;
  halfDay: string;
  hr: string;
  min: string;
  mins: string;
  of: string;
  signedWorker: string;
  signedManager: string;
  notSigned: string;
  performance: string;
  errorFillFields: string;
  errorEndBeforeStart: string;
  savedSuccess: string;
  deletedSuccess: string;
  updatedSuccess: string;
  workerAdded: string;
  workerDeleted: string;
  loginError: string;
  alreadyStarted: string;
  alreadyEnded: string;
  alreadyOnBreak: string;
  notOnBreak: string;
  notStarted: string;
  forgotCheckout: string;
  mins_break: string;
  totalRecords: string;
  language: string;
  arabic: string;
  french: string;
  workerColor: string;
  adminAccess: string;
  adminLoginTitle: string;
  viewAll: string;
  thisMonth: string;
  h: string;
  m: string;
  /** Manager Pointage: pick employee then use start/end/break buttons (no manual entry) */
  managerPointageHint: string;
}
