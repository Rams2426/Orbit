import React from 'react';
import { Task, TeamMember, Sprint, TimeLog } from '../types';
import { BarChart3, TrendingUp, Clock, CheckCircle2, Download, AlertCircle } from 'lucide-react';

interface AnalyticsDashboardProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  sprints: Sprint[];
  timeLogs: TimeLog[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  tasks,
  teamMembers,
  sprints,
  timeLogs,
}) => {
  // Real calculations from state
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const inReviewTasks = tasks.filter((t) => t.status === 'in_review').length;
  const backlogTasks = tasks.filter((t) => t.status === 'backlog').length;

  const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalLoggedHours = tasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const burnRatePercent = totalEstimatedHours > 0 ? Math.round((totalLoggedHours / totalEstimatedHours) * 100) : 0;

  // Workload per team member
  const memberWorkload = teamMembers.map((member) => {
    const memberTasks = tasks.filter((t) => t.assigneeId === member.id);
    const completed = memberTasks.filter((t) => t.status === 'done').length;
    const estHours = memberTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const logHours = memberTasks.reduce((acc, t) => acc + (t.loggedHours || 0), 0);

    return {
      ...member,
      taskCount: memberTasks.length,
      completedCount: completed,
      estimatedHours: estHours,
      loggedHours: logHours,
      rate: memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0,
    };
  });

  // Priority counts
  const urgentCount = tasks.filter((t) => t.priority === 'urgent').length;
  const highCount = tasks.filter((t) => t.priority === 'high').length;
  const mediumCount = tasks.filter((t) => t.priority === 'medium').length;
  const lowCount = tasks.filter((t) => t.priority === 'low').length;

  // Export CSV Report
  const handleExportCSV = () => {
    const headers = ['Task ID', 'Title', 'Status', 'Priority', 'Assignee', 'Sprint', 'Due Date', 'Estimated Hours', 'Logged Hours', 'Completion'];
    const rows = tasks.map((t) => {
      const assignee = teamMembers.find((m) => m.id === t.assigneeId)?.name || 'Unassigned';
      const sprint = sprints.find((s) => s.id === t.sprintId)?.name || 'None';
      return [
        `"${t.id}"`,
        `"${t.title.replace(/"/g, '""')}"`,
        `"${t.status}"`,
        `"${t.priority}"`,
        `"${assignee}"`,
        `"${sprint}"`,
        `"${t.dueDate}"`,
        t.estimatedHours,
        t.loggedHours,
        `"${t.status === 'done' ? '100%' : 'In Flight'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kroma_analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header & Export Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Sprint Intelligence & Capacity Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time delivery velocity, member load distribution, and time tracking metrics.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Primary KPI Metric Strips (clean, unboxed numbers with tabular-nums) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Overall Completion</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {completionRate}%
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{completedTasks}</span> of {totalTasks} tasks resolved
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Hours Logged</span>
            <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {totalLoggedHours}h
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            of <span className="font-semibold text-slate-800 dark:text-slate-200">{totalEstimatedHours}h</span> budgeted ({burnRatePercent}%)
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Active In-Flight</span>
            <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {inProgressTasks + inReviewTasks}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {inProgressTasks} progress · {inReviewTasks} review
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>High Risk & Urgent</span>
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {urgentCount + highCount}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {urgentCount} critical priority · {highCount} high
          </div>
        </div>
      </div>

      {/* Priority Distribution Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Priority Composition
        </h3>
        {/* Stacked Bar */}
        <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
          {totalTasks > 0 && (
            <>
              <div
                style={{ width: `${(urgentCount / totalTasks) * 100}%` }}
                className="bg-rose-600"
                title={`Urgent: ${urgentCount}`}
              />
              <div
                style={{ width: `${(highCount / totalTasks) * 100}%` }}
                className="bg-amber-500"
                title={`High: ${highCount}`}
              />
              <div
                style={{ width: `${(mediumCount / totalTasks) * 100}%` }}
                className="bg-indigo-600"
                title={`Medium: ${mediumCount}`}
              />
              <div
                style={{ width: `${(lowCount / totalTasks) * 100}%` }}
                className="bg-slate-400"
                title={`Low: ${lowCount}`}
              />
            </>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-rose-600" />
            <span>Urgent: <strong className="font-mono tabular-nums">{urgentCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>High: <strong className="font-mono tabular-nums">{highCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            <span>Medium: <strong className="font-mono tabular-nums">{mediumCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <span>Low: <strong className="font-mono tabular-nums">{lowCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Member Capacity & Delivery Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Team Member Workload & Capacity
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-medium">
                <th className="py-3 px-5">Member</th>
                <th className="py-3 px-5">Role</th>
                <th className="py-3 px-5 text-right font-mono tabular-nums">Tasks Assigned</th>
                <th className="py-3 px-5 text-right font-mono tabular-nums">Completed</th>
                <th className="py-3 px-5 text-right font-mono tabular-nums">Hours Logged</th>
                <th className="py-3 px-5 text-right font-mono tabular-nums">Est. Hours</th>
                <th className="py-3 px-5 text-right font-mono tabular-nums">Delivery Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {memberWorkload.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        referrerPolicy="no-referrer"
                        className="h-6 w-6 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{m.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-slate-500 dark:text-slate-400">{m.role}</td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {m.taskCount}
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                    {m.completedCount}
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums text-indigo-600 dark:text-indigo-400 font-medium">
                    {m.loggedHours}h
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {m.estimatedHours}h
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    {m.rate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Time Log Activity */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Recent Logged Sessions
        </h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {timeLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">No focus logs recorded yet.</p>
          ) : (
            timeLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">{log.taskId}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {log.taskTitle}
                    </span>
                  </div>
                  {log.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {log.notes}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                    +{log.durationMinutes} min
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {log.timestamp}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
