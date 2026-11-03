import React, { useState, useMemo, useEffect } from 'react';
import { Task } from '../types/orbit';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, GripVertical } from 'lucide-react';
import { TaskDrawer } from './TaskDrawer';
import { useOrbit } from '../context/OrbitContext';
import { formatTimeDisplay } from '../utils/timeFormat';

interface CalendarViewProps {
  currentView: 'month' | 'week';
  tasks: Task[];
  onOpenEditTask: (task: Task) => void;
  onOpenNewTaskForDate: (dateStr: string) => void;
  jumpToTodaySignal?: number;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentView,
  tasks,
  onOpenEditTask,
  onOpenNewTaskForDate,
  jumpToTodaySignal = 0,
}) => {
  const { weekStart, timeFormat, setSelectedTaskForDetail, updateTask, showToast } = useOrbit();
  const isMondayStart = weekStart === 'monday';

  // Real today string YYYY-MM-DD in local time
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  // Real device current date
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [focusedDateStr, setFocusedDateStr] = useState<string>(todayStr);
  const [selectedDrawerDate, setSelectedDrawerDate] = useState<Date | null>(null);

  // Drag-and-drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDateStr, setDragOverDateStr] = useState<string | null>(null);

  // Desktop hover preview state
  const [hoveredDateStr, setHoveredDateStr] = useState<string | null>(null);

  // Respond to external "T" (Jump to Today) shortcut signal
  useEffect(() => {
    if (jumpToTodaySignal > 0) {
      const now = new Date();
      setCurrentDate(now);
      setFocusedDateStr(now.toLocaleDateString('en-CA'));
    }
  }, [jumpToTodaySignal]);

  // "Show completed" toggle (on by default, remembered in localStorage)
  const [showCompleted, setShowCompleted] = useState<boolean>(() => {
    return localStorage.getItem('orbit_calendar_show_completed') !== 'false';
  });

  const handleToggleShowCompleted = () => {
    setShowCompleted((prev) => {
      const next = !prev;
      localStorage.setItem('orbit_calendar_show_completed', String(next));
      return next;
    });
  };

  // Filter tasks based on "Show completed" toggle
  const visibleTasks = useMemo(() => {
    return showCompleted ? tasks : tasks.filter((t) => t.status !== 'done');
  }, [tasks, showCompleted]);

  // Arrow keys to move through the calendar on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        e.preventDefault();
        const delta =
          e.key === 'ArrowLeft'
            ? -1
            : e.key === 'ArrowRight'
            ? 1
            : e.key === 'ArrowUp'
            ? -7
            : 7;

        const base = new Date((focusedDateStr || todayStr) + 'T12:00:00');
        base.setDate(base.getDate() + delta);
        const nextStr = base.toLocaleDateString('en-CA');
        setFocusedDateStr(nextStr);
        setCurrentDate(base);
      } else if (e.key === 'Enter' && focusedDateStr && !selectedDrawerDate) {
        e.preventDefault();
        const dayTasks = visibleTasks.filter((t) => t.dueDate === focusedDateStr);
        if (dayTasks.length === 0) {
          onOpenNewTaskForDate(focusedDateStr);
        } else {
          setSelectedDrawerDate(new Date(focusedDateStr + 'T12:00:00'));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedDateStr, todayStr, selectedDrawerDate, visibleTasks, onOpenNewTaskForDate]);

  const nowMs = Date.now();
  const next24hMs = nowMs + 24 * 60 * 60 * 1000;

  const getChipColorClasses = (t: Task, isWeekCard = false) => {
    if (t.status === 'done') {
      return isWeekCard
        ? 'border-slate-200 bg-slate-50/80 opacity-55 line-through text-slate-400 dark:border-[#2E2E3A] dark:bg-[#24242E]/50 dark:text-[#6E6E80]'
        : 'bg-slate-100/80 text-slate-400 border-slate-200 dark:bg-[#24242E]/50 dark:text-[#6E6E80] dark:border-[#2E2E3A] opacity-60 line-through';
    }

    const dueMs = new Date(`${t.dueDate}T${t.dueTime || '23:59'}`).getTime();
    if (dueMs < nowMs) {
      // Overdue -> Red chip with gentle 1x pulse on load
      return isWeekCard
        ? 'border-l-4 border-l-rose-500 orbit-overdue-pulse border-rose-200 bg-rose-50/60 text-rose-950 dark:border-[#FF6B6B]/30 dark:border-l-2 dark:border-l-[#FF6B6B] dark:bg-[#FF6B6B]/15 dark:text-[#FF6B6B]'
        : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-[#FF6B6B]/15 dark:text-[#FF6B6B] dark:border-[#FF6B6B]/30 dark:border-l-2 dark:border-l-[#FF6B6B] orbit-overdue-pulse';
    }
    if (dueMs <= next24hMs) {
      // Due soon -> Amber chip
      return isWeekCard
        ? 'border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/60 text-amber-950 dark:border-[#FFB84D]/30 dark:border-l-2 dark:border-l-[#FFB84D] dark:bg-[#FFB84D]/15 dark:text-[#FFB84D]'
        : 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-[#FFB84D]/15 dark:text-[#FFB84D] dark:border-[#FFB84D]/30 dark:border-l-2 dark:border-l-[#FFB84D]';
    }
    // On track -> Green chip
    return isWeekCard
      ? 'border-l-4 border-l-emerald-500 border-emerald-200 bg-emerald-50/60 text-emerald-950 dark:border-[#4ADE80]/30 dark:border-l-2 dark:border-l-[#4ADE80] dark:bg-[#4ADE80]/15 dark:text-[#4ADE80]'
      : 'bg-emerald-50/90 text-emerald-900 border-emerald-200 dark:bg-[#4ADE80]/15 dark:text-[#4ADE80] dark:border-[#4ADE80]/30 dark:border-l-2 dark:border-l-[#4ADE80]';
  };

  const prevPeriod = () => {
    const d = new Date(currentDate);
    if (currentView === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setCurrentDate(d);
  };

  const nextPeriod = () => {
    const d = new Date(currentDate);
    if (currentView === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setCurrentDate(d);
  };

  const jumpToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setFocusedDateStr(now.toLocaleDateString('en-CA'));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.stopPropagation();
    setDraggedTaskId(task.id);
    setHoveredDateStr(null);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDateStr !== dateStr) {
      setDragOverDateStr(dateStr);
    }
  };

  const handleDropOnDay = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverDateStr(null);

    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.dueDate === targetDateStr) return;

    const previousDueDate = task.dueDate;
    await updateTask(task.id, { dueDate: targetDateStr });

    const formattedTarget = new Date(targetDateStr + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    showToast(`Moved "${task.title}" to ${formattedTarget}`, 'success', () => {
      updateTask(task.id, { dueDate: previousDueDate });
    });
  };

  // Tapping an empty day opens the New task form with that date filled in;
  // tapping a day with tasks opens the Day Drawer.
  const handleDayCellClick = (date: Date, dateStr: string, dayTasksCount: number) => {
    setFocusedDateStr(dateStr);
    if (dayTasksCount === 0) {
      onOpenNewTaskForDate(dateStr);
    } else {
      setSelectedDrawerDate(date);
    }
  };

  // Generate Month Grid Dates respecting weekStart (Monday or Sunday)
  const generateMonthDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const rawFirstDay = new Date(year, month, 1).getDay();
    const firstDayIndex = isMondayStart ? (rawFirstDay + 6) % 7 : rawFirstDay;
    const lastDate = new Date(year, month + 1, 0).getDate();

    const dates: { date: Date; isCurrentMonth: boolean }[] = [];

    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      dates.push({
        date: new Date(year, month - 1, prevMonthLastDate - i),
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= lastDate; i++) {
      dates.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    const remaining = (7 - (dates.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      dates.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return dates;
  };

  // Generate Week Grid Dates respecting weekStart
  const generateWeekDates = () => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const startDay = new Date(curr);
    if (isMondayStart) {
      const monOffset = (day + 6) % 7;
      startDay.setDate(curr.getDate() - monOffset);
    } else {
      startDay.setDate(curr.getDate() - day);
    }

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const monthDates = generateMonthDates();
  const weekDates = generateWeekDates();
  const weekDayLabels = isMondayStart
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 pt-2.5 sm:pt-3 pb-16 md:pb-4 h-[calc(100dvh-114px)] min-h-[440px] flex flex-col orbit-view-fade">
      {/* Compact Calendar Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-2">
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F2F2F7] capitalize tracking-tight">
            {currentView === 'month'
              ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : 'Weekly Schedule'}
          </h2>
          <button
            type="button"
            onClick={jumpToToday}
            title="Jump to Today (Shortcut: T)"
            className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] text-xs font-semibold text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] cursor-pointer transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* "Show completed" toggle (on by default) */}
          <button
            type="button"
            onClick={handleToggleShowCompleted}
            aria-pressed={showCompleted}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              showCompleted
                ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:bg-[#8B7BFF]/15 dark:text-[#8B7BFF]'
                : 'border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] text-slate-600 dark:text-[#A0A0B0] hover:bg-slate-100 dark:hover:bg-[#24242E]'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
            <span>Show completed</span>
          </button>

          <button
            type="button"
            onClick={prevPeriod}
            aria-label="Previous period"
            title="Previous period"
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 stroke-current" strokeWidth={2} />
            <span className="sr-only">Previous period</span>
          </button>
          <button
            type="button"
            onClick={nextPeriod}
            aria-label="Next period"
            title="Next period"
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] transition-colors cursor-pointer"
          >
            <ChevronRight className="h-5 w-5 stroke-current" strokeWidth={2} />
            <span className="sr-only">Next period</span>
          </button>
        </div>
      </div>

      {/* Self-Contained Calendar Frame with Cross-Fade between Month and Week */}
      <div
        key={currentView}
        className="flex-1 min-h-0 flex flex-col rounded-2xl border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] overflow-hidden shadow-xs orbit-view-fade"
      >
        {/* Weekday column headers — matching dark surface with light text, no light grey bar */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-[#2E2E3A] bg-slate-50/80 dark:bg-[#1A1A22] text-center py-2 text-[11px] font-semibold text-slate-500 dark:text-[#F2F2F7] shrink-0">
          {weekDayLabels.map((day) => (
            <div key={day} className="truncate">
              {day}
            </div>
          ))}
        </div>

        {/* View Matrix: Month View */}
        {currentView === 'month' && (
          <div className="flex-1 min-h-0 grid grid-cols-7 auto-rows-fr bg-white dark:bg-[#1A1A22]">
            {monthDates.map(({ date, isCurrentMonth }, idx) => {
              const dateStr = date.toLocaleDateString('en-CA');
              const isToday = dateStr === todayStr;
              const isFocused = dateStr === focusedDateStr;
              const isDropTarget = dragOverDateStr === dateStr;
              const dayTasks = visibleTasks.filter((t) => t.dueDate === dateStr);
              const isHovered = hoveredDateStr === dateStr && dayTasks.length > 0 && !draggedTaskId;

              return (
                <div
                  key={idx}
                  onClick={() => handleDayCellClick(date, dateStr, dayTasks.length)}
                  onMouseEnter={() => setHoveredDateStr(dateStr)}
                  onMouseLeave={() => setHoveredDateStr((prev) => (prev === dateStr ? null : prev))}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={() =>
                    setDragOverDateStr((prev) => (prev === dateStr ? null : prev))
                  }
                  onDrop={(e) => handleDropOnDay(e, dateStr)}
                  aria-label={`${date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}, ${dayTasks.length} tasks`}
                  className={`relative min-h-0 p-1.5 sm:p-2 border-b border-r last:border-r-0 border-slate-200/80 dark:border-[#2E2E3A] flex flex-col justify-between transition-all duration-150 cursor-pointer group ${
                    isDropTarget
                      ? 'ring-2 ring-inset ring-[var(--orbit-accent,#534AB7)] bg-indigo-50/80 dark:bg-[#8B7BFF]/20'
                      : isFocused
                      ? 'ring-1 ring-inset ring-[var(--orbit-accent,#534AB7)]/50 dark:ring-[#8B7BFF]/50'
                      : ''
                  } ${
                    isCurrentMonth
                      ? 'bg-white dark:bg-[#1A1A22] hover:bg-slate-50/80 dark:hover:bg-[#24242E]'
                      : 'bg-slate-50/40 dark:bg-[#0F0F14]/60 dark:text-[#6E6E80] opacity-50 hover:opacity-75'
                  }`}
                >
                  {/* Date Number Header */}
                  <div className="flex items-center justify-between mb-0.5 shrink-0">
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-mono tabular-nums ${
                        isToday
                          ? 'bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] dark:text-[#0F0F14] font-bold text-white'
                          : isCurrentMonth
                          ? 'text-slate-700 dark:text-[#F2F2F7] group-hover:font-semibold'
                          : 'text-slate-400 dark:text-[#6E6E80]'
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-mono text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] font-semibold tabular-nums hidden sm:inline">
                        {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>

                  {/* Draggable Task preview items with time */}
                  <div className="flex-1 min-h-0 space-y-0.5 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t)}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDragOverDateStr(null);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskForDetail(t);
                        }}
                        className={`text-[10px] truncate px-1.5 py-0.5 rounded border leading-tight flex items-center gap-1 hover:opacity-90 cursor-grab active:cursor-grabbing ${getChipColorClasses(
                          t,
                          false
                        )}`}
                      >
                        <span className="font-mono text-[9px] opacity-75 shrink-0 hidden md:inline">
                          {t.dueTime}
                        </span>
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[9px] text-slate-400 dark:text-[#A0A0B0] font-medium pl-1 leading-none">
                        +{dayTasks.length - 2} more
                      </div>
                    )}
                  </div>

                  {/* Desktop Hover Preview Tooltip */}
                  {isHovered && (
                    <div
                      role="tooltip"
                      className="hidden md:block pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-40 w-52 p-2.5 rounded-xl bg-slate-900/95 dark:bg-[#1A1A22] text-white dark:text-[#F2F2F7] border border-slate-700 dark:border-[#2E2E3A] shadow-xl space-y-1.5 orbit-view-fade"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A0A0B0] flex items-center justify-between">
                        <span>
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span>{dayTasks.length} due</span>
                      </div>
                      <div className="space-y-1">
                        {dayTasks.slice(0, 4).map((t) => (
                          <div key={t.id} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="truncate font-medium">{t.title}</span>
                            <span className="font-mono text-[10px] text-slate-300 dark:text-[#A0A0B0] shrink-0">
                              {formatTimeDisplay(t.dueTime, timeFormat)}
                            </span>
                          </div>
                        ))}
                        {dayTasks.length > 4 && (
                          <div className="text-[10px] text-slate-400 dark:text-[#A0A0B0]">
                            +{dayTasks.length - 4} more...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* View Matrix: Week View */}
        {currentView === 'week' && (
          <div className="flex-1 min-h-0 grid grid-cols-7 bg-white dark:bg-[#1A1A22]">
            {weekDates.map((date, idx) => {
              const dateStr = date.toLocaleDateString('en-CA');
              const isToday = dateStr === todayStr;
              const isFocused = dateStr === focusedDateStr;
              const isDropTarget = dragOverDateStr === dateStr;
              const dayTasks = visibleTasks.filter((t) => t.dueDate === dateStr);

              return (
                <div
                  key={idx}
                  onClick={() => handleDayCellClick(date, dateStr, dayTasks.length)}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={() =>
                    setDragOverDateStr((prev) => (prev === dateStr ? null : prev))
                  }
                  onDrop={(e) => handleDropOnDay(e, dateStr)}
                  className={`min-h-0 p-2 border-r last:border-r-0 border-slate-200/80 dark:border-[#2E2E3A] flex flex-col justify-start hover:bg-slate-50/80 dark:hover:bg-[#24242E] transition-all duration-150 cursor-pointer group overflow-hidden ${
                    isDropTarget
                      ? 'ring-2 ring-inset ring-[var(--orbit-accent,#534AB7)] bg-indigo-50/80 dark:bg-[#8B7BFF]/20'
                      : isFocused
                      ? 'ring-1 ring-inset ring-[var(--orbit-accent,#534AB7)]/50 dark:ring-[#8B7BFF]/50'
                      : ''
                  }`}
                >
                  {/* Date header */}
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-[#2E2E3A] shrink-0">
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-mono tabular-nums ${
                        isToday
                          ? 'bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] dark:text-[#0F0F14] font-bold text-white'
                          : 'text-slate-800 dark:text-[#F2F2F7] group-hover:font-semibold'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-[#A0A0B0] tabular-nums">
                      {dayTasks.length}
                    </span>
                  </div>

                  {/* Draggable Day Tasks in Column */}
                  <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-0.5">
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t)}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDragOverDateStr(null);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskForDetail(t);
                        }}
                        className={`p-1.5 sm:p-2 rounded-lg border text-xs leading-snug hover:border-[#534AB7] dark:hover:border-[#8B7BFF] transition-colors cursor-grab active:cursor-grabbing ${getChipColorClasses(
                          t,
                          true
                        )}`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono opacity-80 mb-0.5">
                          <span className="flex items-center gap-1">
                            <GripVertical className="h-3 w-3 opacity-50 shrink-0 hidden sm:inline" />
                            <Clock className="h-3 w-3 stroke-current" strokeWidth={2} />
                            <span>{formatTimeDisplay(t.dueTime, timeFormat)}</span>
                          </span>
                          <span className="capitalize font-medium hidden sm:inline">{t.priority}</span>
                        </div>
                        <div className="font-semibold truncate">{t.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Date Tasks Detail Drawer */}
      <TaskDrawer
        isOpen={Boolean(selectedDrawerDate)}
        onClose={() => setSelectedDrawerDate(null)}
        selectedDate={selectedDrawerDate}
        tasks={visibleTasks}
        onOpenEditTask={onOpenEditTask}
        onOpenNewTaskForDate={onOpenNewTaskForDate}
      />
    </div>
  );
};
