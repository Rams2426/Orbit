export type PersonaType = 'designer' | 'student';
export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'todo' | 'in_progress' | 'done';
export type ViewMode = 'home' | 'calendar' | 'tasks' | 'team' | 'list' | 'month' | 'week';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'red';
export type TextSize = 'small' | 'medium' | 'large';
export type WeekStart = 'monday' | 'sunday';
export type TimeFormat = '12h' | '24h';
export type ReminderTime = '1h' | '1d' | '2d';

export type TeamRole = 'owner' | 'admin' | 'member';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  personas: PersonaType[];
  activePairId: string | null;
  activeTeamId?: string | null;
  preferredView: ViewMode;
  notificationsEnabled?: boolean;
  theme?: ThemeMode;
  accentColor?: AccentColor;
  textSize?: TextSize;
  weekStart?: WeekStart;
  timeFormat?: TimeFormat;
  reminderTime?: ReminderTime;
  createdAt: string;
  updatedAt: string;
}

export interface Pair {
  id: string;
  bossUid: string;
  freelancerUid: string | null;
  bossEmail: string;
  freelancerEmail: string | null;
  status: 'pending' | 'active';
  createdAt: string;
  pairedAt: string | null;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type?: string;
  storagePath?: string;
  isLink?: boolean;
  uploadedBy: string;
  uploadedByUid?: string;
  uploadedAt: string;
}

export interface TaskComment {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  text: string;
  createdAt: string;
}

export interface TaskActivity {
  id: string;
  userId?: string;
  userName?: string;
  performedBy?: string;
  action: string;
  timestamp: string;
}

export interface TeamMember {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: TeamRole;
  joinedAt: string;
  status?: 'active' | 'pending_approval';
}

export interface Team {
  id: string;
  name: string;
  ownerUid: string;
  ownerEmail?: string;
  requireApproval?: boolean;
  memberCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  createdByUid: string;
  createdAt: string;
  expiresAt: string;
  used?: boolean;
  revoked?: boolean;
  invitedEmail?: string;
  role?: TeamRole;
  accepted?: boolean;
}

export interface Task {
  id: string;
  userId: string;
  pairId?: string;
  teamId?: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm (24h format e.g. "14:30")
  priority: Priority;
  notes: string;
  description?: string;
  brief?: string;
  caption?: string;
  brand?: string;
  contentType?: string;
  domain: PersonaType;
  status: TaskStatus;
  assigneeUid?: string;
  assigneeName?: string;
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  activityLog?: TaskActivity[];
  createdBy: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invite {
  id: string;
  pairId: string;
  bossUid: string;
  bossEmail: string;
  targetEmail: string | null;
  expiresAt: string;
  accepted: boolean;
  acceptedByUid: string | null;
  createdAt: string;
}
