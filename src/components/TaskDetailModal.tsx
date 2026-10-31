import React, { useState, useRef } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { Task, TaskStatus, TaskAttachment, TaskComment, TaskActivity } from '../types/orbit';
import { formatTimeDisplay } from '../utils/timeFormat';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Paperclip,
  Download,
  Copy,
  Trash2,
  Edit2,
  Send,
  Upload,
  Check,
  AlertCircle,
  File,
  MessageSquare,
  Activity as ActivityIcon,
  BookOpen,
  Sparkles,
} from 'lucide-react';

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onEdit,
}) => {
  const {
    currentUser,
    activePair,
    team,
    userTeamRole,
    role,
    updateTask,
    deleteTaskWithUndo,
    addCommentToTask,
    addAttachmentToTask,
    deleteAttachmentFromTask,
    timeFormat,
    showToast,
  } = useOrbit();

  const [activeTab, setActiveTab] = useState<'overview' | 'brief' | 'caption' | 'notes' | 'comments' | 'activity'>('overview');

  // Date/Time Change Popover
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');

  // Brief and Caption local edits
  const [briefText, setBriefText] = useState('');
  const [captionText, setCaptionText] = useState('');
  const [hasCopiedCaption, setHasCopiedCaption] = useState(false);

  // New Comment input
  const [commentInput, setCommentInput] = useState('');

  // Delete Confirmation Dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize values when task changes
  React.useEffect(() => {
    if (task) {
      setNewDueDate(task.dueDate);
      setNewDueTime(task.dueTime || '17:00');
      setBriefText(task.brief || '');
      setCaptionText(task.caption || '');
    }
  }, [task]);

  if (!task) return null;

  const isDesigner = task.domain === 'designer';
  const isLinked = Boolean(task.pairId && activePair);
  const isTeamTask = Boolean(task.teamId && team);
  const canDelete = isTeamTask
    ? userTeamRole === 'owner' || userTeamRole === 'admin' || task.createdBy === currentUser?.uid
    : task.createdBy === currentUser?.uid || task.userId === currentUser?.uid;
  const canEdit = canDelete;

  // Deadline calculation
  const now = Date.now();
  const dueTimestamp = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`).getTime();
  const isOverdue = task.status !== 'done' && dueTimestamp < now;
  const isDueSoon = task.status !== 'done' && !isOverdue && dueTimestamp - now <= 24 * 60 * 60 * 1000;

  const deadlineStatus = task.status === 'done' ? (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
      Done
    </span>
  ) : isOverdue ? (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
      Overdue
    </span>
  ) : isDueSoon ? (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
      Due soon
    </span>
  ) : (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
      On track
    </span>
  );

  // Priority Chip Styling
  const priorityChip = {
    urgent: {
      label: 'Urgent',
      className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
    },
    high: {
      label: 'High',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    },
    medium: {
      label: 'Medium',
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    low: {
      label: 'Low',
      className: 'bg-slate-50 text-slate-500 dark:bg-slate-850 dark:text-slate-400',
    },
  }[task.priority || 'medium'];

  // Handle Step Click
  const handleStepClick = async (stepId: TaskStatus) => {
    if (task.status === stepId) return;

    const activity: TaskActivity = {
      id: `act_${Date.now()}`,
      action: `Status changed to ${stepId.replace('_', ' ')}`,
      performedBy: currentUser?.displayName || currentUser?.email || 'User',
      timestamp: new Date().toISOString(),
    };

    const newLog = [...(task.activityLog || []), activity];

    await updateTask(task.id, {
      status: stepId,
      completedAt: stepId === 'done' ? new Date().toISOString() : null,
      activityLog: newLog,
    });
  };

  // Handle Deadline Save
  const handleSaveDeadline = async () => {
    if (!newDueDate || !newDueTime) return;

    const activity: TaskActivity = {
      id: `act_${Date.now()}`,
      action: `Deadline changed to ${newDueDate} at ${newDueTime}`,
      performedBy: currentUser?.displayName || currentUser?.email || 'User',
      timestamp: new Date().toISOString(),
    };

    await updateTask(task.id, {
      dueDate: newDueDate,
      dueTime: newDueTime,
      activityLog: [...(task.activityLog || []), activity],
    });

    setIsEditingDeadline(false);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 700KB limit for Firestore document storage safety
    if (file.size > 700 * 1024) {
      showToast('File size exceeds the 700KB attachment limit.', 'error');
      return;
    }

    // Allowed types: images, pdf, common docs
    const allowed = ['image/', 'application/pdf', 'text/', 'application/msword', 'application/vnd.openxmlformats-officedocument'];
    const isAllowed = allowed.some((prefix) => file.type.startsWith(prefix) || file.type.includes('pdf') || file.type.includes('document'));

    if (!isAllowed) {
      showToast('File type not allowed. Please upload an image, PDF, or document.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const url = reader.result as string;
      await addAttachmentToTask(task.id, {
        name: file.name,
        size: file.size,
        type: file.type,
        url,
      });
      showToast(`Attached ${file.name}`, 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    await addCommentToTask(task.id, commentInput.trim());
    setCommentInput('');
  };

  // Handle Copy Caption
  const handleCopyCaption = async () => {
    if (!captionText) return;
    await navigator.clipboard.writeText(captionText);
    setHasCopiedCaption(true);
    setTimeout(() => setHasCopiedCaption(false), 2000);
    showToast('Caption copied to clipboard', 'success');
  };

  // Handle Save Brief
  const handleSaveBrief = async () => {
    await updateTask(task.id, { brief: briefText.trim() });
    showToast('Brief saved', 'success');
  };

  // Handle Save Caption
  const handleSaveCaption = async () => {
    await updateTask(task.id, { caption: captionText.trim() });
    showToast('Caption saved', 'success');
  };

  // Handle Confirm Delete
  const handleConfirmDelete = () => {
    deleteTaskWithUndo(task.id);
    onClose();
  };

  // Standard steps
  const standardSteps: { id: TaskStatus; label: string }[] = [
    { id: 'todo', label: 'To do' },
    { id: 'in_progress', label: 'In progress' },
    { id: 'done', label: 'Done' },
  ];

  // Review steps (if linked)
  const reviewSteps: { id: TaskStatus; label: string }[] = [
    { id: 'submitted', label: 'Submitted for review' },
    { id: 'changes_requested', label: 'Changes requested' },
    { id: 'approved', label: 'Approved' },
  ];

  const currentStatus = task.status === 'pending' ? 'todo' : task.status;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card (Full screen on mobile, max-w-2xl modal on desktop) */}
      <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white dark:bg-[#16161D] sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* HEADER */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 shrink-0 space-y-3 bg-slate-50/50 dark:bg-[#1B1B24]">
          {/* Top row: Brand chip, content type label, priority chip, Close X */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center flex-wrap gap-2">
              {task.brand && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--orbit-accent-light,#EEEDFE)] dark:bg-[#534AB7]/25 text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]">
                  {task.brand}
                </span>
              )}
              {task.contentType && (
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-[#A0A0B0]">
                  {task.contentType}
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${priorityChip.className}`}>
                {priorityChip.label}
              </span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close details"
              className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7] hover:bg-slate-200/60 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5 stroke-current" strokeWidth={2} />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Large Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F2F2F7] leading-tight">
            {task.title}
          </h1>

          {/* Deadline Line */}
          <div className="flex items-center flex-wrap gap-3 text-xs text-slate-600 dark:text-[#A0A0B0] pt-1">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="h-4 w-4 stroke-current text-slate-400 dark:text-[#A0A0B0]" strokeWidth={2} />
              <span>{task.dueDate}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <Clock className="h-4 w-4 stroke-current text-slate-400 dark:text-[#A0A0B0]" strokeWidth={2} />
              <span>{formatTimeDisplay(task.dueTime || '17:00', timeFormat)}</span>
            </div>
            {deadlineStatus}

            <button
              onClick={() => setIsEditingDeadline(!isEditingDeadline)}
              className="text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] font-semibold hover:underline cursor-pointer ml-1"
            >
              Change
            </button>
          </div>

          {/* Inline Change Deadline Picker */}
          {isEditingDeadline && (
            <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <input
                  type="time"
                  value={newDueTime}
                  onChange={(e) => setNewDueTime(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDeadline}
                  className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--orbit-accent,#534AB7)] text-white hover:bg-[var(--orbit-accent-hover,#433B9B)] cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingDeadline(false)}
                  className="min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* STATUS BAR: 3 steps (To do, In progress, Done) + optional Review steps */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#16161D] shrink-0">
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Status
          </div>
          <div className="grid grid-cols-3 gap-2">
            {standardSteps.map((step, idx) => {
              const isCurrent = currentStatus === step.id;
              const isDoneStep = currentStatus === 'done' || (currentStatus === 'in_progress' && step.id === 'todo');

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                    isCurrent
                      ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent,#534AB7)] text-white shadow-xs'
                      : isDoneStep
                      ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-[#A0A0B0] hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {isCurrent ? (
                    <Circle className="h-4 w-4 stroke-current fill-current shrink-0" strokeWidth={2} />
                  ) : isDoneStep ? (
                    <CheckCircle2 className="h-4 w-4 stroke-current shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                  ) : (
                    <Circle className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
                  )}
                  <span className="truncate">{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* Review Steps: Only when user is linked with someone or in collaborative mode */}
          {isLinked && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Review & Approval
              </div>
              <div className="grid grid-cols-3 gap-2">
                {reviewSteps.map((step) => {
                  const isCurrent = currentStatus === step.id;
                  return (
                    <button
                      key={step.id}
                      onClick={() => handleStepClick(step.id)}
                      className={`min-h-[40px] px-2 py-1.5 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        isCurrent
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-[#A0A0B0]'
                      }`}
                    >
                      <span className="truncate">{step.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Linked Partner Review Buttons */}
              {role === 'boss' && (
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={() => handleStepClick('changes_requested')}
                    className="min-h-[36px] flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer"
                  >
                    Request changes
                  </button>
                  <button
                    onClick={() => handleStepClick('approved')}
                    className="min-h-[36px] flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* HORIZONTAL TABS */}
        <div className="px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#16161D] shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-4 text-xs font-semibold whitespace-nowrap">
            <button
              onClick={() => setActiveTab('overview')}
              className={`min-h-[44px] py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]'
                  : 'border-transparent text-slate-500 dark:text-[#A0A0B0] hover:text-slate-800 dark:hover:text-[#F2F2F7]'
              }`}
            >
              Overview
            </button>

            {isDesigner ? (
              <>
                <button
                  onClick={() => setActiveTab('brief')}
                  className={`min-h-[44px] py-3 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'brief'
                      ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]'
                      : 'border-transparent text-slate-500 dark:text-[#A0A0B0] hover:text-slate-800 dark:hover:text-[#F2F2F7]'
                  }`}
                >
                  Brief
                </button>
                <button
                  onClick={() => setActiveTab('caption')}
                  className={`min-h-[44px] py-3 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'caption'
                      ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]'
                      : 'border-transparent text-slate-500 dark:text-[#A0A0B0] hover:text-slate-800 dark:hover:text-[#F2F2F7]'
                  }`}
                >
                  Caption
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveTab('notes')}
                className={`min-h-[44px] py-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'notes'
                    ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]'
                    : 'border-transparent text-slate-500 dark:text-[#A0A0B0] hover:text-slate-800 dark:hover:text-[#F2F2F7]'
                }`}
              >
                Notes
              </button>
            )}

            <button
              onClick={() => setActiveTab('comments')}
              className={`min-h-[44px] py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'comments'
                  ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]'
                  : 'border-transparent text-slate-500 dark:text-[#A0A0B0] hover:text-slate-800 dark:hover:text-[#F2F2F7]'
              }`}
            >
              <span>Comments</span>
              {(task.comments?.length || 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {task.comments?.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`min-h-[44px] py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'activity'
                  ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]'
                  : 'border-transparent text-slate-500 dark:text-[#A0A0B0] hover:text-slate-800 dark:hover:text-[#F2F2F7]'
              }`}
            >
              Activity
            </button>
          </div>
        </div>

        {/* TAB CONTENTS (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Description
                </h4>
                {task.description || task.notes ? (
                  <p className="text-sm text-slate-800 dark:text-[#F2F2F7] leading-relaxed whitespace-pre-wrap">
                    {task.description || task.notes}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">No description provided.</p>
                )}
              </div>

              {/* Assignee if in Team */}
              {task.assigneeName && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Assignee
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-slate-800 dark:text-[#F2F2F7]">
                    <div className="h-6 w-6 rounded-full bg-[var(--orbit-accent,#534AB7)] text-white text-[11px] font-semibold flex items-center justify-center">
                      {task.assigneeName.charAt(0).toUpperCase()}
                    </div>
                    <span>{task.assigneeName}</span>
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Attachments ({(task.attachments?.length || 0)})
                  </h4>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                    <span>Add attachment</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {task.attachments && task.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {task.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Paperclip className="h-4 w-4 stroke-current text-slate-400 dark:text-[#A0A0B0] shrink-0" strokeWidth={2} />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-900 dark:text-[#F2F2F7] truncate">
                              {att.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {(att.size / 1024).toFixed(1)} KB · {att.uploadedBy}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={att.url}
                            download={att.name}
                            className="min-h-[36px] px-3 py-1 text-xs font-semibold text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] hover:bg-slate-200 dark:hover:bg-[#24242E] rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Download className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                            <span>Download</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => deleteAttachmentFromTask(task.id, att.id)}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 className="h-4 w-4 stroke-current" strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    No files attached yet. Upload images, briefs, or documents (max 5MB).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BRIEF TAB (Designer) */}
          {activeTab === 'brief' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Design Brief & Visual Guidelines
                </h4>
                <button
                  type="button"
                  onClick={handleSaveBrief}
                  className="min-h-[36px] px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--orbit-accent,#534AB7)] text-white hover:bg-[var(--orbit-accent-hover,#433B9B)] cursor-pointer"
                >
                  Save Brief
                </button>
              </div>
              <textarea
                rows={8}
                value={briefText}
                onChange={(e) => setBriefText(e.target.value)}
                placeholder="Key goals, art direction, brand colors, target audience, format specs..."
                className="w-full p-3.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#1E1E28] dark:text-[#F2F2F7] dark:placeholder-[#A0A0B0] leading-relaxed focus:ring-2 focus:ring-[#8B7BFF] outline-none"
              />
            </div>
          )}

          {/* CAPTION TAB (Designer) */}
          {activeTab === 'caption' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Draft Caption, Hashtags & CTA
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {hasCopiedCaption ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{hasCopiedCaption ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCaption}
                    className="min-h-[36px] px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--orbit-accent,#534AB7)] text-white hover:bg-[var(--orbit-accent-hover,#433B9B)] cursor-pointer"
                  >
                    Save Caption
                  </button>
                </div>
              </div>
              <textarea
                rows={8}
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                placeholder="Hook sentence...&#10;&#10;Value paragraphs...&#10;&#10;Call to action: Link in bio!&#10;&#10;#design #branding #campaign"
                className="w-full p-3.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#1E1E28] dark:text-[#F2F2F7] dark:placeholder-[#A0A0B0] leading-relaxed focus:ring-2 focus:ring-[#8B7BFF] outline-none"
              />
            </div>
          )}

          {/* NOTES TAB (Student) */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Study Notes & Requirements
              </h4>
              <textarea
                rows={8}
                value={task.notes || ''}
                onChange={(e) => updateTask(task.id, { notes: e.target.value })}
                placeholder="Lecture references, textbook pages, study questions..."
                className="w-full p-3.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#1E1E28] dark:text-[#F2F2F7] dark:placeholder-[#A0A0B0] leading-relaxed focus:ring-2 focus:ring-[#8B7BFF] outline-none"
              />
            </div>
          )}

          {/* COMMENTS TAB */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-900 dark:text-[#F2F2F7]">
                          {comment.authorName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(comment.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-[#F2F2F7] leading-relaxed">
                        {comment.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No comments yet. Start the discussion below.</p>
                )}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Write a comment or note..."
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-[#1E1E28] dark:text-[#F2F2F7] focus:ring-2 focus:ring-[#8B7BFF] outline-none"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="min-h-[40px] px-4 rounded-xl bg-[var(--orbit-accent,#534AB7)] text-white hover:bg-[var(--orbit-accent-hover,#433B9B)] disabled:opacity-50 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Send className="h-4 w-4 stroke-current" strokeWidth={2} />
                  <span className="sr-only">Send</span>
                </button>
              </form>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Audit & Activity Log
              </h4>
              <div className="space-y-2">
                {task.activityLog && task.activityLog.length > 0 ? (
                  task.activityLog
                    .slice()
                    .reverse()
                    .map((act) => (
                      <div
                        key={act.id}
                        className="flex items-start gap-3 p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800"
                      >
                        <ActivityIcon className="h-4 w-4 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] shrink-0 mt-0.5" strokeWidth={2} />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 dark:text-[#F2F2F7]">
                            {act.action}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            by {act.performedBy} · {new Date(act.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No activity recorded yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#1B1B24] flex items-center justify-between shrink-0">
          {/* Left: Edit and Delete buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(task);
              }}
              className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] hover:bg-slate-200/60 dark:hover:bg-[#24242E] rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Edit2 className="h-4 w-4 stroke-current" strokeWidth={2} />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-[#24242E] rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4 stroke-current" strokeWidth={2} />
              <span>Delete</span>
            </button>
          </div>

          {/* Right: Filled Green "Mark done" button */}
          <button
            type="button"
            onClick={() => handleStepClick(task.status === 'done' ? 'todo' : 'done')}
            className={`min-h-[42px] px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-2 ${
              task.status === 'done'
                ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-[#F2F2F7] hover:bg-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-98'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 stroke-current" strokeWidth={2} />
            <span>{task.status === 'done' ? 'Mark as to do' : 'Mark done'}</span>
          </button>
        </div>

        {/* Delete Confirmation Dialog Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
            <div className="w-full max-w-sm p-5 rounded-2xl bg-white dark:bg-[#1E1E28] border border-slate-200 dark:border-slate-700 shadow-xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5 stroke-current" strokeWidth={2} />
                <h4 className="text-sm font-bold text-slate-900 dark:text-[#F2F2F7]">
                  Delete this task?
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#A0A0B0] leading-relaxed">
                This action will delete &ldquo;{task.title}&rdquo;. You will have 5 seconds to undo.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="min-h-[40px] px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-[#A0A0B0] hover:bg-slate-100 dark:hover:bg-[#24242E] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs"
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
