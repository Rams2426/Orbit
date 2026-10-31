import React, { useMemo, useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { Task, PersonaType } from '../types/orbit';
import {
  Briefcase,
  GraduationCap,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface EntitiesViewProps {
  onOpenNewTaskForEntity: (name: string, domain: PersonaType) => void;
  onOpenEditTask: (task: Task) => void;
}

export const EntitiesView: React.FC<EntitiesViewProps> = ({
  onOpenNewTaskForEntity,
  onOpenEditTask,
}) => {
  const { userProfile, tasks } = useOrbit();

  const userPersonas = userProfile?.personas?.length ? userProfile.personas : ['designer'];
  const hasDesigner = userPersonas.includes('designer');
  const hasStudent = userPersonas.includes('student');
  const hasBoth = hasDesigner && hasStudent;

  const [filterMode, setFilterMode] = useState<'all' | 'designer' | 'student'>('all');

  // Page title and labels
  const pageTitle = hasBoth
    ? 'Brands & Classes'
    : hasStudent
    ? 'Classes & Subjects'
    : 'Brands & Projects';

  const pageSubtitle = hasBoth
    ? 'Manage all client projects and academic courses in one place.'
    : hasStudent
    ? 'Track course deliverables, exams, and lecture prep.'
    : 'Track client deliverables, campaigns, and content schedules.';

  // Group real tasks by brand/subject name
  const entityGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        domain: PersonaType;
        tasks: Task[];
        pending: Task[];
        done: Task[];
        types: Record<string, number>;
        nextTask: Task | null;
      }
    >();

    tasks.forEach((t) => {
      if (!t.brand || !t.brand.trim()) return;
      const name = t.brand.trim();
      const entityDomain = t.domain || 'designer';

      if (hasBoth && filterMode !== 'all' && entityDomain !== filterMode) {
        return;
      }

      if (!map.has(name)) {
        map.set(name, {
          name,
          domain: entityDomain,
          tasks: [],
          pending: [],
          done: [],
          types: {},
          nextTask: null,
        });
      }

      const group = map.get(name)!;
      group.tasks.push(t);
      if (t.status === 'done') {
        group.done.push(t);
      } else {
        group.pending.push(t);
      }

      if (t.contentType) {
        group.types[t.contentType] = (group.types[t.contentType] || 0) + 1;
      }
    });

    // Sort pending tasks by due date to get the next task
    map.forEach((group) => {
      group.pending.sort((a, b) => {
        const timeA = `${a.dueDate}T${a.dueTime || '23:59'}`;
        const timeB = `${b.dueDate}T${b.dueTime || '23:59'}`;
        return timeA.localeCompare(timeB);
      });
      group.nextTask = group.pending[0] || null;
    });

    return Array.from(map.values()).sort((a, b) => {
      // Prioritize entities with pending deadlines
      if (a.pending.length !== b.pending.length) {
        return b.pending.length - a.pending.length;
      }
      return a.name.localeCompare(b.name);
    });
  }, [tasks, hasBoth, filterMode]);

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F2F2F7]">
            {pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A0A0B0] mt-0.5">
            {pageSubtitle}
          </p>
        </div>

        {/* Filter if both modes ticked */}
        {hasBoth && (
          <div className="flex items-center gap-1.5 p-1 rounded-[10px] bg-slate-100 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setFilterMode('all')}
              className={`min-h-[36px] px-3 py-1.5 rounded-[8px] cursor-pointer transition-all ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-[#F2F2F7] shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-[#A0A0B0]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('designer')}
              className={`min-h-[36px] px-3 py-1.5 rounded-[8px] cursor-pointer transition-all ${
                filterMode === 'designer'
                  ? 'bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:bg-[#534AB7]/30 dark:text-[#8B7BFF] shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-[#A0A0B0]'
              }`}
            >
              Brands
            </button>
            <button
              onClick={() => setFilterMode('student')}
              className={`min-h-[36px] px-3 py-1.5 rounded-[8px] cursor-pointer transition-all ${
                filterMode === 'student'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-[#A0A0B0]'
              }`}
            >
              Classes
            </button>
          </div>
        )}
      </div>

      {/* Entity Cards Grid */}
      {entityGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-[16px] border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-[#A0A0B0] mb-3">
            {hasStudent && !hasDesigner ? (
              <GraduationCap className="h-6 w-6 stroke-current text-emerald-500" strokeWidth={2} />
            ) : (
              <Briefcase className="h-6 w-6 stroke-current text-[var(--orbit-accent,#534AB7)]" strokeWidth={2} />
            )}
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-[#F2F2F7]">
            {hasStudent && !hasDesigner ? 'No classes found' : 'No brands or projects found'}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-[#A0A0B0] max-w-sm">
            When you create tasks with a {hasStudent && !hasDesigner ? 'subject / class' : 'brand / project'} name, they will automatically be organized here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entityGroups.map((group) => {
            const total = group.tasks.length;
            const doneCount = group.done.length;
            const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
            const isStudent = group.domain === 'student';

            return (
              <div
                key={group.name}
                className="p-5 rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div>
                  {/* Top Bar: Name + Domain Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                          isStudent
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:bg-[#534AB7]/30 dark:text-[#8B7BFF]'
                        }`}
                      >
                        {isStudent ? (
                          <GraduationCap className="h-5 w-5 stroke-current" strokeWidth={2} />
                        ) : (
                          <Briefcase className="h-5 w-5 stroke-current" strokeWidth={2} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-slate-900 dark:text-[#F2F2F7] truncate">
                          {group.name}
                        </h2>
                        <span className="text-[11px] text-slate-400 dark:text-[#A0A0B0]">
                          {group.pending.length} pending · {doneCount} done
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenNewTaskForEntity(group.name, group.domain)}
                      title={`Add task for ${group.name}`}
                      aria-label={`Add task for ${group.name}`}
                      className="min-h-[40px] px-3 py-1.5 rounded-[10px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-[#24242E] text-slate-700 dark:text-[#F2F2F7] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-[#A0A0B0]">
                      <span>Completion rate</span>
                      <span className="font-mono tabular-nums">{percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isStudent
                            ? 'bg-emerald-500 dark:bg-emerald-400'
                            : 'bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF]'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Types breakdown pills */}
                  {Object.keys(group.types).length > 0 && (
                    <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                      {Object.entries(group.types).map(([typeName, count]) => (
                        <span
                          key={typeName}
                          className="px-2 py-0.5 rounded-[8px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-[#F2F2F7] text-[10px] font-semibold"
                        >
                          {count} {typeName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Next Upcoming Deadline */}
                {group.nextTask && (
                  <div
                    onClick={() => onOpenEditTask(group.nextTask!)}
                    className="p-3 rounded-[10px] bg-slate-50 dark:bg-slate-850/80 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="block text-[10px] font-semibold uppercase text-slate-400 dark:text-[#A0A0B0]">
                        Next deliverable
                      </span>
                      <span className="block text-xs font-bold text-slate-900 dark:text-[#F2F2F7] truncate mt-0.5">
                        {group.nextTask.title}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#A0A0B0] font-mono mt-0.5">
                        <Clock className="h-3 w-3 stroke-current" strokeWidth={2} />
                        <span>{group.nextTask.dueDate} at {group.nextTask.dueTime}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 stroke-current text-slate-400 shrink-0" strokeWidth={2} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
