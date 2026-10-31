import React, { useState } from 'react';
import { Task, TaskStatus, TeamMember } from '../types';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';
import { playChime } from '../utils/sound';

interface KanbanBoardProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  onOpenDetails: (task: Task) => void;
  onOpenNewTaskWithStatus: (status: TaskStatus) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onStartFocus: (task: Task) => void;
}

const COLUMNS: { id: TaskStatus; title: string; hint: string }[] = [
  { id: 'backlog', title: 'Backlog', hint: 'Planned sprint backlog items' },
  { id: 'in_progress', title: 'In Progress', hint: 'Currently actively executing' },
  { id: 'in_review', title: 'In Review', hint: 'Code review, design check & QA' },
  { id: 'done', title: 'Done', hint: 'Verified & shipped to main' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  teamMembers,
  onOpenDetails,
  onOpenNewTaskWithStatus,
  onStatusChange,
  onStartFocus,
}) => {
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onStatusChange(taskId, targetStatus);
      playChime('click');
    }
  };

  const getMember = (assigneeId: string) => {
    return teamMembers.find((m) => m.id === assigneeId);
  };

  return (
    <div className="flex-1 overflow-x-auto p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 min-w-[320px] max-w-7xl mx-auto items-start">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const totalHours = colTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col rounded-xl border transition-all duration-200 min-h-[500px] ${
                isOver
                  ? 'border-indigo-500 bg-indigo-50/20 dark:border-indigo-400 dark:bg-indigo-950/20'
                  : 'border-slate-200 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-900/40'
              } p-3.5`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {col.title}
                  </h3>
                  <span className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 tabular-nums" title="Total estimated hours">
                    {totalHours}h est.
                  </span>
                  <button
                    onClick={() => onOpenNewTaskWithStatus(col.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer"
                    title={`Add task to ${col.title}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Task list container */}
              <div className="flex-1 flex flex-col gap-3 pt-3">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignee={getMember(task.assigneeId)}
                    onOpenDetails={onOpenDetails}
                    onStatusChange={onStatusChange}
                    onStartFocus={onStartFocus}
                  />
                ))}

                {/* Empty State */}
                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-slate-200 rounded-lg dark:border-slate-800">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      No tasks in {col.title.toLowerCase()}
                    </p>
                    <button
                      onClick={() => onOpenNewTaskWithStatus(col.id)}
                      className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 cursor-pointer"
                    >
                      + Add a task
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
