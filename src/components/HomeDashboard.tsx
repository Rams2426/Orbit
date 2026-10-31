import React, { useMemo, useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { Task, PersonaType } from '../types/orbit';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  CheckCircle2,
  Circle,
  AlertCircle,
  Sliders,
  Bell,
  BellOff,
  ChevronRight,
  Video,
  Image as ImageIcon,
  Sparkles,
  Layers,
  FileText,
  GraduationCap,
  BookOpen,
  Briefcase,
  TrendingUp,
  Users,
  Menu,
  X,
} from 'lucide-react';

interface HomeDashboardProps {
  onOpenNewTask: () => void;
  onOpenEditTask: (task: Task) => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onOpenTeam?: () => void;
  onOpenMobileMenu?: () => void;
  selectedContentType?: string;
  onClearContentType?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onOpenNewTask,
  onOpenEditTask,
  onOpenCalendar,
  onOpenSettings,
  onOpenMobileMenu,
  selectedContentType = 'all',
  onClearContentType,
}) => {
  const {
    currentUser,
    userProfile,
    tasks,
    toggleTaskDone,
    notificationPermission,
    enableNotifications,
    weekStart,
    setSelectedTaskForDetail,
  } = useOrbit();

  // Personas from settings
  const userPersonas = userProfile?.personas?.length ? userProfile.personas : ['designer'];
  const hasDesigner = userPersonas.includes('designer');
  const hasStudent = userPersonas.includes('student');
  const hasBoth = hasDesigner && hasStudent;

  // Filter if both modes are ticked: 'all' | 'designer' | 'student'
  const [selectedPersonaFilter, setSelectedPersonaFilter] = useState<'all' | 'designer' | 'student'>('all');

  // Greeting by hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const userName = currentUser?.displayName
    ? currentUser.displayName.split(' ')[0]
    : 'there';

  // Current Date String YYYY-MM-DD
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toLocaleDateString('en-CA'), [today]);

  // Formatted date string, e.g. "Saturday, Oct 31, 2026"
  const formattedTodayDate = useMemo(() => {
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [today]);

  // Filtered tasks if both modes selected or if a Sidebar Type filter is active
  const activeTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (hasBoth && selectedPersonaFilter !== 'all' && t.domain !== selectedPersonaFilter) {
        return false;
      }
      if (selectedContentType !== 'all' && t.contentType !== selectedContentType) {
        return false;
      }
      return true;
    });
  }, [tasks, hasBoth, selectedPersonaFilter, selectedContentType]);

  // Calculate start and end of current week
  const weekRange = useMemo(() => {
    const now = new Date(today);
    const day = now.getDay(); // 0 is Sunday, 1 is Monday
    const diffToStart = weekStart === 'monday' ? (day === 0 ? -6 : 1 - day) : -day;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToStart);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const days: { dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dStr = d.toLocaleDateString('en-CA');
      days.push({
        dateStr: dStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: dStr === todayStr,
      });
    }

    return {
      startStr: startOfWeek.toLocaleDateString('en-CA'),
      endStr: endOfWeek.toLocaleDateString('en-CA'),
      days,
    };
  }, [today, todayStr, weekStart]);

  // Four stat cards calculated strictly from real tasks:
  // 1. Due this week
  // 2. Due today (amber number)
  // 3. Overdue (red number)
  // 4. Active brands (Designer) / Active classes (Student) / Active brands & classes (Both)
  const stats = useMemo(() => {
    const pendingTasks = activeTasks.filter((t) => t.status !== 'done');

    const dueThisWeek = activeTasks.filter(
      (t) => t.dueDate >= weekRange.startStr && t.dueDate <= weekRange.endStr
    ).length;

    const dueToday = pendingTasks.filter((t) => t.dueDate === todayStr).length;

    const overdue = pendingTasks.filter((t) => t.dueDate < todayStr).length;

    // Four stat cards: Due this week, Due today, Overdue, Completed
    const completedCount = activeTasks.filter((t) => t.status === 'done').length;

    // Weekly progress
    const thisWeekTasks = activeTasks.filter(
      (t) => t.dueDate >= weekRange.startStr && t.dueDate <= weekRange.endStr
    );
    const thisWeekDone = thisWeekTasks.filter((t) => t.status === 'done').length;
    const thisWeekTotal = thisWeekTasks.length;
    const thisWeekPercent = thisWeekTotal > 0 ? Math.round((thisWeekDone / thisWeekTotal) * 100) : 0;

    return {
      dueThisWeek,
      dueToday,
      overdue,
      completedCount,
      thisWeekDone,
      thisWeekTotal,
      thisWeekPercent,
    };
  }, [activeTasks, weekRange, todayStr]);

  // "Up next" list of upcoming pending tasks, chronologically ordered
  const upNextTasks = useMemo(() => {
    return activeTasks
      .filter((t) => t.status !== 'done')
      .sort((a, b) => {
        const timeA = `${a.dueDate}T${a.dueTime || '23:59'}`;
        const timeB = `${b.dueDate}T${b.dueTime || '23:59'}`;
        return timeA.localeCompare(timeB);
      })
      .slice(0, 10);
  }, [activeTasks]);

  // Type Icon helper
  const getTypeIcon = (type?: string, domain?: PersonaType) => {
    if (!type) return domain === 'student' ? BookOpen : Video;
    switch (type.toLowerCase()) {
      case 'reel':
        return Video;
      case 'post':
        return ImageIcon;
      case 'story':
        return Sparkles;
      case 'carousel':
        return Layers;
      case 'assignment':
        return FileText;
      case 'exam':
        return AlertCircle;
      case 'class':
        return GraduationCap;
      case 'study':
        return BookOpen;
      default:
        return domain === 'student' ? BookOpen : Video;
    }
  };

  // Card edge status color: Red overdue, Amber due soon (today or within 24h), Green on track
  const getEdgeStatus = (task: Task) => {
    if (task.dueDate < todayStr) {
      return {
        borderClass: 'border-l-rose-500',
        label: 'Overdue',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400',
      };
    }
    if (task.dueDate === todayStr) {
      return {
        borderClass: 'border-l-amber-500',
        label: 'Due today',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
      };
    }
    return {
      borderClass: 'border-l-emerald-500',
      label: 'On track',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
    };
  };

  const entityLabel = hasBoth
    ? 'Active brands & classes'
    : hasStudent
    ? 'Active classes'
    : 'Active brands';

  const progressLabel = hasBoth
    ? 'Deliverables & tasks this week'
    : hasStudent
    ? 'Tasks this week'
    : 'Deliverables this week';

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6 pb-24">
      {/* Header: Greeting, today's date, and alerts and settings icons */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              title="Open menu"
              className="md:hidden min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-[12px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] transition-colors cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5 stroke-current" strokeWidth={2} />
              <span className="sr-only">Open menu</span>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F2F2F7] truncate">
              {greeting}, {userName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A0A0B0] font-medium">
                {formattedTodayDate}
              </p>
              {selectedContentType !== 'all' && (
                <button
                  type="button"
                  onClick={onClearContentType}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--orbit-accent,#534AB7)]/15 text-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF]/20 dark:text-[#8B7BFF] text-[11px] font-semibold cursor-pointer"
                >
                  <span>Type: {selectedContentType}</span>
                  <X className="h-3 w-3 stroke-current" strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Icon Button */}
          <button
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="Settings"
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-[10px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] dark:active:bg-[#24242E] transition-colors cursor-pointer"
          >
            <Sliders className="h-5 w-5 stroke-current shrink-0" strokeWidth={2} />
            <span className="sr-only">Settings</span>
          </button>

          {/* Filled Add Task Button */}
          <button
            onClick={onOpenNewTask}
            aria-label="Add task"
            className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[var(--orbit-accent,#534AB7)] hover:bg-[var(--orbit-accent-hover,#433B9B)] rounded-[10px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4 stroke-current shrink-0" strokeWidth={2.5} />
            <span>Add task</span>
          </button>
        </div>
      </div>

      {/* If BOTH modes are ticked: Segmented Filter */}
      {hasBoth && (
        <div className="flex items-center gap-2 p-1 rounded-[10px] bg-slate-100 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 w-fit text-xs font-medium">
          <button
            onClick={() => setSelectedPersonaFilter('all')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] transition-all cursor-pointer ${
              selectedPersonaFilter === 'all'
                ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-[#F2F2F7] font-bold shadow-2xs'
                : 'text-slate-600 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7]'
            }`}
          >
            All Tasks
          </button>
          <button
            onClick={() => setSelectedPersonaFilter('designer')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedPersonaFilter === 'designer'
                ? 'bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:bg-[#534AB7]/30 dark:text-[#8B7BFF] font-bold shadow-2xs'
                : 'text-slate-600 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7]'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
            <span>Designer</span>
          </button>
          <button
            onClick={() => setSelectedPersonaFilter('student')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedPersonaFilter === 'student'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7]'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
            <span>Student</span>
          </button>
        </div>
      )}

      {/* Four stat cards in 2x2 (16px rounded cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Due this week */}
        <div className="p-4 sm:p-5 rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 dark:text-[#A0A0B0]">
            Due this week
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F2F2F7] font-mono tabular-nums">
            {stats.dueThisWeek}
          </div>
          <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Scheduled deadlines
          </span>
        </div>

        {/* Card 2: Due today (Amber number) */}
        <div className="p-4 sm:p-5 rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 dark:text-[#A0A0B0]">
            Due today
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-500 dark:text-amber-400 font-mono tabular-nums">
            {stats.dueToday}
          </div>
          <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Deliver by tonight
          </span>
        </div>

        {/* Card 3: Overdue (Red number) */}
        <div className="p-4 sm:p-5 rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 dark:text-[#A0A0B0]">
            Overdue
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-rose-500 dark:text-rose-400 font-mono tabular-nums">
            {stats.overdue}
          </div>
          <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Needs resolution
          </span>
        </div>

        {/* Card 4: Completed */}
        <div className="p-4 sm:p-5 rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 dark:text-[#A0A0B0] truncate">
            Completed
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {stats.completedCount}
          </div>
          <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
            Finished tasks
          </span>
        </div>
      </div>

      {/* Progress Bar: "Deliverables this week" / "Tasks this week" */}
      <div className="p-4 sm:p-5 rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-[#F2F2F7]">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]" strokeWidth={2} />
            <span>{progressLabel}</span>
          </span>
          <span className="font-mono text-slate-500 dark:text-[#A0A0B0]">
            {stats.thisWeekDone} of {stats.thisWeekTotal} done
          </span>
        </div>

        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${stats.thisWeekPercent}%` }}
          />
        </div>
      </div>

      {/* "This week" strip with 7 days, today highlighted in accent, and an "Open calendar" link */}
      <div className="p-4 sm:p-5 rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A0A0B0] flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 stroke-current" strokeWidth={2} />
            <span>This week</span>
          </span>
          <button
            onClick={onOpenCalendar}
            className="text-xs font-semibold text-[var(--orbit-accent,#534AB7)] hover:underline dark:text-[#8B7BFF] flex items-center gap-1 cursor-pointer"
          >
            <span>Open calendar</span>
            <ChevronRight className="h-4 w-4 stroke-current" strokeWidth={2} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekRange.days.map((d) => {
            const dayTaskCount = activeTasks.filter(
              (t) => t.dueDate === d.dateStr && t.status !== 'done'
            ).length;

            return (
              <div
                key={d.dateStr}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-[10px] border transition-all text-center ${
                  d.isToday
                    ? 'bg-[var(--orbit-accent,#534AB7)] text-white border-[var(--orbit-accent,#534AB7)] font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-850/60 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-[#F2F2F7]'
                }`}
              >
                <span className={`text-[10px] font-semibold uppercase ${d.isToday ? 'text-white/90' : 'text-slate-400 dark:text-[#A0A0B0]'}`}>
                  {d.dayName}
                </span>
                <span className="text-sm sm:text-base font-extrabold font-mono mt-0.5">
                  {d.dayNum}
                </span>

                {/* Deadline Dot or Count */}
                {dayTaskCount > 0 ? (
                  <div
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      d.isToday ? 'bg-amber-300' : 'bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF]'
                    }`}
                    title={`${dayTaskCount} deadline${dayTaskCount > 1 ? 's' : ''}`}
                  />
                ) : (
                  <div className="mt-1 h-1.5 w-1.5 opacity-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* "Up next" list of task cards with colored left edge */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-[#F2F2F7] uppercase tracking-wider">
            Up next
          </h2>
          <span className="text-xs text-slate-400 dark:text-[#A0A0B0] font-mono tabular-nums">
            {upNextTasks.length} pending
          </span>
        </div>

        {upNextTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-[16px] border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-[#A0A0B0] mb-3">
              <CheckCircle2 className="h-6 w-6 stroke-current text-emerald-500" strokeWidth={2} />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-[#F2F2F7]">
              All caught up!
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-[#A0A0B0] max-w-xs">
              No pending deadlines scheduled right now. Tap Add task to schedule your next deliverable.
            </p>
            <button
              onClick={onOpenNewTask}
              className="mt-4 min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[var(--orbit-accent,#534AB7)] hover:bg-[var(--orbit-accent-hover,#433B9B)] rounded-[10px] shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4 stroke-current" strokeWidth={2} />
              <span>Add task</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upNextTasks.map((t) => {
              const statusEdge = getEdgeStatus(t);
              const TypeIcon = getTypeIcon(t.contentType, t.domain);

              // Friendly Due string
              const isTodayDue = t.dueDate === todayStr;
              const dueDisplay = isTodayDue ? `Today · ${t.dueTime}` : `${t.dueDate} · ${t.dueTime}`;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTaskForDetail(t)}
                  className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-[12px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all cursor-pointer border-l-4 ${statusEdge.borderClass}`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {/* Done Toggle Circle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskDone(t.id);
                      }}
                      title="Mark as done"
                      aria-label="Mark task done"
                      className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-[10px] text-slate-400 hover:text-emerald-600 dark:text-[#A0A0B0] dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-[#24242E] dark:active:bg-[#24242E] cursor-pointer transition-colors shrink-0 -ml-1.5"
                    >
                      <Circle className="h-5 w-5 stroke-current" strokeWidth={2} />
                      <span className="sr-only">Mark done</span>
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F2F2F7] group-hover:text-[var(--orbit-accent,#534AB7)] dark:group-hover:text-[#8B7BFF] transition-colors truncate">
                          {t.title}
                        </h3>

                        {/* Deliverable Type Chip with Icon */}
                        {t.contentType && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-[#F2F2F7] text-[10px] font-semibold">
                            <TypeIcon className="h-3 w-3 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]" strokeWidth={2} />
                            <span>{t.contentType}</span>
                          </span>
                        )}

                        {/* Brand or Class */}
                        {t.brand && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-[#A0A0B0]">
                            <span>·</span>
                            <span>{t.brand}</span>
                          </span>
                        )}
                      </div>

                      {/* Due date info */}
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 dark:text-[#A0A0B0]">
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 stroke-current" strokeWidth={2} />
                          <span>{dueDisplay}</span>
                        </div>
                        <span>·</span>
                        <span className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-semibold ${statusEdge.badgeBg}`}>
                          {statusEdge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronRight className="h-5 w-5 stroke-current text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-[#F2F2F7] transition-colors" strokeWidth={2} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
