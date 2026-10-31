import React, { useState } from 'react';
import { Task, TeamMember, TaskStatus } from '../types';
import { Clock, CheckSquare, ArrowRight, ArrowLeft, MoreHorizontal, AlertCircle, Calendar } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  assignee?: TeamMember;
  onOpenDetails: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onStartFocus: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  assignee,
  onOpenDetails,
  onStatusChange,
  onStartFocus,
}) => {
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  // Format Due Date
  const isOverdue = new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0) && task.status !== 'done';
  const dueDateStr = new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Priority color and text pair (no hue-only signaling)
  const priorityConfig = {
    urgent: { label: 'Urgent Priority', textClass: 'text-rose-600 dark:text-rose-400 font-semibold' },
    high: { label: 'High Priority', textClass: 'text-amber-600 dark:text-amber-400 font-medium' },
    medium: { label: 'Medium Priority', textClass: 'text-slate-600 dark:text-slate-400' },
    low: { label: 'Low Priority', textClass: 'text-slate-400 dark:text-slate-500' },
  }[task.priority];

  const statuses: { id: TaskStatus; label: string }[] = [
    { id: 'backlog', label: 'Backlog' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'in_review', label: 'In Review' },
    { id: 'done', label: 'Done' },
  ];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onOpenDetails(task)}
      className="group relative cursor-pointer rounded-lg border border-slate-200 bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      {/* Top row: ID + Priority label */}
      <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
        <span className="font-mono text-slate-400 dark:text-slate-500 font-medium tracking-tight">
          {task.id}
        </span>
        <span className={`text-[11px] ${priorityConfig.textClass} flex items-center gap-1.5`}>
          {task.priority === 'urgent' && (
            <AlertCircle className="h-5 w-5 shrink-0 stroke-current" strokeWidth={2} />
          )}
          {priorityConfig.label}
        </span>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-[#F2F2F7] dark:group-hover:text-[#8B7BFF] leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Description excerpt if present */}
      {task.description && (
        <p className="mt-1 text-xs text-slate-500 dark:text-[#A0A0B0] line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Unboxed Metadata (Tags with subtle separators, zero pills) */}
      {task.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-[#A0A0B0]">
          {task.tags.map((tag, idx) => (
            <React.Fragment key={tag}>
              {idx > 0 && <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>}
              <span className="hover:text-slate-700 dark:hover:text-[#F2F2F7]">{tag}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Subtasks Progress */}
      {totalSubtasks > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#A0A0B0] mb-1">
            <span className="flex items-center gap-1.5">
              <CheckSquare className="h-5 w-5 shrink-0 stroke-current text-slate-400 dark:text-[#A0A0B0]" strokeWidth={2} />
              <span>Subtasks</span>
            </span>
            <span className="font-mono tabular-nums font-medium dark:text-[#F2F2F7]">
              {completedSubtasks}/{totalSubtasks}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-[#8B7BFF] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Footer Row */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        {/* Left: Due Date & Logged Hours */}
        <div className="flex items-center gap-2.5 text-slate-500 dark:text-[#A0A0B0]">
          <div
            className={`flex items-center gap-1.5 text-[11px] ${
              isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''
            }`}
            title={`Due on ${task.dueDate}`}
          >
            <Calendar className="h-5 w-5 shrink-0 stroke-current" strokeWidth={2} />
            <span className="tabular-nums">{dueDateStr}</span>
          </div>

          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>

          <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums" title="Logged vs Estimated Hours">
            <Clock className="h-5 w-5 shrink-0 stroke-current text-slate-400 dark:text-[#A0A0B0]" strokeWidth={2} />
            <span>{task.loggedHours}/{task.estimatedHours}h</span>
          </div>
        </div>

        {/* Right: Quick actions & Assignee avatar */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Quick status mover dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] dark:hover:bg-[#24242E] dark:active:bg-[#24242E] transition-colors cursor-pointer"
              title="Move column"
              aria-label="Move column"
            >
              <MoreHorizontal className="h-5 w-5 stroke-current" strokeWidth={2} />
              <span className="sr-only">Move column</span>
            </button>

            {showMoveMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMoveMenu(false)}
                />
                <div className="absolute right-0 bottom-full mb-1 z-50 w-36 rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Move Status
                  </div>
                  {statuses.map((s) => (
                    <button
                      key={s.id}
                      disabled={s.id === task.status}
                      onClick={() => {
                        onStatusChange(task.id, s.id);
                        setShowMoveMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        s.id === task.status
                          ? 'text-indigo-600 font-medium bg-indigo-50/50 dark:bg-indigo-950/30 dark:text-indigo-400'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{s.label}</span>
                      {s.id === task.status && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                  <button
                    onClick={() => {
                      onStartFocus(task);
                      setShowMoveMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 cursor-pointer font-medium"
                  >
                    Start Focus Session
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Assignee Avatar */}
          {assignee ? (
            <div
              className="relative h-6 w-6 rounded-full overflow-hidden border border-white dark:border-slate-900 shadow-sm shrink-0"
              title={`${assignee.name} (${assignee.role})`}
            >
              <img
                src={assignee.avatarUrl}
                alt={assignee.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={(e) => {
                  // Fallback container if image fails to load
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <div className="avatar-fallback hidden h-full w-full bg-indigo-600 text-[10px] font-semibold text-white flex items-center justify-center">
                {assignee.name.split(' ').map((n) => n[0]).join('')}
              </div>
            </div>
          ) : (
            <div
              className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-400 flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700"
              title="Unassigned"
            >
              ?
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
