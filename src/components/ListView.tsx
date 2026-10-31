import React, { useState, useMemo } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { Task } from '../types/orbit';
import { formatTimeDisplay } from '../utils/timeFormat';
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
} from 'lucide-react';

interface ListViewProps {
  tasks: Task[];
  onOpenEditTask: (task: Task) => void;
  onOpenNewTask: () => void;
}

type ListSectionTab = 'pending' | 'completed';

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  onOpenEditTask,
  onOpenNewTask,
}) => {
  const {
    toggleTaskDone,
    deleteTaskWithUndo,
    deleteMultipleTasksWithUndo,
    duplicateTask,
    currentUser,
    timeFormat,
    setSelectedTaskForDetail,
    userTeamRole,
  } = useOrbit();

  // Persisted Pending / Completed tab selection (defaults to 'pending')
  const [activeListTab, setActiveListTab] = useState<ListSectionTab>(() => {
    const saved = localStorage.getItem('orbit_list_section_tab');
    return saved === 'completed' ? 'completed' : 'pending';
  });

  const handleSelectListTab = (tab: ListSectionTab) => {
    setActiveListTab(tab);
    localStorage.setItem('orbit_list_section_tab', tab);
    setIsSelectMode(false);
    setSelectedIds([]);
  };

  // Track tasks currently animating out between Pending <-> Completed
  const [fadingTaskIds, setFadingTaskIds] = useState<string[]>([]);

  const handleAnimatedToggleDone = (taskId: string) => {
    if (fadingTaskIds.includes(taskId)) return;
    setFadingTaskIds((prev) => [...prev, taskId]);
    setTimeout(() => {
      toggleTaskDone(taskId);
      setFadingTaskIds((prev) => prev.filter((id) => id !== taskId));
    }, 180);
  };

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Confirmation modal states
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showClearCompletedConfirm, setShowClearCompletedConfirm] = useState(false);

  // Device's real current date and time
  const now = new Date();
  const currentTimestamp = now.getTime();
  const next24HoursTimestamp = currentTimestamp + 24 * 60 * 60 * 1000;

  // Separate and sort Pending vs Completed tasks
  const pendingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'done')
      .sort((a, b) => {
        const aTime = new Date(`${a.dueDate}T${a.dueTime || '23:59'}`).getTime();
        const bTime = new Date(`${b.dueDate}T${b.dueTime || '23:59'}`).getTime();
        return aTime - bTime;
      });
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'done')
      .sort((a, b) => {
        const aTime = new Date(a.completedAt || a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.completedAt || b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [tasks]);

  const displayedTasks = activeListTab === 'pending' ? pendingTasks : completedTasks;

  const totalCount = tasks.length;
  const doneCount = completedTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const getDeadlineStatus = (task: Task) => {
    if (task.status === 'done') {
      return {
        label: 'Completed',
        colorBarClass: 'bg-emerald-500/70',
        textClass: 'text-emerald-600 dark:text-emerald-400',
      };
    }

    const taskDueDateTime = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`).getTime();

    if (taskDueDateTime < currentTimestamp) {
      return {
        label: 'Overdue',
        colorBarClass: 'bg-rose-500',
        textClass: 'text-rose-600 dark:text-rose-400 font-semibold',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/70',
      };
    }

    if (taskDueDateTime <= next24HoursTimestamp) {
      return {
        label: 'Due soon',
        colorBarClass: 'bg-amber-500',
        textClass: 'text-amber-600 dark:text-amber-400 font-semibold',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
      };
    }

    return {
      label: 'On track',
      colorBarClass: 'bg-emerald-500',
      textClass: 'text-emerald-600 dark:text-emerald-400 font-medium',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70',
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
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const deletableIds = displayedTasks.filter(canDeleteTask).map((t) => t.id);
    if (selectedIds.length === deletableIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(deletableIds);
    }
  };

  const handleConfirmSingleDelete = () => {
    if (!taskToDelete) return;
    deleteTaskWithUndo(taskToDelete.id);
    setTaskToDelete(null);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedIds.length === 0) return;
    deleteMultipleTasksWithUndo(selectedIds);
    setSelectedIds([]);
    setIsSelectMode(false);
    setShowBulkDeleteConfirm(false);
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

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 pb-24">
      {/* Top Row: Tabs (Pending / Completed) + Progress Line & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 mb-5">
        {/* Tab Row: Pending (n) and Completed (n) */}
        <div className="flex items-center gap-6 -mb-px">
          <button
            type="button"
            onClick={() => handleSelectListTab('pending')}
            className={`min-h-[44px] pb-3 pt-1 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeListTab === 'pending'
                ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:text-[#8B7BFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7]'
            }`}
          >
            <span>Pending ({pendingTasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectListTab('completed')}
            className={`min-h-[44px] pb-3 pt-1 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeListTab === 'completed'
                ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:text-[#8B7BFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7]'
            }`}
          >
            <span>Completed ({completedTasks.length})</span>
          </button>
        </div>

        {/* Right Side: Progress Line ("3 of 8 done" + thin progress bar) & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pb-2.5 sm:pb-2">
          {/* Small progress line + thin progress bar */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-slate-600 dark:text-[#A0A0B0] tabular-nums">
              <strong className="font-bold text-slate-900 dark:text-[#F2F2F7]">{doneCount}</strong> of{' '}
              <strong className="font-bold text-slate-900 dark:text-[#F2F2F7]">{totalCount}</strong> done
            </span>
            <div className="w-24 sm:w-28 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] transition-all duration-300"
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

      {/* Empty States per Tab */}
      {displayedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-[16px] border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
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
            const isFading = fadingTaskIds.includes(task.id);

            return (
              <div
                key={task.id}
                onClick={() => {
                  if (isSelectMode) {
                    if (canDelete) toggleSelectTask(task.id);
                  } else {
                    setSelectedTaskForDetail(task);
                  }
                }}
                className={`relative flex items-stretch rounded-[16px] border transition-all duration-200 overflow-hidden shadow-2xs cursor-pointer ${
                  isFading ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
                } ${
                  isSelected
                    ? 'border-[var(--orbit-accent,#534AB7)] ring-1 ring-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] bg-white dark:bg-slate-900'
                    : isDone
                    ? 'border-slate-200/70 bg-slate-50/70 dark:border-slate-800/70 dark:bg-slate-900/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-800 dark:hover:border-slate-700 dark:bg-slate-900'
                }`}
              >
                {/* Left Color Bar: Red (overdue), Amber (due soon), Green (on track / completed) */}
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
                          if (canDelete) toggleSelectTask(task.id);
                        }}
                        disabled={!canDelete}
                        aria-label={isSelected ? 'Deselect task' : 'Select task'}
                        className="min-w-[44px] min-h-[44px] h-11 w-11 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-[#24242E] transition-colors cursor-pointer shrink-0 disabled:opacity-40"
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnimatedToggleDone(task.id);
                        }}
                        aria-label={isDone ? 'Move back to pending' : 'Mark task as done'}
                        className="min-w-[44px] min-h-[44px] h-11 w-11 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] transition-colors cursor-pointer shrink-0"
                        title={isDone ? 'Move back to pending' : 'Mark as done'}
                      >
                        {isDone ? (
                          <CheckCircle2
                            className="h-6 w-6 stroke-current text-emerald-600 dark:text-emerald-400 fill-emerald-50 dark:fill-emerald-950/40"
                            strokeWidth={2}
                          />
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
                    )}

                    <div className="min-w-0 flex-1">
                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-[#A0A0B0] mb-1">
                        {!isDone && statusInfo.label === 'Overdue' && (
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
                              {task.brand}
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
                      </div>

                      {/* Title */}
                      <h4
                        className={`text-sm font-semibold leading-snug transition-colors ${
                          isDone
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-[#F2F2F7]'
                        }`}
                      >
                        {task.title}
                      </h4>

                      {/* Completed date/time subtitle for Completed cards */}
                      {isDone && (
                        <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <span>{formatCompletedTimestamp(task)}</span>
                        </p>
                      )}

                      {/* Notes */}
                      {!isDone && (task.notes || task.description) && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-[#A0A0B0] line-clamp-2 leading-relaxed">
                          {task.notes || task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Assignee Initials, Date/Time & Actions */}
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
                              onClick={() => handleAnimatedToggleDone(task.id)}
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
                                onClick={() => setTaskToDelete(task)}
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
                                onClick={() => setTaskToDelete(task)}
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
            );
          })}
        </div>
      )}

      {/* Single Task Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm p-5 rounded-[16px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5 stroke-current" strokeWidth={2} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F2F2F7]">
                  Delete this task?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-[#F2F2F7] cursor-pointer"
              >
                <X className="h-4 w-4 stroke-current" strokeWidth={2} />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-[#A0A0B0] leading-relaxed">
              Are you sure you want to delete &ldquo;{taskToDelete.title}&rdquo;? This can&apos;t be
              undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[10px] text-slate-600 dark:text-[#A0A0B0] hover:bg-slate-100 dark:hover:bg-[#24242E] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[10px] bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-colors shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Completed Confirmation Modal */}
      {showClearCompletedConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm p-5 rounded-[16px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
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

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm p-5 rounded-[16px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-5 w-5 stroke-current" strokeWidth={2} />
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#F2F2F7]">
                Delete {selectedIds.length} {selectedIds.length === 1 ? 'task' : 'tasks'}?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-[#A0A0B0] leading-relaxed">
              Delete {selectedIds.length} selected {selectedIds.length === 1 ? 'task' : 'tasks'}?
              This can&apos;t be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[10px] text-slate-600 dark:text-[#A0A0B0] hover:bg-slate-100 dark:hover:bg-[#24242E] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[10px] bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-colors shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
