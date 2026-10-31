import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  handleFirestoreError,
  OperationType,
  removeUndefinedFields,
} from '../lib/firebase';
import {
  UserProfile,
  Pair,
  Task,
  Invite,
  PersonaType,
  ViewMode,
  UserRole,
  ThemeMode,
  AccentColor,
  TextSize,
  WeekStart,
  TimeFormat,
  ReminderTime,
  Team,
  TeamMember,
  TeamInvite,
  TeamRole,
  AppNavTab,
  TaskAttachment,
  TaskComment,
  TaskActivity,
  TaskStatus,
} from '../types/orbit';
import {
  sendBrowserNotification,
  getNotifiedTaskIds,
  markTaskAsNotified,
  requestNotificationPermission,
  isNotificationSupported,
} from '../utils/notifications';
import { deleteFileFromStorage, deleteAllTaskStorageFiles } from '../utils/attachments';

export const ACCENT_PALETTES: Record<
  AccentColor,
  { label: string; primary: string; hover: string; light: string; text: string; ringColor: string }
> = {
  purple: { label: 'Purple', primary: '#534AB7', hover: '#433B9B', light: '#EEEDFE', text: '#534AB7', ringColor: 'ring-[#534AB7]' },
  blue: { label: 'Blue', primary: '#2563EB', hover: '#1D4ED8', light: '#EFF6FF', text: '#2563EB', ringColor: 'ring-[#2563EB]' },
  green: { label: 'Green', primary: '#16A34A', hover: '#15803D', light: '#F0FDF4', text: '#16A34A', ringColor: 'ring-[#16A34A]' },
  orange: { label: 'Orange', primary: '#EA580C', hover: '#C2410C', light: '#FFF7ED', text: '#EA580C', ringColor: 'ring-[#EA580C]' },
  pink: { label: 'Pink', primary: '#DB2777', hover: '#BE185D', light: '#FDF2F8', text: '#DB2777', ringColor: 'ring-[#DB2777]' },
  red: { label: 'Red', primary: '#DC2626', hover: '#B91C1C', light: '#FEF2F2', text: '#DC2626', ringColor: 'ring-[#DC2626]' },
};

interface PendingDelete {
  tasks: Task[];
  timer: NodeJS.Timeout;
  pathGetter: (t: Task) => string;
}

interface OrbitContextValue {
  currentUser: User | null;
  userProfile: UserProfile | null;
  activePair: Pair | null;
  role: UserRole | null;
  tasks: Task[];
  soloTasks: Task[];
  teamTasks: Task[];
  loadingAuth: boolean;
  loadingData: boolean;
  needsOnboarding: boolean;
  notificationPermission: NotificationPermission;
  activeAlertTask: Task | null;
  dismissAlertTask: () => void;
  enableNotifications: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (personas: PersonaType[]) => Promise<void>;
  updatePersonas: (personas: PersonaType[]) => Promise<void>;
  updatePreferredView: (view: ViewMode) => Promise<void>;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  weekStart: WeekStart;
  setWeekStart: (start: WeekStart) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (fmt: TimeFormat) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  reminderTime: ReminderTime;
  setReminderTime: (time: ReminderTime) => void;

  // Navigation & Modal states
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  selectedTaskForDetail: Task | null;
  setSelectedTaskForDetail: (task: Task | null) => void;
  selectedTaskToEdit: Task | null;
  setSelectedTaskToEdit: (task: Task | null) => void;
  isNewTaskModalOpen: boolean;
  setIsNewTaskModalOpen: (open: boolean) => void;
  modalDefaultDueDate?: string;
  setModalDefaultDueDate: (date?: string) => void;

