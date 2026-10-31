import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { TaskPriority, TeamMember, Sprint } from '../types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPriority: string;
  onPriorityChange: (p: string) => void;
  selectedAssignee: string;
  onAssigneeChange: (a: string) => void;
  selectedSprint: string;
  onSprintChange: (s: string) => void;
  teamMembers: TeamMember[];
  sprints: Sprint[];
  totalCount: number;
  filteredCount: number;
  onResetFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedPriority,
  onPriorityChange,
  selectedAssignee,
  onAssigneeChange,
  selectedSprint,
  onSprintChange,
  teamMembers,
  sprints,
  totalCount,
  filteredCount,
  onResetFilters,
}) => {
  const isFiltered =
    Boolean(searchQuery) ||
    selectedPriority !== 'all' ||
    selectedAssignee !== 'all' ||
    selectedSprint !== 'all';

  return (
    <div className="flex flex-col gap-3 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-[#A0A0B0] stroke-current" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks by title, tag, or description..."
            className="w-full pl-10 pr-10 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors dark:border-slate-700 dark:bg-slate-800/80 dark:text-[#F2F2F7] dark:placeholder-[#A0A0B0]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] dark:hover:bg-[#24242E] dark:active:bg-[#24242E] cursor-pointer"
              aria-label="Clear search input"
              title="Clear search input"
            >
              <X className="h-5 w-5 stroke-current" strokeWidth={2} />
              <span className="sr-only">Clear search input</span>
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <select
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value)}
            aria-label="Filter by priority"
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Assignee filter */}
          <select
            value={selectedAssignee}
            onChange={(e) => onAssigneeChange(e.target.value)}
            aria-label="Filter by assignee"
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All Assignees</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>

          {/* Sprint filter */}
          <select
            value={selectedSprint}
            onChange={(e) => onSprintChange(e.target.value)}
            aria-label="Filter by sprint"
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer max-w-[180px] truncate"
          >
            <option value="all">All Sprints</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>

          {/* Reset Filters button */}
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-3 min-h-[40px] text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] dark:hover:bg-[#24242E] dark:active:bg-[#24242E] cursor-pointer transition-colors"
            >
              <X className="h-5 w-5 shrink-0 stroke-current" strokeWidth={2} />
              <span>Clear filters</span>
            </button>
          )}
        </div>

        {/* Counter indicator */}
        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
          Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{filteredCount}</span> of {totalCount} tasks
        </div>
      </div>
    </div>
  );
};
