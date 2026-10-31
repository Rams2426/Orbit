import React, { useState, useMemo } from 'react';
import { Task } from '../types/orbit';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { TaskDrawer } from './TaskDrawer';
import { useOrbit } from '../context/OrbitContext';
import { formatTimeDisplay } from '../utils/timeFormat';

interface CalendarViewProps {
  currentView: 'month' | 'week';
  tasks: Task[];
  onOpenEditTask: (task: Task) => void;
  onOpenNewTaskForDate: (dateStr: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentView,
  tasks,
  onOpenEditTask,
  onOpenNewTaskForDate,
}) => {
  const { weekStart, timeFormat, setSelectedTaskForDetail } = useOrbit();
  const isMondayStart = weekStart === 'monday';

  // Real device current date
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDrawerDate, setSelectedDrawerDate] = useState<Date | null>(null);

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

  const nowMs = Date.now();
  const next24hMs = nowMs + 24 * 60 * 60 * 1000;

  const getChipColorClasses = (t: Task, isWeekCard = false) => {
    if (t.status === 'done') {
      return isWeekCard
        ? 'border-slate-200 bg-slate-50/80 opacity-55 line-through text-slate-400 dark:border-slate-800 dark:bg-slate-850/60 dark:text-slate-500'
        : 'bg-slate-100/80 text-slate-400 border-slate-200 dark:bg-slate-800/60 dark:text-slate-500 dark:border-slate-700/70 opacity-60 line-through';
    }

    const dueMs = new Date(`${t.dueDate}T${t.dueTime || '23:59'}`).getTime();
    if (dueMs < nowMs) {
      // Overdue -> Red chip
      return isWeekCard
        ? 'border-l-4 border-l-rose-500 border-rose-200 bg-rose-50/60 text-rose-950 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-200'
        : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800/70';
    }
    if (dueMs <= next24hMs) {
      // Due soon -> Amber chip
      return isWeekCard
        ? 'border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/60 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200'
        : 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800/70';
    }
    // On track -> Green chip
    return isWeekCard
      ? 'border-l-4 border-l-emerald-500 border-emerald-200 bg-emerald-50/60 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200'
      : 'bg-emerald-50/90 text-emerald-900 border-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-200 dark:border-emerald-800/70';
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

  // Real today string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

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
    <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 pt-2.5 sm:pt-3 pb-16 md:pb-4 h-[calc(100dvh-114px)] min-h-[440px] flex flex-col">
      {/* Compact Calendar Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-2">
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F2F2F7] capitalize tracking-tight">
            {currentView === 'month'
              ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : 'Weekly Schedule'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* "Show completed" toggle (on by default) */}
          <button
            type="button"
            onClick={handleToggleShowCompleted}
            aria-pressed={showCompleted}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              showCompleted
                ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:bg-[#534AB7]/25 dark:text-[#8B7BFF]'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-[#A0A0B0] hover:bg-slate-100 dark:hover:bg-[#24242E]'
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
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 stroke-current" strokeWidth={2} />
            <span className="sr-only">Previous period</span>
          </button>
          <button
            type="button"
            onClick={nextPeriod}
            aria-label="Next period"
            title="Next period"
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] transition-colors cursor-pointer"
          >
            <ChevronRight className="h-5 w-5 stroke-current" strokeWidth={2} />
            <span className="sr-only">Next period</span>
          </button>
        </div>
      </div>

      {/* Self-Contained Calendar Frame */}
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {/* Weekday column headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 text-center py-1.5 text-[11px] font-semibold text-slate-500 dark:text-[#A0A0B0] shrink-0">
          {weekDayLabels.map((day) => (
            <div key={day} className="truncate">
              {day}
            </div>
          ))}
        </div>

        {/* View Matrix: Month View */}
        {currentView === 'month' && (
          <div className="flex-1 min-h-0 grid grid-cols-7 auto-rows-fr bg-white dark:bg-slate-900">
            {monthDates.map(({ date, isCurrentMonth }, idx) => {
              const dateStr = date.toISOString().split('T')[0];
              const isToday = dateStr === todayStr;
              const dayTasks = visibleTasks.filter((t) => t.dueDate === dateStr);

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDrawerDate(date)}
                  className={`min-h-0 p-1.5 sm:p-2 border-b border-r last:border-r-0 border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between transition-colors cursor-pointer group overflow-hidden ${
                    isCurrentMonth
                      ? 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-850/80'
                      : 'bg-slate-50/40 dark:bg-slate-950/40 opacity-40 hover:opacity-75'
                  }`}
                >
                  {/* Date Number Header */}
                  <div className="flex items-center justify-between mb-0.5 shrink-0">
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-mono tabular-nums ${
                        isToday
                          ? 'bg-[var(--orbit-accent,#534AB7)] font-bold text-white'
                          : 'text-slate-700 dark:text-[#F2F2F7] group-hover:font-semibold'
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

                  {/* Task preview items with time */}
                  <div className="flex-1 min-h-0 space-y-0.5 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskForDetail(t);
                        }}
                        className={`text-[10px] truncate px-1.5 py-0.5 rounded border leading-tight flex items-center gap-1 hover:opacity-90 ${getChipColorClasses(
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
                </div>
              );
            })}
          </div>
        )}

        {/* View Matrix: Week View */}
        {currentView === 'week' && (
          <div className="flex-1 min-h-0 grid grid-cols-7 bg-white dark:bg-slate-900">
            {weekDates.map((date, idx) => {
              const dateStr = date.toISOString().split('T')[0];
              const isToday = dateStr === todayStr;
              const dayTasks = visibleTasks.filter((t) => t.dueDate === dateStr);

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDrawerDate(date)}
                  className="min-h-0 p-2 border-r last:border-r-0 border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-start hover:bg-slate-50/80 dark:hover:bg-slate-850/80 transition-colors cursor-pointer group overflow-hidden"
                >
                  {/* Date header */}
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-mono tabular-nums ${
                        isToday
                          ? 'bg-[var(--orbit-accent,#534AB7)] font-bold text-white'
                          : 'text-slate-800 dark:text-[#F2F2F7] group-hover:font-semibold'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-[#A0A0B0] tabular-nums">
                      {dayTasks.length}
                    </span>
                  </div>

                  {/* Day Tasks in Column */}
                  <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-0.5">
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskForDetail(t);
                        }}
                        className={`p-1.5 sm:p-2 rounded-lg border text-xs leading-snug hover:border-[#534AB7] dark:hover:border-[#8B7BFF] transition-colors ${getChipColorClasses(
                          t,
                          true
                        )}`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono opacity-80 mb-0.5">
                          <span className="flex items-center gap-1">
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