  // Task CRUD & Detail Actions
  createTask: (taskData: Omit<Task, 'id' | 'userId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'completedAt'> & { id?: string; isSharedPairTask?: boolean; isTeamTask?: boolean }) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  toggleTaskDone: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  deleteTaskWithUndo: (taskId: string) => void;
  deleteMultipleTasksWithUndo: (taskIds: string[]) => void;
  undoDelete: () => void;
  duplicateTask: (task: Task) => Promise<void>;
  addCommentToTask: (taskId: string, text: string) => Promise<void>;
  addAttachmentToTask: (taskId: string, attachment: Omit<TaskAttachment, 'id' | 'uploadedAt' | 'uploadedBy'>) => Promise<void>;
  deleteAttachmentFromTask: (taskId: string, attachmentId: string) => Promise<void>;

  // Team Space
  team: Team | null;
  teamMembers: TeamMember[];
  userTeamRole: TeamRole | null;
  createTeam: (name: string, requireApproval?: boolean) => Promise<Team>;
  generateTeamInvite: () => Promise<TeamInvite>;
  revokeTeamInvite: (inviteId: string) => Promise<void>;
  joinTeam: (inviteId: string) => Promise<{ success: boolean; message: string }>;
  leaveTeam: () => Promise<void>;
  removeTeamMember: (memberUid: string) => Promise<void>;
  updateTeamMemberRole: (memberUid: string, role: TeamRole) => Promise<void>;
  updateTeamName: (name: string) => Promise<void>;

  // Pairs & Invites (Solo/Pair 1:1)
  createPairAsBoss: () => Promise<string>;
  generateInvite: (pairId: string) => Promise<Invite>;
  acceptInvite: (inviteId: string) => Promise<{ success: boolean; message: string }>;

  // Toast
  toast: { message: string; type: 'success' | 'error'; undoAction?: () => void } | null;
  showToast: (message: string, type?: 'success' | 'error', undoAction?: () => void) => void;
  dismissToast: () => void;
}

const OrbitContext = createContext<OrbitContextValue | null>(null);

export const OrbitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activePair, setActivePair] = useState<Pair | null>(null);
  const [soloTasks, setSoloTasks] = useState<Task[]>([]);
  const [pairTasks, setPairTasks] = useState<Task[]>([]);
  const [teamTasks, setTeamTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [activeAlertTask, setActiveAlertTask] = useState<Task | null>(null);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<AppNavTab>('home');
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [modalDefaultDueDate, setModalDefaultDueDate] = useState<string | undefined>(undefined);

  // Undo delete queue
  const pendingDeleteRef = useRef<PendingDelete | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; undoAction?: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success', undoAction?: () => void) => {
    setToast({ message, type, undoAction });
  };

  const dismissToast = () => {
    setToast(null);
  };

  // Auto-dismiss toast after 5s unless user clicks undo
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Preference States with immediate localStorage read
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('orbit_theme_mode') as ThemeMode) || 'system';
  });
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    return (localStorage.getItem('orbit_accent_color') as AccentColor) || 'purple';
  });
  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    return (localStorage.getItem('orbit_text_size') as TextSize) || 'medium';
  });
  const [weekStart, setWeekStartState] = useState<WeekStart>(() => {
    return (localStorage.getItem('orbit_week_start') as WeekStart) || 'monday';
  });
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(() => {
    return (localStorage.getItem('orbit_time_format') as TimeFormat) || '12h';
  });
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('orbit_notifs_enabled') !== 'false';
  });
  const [reminderTime, setReminderTimeState] = useState<ReminderTime>(() => {
    return (localStorage.getItem('orbit_reminder_time') as ReminderTime) || '1h';
  });

  // Apply Theme Mode (System / Dark / Light)
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [theme]);

  // Apply Accent Color Variable
  useEffect(() => {
    const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.purple;
    const root = document.documentElement;
    root.style.setProperty('--orbit-accent', palette.primary);
    root.style.setProperty('--orbit-accent-hover', palette.hover);
    root.style.setProperty('--orbit-accent-light', palette.light);
  }, [accentColor]);

  // Apply Text Size Root Scale
  useEffect(() => {
    const root = document.documentElement;
    if (textSize === 'small') {
      root.style.fontSize = '14px';
    } else if (textSize === 'large') {
      root.style.fontSize = '17px';
    } else {
      root.style.fontSize = '15px';
    }
  }, [textSize]);

  // Check Notification Permission on mount
  useEffect(() => {
    if (isNotificationSupported()) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
      if (!user) {
        setUserProfile(null);
        setActivePair(null);
        setSoloTasks([]);
        setPairTasks([]);
        setTeamTasks([]);
        setTeam(null);
        setTeamMembers([]);
        setLoadingData(false);
        setNeedsOnboarding(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Profile Listener
  useEffect(() => {
    if (!currentUser) return;

    setLoadingData(true);
    const userDocRef = doc(db, 'users', currentUser.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as UserProfile;
          setUserProfile(data);
          setNeedsOnboarding(!data.personas || data.personas.length === 0);
          if (data.theme) {
            setThemeState(data.theme);
            localStorage.setItem('orbit_theme_mode', data.theme);
          }
          if (data.accentColor) {
            setAccentColorState(data.accentColor);
            localStorage.setItem('orbit_accent_color', data.accentColor);
          }
          if (data.textSize) {
            setTextSizeState(data.textSize);
            localStorage.setItem('orbit_text_size', data.textSize);
          }
          if (data.weekStart) {
            setWeekStartState(data.weekStart);
            localStorage.setItem('orbit_week_start', data.weekStart);
          }
          if (data.timeFormat) {
            setTimeFormatState(data.timeFormat);
            localStorage.setItem('orbit_time_format', data.timeFormat);
          }
          if (data.notificationsEnabled !== undefined) {
            setNotificationsEnabledState(data.notificationsEnabled);
            localStorage.setItem('orbit_notifs_enabled', String(data.notificationsEnabled));
          }
          if (data.reminderTime) {
            setReminderTimeState(data.reminderTime);
            localStorage.setItem('orbit_reminder_time', data.reminderTime);
          }
        } else {
          setUserProfile(null);
          setNeedsOnboarding(true);
        }
        setLoadingData(false);
      },
      (err) => {
        setLoadingData(false);
        handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 3. Solo Tasks Listener
  useEffect(() => {
    if (!currentUser) {
      setSoloTasks([]);
      return;
    }

    const soloColRef = collection(db, 'users', currentUser.uid, 'tasks');
    const unsubscribe = onSnapshot(
      soloColRef,
      (snapshot) => {
        const tasksArr: Task[] = [];
        snapshot.forEach((docSnap) => {
          tasksArr.push(docSnap.data() as Task);
        });
        setSoloTasks(tasksArr);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/tasks`);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 4. Collaborative Pair Tasks Listener (if active pair exists)
  useEffect(() => {
    if (!currentUser || !userProfile?.activePairId) {
      setActivePair(null);
      setPairTasks([]);
      return;
    }

    const pairDocRef = doc(db, 'pairs', userProfile.activePairId);
    const unsubPair = onSnapshot(
      pairDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setActivePair(snapshot.data() as Pair);
        } else {
          setActivePair(null);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `pairs/${userProfile.activePairId}`);
      }
    );

    const pairTasksColRef = collection(db, 'pairs', userProfile.activePairId, 'tasks');
    const unsubTasks = onSnapshot(
      pairTasksColRef,
      (snapshot) => {
        const fetchedTasks: Task[] = [];
        snapshot.forEach((docSnap) => {
          fetchedTasks.push(docSnap.data() as Task);
        });
        setPairTasks(fetchedTasks);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `pairs/${userProfile.activePairId}/tasks`);
      }
    );

    return () => {
      unsubPair();
      unsubTasks();
    };
  }, [currentUser, userProfile?.activePairId]);

  // 5. Team Space Listener (if activeTeamId exists)
  useEffect(() => {
    if (!currentUser || !userProfile?.activeTeamId) {
      setTeam(null);
      setTeamMembers([]);
      setTeamTasks([]);
      return;
    }

    const teamId = userProfile.activeTeamId;

    // Team Document
    const teamDocRef = doc(db, 'teams', teamId);
    const unsubTeam = onSnapshot(teamDocRef, (snap) => {
      if (snap.exists()) {
        setTeam(snap.data() as Team);
      } else {
        setTeam(null);
      }
    });

    // Team Members
    const membersColRef = collection(db, 'teams', teamId, 'members');
    const unsubMembers = onSnapshot(membersColRef, (snap) => {
      const mems: TeamMember[] = [];
      snap.forEach((d) => mems.push(d.data() as TeamMember));
      setTeamMembers(mems);
    });

    // Team Tasks
    const teamTasksColRef = collection(db, 'teams', teamId, 'tasks');
    const unsubTasks = onSnapshot(teamTasksColRef, (snap) => {
      const ttasks: Task[] = [];
      snap.forEach((d) => ttasks.push(d.data() as Task));
      setTeamTasks(ttasks);
    });

    return () => {
      unsubTeam();
      unsubMembers();
      unsubTasks();
    };
  }, [currentUser, userProfile?.activeTeamId]);

  // Combined tasks list (solo + pair + team)
  const allTasks = useMemo(
    () => [...soloTasks, ...pairTasks, ...teamTasks],
    [soloTasks, pairTasks, teamTasks]
  );

  // Keep selectedTaskForDetail in sync with latest updates
  useEffect(() => {
    if (selectedTaskForDetail) {
      const updated = allTasks.find((t) => t.id === selectedTaskForDetail.id);
      if (updated) {
        setSelectedTaskForDetail(updated);
      }
    }
  }, [allTasks]);

  // User Team Role
  const userTeamRole: TeamRole | null = teamMembers.find((m) => m.uid === currentUser?.uid)?.role || null;

  // Deadline Alerts Engine
  useEffect(() => {
    if (!notificationsEnabled || allTasks.length === 0) {
      setActiveAlertTask((prev) => (prev === null ? prev : null));
      return;
    }

    const checkUpcoming = () => {
      const now = Date.now();
      let alertTaskFound: Task | null = null;

      for (const t of allTasks) {
        if (t.status === 'done') continue;
        const dueTimestamp = new Date(`${t.dueDate}T${t.dueTime || '23:59'}`).getTime();
        const diff = dueTimestamp - now;

        if (diff > 0 && diff <= 60 * 60 * 1000) {
          alertTaskFound = t;
          break;
        }
      }

      setActiveAlertTask((prev) =>
        (prev?.id || null) === (alertTaskFound?.id || null) ? prev : alertTaskFound
      );

      let windowMs = 60 * 60 * 1000;
      if (reminderTime === '1d') windowMs = 24 * 60 * 60 * 1000;
      if (reminderTime === '2d') windowMs = 48 * 60 * 60 * 1000;

      const notifiedSet = getNotifiedTaskIds();

      allTasks.forEach((t) => {
        if (t.status === 'done') return;
        const dueTimestamp = new Date(`${t.dueDate}T${t.dueTime || '23:59'}`).getTime();
        const diff = dueTimestamp - now;

        if (diff > 0 && diff <= windowMs) {
          if (!notifiedSet.has(t.id)) {
            sendBrowserNotification(t);
            markTaskAsNotified(t.id);
          }
        }
      });
    };

    checkUpcoming();
    const interval = setInterval(checkUpcoming, 30000);
    return () => clearInterval(interval);
  }, [allTasks, notificationsEnabled, reminderTime]);

  const role: UserRole | null = activePair && currentUser
    ? activePair.bossUid === currentUser.uid
      ? 'boss'
      : activePair.freelancerUid === currentUser.uid
      ? 'freelancer'
      : null
    : null;

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign Out failed:', err);
    }
  };

  const completeOnboarding = async (personas: PersonaType[]) => {
    if (!currentUser) return;
    const defaultView: ViewMode = 'home';
    const now = new Date().toISOString();

    const newProfile: UserProfile = {
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: currentUser.displayName || 'Orbit User',
      photoURL: currentUser.photoURL || undefined,
      personas,
      activePairId: null,
      activeTeamId: null,
      preferredView: defaultView,
      notificationsEnabled: true,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'users', currentUser.uid), newProfile);
      setUserProfile(newProfile);
      setNeedsOnboarding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  };

  const updatePersonas = async (personas: PersonaType[]) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        personas,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const updatePreferredView = async (preferredView: ViewMode) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        preferredView,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('orbit_theme_mode', newTheme);
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        theme: newTheme,
        updatedAt: new Date().toISOString(),
      }).catch(console.error);
    }
  };

  const setAccentColor = (newColor: AccentColor) => {
    setAccentColorState(newColor);
    localStorage.setItem('orbit_accent_color', newColor);
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        accentColor: newColor,
        updatedAt: new Date().toISOString(),
      }).catch(console.error);
    }
  };

  const setTextSize = (newSize: TextSize) => {
    setTextSizeState(newSize);
    localStorage.setItem('orbit_text_size', newSize);
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        textSize: newSize,
        updatedAt: new Date().toISOString(),
      }).catch(console.error);
    }
  };

  const setWeekStart = (newStart: WeekStart) => {
    setWeekStartState(newStart);
    localStorage.setItem('orbit_week_start', newStart);
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        weekStart: newStart,
        updatedAt: new Date().toISOString(),
      }).catch(console.error);
    }
  };

  const setTimeFormat = (newFmt: TimeFormat) => {
    setTimeFormatState(newFmt);
    localStorage.setItem('orbit_time_format', newFmt);
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        timeFormat: newFmt,
        updatedAt: new Date().toISOString(),
      }).catch(console.error);
    }
  };

  const setNotificationsEnabled = (enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    localStorage.setItem('orbit_notifs_enabled', String(enabled));
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        notificationsEnabled: enabled,
        updatedAt: new Date().toISOString(),
      }).catch(console.error);
    }
  };

  const setReminderTime = (time: ReminderTime) => {
    setReminderTimeState(time);
    localStorage.setItem('orbit_reminder_time', time);
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        reminderTime: time,
        updatedAt: new Date().toISOString(),
      }).catch(console.error);
    }
  };

  const enableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      setNotificationsEnabled(true);
      showToast('1-hour deadline browser notifications enabled', 'success');
    }
  };

  const dismissAlertTask = () => {
    setActiveAlertTask(null);
  };

  // Helper to determine task storage path
  const getTaskPath = (t: Task): string => {
    if (t.teamId) {
      return `teams/${t.teamId}/tasks/${t.id}`;
    }
    if (t.pairId && activePair) {
      return `pairs/${t.pairId}/tasks/${t.id}`;
    }
    return `users/${currentUser?.uid || t.userId}/tasks/${t.id}`;
  };

  // Create Task
  const createTask = async (
    taskData: Omit<Task, 'id' | 'userId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'completedAt'> & {
      id?: string;
      isSharedPairTask?: boolean;
      isTeamTask?: boolean;
    }
  ): Promise<Task> => {
    if (!currentUser) throw new Error('Must be signed in to create tasks');

    const taskId = taskData.id || `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const isShared = Boolean(taskData.isSharedPairTask && activePair && role === 'boss');
    const isTeam = Boolean(taskData.isTeamTask && userProfile?.activeTeamId);

    const taskFields: Record<string, any> = {
      id: taskId,
      title: taskData.title.trim(),
      dueDate: taskData.dueDate,
      dueTime: taskData.dueTime,
      priority: taskData.priority || 'medium',
      domain: taskData.domain || 'designer',
      status: taskData.status || 'todo',
      createdBy: currentUser.uid,
      userId: currentUser.uid,
      notes: taskData.notes?.trim() || '',
      description: taskData.description?.trim() || '',
      brief: taskData.brief?.trim() || '',
      caption: taskData.caption?.trim() || '',
      attachments: taskData.attachments || [],
      comments: taskData.comments || [],
      activityLog: [
        {
          id: `act_${Date.now()}`,
          action: 'Created task',
          performedBy: currentUser.displayName || currentUser.email || 'User',
          timestamp: now,
        },
      ],
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (taskData.brand && taskData.brand.trim()) {
      taskFields.brand = taskData.brand.trim();
    }
    if (taskData.contentType && taskData.contentType.trim()) {
      taskFields.contentType = taskData.contentType.trim();
    }
    if (isShared && activePair) {
      taskFields.pairId = activePair.id;
    }
    if (isTeam && userProfile?.activeTeamId) {
      taskFields.teamId = userProfile.activeTeamId;
      if (taskData.assigneeUid) {
        taskFields.assigneeUid = taskData.assigneeUid;
        taskFields.assigneeName = taskData.assigneeName || 'Team member';
      }
    }

    const newTask = removeUndefinedFields(taskFields) as Task;

    // Optimistic local update
    if (isTeam) {
      setTeamTasks((prev) => [newTask, ...prev.filter((t) => t.id !== taskId)]);
    } else if (isShared) {
      setPairTasks((prev) => [newTask, ...prev.filter((t) => t.id !== taskId)]);
    } else {
      setSoloTasks((prev) => [newTask, ...prev.filter((t) => t.id !== taskId)]);
    }

    const path = isTeam
      ? `teams/${userProfile?.activeTeamId}/tasks/${taskId}`
      : isShared
      ? `pairs/${activePair!.id}/tasks/${taskId}`
      : `users/${currentUser.uid}/tasks/${taskId}`;

    try {
      await setDoc(doc(db, path), newTask);
      showToast(`Saved "${newTask.title}" to schedule`, 'success');
      return newTask;
    } catch (err) {
      // Revert optimistic update
      if (isTeam) {
        setTeamTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else if (isShared) {
        setPairTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else {
        setSoloTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  // Update Task
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!currentUser) throw new Error('Must be signed in to update tasks');

    const target = allTasks.find((t) => t.id === taskId);
    if (!target) return;

    const path = getTaskPath(target);
    const now = new Date().toISOString();

    const cleanUpdates: Record<string, any> = {
      ...updates,
      updatedAt: now,
    };

    if (cleanUpdates.title !== undefined) cleanUpdates.title = cleanUpdates.title.trim();
    if (cleanUpdates.notes !== undefined) cleanUpdates.notes = cleanUpdates.notes.trim();
    if (cleanUpdates.description !== undefined) cleanUpdates.description = cleanUpdates.description.trim();
    if (cleanUpdates.brief !== undefined) cleanUpdates.brief = cleanUpdates.brief.trim();
    if (cleanUpdates.caption !== undefined) cleanUpdates.caption = cleanUpdates.caption.trim();

    if (cleanUpdates.brand !== undefined) {
      if (cleanUpdates.brand?.trim()) cleanUpdates.brand = cleanUpdates.brand.trim();
      else delete cleanUpdates.brand;
    }
    if (cleanUpdates.contentType !== undefined) {
      if (cleanUpdates.contentType?.trim()) cleanUpdates.contentType = cleanUpdates.contentType.trim();
      else delete cleanUpdates.contentType;
    }

    const sanitized = removeUndefinedFields(cleanUpdates);

    // Optimistic update
    const updater = (prev: Task[]) => prev.map((t) => (t.id === taskId ? { ...t, ...sanitized } : t));
    if (target.teamId) setTeamTasks(updater);
    else if (target.pairId) setPairTasks(updater);
    else setSoloTasks(updater);

    try {
      await updateDoc(doc(db, path), sanitized);
      showToast('Changes saved', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  // Toggle Task Done
  const toggleTaskDone = async (taskId: string) => {
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;

    const isDone = task.status === 'done';
    const nextStatus: TaskStatus = isDone ? 'todo' : 'done';
    const completedAt = isDone ? null : new Date().toISOString();

    const activity: TaskActivity = {
      id: `act_${Date.now()}`,
      action: isDone ? 'Marked task as to do' : 'Marked task as done',
      performedBy: currentUser?.displayName || currentUser?.email || 'User',
      timestamp: new Date().toISOString(),
    };

    const newLog = [...(task.activityLog || []), activity];

    await updateTask(taskId, {
      status: nextStatus,
      completedAt,
      activityLog: newLog,
    });
  };

  // Immediate delete
  const deleteTask = async (taskId: string) => {
    if (!currentUser) throw new Error('Must be signed in');
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;

    const path = getTaskPath(task);

    // Optimistic removal
    if (task.teamId) setTeamTasks((prev) => prev.filter((t) => t.id !== taskId));
    else if (task.pairId) setPairTasks((prev) => prev.filter((t) => t.id !== taskId));
    else setSoloTasks((prev) => prev.filter((t) => t.id !== taskId));

    if (selectedTaskForDetail?.id === taskId) setSelectedTaskForDetail(null);
    if (selectedTaskToEdit?.id === taskId) setSelectedTaskToEdit(null);

    try {
      await deleteAllTaskStorageFiles(task.attachments);
      await deleteDoc(doc(db, path));
      showToast('Task deleted', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Delete Task with 5-Second Undo
  const deleteTaskWithUndo = (taskId: string) => {
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;

    // If an existing pending delete exists, flush it
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timer);
      const flushTasks = pendingDeleteRef.current.tasks;
      flushTasks.forEach((ft) => {
        deleteAllTaskStorageFiles(ft.attachments).catch(console.error);
        deleteDoc(doc(db, getTaskPath(ft))).catch(console.error);
      });
      pendingDeleteRef.current = null;
    }

    // 1. Optimistically remove from state right away
    if (task.teamId) setTeamTasks((prev) => prev.filter((t) => t.id !== taskId));
    else if (task.pairId) setPairTasks((prev) => prev.filter((t) => t.id !== taskId));
    else setSoloTasks((prev) => prev.filter((t) => t.id !== taskId));

    if (selectedTaskForDetail?.id === taskId) setSelectedTaskForDetail(null);
    if (selectedTaskToEdit?.id === taskId) setSelectedTaskToEdit(null);

    // 2. Set 5-second timer
    const timer = setTimeout(async () => {
      try {
        await deleteAllTaskStorageFiles(task.attachments);
        await deleteDoc(doc(db, getTaskPath(task)));
      } catch (err) {
        console.error('Final task deletion failed:', err);
      } finally {
        if (pendingDeleteRef.current?.tasks[0]?.id === taskId) {
          pendingDeleteRef.current = null;
        }
      }
    }, 5000);

    pendingDeleteRef.current = {
      tasks: [task],
      timer,
      pathGetter: getTaskPath,
    };

    // 3. Show Toast with Undo
    showToast(`Task deleted`, 'success', () => {
      undoDelete();
    });
  };

  // Delete Multiple Tasks with 5-Second Undo
  const deleteMultipleTasksWithUndo = (taskIds: string[]) => {
    if (taskIds.length === 0) return;
    const tasksToDelete = allTasks.filter((t) => taskIds.includes(t.id));
    if (tasksToDelete.length === 0) return;

    // Flush any pending delete
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timer);
      pendingDeleteRef.current.tasks.forEach((ft) => {
        deleteAllTaskStorageFiles(ft.attachments).catch(console.error);
        deleteDoc(doc(db, getTaskPath(ft))).catch(console.error);
      });
      pendingDeleteRef.current = null;
    }

    // Optimistically remove from state
    setSoloTasks((prev) => prev.filter((t) => !taskIds.includes(t.id)));
    setTeamTasks((prev) => prev.filter((t) => !taskIds.includes(t.id)));
    setPairTasks((prev) => prev.filter((t) => !taskIds.includes(t.id)));

    if (selectedTaskForDetail && taskIds.includes(selectedTaskForDetail.id)) setSelectedTaskForDetail(null);
    if (selectedTaskToEdit && taskIds.includes(selectedTaskToEdit.id)) setSelectedTaskToEdit(null);

    // Set 5-second timer
    const timer = setTimeout(async () => {
      try {
        for (const t of tasksToDelete) {
          await deleteAllTaskStorageFiles(t.attachments);
          await deleteDoc(doc(db, getTaskPath(t)));
        }
      } catch (err) {
        console.error('Multi-task deletion failed:', err);
      } finally {
        pendingDeleteRef.current = null;
      }
    }, 5000);

    pendingDeleteRef.current = {
      tasks: tasksToDelete,
      timer,
      pathGetter: getTaskPath,
    };

    showToast(`${tasksToDelete.length} tasks deleted`, 'success', () => {
      undoDelete();
    });
  };

  // Undo Delete
  const undoDelete = () => {
    if (!pendingDeleteRef.current) return;
    clearTimeout(pendingDeleteRef.current.timer);
    const restored = pendingDeleteRef.current.tasks;
    pendingDeleteRef.current = null;

    restored.forEach((t) => {
      if (t.teamId) setTeamTasks((prev) => [t, ...prev.filter((item) => item.id !== t.id)]);
      else if (t.pairId) setPairTasks((prev) => [t, ...prev.filter((item) => item.id !== t.id)]);
      else setSoloTasks((prev) => [t, ...prev.filter((item) => item.id !== t.id)]);
    });

    dismissToast();
    showToast('Deletion undone', 'success');
  };

  // Duplicate Task
  const duplicateTask = async (task: Task) => {
    await createTask({
      title: `Copy of ${task.title}`,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      priority: task.priority,
      notes: task.notes,
      description: task.description,
      brief: task.brief,
      caption: task.caption,
      brand: task.brand,
      contentType: task.contentType,
      domain: task.domain,
      status: 'todo',
      isSharedPairTask: Boolean(task.pairId),
      isTeamTask: Boolean(task.teamId),
      assigneeUid: task.assigneeUid,
      assigneeName: task.assigneeName,
    });
  };

  // Add Comment to Task
  const addCommentToTask = async (taskId: string, text: string) => {
    if (!currentUser || !text.trim()) return;
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;

    const newComment: TaskComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      authorUid: currentUser.uid,
      authorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
      authorPhoto: currentUser.photoURL || undefined,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    const newActivity: TaskActivity = {
      id: `act_${Date.now()}`,
      action: 'Added a comment',
      performedBy: currentUser.displayName || currentUser.email || 'User',
      timestamp: new Date().toISOString(),
    };

    const updatedComments = [...(task.comments || []), newComment];
    const updatedActivity = [...(task.activityLog || []), newActivity];

    await updateTask(taskId, {
      comments: updatedComments,
      activityLog: updatedActivity,
    });
  };

  // Add Attachment to Task
  const addAttachmentToTask = async (
    taskId: string,
    attachment: Omit<TaskAttachment, 'id' | 'uploadedAt' | 'uploadedBy'>
  ) => {
    if (!currentUser) return;
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;

    const newAttachment: TaskAttachment = {
      ...attachment,
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.displayName || currentUser.email || 'User',
      uploadedByUid: currentUser.uid,
    };

    const newActivity: TaskActivity = {
      id: `act_${Date.now()}`,
      action: attachment.isLink ? `Added link: ${attachment.name}` : `Attached file: ${attachment.name}`,
      performedBy: currentUser.displayName || currentUser.email || 'User',
      timestamp: new Date().toISOString(),
    };

    const updatedAttachments = [...(task.attachments || []), newAttachment];
    const updatedActivity = [...(task.activityLog || []), newActivity];

    await updateTask(taskId, {
      attachments: updatedAttachments,
      activityLog: updatedActivity,
    });
  };

  // Delete Attachment from Task
  const deleteAttachmentFromTask = async (taskId: string, attachmentId: string) => {
    if (!currentUser) return;
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;

    const targetAtt = (task.attachments || []).find((a) => a.id === attachmentId);
    if (targetAtt?.storagePath && !targetAtt.isLink) {
      await deleteFileFromStorage(targetAtt.storagePath);
    }

    const updatedAttachments = (task.attachments || []).filter((a) => a.id !== attachmentId);
    const newActivity: TaskActivity = {
      id: `act_${Date.now()}`,
      action: `Removed attachment: ${targetAtt?.name || 'file'}`,
      performedBy: currentUser.displayName || currentUser.email || 'User',
      timestamp: new Date().toISOString(),
    };

    await updateTask(taskId, {
      attachments: updatedAttachments,
      activityLog: [...(task.activityLog || []), newActivity],
    });
  };

  // Team Space Operations
  const createTeam = async (name: string, requireApproval = false): Promise<Team> => {
    if (!currentUser) throw new Error('Must be signed in to create a team');
    const teamId = `team_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newTeam: Team = {
      id: teamId,
      name: name.trim(),
      ownerUid: currentUser.uid,
      ownerEmail: currentUser.email || '',
      requireApproval,
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    const ownerMember: TeamMember = {
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: currentUser.displayName || 'Owner',
      photoURL: currentUser.photoURL || undefined,
      role: 'owner',
      joinedAt: now,
      status: 'active',
    };

    try {
      await setDoc(doc(db, 'teams', teamId), newTeam);
      await setDoc(doc(db, 'teams', teamId, 'members', currentUser.uid), ownerMember);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        activeTeamId: teamId,
        updatedAt: now,
      });

      setTeam(newTeam);
      setTeamMembers([ownerMember]);
      showToast(`Team "${newTeam.name}" created!`, 'success');
      return newTeam;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `teams/${teamId}`);
    }
  };

  const generateTeamInvite = async (): Promise<TeamInvite> => {
    if (!currentUser || !team) throw new Error('No active team found');
    const inviteId = `${team.id}__tinv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const newInvite: TeamInvite = {
      id: inviteId,
      teamId: team.id,
      teamName: team.name,
      createdByUid: currentUser.uid,
      createdAt: now.toISOString(),
      expiresAt,
      used: false,
      revoked: false,
    };

    try {
      await setDoc(doc(db, 'teams', team.id, 'invites', inviteId), newInvite);
      return newInvite;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `teams/${team.id}/invites/${inviteId}`);
    }
  };

  const revokeTeamInvite = async (inviteId: string) => {
    if (!team) return;
    try {
      await updateDoc(doc(db, 'teams', team.id, 'invites', inviteId), {
        revoked: true,
      });
      showToast('Invite code revoked', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teams/${team.id}/invites/${inviteId}`);
    }
  };

  const joinTeam = async (inviteId: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: 'Please sign in first' };

    try {
      const parsedTeamId = inviteId.includes('__')
        ? inviteId.split('__')[0]
        : inviteId.split('_')[1] || '';
      const inviteSnap = parsedTeamId
        ? await getDoc(doc(db, 'teams', parsedTeamId, 'invites', inviteId)).catch(() => null)
        : null;

      let foundInvite: TeamInvite | null = null;
      let targetTeamId: string | null = null;

      if (inviteSnap && inviteSnap.exists()) {
        foundInvite = inviteSnap.data() as TeamInvite;
        targetTeamId = foundInvite.teamId;
      } else {
        // Query teams collection
        const teamsSnap = await getDocs(collection(db, 'teams'));
        for (const tDoc of teamsSnap.docs) {
          const invDoc = await getDoc(doc(db, 'teams', tDoc.id, 'invites', inviteId));
          if (invDoc.exists()) {
            foundInvite = invDoc.data() as TeamInvite;
            targetTeamId = tDoc.id;
            break;
          }
        }
      }

      if (!foundInvite || !targetTeamId) {
        return { success: false, message: 'Invalid or nonexistent invite code.' };
      }

      if (foundInvite.revoked) {
        return { success: false, message: 'This invite has been revoked by the team owner.' };
      }

      if (foundInvite.used) {
        return { success: false, message: 'This single-use invite code has already been claimed.' };
      }

      const isExpired = new Date(foundInvite.expiresAt).getTime() < Date.now();
      if (isExpired) {
        return { success: false, message: 'This invite code has expired (24h limit).' };
      }

      const now = new Date().toISOString();
      const targetTeamDoc = await getDoc(doc(db, 'teams', targetTeamId));
      const targetTeamData = targetTeamDoc.data() as Team;

      const newMember: TeamMember = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || 'Member',
        photoURL: currentUser.photoURL || undefined,
        role: 'member',
        joinedAt: now,
        status: targetTeamData?.requireApproval ? 'pending_approval' : 'active',
      };

      await setDoc(doc(db, 'teams', targetTeamId, 'members', currentUser.uid), newMember);
      await updateDoc(doc(db, 'teams', targetTeamId, 'invites', inviteId), {
        used: true,
      });
      await updateDoc(doc(db, 'users', currentUser.uid), {
        activeTeamId: targetTeamId,
        updatedAt: now,
      });

      showToast(`Joined ${targetTeamData.name}!`, 'success');
      return { success: true, message: `Successfully joined ${targetTeamData.name}!` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to join team' };
    }
  };

  const leaveTeam = async () => {
    if (!currentUser || !team) return;

    if (userTeamRole === 'owner') {
      const otherMembers = teamMembers.filter((m) => m.uid !== currentUser.uid);
      if (otherMembers.length > 0) {
        throw new Error('Please transfer team ownership before leaving, or delete the team.');
      }
    }

    try {
      await deleteDoc(doc(db, 'teams', team.id, 'members', currentUser.uid));
      await updateDoc(doc(db, 'users', currentUser.uid), {
        activeTeamId: null,
        updatedAt: new Date().toISOString(),
      });
      setTeam(null);
      setTeamMembers([]);
      setTeamTasks([]);
      showToast('Left team', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teams/${team.id}/members/${currentUser.uid}`);
    }
  };

  const removeTeamMember = async (memberUid: string) => {
    if (!currentUser || !team) return;
    if (userTeamRole !== 'owner' && userTeamRole !== 'admin') {
      throw new Error('Only owners and admins can remove members.');
    }

    try {
      await deleteDoc(doc(db, 'teams', team.id, 'members', memberUid));
      await updateDoc(doc(db, 'users', memberUid), {
        activeTeamId: null,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
      showToast('Member removed from team', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teams/${team.id}/members/${memberUid}`);
    }
  };

  const updateTeamMemberRole = async (memberUid: string, newRole: TeamRole) => {
    if (!currentUser || !team) return;
    if (userTeamRole !== 'owner') {
      throw new Error('Only the team owner can change member roles.');
    }

    try {
      await updateDoc(doc(db, 'teams', team.id, 'members', memberUid), {
        role: newRole,
      });
      showToast('Role updated', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teams/${team.id}/members/${memberUid}`);
    }
  };

  const updateTeamName = async (name: string) => {
    if (!currentUser || !team) return;
    if (userTeamRole !== 'owner') throw new Error('Only owner can rename team');

    try {
      await updateDoc(doc(db, 'teams', team.id), {
        name: name.trim(),
        updatedAt: new Date().toISOString(),
      });
      showToast('Team name updated', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teams/${team.id}`);
    }
  };

  // Pair Collaboration Methods
  const createPairAsBoss = async (): Promise<string> => {
    if (!currentUser) throw new Error('Must be signed in');
    const pairId = `pair_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newPair: Pair = {
      id: pairId,
      bossUid: currentUser.uid,
      freelancerUid: null,
      bossEmail: currentUser.email || '',
      freelancerEmail: null,
      status: 'pending',
      createdAt: now,
      pairedAt: null,
    };

    try {
      await setDoc(doc(db, 'pairs', pairId), newPair);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        activePairId: pairId,
        updatedAt: now,
      });
      setActivePair(newPair);
      return pairId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `pairs/${pairId}`);
    }
  };

  const generateInvite = async (pairId: string): Promise<Invite> => {
    if (!currentUser) throw new Error('Must be signed in');
    const inviteId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

    const newInvite: Invite = {
      id: inviteId,
      pairId,
      bossUid: currentUser.uid,
      bossEmail: currentUser.email || '',
      targetEmail: null,
      expiresAt,
      accepted: false,
      acceptedByUid: null,
      createdAt: now.toISOString(),
    };

    try {
      await setDoc(doc(db, 'invites', inviteId), newInvite);
      return newInvite;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `invites/${inviteId}`);
    }
  };

  const acceptInvite = async (inviteId: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: 'Please sign in first.' };

    try {
      const inviteSnap = await getDoc(doc(db, 'invites', inviteId));
      if (!inviteSnap.exists()) {
        return { success: false, message: 'Invite link not found or expired.' };
      }

      const invData = inviteSnap.data() as Invite;
      if (invData.accepted) {
        return { success: false, message: 'This invite has already been accepted.' };
      }

      const now = new Date().toISOString();
      if (invData.expiresAt < now) {
        return { success: false, message: 'This invite has expired.' };
      }

      if (invData.bossUid === currentUser.uid) {
        return { success: false, message: 'You created this invite for a collaborator.' };
      }

      await updateDoc(doc(db, 'pairs', invData.pairId), {
        freelancerUid: currentUser.uid,
        freelancerEmail: currentUser.email || '',
        status: 'active',
        pairedAt: now,
      });

      await updateDoc(doc(db, 'invites', inviteId), {
        accepted: true,
        acceptedByUid: currentUser.uid,
      });

      await updateDoc(doc(db, 'users', currentUser.uid), {
        activePairId: invData.pairId,
        updatedAt: now,
      });

      return { success: true, message: 'Connected to private pair!' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to join' };
    }
  };

  return (
    <OrbitContext.Provider
      value={{
        currentUser,
        userProfile,
        activePair,
        role,
        tasks: allTasks,
        soloTasks,
        teamTasks,
        loadingAuth,
        loadingData,
        needsOnboarding,
        notificationPermission,
        activeAlertTask,
        dismissAlertTask,
        enableNotifications,
        loginWithGoogle,
        logout,
        completeOnboarding,
        updatePersonas,
        updatePreferredView,
        theme,
        setTheme,
        accentColor,
        setAccentColor,
        textSize,
        setTextSize,
        weekStart,
        setWeekStart,
        timeFormat,
        setTimeFormat,
        notificationsEnabled,
        setNotificationsEnabled,
        reminderTime,
        setReminderTime,

        // Navigation & Modals
        activeTab,
        setActiveTab,
        selectedTaskForDetail,
        setSelectedTaskForDetail,
        selectedTaskToEdit,
        setSelectedTaskToEdit,
        isNewTaskModalOpen,
        setIsNewTaskModalOpen,
        modalDefaultDueDate,
        setModalDefaultDueDate,

        // Tasks CRUD & Details
        createTask,
        updateTask,
        toggleTaskDone,
        deleteTask,
        deleteTaskWithUndo,
        deleteMultipleTasksWithUndo,
        undoDelete,
        duplicateTask,
        addCommentToTask,
        addAttachmentToTask,
        deleteAttachmentFromTask,

        // Team Space
        team,
        teamMembers,
        userTeamRole,
        createTeam,
        generateTeamInvite,
        revokeTeamInvite,
        joinTeam,
        leaveTeam,
        removeTeamMember,
        updateTeamMemberRole,
        updateTeamName,

        // Pairs
        createPairAsBoss,
        generateInvite,
        acceptInvite,

        // Toast
        toast,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </OrbitContext.Provider>
  );
};

export const useOrbit = () => {
  const context = useContext(OrbitContext);
  if (!context) throw new Error('useOrbit must be used within an OrbitProvider');
  return context;
};
