import React, { useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { Task } from '../types/orbit';
import { formatTimeDisplay, canUserDeleteTask } from '../utils/timeFormat';
import {
  X,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Edit2,
  Trash2,
} from 'lucide-react';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  tasks: Task[];
  onOpenEditTask: (task: Task) => void;
  onOpenNewTaskForDate: (dateStr: string) => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  isOpen,
  onClose,
  selectedDate,
  tasks,
  onOpenEditTask,
  onOpenNewTaskForDate,
}) => {
  const {
    toggleTaskDone,
    deleteTaskWithUndo,
    currentUser,
    timeFormat,
    setSelectedTaskForDetail,
    userTeamRole,
  } = useOrbit();

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  if (!isOpen || !selectedDate) return null;

  const dateStr = selectedDate.toISOString().split('T')[0];
  const dateFormatted = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const dayTasks = tasks.filter((t) => t.dueDate === dateStr);

  const canDeleteTask = (task: Task) =>
    canUserDeleteTask(task, currentUser?.uid, userTeamRole);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#1A1A22] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-[#2E2E3A] z-50 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#2E2E3A]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] font-semibold uppercase tracking-wider">
              <Calendar className="h-5 w-5 stroke-current" strokeWidth={2} />
              <span>{dateFormatted}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F2F2F7] mt-1">
              Scheduled Deadlines ({dayTasks.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] cursor-pointer transition-colors"
          >
            <X className="h-5 w-5 stroke-current" strokeWidth={2} />
            <span className="sr-only">Close drawer</span>
          </button>
        </div>

        {/* Task Cards List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {dayTasks.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-[#A0A0B0]">
              <p className="text-xs">No deadlines scheduled for this date.</p>
              <button
                type="button"
                onClick={() => onOpenNewTaskForDate(dateStr)}
                className="mt-3 min-h-[40px] px-3 py-2 text-xs font-semibold text-[var(--orbit-accent,#534AB7)] hover:text-[var(--orbit-accent-hover,#433B9B)] dark:text-[#8B7BFF] dark:hover:text-[#9B8EFF] cursor-pointer"
              >
                + Add task for this date
              </button>
            </div>
          ) : (
            dayTasks.map((task) => {
              const isDone = task.status === 'done';
              const canDelete = canDeleteTask(task);

              return (
                <div
                  key={task.id}
                  onClick={() => {
                    onClose();
                    setSelectedTaskForDetail(task);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isDone
                      ? 'border-slate-200/60 bg-slate-50/50 dark:border-[#2E2E3A]/60 dark:bg-[#24242E]/50 opacity-75'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-[#2E2E3A] dark:bg-[#24242E] dark:hover:border-[#8B7BFF]/50 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskDone(task.id);
                      }}
                      aria-label={isDone ? 'Mark as pending' : 'Mark as done'}
                      className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-[#2E2E3A] active:bg-slate-200 dark:active:bg-[#2E2E3A] transition-colors cursor-pointer shrink-0"
                      title={isDone ? 'Mark pending' : 'Mark done'}
                    >
                      {isDone ? (
                        <CheckCircle2
                          className="h-5 w-5 stroke-current text-emerald-600 dark:text-[#4ADE80] fill-emerald-50 dark:fill-emerald-950/40"
                          strokeWidth={2}
                        />
                      ) : (
                        <Circle
                          className="h-5 w-5 stroke-current text-slate-400 dark:text-[#A0A0B0] hover:text-slate-600 dark:hover:text-[#F2F2F7]"
                          strokeWidth={2}
                        />
                      )}
                      <span className="sr-only">
                        {isDone ? 'Mark as pending' : 'Mark as done'}
                      </span>
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#A0A0B0] mb-1">
                        <span className="flex items-center gap-1 text-slate-700 dark:text-[#F2F2F7] font-mono font-medium">
                          <Clock
                            className="h-4 w-4 stroke-current text-slate-500 dark:text-[#A0A0B0]"
                            strokeWidth={2}
                          />
                          <span>{formatTimeDisplay(task.dueTime, timeFormat)}</span>
                        </span>
                        {task.brand && (
                          <>
                            <span>·</span>
                            <span className="font-medium text-slate-700 dark:text-[#F2F2F7]">
                              {task.brand}
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span className="capitalize">{task.priority}</span>
                      </div>

                      <h4
                        className={`text-xs font-semibold ${
                          isDone
                            ? 'line-through text-slate-400 dark:text-[#6E6E80]'
                            : 'text-slate-900 dark:text-[#F2F2F7]'
                        }`}
                      >
                        {task.title}
                      </h4>

                      {task.notes && (
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-[#A0A0B0] line-clamp-3">
                          {task.notes}
                        </p>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenEditTask(task);
                        }}
                        aria-label={`Edit ${task.title}`}
                        className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center text-slate-500 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#2E2E3A] active:bg-slate-200 dark:active:bg-[#2E2E3A] rounded-xl transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4 stroke-current" strokeWidth={2} />
                        <span className="sr-only">Edit</span>
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(task)}
                          aria-label={`Delete ${task.title}`}
                          className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center text-slate-500 dark:text-[#A0A0B0] hover:text-rose-600 dark:hover:text-[#FF6B6B] hover:bg-rose-50 dark:hover:bg-[#2E2E3A] active:bg-rose-100 dark:active:bg-[#2E2E3A] rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 stroke-current" strokeWidth={2} />
                          <span className="sr-only">Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-[#2E2E3A] bg-slate-50 dark:bg-[#14141A]">
          <button
            type="button"
            onClick={() => onOpenNewTaskForDate(dateStr)}
            className="min-h-[40px] w-full py-2.5 px-3 rounded-xl bg-[var(--orbit-accent,#534AB7)] hover:bg-[var(--orbit-accent-hover,#433B9B)] dark:bg-[#8B7BFF] dark:hover:bg-[#9B8EFF] text-xs font-semibold text-white dark:text-[#0F0F14] shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="h-5 w-5 stroke-current" strokeWidth={2} />
            <span>Add Deadline on this Date</span>
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {taskToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="w-full max-w-sm p-5 rounded-[16px] bg-white dark:bg-[#1A1A22] border border-slate-200 dark:border-[#2E2E3A] shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-[#FF6B6B]">
                <Trash2 className="h-5 w-5 stroke-current" strokeWidth={2} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F2F2F7]">
                  Delete this task?
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#A0A0B0] leading-relaxed">
                Delete &ldquo;{taskToDelete.title}&rdquo;? This can&apos;t be undone.
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
                  onClick={() => {
                    deleteTaskWithUndo(taskToDelete.id);
                    setTaskToDelete(null);
                  }}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[10px] bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-colors shadow-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
