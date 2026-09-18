export type UserRole = "student" | "teacher" | "admin";

export type ActiveView = 
  | "dashboard" 
  | "student" 
  | "teacher" 
  | "room" 
  | "grid" 
  | "table" 
  | "review" 
  | "pdf";

export interface TimetableEntry {
  id: string;
  timetableId?: string;
  day: string;
  startTime: string;
  endTime: string;
  time: string;
  subject: string;
  courseCode?: string;
  teacher: string;
  room: string;
  className: string;        // Full original e.g. BS SE Semester 3 Self Support 2 (2025-2029)
  displayName?: string;
  program: string;
  year?: string;
  semester?: string;
  section?: string;
  shift?: string;
  batch?: string;
  department?: string;
  sourcePage?: number;
  rawText?: string;
  confidence?: number;
  hasConflict?: boolean;
  needsReview?: boolean;
  conflictNote?: string;
  durationHours?: number;
}

export interface ConflictItem {
  type: "TEACHER_CONFLICT" | "ROOM_CONFLICT";
  teacher?: string;
  room?: string;
  day: string;
  description: string;
  entryIds: string[];
}

export interface TimetableStats {
  totalEntries: number;
  classesCount?: number;
  programsCount: number;
  teachersCount: number;
  roomsCount: number;
  subjectsCount: number;
  daysCount: number;
  conflictsCount: number;
  reviewNeededCount: number;
  totalHours: number;
  dayDistribution?: Record<string, number>;
  classes?: string[];
  programs?: string[];
  teachers?: string[];
  rooms?: string[];
  subjects?: string[];
  days?: string[];
}

export interface TimetableDoc {
  id: string;
  filename: string;
  originalName: string;
  uploadDate: string;
  isActive: boolean;
  pageCount: number;
  entries: TimetableEntry[];
  stats: TimetableStats;
  conflicts: ConflictItem[];
}

export interface TimetableSummary {
  id: string;
  filename: string;
  originalName: string;
  uploadDate: string;
  isActive: boolean;
  pageCount: number;
  entryCount: number;
}
