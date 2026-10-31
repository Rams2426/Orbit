import React, { useState } from 'react';
import { Task, Sprint, TeamMember } from '../types';
import { Calendar, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

interface RoadmapTimelineProps {
  tasks: Task[];
  sprints: Sprint[];
  teamMembers: TeamMember[];
  onOpenDetails: (task: Task) => void;
}

export const RoadmapTimeline: React.FC<RoadmapTimelineProps> = ({
  tasks,
  sprints,
  teamMembers,
  onOpenDetails,
}) => {
  const [selectedSprintId, setSelectedSprintId] = useState<string>('all');
  const [zoomMode, setZoomMode] = useState<'days' | 'weeks'>('days');

  // Filter tasks by sprint if chosen
  const filteredTasks = selectedSprintId === 'all'
    ? tasks
    : tasks.filter((t) => t.sprintId === selectedSprintId);

  // Compute reference dates
  // Find min and max dates from tasks & sprints
  const now = new Date('2026-10-31');
  const startReference = new Date('2026-10-15');
  const totalDays = 45; // 45 day window from Oct 15 to end of Nov

  const days: Date[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startReference);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const getDayOffset = (dateStr: string) => {
    const d = new Date(dateStr);
    const diffTime = d.getTime() - startReference.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(diffDays, totalDays - 1));
  };

  const getMember = (id: string) => teamMembers.find((m) => m.id === id);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Sprint & Delivery Roadmap
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Visual task timeline, delivery dependencies, and milestone tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sprint selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <Layers className="h-4 w-4" />
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="all">All Sprints</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Zoom toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
            <button
              onClick={() => setZoomMode('days')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                zoomMode === 'days'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Days
            </button>
            <button
              onClick={() => setZoomMode('weeks')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                zoomMode === 'weeks'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Weeks
            </button>
          </div>
        </div>
      </div>

      {/* Sprints Overview Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        {sprints.map((sprint) => {
          const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id);
          const doneTasks = sprintTasks.filter((t) => t.status === 'done');
          const percent = sprintTasks.length > 0 ? Math.round((doneTasks.length / sprintTasks.length) * 100) : 0;

          return (
            <div
              key={sprint.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {sprint.name}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-indigo-600 dark:text-indigo-400 font-semibold">
                  {percent}% completed
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {sprint.goal}
              </p>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                <span>{sprint.startDate}</span>
                <span>{sprintTasks.length} tasks ({doneTasks.length} shipped)</span>
                <span>{sprint.endDate}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Gantt / Timeline Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Timeline Days Header */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
              <div className="w-72 shrink-0 p-3 text-xs font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                Task & Ownership
              </div>
              <div className="flex-1 flex">
                {days.map((date, idx) => {
                  const isToday = date.toDateString() === now.toDateString();
                  const isMonday = date.getDay() === 1;
                  const showLabel = zoomMode === 'weeks' ? isMonday : true;

                  return (
                    <div
                      key={idx}
                      className={`flex-1 min-w-[28px] py-2 text-center border-r border-slate-100 dark:border-slate-800/60 text-[10px] font-mono tabular-nums ${
                        isToday
                          ? 'bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {showLabel && (
                        <div>
                          <div>{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                          <div>{date.getDate()}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tasks Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredTasks.map((task) => {
                const assignee = getMember(task.assigneeId);
                const startDay = getDayOffset(task.createdAt);
                const endDay = getDayOffset(task.dueDate);
                const durationDays = Math.max(2, endDay - startDay + 1);

                const leftPercent = (startDay / totalDays) * 100;
                const widthPercent = (durationDays / totalDays) * 100;

                const statusColor = {
                  done: 'bg-emerald-600 border-emerald-700 text-white',
                  in_review: 'bg-amber-500 border-amber-600 text-white',
                  in_progress: 'bg-indigo-600 border-indigo-700 text-white',
                  backlog: 'bg-slate-400 border-slate-500 text-white',
                }[task.status];

                return (
                  <div
                    key={task.id}
                    className="flex items-center hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Left info column */}
                    <div
                      onClick={() => onOpenDetails(task)}
                      className="w-72 shrink-0 p-3 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">
                            {task.id}
                          </span>
                          <span className="text-xs font-medium text-slate-800 group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-400 truncate">
                            {task.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{assignee ? assignee.name : 'Unassigned'}</span>
                          <span>·</span>
                          <span className="capitalize">{task.status.replace('_', ' ')}</span>
                        </div>
                      </div>

                      {assignee && (
                        <img
                          src={assignee.avatarUrl}
                          alt={assignee.name}
                          referrerPolicy="no-referrer"
                          className="h-5 w-5 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                      )}
                    </div>

                    {/* Right Timeline Bar Track */}
                    <div className="flex-1 relative h-12 flex items-center px-1">
                      {/* Today marker vertical guide line */}
                      <div
                        className="absolute top-0 bottom-0 w-px bg-indigo-500/30 z-0 pointer-events-none"
                        style={{ left: `${(getDayOffset('2026-10-31') / totalDays) * 100}%` }}
                      />

                      {/* Task Schedule Bar */}
                      <div
                        onClick={() => onOpenDetails(task)}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
                        }}
                        className={`absolute h-7 rounded-md border text-xs px-2 flex items-center justify-between cursor-pointer shadow-xs hover:brightness-105 transition-all z-10 ${statusColor}`}
                        title={`${task.title} (Due: ${task.dueDate})`}
                      >
                        <span className="truncate text-[11px] font-medium leading-none">
                          {task.title}
                        </span>
                        <span className="font-mono text-[10px] tabular-nums shrink-0 ml-1.5 opacity-90">
                          {task.loggedHours}/{task.estimatedHours}h
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
