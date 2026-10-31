export type TaskStatus = 'backlog' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string;
  tags: string[];
  estimatedHours: number;
  loggedHours: number;
  subtasks: Subtask[];
  createdAt: string;
  sprintId: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarUrl: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'planning' | 'completed';
}

export interface DocNote {
  id: string;
  title: string;
  content: string;
  category: 'architecture' | 'spec' | 'retrospective' | 'guidelines';
  updatedAt: string;
  tags: string[];
  pinned?: boolean;
}

export interface TimeLog {
  id: string;
  taskId: string;
  taskTitle: string;
  durationMinutes: number;
  timestamp: string;
  notes?: string;
}

export type ViewMode = 'board' | 'roadmap' | 'analytics' | 'docs' | 'focus';
