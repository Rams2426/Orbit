import React, { useState, useEffect, useMemo } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { Task, Priority, PersonaType } from '../types/orbit';
import {
  X,
  Plus,
  Trash2,
  Copy,
  AlertCircle,
  Video,
  Image as ImageIcon,
  Sparkles,
  Layers,
  FileText,
  GraduationCap,
  BookOpen,
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
} from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  defaultDueDate?: string;
  defaultDomain?: PersonaType;
  defaultIsTeamTask?: boolean;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  task,
  defaultDueDate,
  defaultDomain,
  defaultIsTeamTask,
}) => {
  const {
    createTask,
    updateTask,
    deleteTaskWithUndo,
    duplicateTask,
    userProfile,
    activePair,
    team,
    teamMembers,
    currentUser,
  } = useOrbit();

  // Personas from settings: can be ['designer'], ['student'], or ['designer', 'student']
  const userPersonas: PersonaType[] = userProfile?.personas?.length
    ? userProfile.personas
    : ['designer'];
  const hasDesigner = userPersonas.includes('designer');
  const hasStudent = userPersonas.includes('student');
  const hasBoth = hasDesigner && hasStudent;

  // Active domain for this task
  const [domain, setDomain] = useState<PersonaType>(defaultDomain || userPersonas[0] || 'designer');
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<string>('Reel');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('17:00');
  const [priority, setPriority] = useState<Priority>('medium');
  const [notes, setNotes] = useState('');

  // Destination schedule: 'my' | 'partner' | 'team'
  const [targetSchedule, setTargetSchedule] = useState<'my' | 'partner' | 'team'>('my');
  const [assigneeUid, setAssigneeUid] = useState<string>('');

  // Form submission and error states
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Only true if a second person has actually accepted the pair invite
  const isLinkedWithPartner = Boolean(
    activePair && activePair.status === 'active' && activePair.freelancerUid
  );

  // Partner display name if actively linked
  const partnerName = useMemo(() => {
    if (!activePair || activePair.status !== 'active' || !activePair.freelancerUid) return null;
    const otherEmail =
      currentUser?.uid === activePair.bossUid
        ? activePair.freelancerEmail
        : activePair.bossEmail;
    return otherEmail ? otherEmail.split('@')[0] : 'Partner';
  }, [activePair, currentUser?.uid]);

  useEffect(() => {
    setErrorMessage(null);
    setIsSaving(false);

    if (task) {
      setTitle(task.title);
      setDueDate(task.dueDate);
      setDueTime(task.dueTime || '17:00');
      setPriority(task.priority || 'medium');
      setNotes(task.notes || '');
      setDomain(task.domain || (userPersonas[0] as PersonaType) || 'designer');
      setContentType(task.contentType || (task.domain === 'student' ? 'Assignment' : 'Reel'));
      setTargetSchedule(task.teamId ? 'team' : task.pairId ? 'partner' : 'my');
      setAssigneeUid(task.assigneeUid || currentUser?.uid || '');
    } else {
      setTitle('');
      // Default to device's today date
      if (defaultDueDate) {
        setDueDate(defaultDueDate);
      } else {
        const todayStr = new Date().toLocaleDateString('en-CA'); // format: YYYY-MM-DD
        setDueDate(todayStr);
      }
      setDueTime('17:00');
      setPriority('medium');
      setNotes('');
      setTargetSchedule(defaultIsTeamTask && team ? 'team' : 'my');
      setAssigneeUid(currentUser?.uid || '');

      const initialDomain: PersonaType = defaultDomain || userPersonas[0] || 'designer';
      setDomain(initialDomain);
      setContentType(initialDomain === 'student' ? 'Assignment' : 'Reel');
    }
  }, [task, defaultDueDate, defaultDomain, defaultIsTeamTask, isOpen, userPersonas, team, currentUser]);

  if (!isOpen) return null;

  // Placeholder and Labels adapted to Designer vs Student choice
  const titlePlaceholder =
    domain === 'student' ? 'e.g. Chemistry lab report' : 'e.g. Summer campaign reel';

  const notesLabel = domain === 'student' ? 'Notes' : 'Task description';

  const handleSelectChip = (type: string, chipDomain: PersonaType) => {
    setContentType(type);
    setDomain(chipDomain);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate || !dueTime) {
      setErrorMessage('Please provide a task title, due date, and exact time.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const isShared = targetSchedule === 'partner' && isLinkedWithPartner;
      const isTeam = (targetSchedule === 'team' || Boolean(defaultIsTeamTask)) && Boolean(team);
      const assignedMember = teamMembers.find((m) => m.uid === assigneeUid);
      const resolvedAssigneeName = assignedMember
        ? assignedMember.displayName
        : currentUser?.displayName || 'Myself';

      if (task) {
        await updateTask(task.id, {
          title: title.trim(),
          dueDate,
          dueTime,
          priority,
          notes: notes.trim(),
          contentType: contentType.trim() ? contentType.trim() : undefined,
          domain,
          ...(task.teamId
            ? {
                assigneeUid: assigneeUid || currentUser?.uid,
                assigneeName: resolvedAssigneeName,
              }
            : {}),
        });
      } else {
        await createTask({
          title: title.trim(),
          dueDate,
          dueTime,
          priority,
          notes: notes.trim(),
          contentType: contentType.trim() ? contentType.trim() : undefined,
          domain,
          status: 'todo',
          isSharedPairTask: isShared,
          isTeamTask: isTeam,
          ...(isTeam
            ? {
                assigneeUid: assigneeUid || currentUser?.uid,
                assigneeName: resolvedAssigneeName,
              }
            : {}),
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Failed to save task:', err);
      let detail = err?.message || 'Failed to save task to Firestore.';
      try {
        const parsed = JSON.parse(detail);
        detail = parsed.error || detail;
      } catch {
        // Keep raw error string
      }
      setErrorMessage(`Unable to save deadline: ${detail}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    deleteTaskWithUndo(task.id);
    onClose();
  };

  const handleDuplicate = async () => {
    if (!task) return;
    try {
      await duplicateTask(task);
      onClose();
    } catch (err: any) {
      setErrorMessage(`Duplicate failed: ${err?.message || 'Check connection'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card - 16px rounded corners, perfectly sized without nested inner scroll */}
      <div className="relative w-full max-w-lg rounded-[16px] border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-auto">
        {/* Header: Title "New task" + close X at top right */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F2F2F7]">
              {task ? 'Edit task' : 'New task'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-[#A0A0B0] mt-0.5">
              {domain === 'student' ? 'Academic schedule & deadline' : 'Deliverable schedule & deadline'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-[10px] text-slate-500 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] cursor-pointer transition-colors"
          >
            <X className="h-5 w-5 stroke-current" strokeWidth={2} />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Clear on-screen error banner if saving fails */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-[10px] bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="h-5 w-5 shrink-0 stroke-current text-rose-600 dark:text-rose-400 mt-0.5" strokeWidth={2} />
            <div className="flex-1">
              <p className="font-semibold text-rose-900 dark:text-rose-200">Unable to save task</p>
              <p className="mt-0.5 text-[11px] leading-relaxed break-words">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200 cursor-pointer"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4 stroke-current" strokeWidth={2} />
              <span className="sr-only">Dismiss error</span>
            </button>
          </div>
        )}

        {/* Form Body - Clean and compact, without inner scrollbars */}
        <form onSubmit={handleSubmit} className="pt-3.5 space-y-3">
          {/* 1. Task title (required) */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] mb-1">
              Task title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={titlePlaceholder}
              className="w-full px-3.5 py-2 text-xs rounded-[10px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--orbit-accent,#534AB7)]/30 focus:border-[var(--orbit-accent,#534AB7)] dark:border-slate-700 dark:bg-slate-800 dark:text-[#F2F2F7] dark:placeholder:text-[#A0A0B0] transition-colors"
            />
          </div>

          {/* 2. Type chips in a 2x2 grid with icons */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] mb-1.5">
              Deliverable type
            </label>

            {/* If BOTH ticked: show two labeled groups */}
            {hasBoth ? (
              <div className="space-y-2.5">
                {/* Designer Group */}
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-[#A0A0B0] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>Designer Deliverables</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'Reel', icon: Video, desc: 'Short vertical video' },
                      { type: 'Post', icon: ImageIcon, desc: 'Single static visual' },
                      { type: 'Story', icon: Sparkles, desc: 'Ephemeral highlight' },
                      { type: 'Carousel', icon: Layers, desc: 'Multi-slide deck' },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = contentType === item.type && domain === 'designer';
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => handleSelectChip(item.type, 'designer')}
                          className={`min-h-[42px] px-2.5 py-1.5 rounded-[10px] border text-left flex items-center gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:bg-[#534AB7]/25 dark:text-[#8B7BFF] ring-1 ring-[var(--orbit-accent,#534AB7)]'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-[#A0A0B0] hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <Icon className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
                          <div className="min-w-0">
                            <span className="block text-xs font-bold leading-tight">{item.type}</span>
                            <span className="block text-[10px] opacity-75 truncate">{item.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Student Group */}
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-[#A0A0B0] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>Student Tasks</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'Assignment', icon: FileText, desc: 'Homework or project' },
                      { type: 'Exam', icon: AlertCircle, desc: 'Midterm, quiz, test' },
                      { type: 'Class', icon: GraduationCap, desc: 'Lecture or lab' },
                      { type: 'Study', icon: BookOpen, desc: 'Review & reading' },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = contentType === item.type && domain === 'student';
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => handleSelectChip(item.type, 'student')}
                          className={`min-h-[42px] px-2.5 py-1.5 rounded-[10px] border text-left flex items-center gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/30 dark:text-emerald-300 ring-1 ring-emerald-500'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-[#A0A0B0] hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <Icon className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
                          <div className="min-w-0">
                            <span className="block text-xs font-bold leading-tight">{item.type}</span>
                            <span className="block text-[10px] opacity-75 truncate">{item.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : domain === 'student' ? (
              /* Student 2x2 grid */
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'Assignment', icon: FileText, desc: 'Homework or paper' },
                  { type: 'Exam', icon: AlertCircle, desc: 'Midterm or final' },
                  { type: 'Class', icon: GraduationCap, desc: 'Lecture or lab' },
                  { type: 'Study', icon: BookOpen, desc: 'Study session' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = contentType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleSelectChip(item.type, 'student')}
                      className={`min-h-[44px] px-2.5 py-1.5 rounded-[10px] border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:bg-[#534AB7]/25 dark:text-[#8B7BFF] ring-1 ring-[var(--orbit-accent,#534AB7)] shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-[#A0A0B0] hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <Icon className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
                      <div className="min-w-0">
                        <span className="block text-xs font-bold leading-tight">{item.type}</span>
                        <span className="block text-[10px] opacity-75 truncate">{item.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Designer 2x2 grid */
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'Reel', icon: Video, desc: 'Short vertical video' },
                  { type: 'Post', icon: ImageIcon, desc: 'Feed image or graphic' },
                  { type: 'Story', icon: Sparkles, desc: '24-hour update' },
                  { type: 'Carousel', icon: Layers, desc: 'Multi-slide slides' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = contentType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleSelectChip(item.type, 'designer')}
                      className={`min-h-[44px] px-2.5 py-1.5 rounded-[10px] border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:bg-[#534AB7]/25 dark:text-[#8B7BFF] ring-1 ring-[var(--orbit-accent,#534AB7)] shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-[#A0A0B0] hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <Icon className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
                      <div className="min-w-0">
                        <span className="block text-xs font-bold leading-tight">{item.type}</span>
                        <span className="block text-[10px] opacity-75 truncate">{item.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Date (required) and Time (required), side by side */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] mb-1 flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 stroke-current text-slate-400 dark:text-[#A0A0B0]" strokeWidth={2} />
                <span>Date</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-[10px] border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--orbit-accent,#534AB7)]/30 focus:border-[var(--orbit-accent,#534AB7)] dark:border-slate-700 dark:bg-slate-800 dark:text-[#F2F2F7] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] mb-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 stroke-current text-slate-400 dark:text-[#A0A0B0]" strokeWidth={2} />
                <span>Time</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-[10px] border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--orbit-accent,#534AB7)]/30 focus:border-[var(--orbit-accent,#534AB7)] dark:border-slate-700 dark:bg-slate-800 dark:text-[#F2F2F7] transition-colors"
              />
            </div>
          </div>

          {/* 4. Priority: Low, Medium, High, Urgent in one row */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] mb-1">
              Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                {
                  id: 'low',
                  label: 'Low',
                  baseClass:
                    'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-[#A0A0B0]',
                  activeClass:
                    'border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-[#F2F2F7] ring-1 ring-slate-400 font-bold',
                },
                {
                  id: 'medium',
                  label: 'Medium',
                  baseClass:
                    'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-[#A0A0B0]',
                  activeClass:
                    'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:bg-[#534AB7]/25 dark:text-[#8B7BFF] ring-1 ring-[var(--orbit-accent,#534AB7)] font-bold',
                },
                {
                  id: 'high',
                  label: 'High',
                  baseClass:
                    'border-amber-200/80 bg-amber-50/40 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400',
                  activeClass:
                    'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-500 dark:bg-amber-950/60 dark:text-amber-200 ring-1 ring-amber-400 font-bold shadow-2xs',
                },
                {
                  id: 'urgent',
                  label: 'Urgent',
                  baseClass:
                    'border-rose-200/80 bg-rose-50/40 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400',
                  activeClass:
                    'border-rose-400 bg-rose-100 text-rose-900 dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-200 ring-1 ring-rose-400 font-bold shadow-2xs',
                },
              ].map((p) => {
                const isSelected = priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as Priority)}
                    className={`min-h-[38px] px-2 py-1.5 text-xs rounded-[10px] border text-center transition-all cursor-pointer ${
                      isSelected ? p.activeClass : p.baseClass
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Optional multiline field: "Task description" (Designer) / "Notes" (Student) */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] mb-1">
              {notesLabel} <span className="text-[11px] font-normal text-slate-500 dark:text-[#A0A0B0]">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instructions, links, or requirements..."
              className="w-full px-3.5 py-2 text-xs rounded-[10px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--orbit-accent,#534AB7)]/30 focus:border-[var(--orbit-accent,#534AB7)] dark:border-slate-700 dark:bg-slate-800 dark:text-[#F2F2F7] dark:placeholder:text-[#A0A0B0] leading-relaxed transition-colors resize-none"
            />
          </div>

          {/* Team Task Assignment: Show when adding/editing a team task */}
          {(defaultIsTeamTask || targetSchedule === 'team' || task?.teamId) && team && (
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] mb-1">
                Assign to
              </label>
              <select
                value={assigneeUid}
                onChange={(e) => setAssigneeUid(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-[10px] border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--orbit-accent,#534AB7)]/30 focus:border-[var(--orbit-accent,#534AB7)] dark:border-slate-700 dark:bg-slate-800 dark:text-[#F2F2F7] transition-colors cursor-pointer"
              >
                {teamMembers.map((member) => (
                  <option key={member.uid} value={member.uid}>
                    {member.uid === currentUser?.uid
                      ? `${member.displayName} (Myself)`
                      : member.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Collaborative Schedule Assignment: Show ONLY if actively linked with a partner */}
          {isLinkedWithPartner && !task && !defaultIsTeamTask && (
            <div className="p-3 rounded-[10px] border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 space-y-1.5">
              <span className="block text-xs font-semibold text-slate-800 dark:text-[#F2F2F7]">
                Add to schedule
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetSchedule('my')}
                  className={`min-h-[40px] px-3 py-1.5 rounded-[10px] border text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    targetSchedule === 'my'
                      ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:bg-[#534AB7]/25 dark:text-[#8B7BFF] font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-[#A0A0B0]'
                  }`}
                >
                  <User className="h-4 w-4 stroke-current" strokeWidth={2} />
                  <span>My schedule</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetSchedule('partner')}
                  className={`min-h-[40px] px-3 py-1.5 rounded-[10px] border text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    targetSchedule === 'partner'
                      ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:bg-[#534AB7]/25 dark:text-[#8B7BFF] font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-[#A0A0B0]'
                  }`}
                >
                  <Users className="h-4 w-4 stroke-current" strokeWidth={2} />
                  <span className="truncate">Add to {partnerName}&apos;s schedule</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              {task && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="min-h-[40px] px-3 py-1.5 flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-[#24242E] active:bg-rose-100 dark:active:bg-[#24242E] rounded-[10px] cursor-pointer font-medium transition-colors"
                  >
                    <Trash2 className="h-4 w-4 stroke-current" strokeWidth={2} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    className="min-h-[40px] px-3 py-1.5 flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] rounded-[10px] cursor-pointer font-medium transition-colors"
                  >
                    <Copy className="h-4 w-4 stroke-current" strokeWidth={2} />
                    <span className="hidden sm:inline">Duplicate</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom right: Cancel text button + filled Add task accent button */}
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] rounded-[10px] cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="min-h-[40px] px-5 py-2 text-xs font-semibold text-white bg-[var(--orbit-accent,#534AB7)] hover:bg-[var(--orbit-accent-hover,#433B9B)] rounded-[10px] shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 stroke-current shrink-0" strokeWidth={2.5} />
                    <span>{task ? 'Save task' : 'Add task'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
