import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { Task } from '../types/orbit';
import { formatTimeDisplay } from '../utils/timeFormat';
import {
  parseQuickAddTask,
  getLiveCountdown,
  highlightSearchText,
} from '../utils/smartParse';
import { usePrefersReducedMotion } from '../utils/usePrefersReducedMotion';
import { StatFilterType } from './HomeDashboard';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Edit2,
  Trash2,
  Copy,
  Users,
  CheckSquare,
  Square,
  X,
  RotateCcw,
  Sparkles,
  Plus,
  Zap,
  CalendarDays,
  Paperclip,
} from 'lucide-react';

interface ListViewProps {
  tasks: Task[];
  onOpenEditTask: (task: Task) => void;
  onOpenNewTask: () => void;
  searchQuery?: string;
  statFilter?: StatFilterType;
  onClearStatFilter?: () => void;
}

type ListSectionTab = 'pending' | 'completed';

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  onOpenEditTask,
  onOpenNewTask,
  searchQuery = '',
  statFilter = 'all',
  onClearStatFilter,
}) => {
  const {
    createTask,
    updateTask,
    toggleTaskDone,
    deleteTaskWithUndo,
    deleteMultipleTasksWithUndo,
    duplicateTask,
    currentUser,
    userProfile,
    loadingData,
    timeFormat,
    weekStart,
    setSelectedTaskForDetail,
    userTeamRole,
    showToast,
  } = useOrbit();

  const prefersReducedMotion = usePrefersReducedMotion();

  // Persisted Pending / Completed tab selection (defaults to 'pending')
  const [activeListTab, setActiveListTab] = useState<ListSectionTab>(() => {
    const saved = localStorage.getItem('orbit_list_section_tab');
    return saved === 'completed' ? 'completed' : 'pending';
  });

  // Sync tab if statFilter === 'completed'
  useEffect(() => {
    if (statFilter === 'completed') {
      setActiveListTab('completed');
    } else if (statFilter !== 'all') {
      setActiveListTab('pending');
    }
  }, [statFilter]);

  const handleSelectListTab = (tab: ListSectionTab) => {
    setActiveListTab(tab);
    localStorage.setItem('orbit_list_section_tab', tab);
    setIsSelectMode(false);
    setSelectedIds([]);
    setSwipedOpenTaskId(null);
  };

  // Live minute-by-minute timestamp for countdowns
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  // Quick Add state
  const [quickAddInput, setQuickAddInput] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  const parsedQuickPreview = useMemo(() => {
    if (!quickAddInput.trim()) return null;
    return parseQuickAddTask(quickAddInput);
  }, [quickAddInput]);

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddInput.trim() || isQuickAdding) return;
    const parsed = parseQuickAddTask(quickAddInput);
    if (!parsed.title.trim()) return;

    setIsQuickAdding(true);
    try {
      const defaultDomain = userProfile?.personas?.includes('student') && !userProfile?.personas?.includes('designer')
        ? 'student'
        : 'designer';

      await createTask({
        title: parsed.title,
        dueDate: parsed.dueDate,
        dueTime: parsed.dueTime,
        priority: 'medium',
        status: 'todo',
        domain: defaultDomain,
        contentType: defaultDomain === 'student' ? 'Assignment' : 'Reel',
        brand: '',
        notes: '',
        attachments: [],
      });
      setQuickAddInput('');
    } finally {
      setIsQuickAdding(false);
    }
  };

  // Track tasks animating check completion, confetti burst, and smooth collapse on delete
  const [completingTaskIds, setCompletingTaskIds] = useState<string[]>([]);
  const [deletingTaskIds, setDeletingTaskIds] = useState<string[]>([]);
  const [confettiTaskId, setConfettiTaskId] = useState<string | null>(null);

  const handleAnimatedToggleDone = (task: Task) => {
    if (completingTaskIds.includes(task.id)) return;

    const pendingToday = tasks.filter(
      (t) => t.status !== 'done' && t.dueDate === todayStr
    );
    const isLastPendingToday =
      task.status !== 'done' &&
      task.dueDate === todayStr &&
      pendingToday.length === 1 &&
      pendingToday[0].id === task.id;

    if (prefersReducedMotion) {
      toggleTaskDone(task.id);
      return;
    }

    setCompletingTaskIds((prev) => [...prev, task.id]);
    if (isLastPendingToday) {
      setConfettiTaskId(task.id);
    }

    setTimeout(() => {
      toggleTaskDone(task.id);
      setCompletingTaskIds((prev) => prev.filter((id) => id !== task.id));
      setConfettiTaskId(null);
    }, 220);
  };

  const handleAnimatedSingleDelete = (task: Task) => {
    if (deletingTaskIds.includes(task.id)) return;
    setSwipedOpenTaskId(null);
    if (prefersReducedMotion) {
      deleteTaskWithUndo(task.id);
      return;
    }
    setDeletingTaskIds((prev) => [...prev, task.id]);
    setTimeout(() => {
      deleteTaskWithUndo(task.id);
      setDeletingTaskIds((prev) => prev.filter((id) => id !== task.id));
    }, 210);
  };

  // Multi-select state (triggered via Long-Press / Click-and-Hold or Select button)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkMovePicker, setShowBulkMovePicker] = useState(false);
  const [bulkMoveDate, setBulkMoveDate] = useState(todayStr);

  // Long-press timer ref for task cards
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef<boolean>(false);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Mobile swipe gesture state
  const [swipedOpenTaskId, setSwipedOpenTaskId] = useState<string | null>(null);
  const [activeSwipeTaskId, setActiveSwipeTaskId] = useState<string | null>(null);
  const [swipeOffsetX, setSwipeOffsetX] = useState<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; taskId: string } | null>(null);

  // Confirmation modal states
  const [showClearCompletedConfirm, setShowClearCompletedConfirm] = useState(false);

  // Calculate week bounds for 'due_week' stat filter
  const weekBounds = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToStart = weekStart === 'monday' ? (day === 0 ? -6 : 1 - day) : -day;
    const start = new Date(now);
    start.setDate(now.getDate() + diffToStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      startStr: start.toLocaleDateString('en-CA'),
      endStr: end.toLocaleDateString('en-CA'),
    };
  }, [weekStart]);

  // Apply statFilter if active
  const statFilteredTasks = useMemo(() => {
    if (statFilter === 'all' || statFilter === 'completed') return tasks;
    return tasks.filter((t) => {
      if (statFilter === 'overdue') return t.dueDate < todayStr;
      if (statFilter === 'due_today') return t.dueDate === todayStr;
      if (statFilter === 'due_week') {
        return t.dueDate >= weekBounds.startStr && t.dueDate <= weekBounds.endStr;
      }
      return true;
    });
  }, [tasks, statFilter, todayStr, weekBounds]);

  // Separate and sort Pending vs Completed tasks
  const pendingTasks = useMemo(() => {
    return statFilteredTasks
      .filter((t) => t.status !== 'done')
      .sort((a, b) => {
        const aTime = new Date(`${a.dueDate}T${a.dueTime || '23:59'}`).getTime();
        const bTime = new Date(`${b.dueDate}T${b.dueTime || '23:59'}`).getTime();
        return aTime - bTime;
      });
  }, [statFilteredTasks]);

  const completedTasks = useMemo(() => {
    return statFilteredTasks
      .filter((t) => t.status === 'done')
      .sort((a, b) => {
        const aTime = new Date(a.completedAt || a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.completedAt || b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [statFilteredTasks]);

  const displayedTasks = activeListTab === 'pending' ? pendingTasks : completedTasks;

  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const next24HoursTimestamp = nowMs + 24 * 60 * 60 * 1000;

  const getDeadlineStatus = (task: Task) => {
    if (task.status === 'done') {
      return {
        label: 'Completed',
        colorBarClass: 'bg-emerald-500/70',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        isOverdue: false,
      };
    }

    const taskDueDateTime = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`).getTime();

    if (taskDueDateTime < nowMs) {
      return {
        label: 'Overdue',
        colorBarClass: 'bg-rose-500 orbit-overdue-pulse',
        textClass: 'text-rose-600 dark:text-rose-400 font-semibold',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/70',
        isOverdue: true,
      };
    }

    if (taskDueDateTime <= next24HoursTimestamp) {
      const liveText = getLiveCountdown(task.dueDate, task.dueTime, nowMs);
      return {
        label: liveText || 'Due soon',
        colorBarClass: 'bg-amber-500',
        textClass: 'text-amber-600 dark:text-amber-400 font-semibold',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
        isOverdue: false,
      };
    }

    return {
      label: 'On track',
      colorBarClass: 'bg-emerald-500',
      textClass: 'text-emerald-600 dark:text-emerald-400 font-medium',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70',
      isOverdue: false,
    };
  };

  const formatCompletedTimestamp = (task: Task) => {
    const rawIso = task.completedAt || task.updatedAt || task.createdAt;
    if (!rawIso) return 'Completed recently';
    const d = new Date(rawIso);
    if (isNaN(d.getTime())) return 'Completed recently';

    const datePart = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const timePart = formatTimeDisplay(`${hours}:${mins}`, timeFormat);
    return `Completed ${datePart}, ${timePart}`;
  };

  const priorityBadge = (priority: Task['priority']) => {
    const map = {
      urgent: { label: 'Urgent', class: 'text-rose-600 dark:text-rose-400 font-medium' },
      high: { label: 'High', class: 'text-amber-600 dark:text-amber-400 font-medium' },
      medium: { label: 'Medium', class: 'text-slate-500 dark:text-slate-400' },
      low: { label: 'Low', class: 'text-slate-400 dark:text-slate-500' },
    }[priority || 'medium'];
    return <span className={`text-[11px] ${map.class}`}>{map.label}</span>;
  };

  const canDeleteTask = (task: Task) => {
    if (task.teamId) {
      return (
        userTeamRole === 'owner' ||
        userTeamRole === 'admin' ||
        task.createdBy === currentUser?.uid
      );
    }
    if (task.pairId) {
      return task.createdBy === currentUser?.uid || task.userId === currentUser?.uid;
    }
    return true;
  };

  const toggleSelectTask = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (next.length === 0) {
        setIsSelectMode(false);
        setShowBulkMovePicker(false);
      }
      return next;
    });
  };

  const handleBulkComplete = async () => {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    setSelectedIds([]);
    setIsSelectMode(false);
    setShowBulkMovePicker(false);
    await Promise.all(
      ids.map((id) => updateTask(id, { status: 'done', completedAt: new Date().toISOString() }))
    );
    showToast(`Marked ${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} done`, 'success');
  };

  const handleBulkMove = async () => {
    if (selectedIds.length === 0 || !bulkMoveDate) return;
    const ids = [...selectedIds];
    setSelectedIds([]);
    setIsSelectMode(false);
    setShowBulkMovePicker(false);
    await Promise.all(ids.map((id) => updateTask(id, { dueDate: bulkMoveDate })));
    const formatted = new Date(bulkMoveDate + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    showToast(`Moved ${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} to ${formatted}`, 'success');
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const deletable = selectedIds.filter((id) => {
      const t = tasks.find((item) => item.id === id);
      return t ? canDeleteTask(t) : false;
    });
    if (deletable.length > 0) {
      deleteMultipleTasksWithUndo(deletable);
    }
    setSelectedIds([]);
    setIsSelectMode(false);
    setShowBulkMovePicker(false);
  };

  const handleConfirmClearCompleted = () => {
    const deletableCompletedIds = completedTasks.filter(canDeleteTask).map((t) => t.id);
    if (deletableCompletedIds.length > 0) {
      deleteMultipleTasksWithUndo(deletableCompletedIds);
    }
    setShowClearCompletedConfirm(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const renderHighlightedText = (text: string) => {
    const segments = highlightSearchText(text, searchQuery);
    return segments.map((seg, i) =>
      seg.matched ? (
        <mark
          key={i}
          className="rounded px-0.5 bg-amber-200/80 text-slate-900 dark:bg-amber-500/30 dark:text-amber-200 font-semibold"
        >
          {seg.text}
        </mark>
      ) : (
        <React.Fragment key={i}>{seg.text}</React.Fragment>
      )
    );
  };

  const confettiDots = [
    { tx: '-18px', ty: '-16px', color: '#10B981' },
    { tx: '18px', ty: '-14px', color: '#8B7BFF' },
    { tx: '-20px', ty: '12px', color: '#F59E0B' },
    { tx: '16px', ty: '15px', color: '#EC4899' },
    { tx: '0px', ty: '-22px', color: '#3B82F6' },
    { tx: '22px', ty: '2px', color: '#10B981' },
  ];

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 pb-28 orbit-view-fade">
      {/* Smart Quick Add Bar at top of Tasks page */}
      <form onSubmit={handleQuickAddSubmit} className="mb-5">
        <div className="relative flex items-center rounded-[14px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs focus-within:border-[var(--orbit-accent,#534AB7)] dark:focus-within:border-[#8B7BFF] focus-within:ring-2 focus-within:ring-[var(--orbit-accent,#534AB7)]/20 transition-all">
          <div className="pl-3.5 pr-2 text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] shrink-0">
            <Zap className="h-4 w-4 stroke-current" strokeWidth={2} />
          </div>
          <input
            type="text"
            value={quickAddInput}
            onChange={(e) => setQuickAddInput(e.target.value)}
            placeholder='Quick add: e.g. "Lab report friday 5pm" or "Brand reel tomorrow 2:30pm"'
            aria-label="Quick add task with natural language date and time"
            className="w-full py-3 pr-28 text-xs sm:text-sm bg-transparent text-slate-900 dark:text-[#F2F2F7] placeholder-slate-400 dark:placeholder-[#A0A0B0] focus:outline-none"
          />
          {quickAddInput.trim() && (
            <button
              type="submit"
              disabled={isQuickAdding}
              className="absolute right-2 min-h-[34px] px-3 py-1.5 rounded-[10px] bg-[var(--orbit-accent,#534AB7)] hover:bg-[var(--orbit-accent-hover,#433B9B)] dark:bg-[#8B7BFF] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="h-3.5 w-3.5 stroke-current" strokeWidth={2.5} />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Live parsed preview badge when user types */}
        {parsedQuickPreview && (parsedQuickPreview.detectedDateLabel || parsedQuickPreview.detectedTimeLabel) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 px-2 text-[11px] text-slate-500 dark:text-[#A0A0B0] orbit-view-fade">
            <span>Task: <strong className="text-slate-800 dark:text-[#F2F2F7]">{parsedQuickPreview.title}</strong></span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:bg-[#534AB7]/25 dark:text-[#8B7BFF] font-semibold">
              <Calendar className="h-3 w-3 stroke-current" strokeWidth={2} />
              <span>
                {new Date(parsedQuickPreview.dueDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span>·</span>
              <span>{formatTimeDisplay(parsedQuickPreview.dueTime, timeFormat)}</span>
            </span>
          </div>
        )}
      </form>

      {/* Top Row: Tabs (Pending / Completed) with Sliding Underline + Progress Line & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 mb-5">
        {/* Tab Row with Sliding Underline */}
        <div className="relative grid grid-cols-2 w-64 sm:w-72 -mb-px">
          <button
            type="button"
            onClick={() => handleSelectListTab('pending')}
            className={`min-h-[44px] pb-3 pt-1 px-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeListTab === 'pending'
                ? 'text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]'
                : 'text-slate-500 hover:text-slate-800 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7]'
            }`}
          >
            <span>Pending ({pendingTasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectListTab('completed')}
            className={`min-h-[44px] pb-3 pt-1 px-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeListTab === 'completed'
                ? 'text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]'
                : 'text-slate-500 hover:text-slate-800 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7]'
            }`}
          >
            <span>Completed ({completedTasks.length})</span>
          </button>

          {/* Sliding Underline Indicator (< 220ms) */}
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-0.5 w-1/2 bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] rounded-full transition-transform duration-200 ease-out"
            style={{
              transform: activeListTab === 'pending' ? 'translateX(0%)' : 'translateX(100%)',
            }}
          />
        </div>

        {/* Right Side: Stat Filter Chip, Progress Line & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pb-2.5 sm:pb-2">
          {statFilter !== 'all' && onClearStatFilter && (
            <button
              type="button"
              onClick={onClearStatFilter}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--orbit-accent,#534AB7)]/15 text-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF]/20 dark:text-[#8B7BFF] text-xs font-semibold cursor-pointer"
            >
              <span>Filtered: {statFilter.replace('_', ' ')}</span>
              <X className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
            </button>
          )}

          {/* Small progress line + thin progress bar */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-slate-600 dark:text-[#A0A0B0] tabular-nums">
              <strong className="font-bold text-slate-900 dark:text-[#F2F2F7]">{doneCount}</strong> of{' '}
              <strong className="font-bold text-slate-900 dark:text-[#F2F2F7]">{totalCount}</strong> done
            </span>
            <div className="w-24 sm:w-28 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] transition-all duration-250 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Clear completed button in Completed tab */}
          {activeListTab === 'completed' && completedTasks.some(canDeleteTask) && (
            <button
              type="button"
              onClick={() => setShowClearCompletedConfirm(true)}
              className="min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-[10px] border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-[#24242E] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
              <span>Clear completed</span>
            </button>
          )}
        </div>
      </div>

      {/* Skeleton Placeholders while loading */}
      {loadingData ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading tasks">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-800/80 animate-pulse" />
                  <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                </div>
              </div>
              <div className="h-6 w-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      ) : displayedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-[16px] border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 orbit-view-fade">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] mb-3">
            {activeListTab === 'pending' ? (
              <Sparkles className="h-5 w-5 stroke-current" strokeWidth={2} />
            ) : (
              <CheckCircle2 className="h-5 w-5 stroke-current" strokeWidth={2} />
            )}
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-[#F2F2F7]">
            {activeListTab === 'pending'
              ? "You're all caught up."
              : 'Finished tasks will show up here.'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#A0A0B0]">
            {activeListTab === 'pending'
              ? 'All scheduled tasks are complete or none match your current filter.'
              : 'Mark any task done by tapping its check circle.'}
          </p>
          {activeListTab === 'pending' && (
            <button
              onClick={onOpenNewTask}
              className="mt-4 min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[var(--orbit-accent,#534AB7)] hover:bg-[var(--orbit-accent-hover,#433B9B)] rounded-[10px] shadow-xs transition-colors cursor-pointer"
            >
              + Add task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedTasks.map((task) => {
            const statusInfo = getDeadlineStatus(task);
            const isDone = task.status === 'done';
            const isPairTask = Boolean(task.pairId);
            const canDelete = canDeleteTask(task);
            const isSelected = selectedIds.includes(task.id);
            const isCompleting = completingTaskIds.includes(task.id);
            const isDeleting = deletingTaskIds.includes(task.id);
            const isSwipedOpen = swipedOpenTaskId === task.id;
            const currentSwipeX =
              activeSwipeTaskId === task.id
                ? swipeOffsetX
                : isSwipedOpen
                ? -116
                : 0;

            return (
              <div
                key={task.id}
                className={`relative rounded-[16px] overflow-hidden select-none ${
                  isCompleting
                    ? 'orbit-task-completing'
                    : isDeleting
                    ? 'orbit-task-deleting'
                    : 'orbit-task-enter'
                }`}
              >
                {/* Mobile Swipe Background Layer (Right swipe = Done, Left swipe = Edit & Delete) */}
                <div
                  className="absolute inset-0 flex items-center justify-between rounded-[16px] overflow-hidden md:hidden"
                  aria-hidden={!isSwipedOpen}
                >
                  {/* Right-swipe green Done reveal */}
                  <div className="h-full flex items-center pl-4 pr-6 bg-emerald-600 text-white text-xs font-bold gap-1.5">
                    <CheckCircle2 className="h-5 w-5 stroke-current" strokeWidth={2.2} />
                    <span>{isDone ? 'Restore' : 'Done'}</span>
                  </div>

                  {/* Left-swipe Edit & Delete action buttons */}
                  <div className="h-full flex items-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSwipedOpenTaskId(null);
                        onOpenEditTask(task);
                      }}
                      aria-label={`Edit ${task.title}`}
                      className="h-full w-14 flex flex-col items-center justify-center bg-indigo-600 text-white text-[11px] font-semibold gap-1 cursor-pointer"
                    >
                      <Edit2 className="h-4 w-4 stroke-current" strokeWidth={2} />
                      <span>Edit</span>
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnimatedSingleDelete(task);
                        }}
                        aria-label={`Delete ${task.title}`}
                        className="h-full w-15 flex flex-col items-center justify-center bg-rose-600 text-white text-[11px] font-semibold gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 stroke-current" strokeWidth={2} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Foreground Task Card */}
                <div
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    longPressTriggeredRef.current = false;
                    clearLongPressTimer();
                    longPressTimerRef.current = window.setTimeout(() => {
                      longPressTriggeredRef.current = true;
                      setIsSelectMode(true);
                      setSelectedIds((prev) =>
                        prev.includes(task.id) ? prev : [...prev, task.id]
                      );
                    }, 430);
                  }}
                  onPointerUp={clearLongPressTimer}
                  onPointerLeave={clearLongPressTimer}
                  onPointerCancel={clearLongPressTimer}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    if (!touch) return;
                    touchStartRef.current = {
                      x: touch.clientX,
                      y: touch.clientY,
                      taskId: task.id,
                    };
                  }}
                  onTouchMove={(e) => {
                    if (!touchStartRef.current || touchStartRef.current.taskId !== task.id) return;
                    const touch = e.touches[0];
                    if (!touch) return;
                    const dx = touch.clientX - touchStartRef.current.x;
                    const dy = touch.clientY - touchStartRef.current.y;
                    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
                      clearLongPressTimer();
                    }
                    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 14) {
                      setActiveSwipeTaskId(task.id);
                      const base = swipedOpenTaskId === task.id ? -116 : 0;
                      const clamped = Math.max(-130, Math.min(110, base + dx));
                      setSwipeOffsetX(clamped);
                    }
                  }}
                  onTouchEnd={() => {
                    clearLongPressTimer();
                    if (activeSwipeTaskId === task.id) {
                      if (swipeOffsetX > 65) {
                        // Swipe right -> Mark done
                        setSwipeOffsetX(0);
                        setActiveSwipeTaskId(null);
                        setSwipedOpenTaskId(null);
                        handleAnimatedToggleDone(task);
                      } else if (swipeOffsetX < -55) {
                        // Swipe left -> Reveal Edit & Delete
                        setSwipeOffsetX(0);
                        setActiveSwipeTaskId(null);
                        setSwipedOpenTaskId(task.id);
                      } else {
                        setSwipeOffsetX(0);
                        setActiveSwipeTaskId(null);
                        setSwipedOpenTaskId(null);
                      }
                    }
                    touchStartRef.current = null;
                  }}
                  onClick={() => {
                    if (longPressTriggeredRef.current) {
                      longPressTriggeredRef.current = false;
                      return;
                    }
                    if (swipedOpenTaskId === task.id) {
                      setSwipedOpenTaskId(null);
                      return;
                    }
                    if (isSelectMode) {
                      toggleSelectTask(task.id);
                    } else {
                      setSelectedTaskForDetail(task);
                    }
                  }}
                  style={{
                    transform: currentSwipeX ? `translateX(${currentSwipeX}px)` : undefined,
                  }}
                  className={`relative flex items-stretch rounded-[16px] border transition-transform duration-150 ease-out shadow-2xs cursor-pointer ${
                    isSelected
                      ? 'border-[var(--orbit-accent,#534AB7)] ring-1 ring-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] bg-white dark:bg-slate-900'
                      : isDone
                      ? 'border-slate-200/70 bg-slate-50 dark:border-slate-800/70 dark:bg-slate-900'
                      : 'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-800 dark:hover:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  {/* Left Color Bar: Red (overdue with 1x pulse on load), Amber (due soon), Green (on track / completed) */}
                  <div className={`w-1.5 shrink-0 ${statusInfo.colorBarClass}`} />

                  {/* Card Main Body */}
                  <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Large Tap Target Check Circle & Title */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {isSelectMode ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectTask(task.id);
                          }}
                          aria-label={isSelected ? 'Deselect task' : 'Select task'}
                          className="min-w-[44px] min-h-[44px] h-11 w-11 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-[#24242E] transition-colors cursor-pointer shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare
                              className="h-5 w-5 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]"
                              strokeWidth={2}
                            />
                          ) : (
                            <Square
                              className="h-5 w-5 stroke-current text-slate-400 dark:text-[#A0A0B0]"
                              strokeWidth={2}
                            />
                          )}
                        </button>
                      ) : (
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAnimatedToggleDone(task);
                            }}
                            aria-label={isDone ? 'Move back to pending' : 'Mark task as done'}
                            className="min-w-[44px] min-h-[44px] h-11 w-11 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] transition-colors cursor-pointer"
                            title={isDone ? 'Move back to pending' : 'Mark as done'}
                          >
                            {isDone || isCompleting ? (
                              <svg
                                className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  className="fill-emerald-50 dark:fill-emerald-950/40"
                                />
                                <path d="M8 12.5l3 3 5-6" className="orbit-check-draw" />
                              </svg>
                            ) : (
                              <Circle
                                className="h-6 w-6 stroke-current text-slate-400 dark:text-[#A0A0B0] hover:text-[var(--orbit-accent,#534AB7)] dark:hover:text-[#8B7BFF]"
                                strokeWidth={2}
                              />
                            )}
                            <span className="sr-only">
                              {isDone ? 'Move back to pending' : 'Mark as done'}
                            </span>
                          </button>

                          {/* Confetti burst when last pending task for the day is finished */}
                          {confettiTaskId === task.id && (
                            <div
                              className="pointer-events-none absolute inset-0 flex items-center justify-center"
                              aria-hidden="true"
                            >
                              {confettiDots.map((dot, idx) => (
                                <span
                                  key={idx}
                                  className="orbit-confetti-dot absolute h-1.5 w-1.5 rounded-full"
                                  style={
                                    {
                                      backgroundColor: dot.color,
                                      '--tx': dot.tx,
                                      '--ty': dot.ty,
                                    } as React.CSSProperties
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-[#A0A0B0] mb-1">
                          {!isDone && statusInfo.isOverdue && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-md border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                              Overdue
                            </span>
                          )}

                          {isPairTask && (
                            <>
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-[#8B7BFF]">
                                <Users className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                                <span>Linked</span>
                              </span>
                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                                ·
                              </span>
                            </>
                          )}

                          {task.brand && (
                            <>
                              <span className="font-medium text-slate-700 dark:text-[#F2F2F7]">
                                {renderHighlightedText(task.brand)}
                              </span>
                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                                ·
                              </span>
                            </>
                          )}

                          {task.contentType && (
                            <>
                              <span>{task.contentType}</span>
                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                                ·
                              </span>
                            </>
                          )}

                          {priorityBadge(task.priority)}

                          {task.attachments && task.attachments.length > 0 && (
                            <>
                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                                ·
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-[#A0A0B0]">
                                <Paperclip className="h-3 w-3 stroke-current" strokeWidth={2} />
                                <span>{task.attachments.length}</span>
                              </span>
                            </>
                          )}
                        </div>

                        {/* Title with instant search match highlighting */}
                        <h4
                          className={`text-sm font-semibold leading-snug transition-colors ${
                            isDone
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-[#F2F2F7]'
                          }`}
                        >
                          {renderHighlightedText(task.title)}
                        </h4>

                        {/* Completed date/time subtitle for Completed cards */}
                        {isDone && (
                          <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <span>{formatCompletedTimestamp(task)}</span>
                          </p>
                        )}

                        {/* Notes with search highlighting */}
                        {!isDone && (task.notes || task.description) && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-[#A0A0B0] line-clamp-2 leading-relaxed">
                            {renderHighlightedText(task.notes || task.description || '')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Assignee Initials, Date/Time, Live Countdown & Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                      {!isDone && (
                        <div className="flex items-center gap-2.5">
                          {task.assigneeName && (
                            <div
                              title={`Assigned to ${task.assigneeName}`}
                              className="h-7 w-7 rounded-full bg-[var(--orbit-accent,#534AB7)] text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                            >
                              {getInitials(task.assigneeName)}
                            </div>
                          )}

                          <div className="text-right">
                            <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-800 dark:text-[#F2F2F7] font-semibold">
                              <Calendar
                                className="h-4 w-4 stroke-current text-slate-500 dark:text-[#A0A0B0]"
                                strokeWidth={2}
                              />
                              <span>
                                {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              <Clock
                                className="h-4 w-4 stroke-current text-slate-500 dark:text-[#A0A0B0] ml-1"
                                strokeWidth={2}
                              />
                              <span>{formatTimeDisplay(task.dueTime, timeFormat)}</span>
                            </div>
                            <div className={`text-[11px] ${statusInfo.textClass}`}>
                              {statusInfo.label}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {!isSelectMode && (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isDone ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAnimatedToggleDone(task)}
                                title="Restore task to Pending"
                                aria-label={`Restore ${task.title}`}
                                className="min-h-[40px] px-3 py-1.5 flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] transition-colors cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                                <span>Restore</span>
                              </button>

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleAnimatedSingleDelete(task)}
                                  title="Delete task"
                                  aria-label={`Delete ${task.title}`}
                                  className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl text-slate-600 dark:text-[#A0A0B0] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-[#24242E] active:bg-rose-100 dark:active:bg-[#24242E] transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4 stroke-current" strokeWidth={2} />
                                  <span className="sr-only">Delete</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenEditTask(task)}
                                title="Edit task"
                                aria-label={`Edit ${task.title}`}
                                className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl text-slate-600 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] transition-colors cursor-pointer"
                              >
                                <Edit2 className="h-4 w-4 stroke-current" strokeWidth={2} />
                                <span className="sr-only">Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => duplicateTask(task)}
                                title="Duplicate task"
                                aria-label={`Duplicate ${task.title}`}
                                className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl text-slate-600 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] transition-colors cursor-pointer"
                              >
                                <Copy className="h-4 w-4 stroke-current" strokeWidth={2} />
                                <span className="sr-only">Copy</span>
                              </button>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleAnimatedSingleDelete(task)}
                                  title="Delete task"
                                  aria-label={`Delete ${task.title}`}
                                  className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl text-slate-600 dark:text-[#A0A0B0] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-[#24242E] active:bg-rose-100 dark:active:bg-[#24242E] transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4 stroke-current" strokeWidth={2} />
                                  <span className="sr-only">Delete</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multi-Select Floating Action Bar (Complete, Move, Delete) */}
      {isSelectMode && selectedIds.length > 0 && (
        <div
          role="region"
          aria-label="Bulk task actions"
          className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-[#1E1E26] dark:text-[#F2F2F7] border border-slate-700 shadow-2xl orbit-modal-enter"
        >
          <span className="text-xs font-bold px-1.5 tabular-nums">
            {selectedIds.length} selected
          </span>

          <button
            type="button"
            onClick={handleBulkComplete}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <CheckCircle2 className="h-4 w-4 stroke-current" strokeWidth={2} />
            <span>Complete</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBulkMovePicker((prev) => !prev)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CalendarDays className="h-4 w-4 stroke-current" strokeWidth={2} />
              <span>Move</span>
            </button>

            {showBulkMovePicker && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-3 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-[#F2F2F7] border border-slate-200 dark:border-slate-700 shadow-xl flex items-center gap-2 z-50 orbit-modal-enter">
                <input
                  type="date"
                  value={bulkMoveDate}
                  onChange={(e) => setBulkMoveDate(e.target.value)}
                  aria-label="New due date for selected tasks"
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-[#F2F2F7]"
                />
                <button
                  type="button"
                  onClick={handleBulkMove}
                  className="min-h-[34px] px-3 py-1 rounded-lg bg-[var(--orbit-accent,#534AB7)] text-white text-xs font-semibold cursor-pointer"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleBulkDelete}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash2 className="h-4 w-4 stroke-current" strokeWidth={2} />
            <span>Delete</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSelectMode(false);
              setSelectedIds([]);
              setShowBulkMovePicker(false);
            }}
            aria-label="Cancel selection"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="h-4 w-4 stroke-current" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Clear All Completed Confirmation Modal */}
      {showClearCompletedConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm p-5 rounded-[16px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 orbit-modal-enter">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5 stroke-current" strokeWidth={2} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F2F2F7]">
                  Clear completed tasks?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClearCompletedConfirm(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-[#F2F2F7] cursor-pointer"
              >
                <X className="h-4 w-4 stroke-current" strokeWidth={2} />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-[#A0A0B0] leading-relaxed">
              This will delete all {completedTasks.filter(canDeleteTask).length} completed{' '}
              {completedTasks.filter(canDeleteTask).length === 1 ? 'task' : 'tasks'}. You can undo
              within 5 seconds.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearCompletedConfirm(false)}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[10px] text-slate-600 dark:text-[#A0A0B0] hover:bg-slate-100 dark:hover:bg-[#24242E] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearCompleted}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[10px] bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-colors shadow-xs"
              >
                Clear completed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
