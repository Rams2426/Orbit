import React, { useState, useRef, useEffect } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { Task, TaskStatus, TaskAttachment, TaskActivity } from '../types/orbit';
import { formatTimeDisplay, canUserDeleteTask } from '../utils/timeFormat';
import {
  MAX_ATTACHMENTS_PER_TASK,
  FILE_INPUT_ACCEPT,
  validateAttachmentFile,
  uploadTaskFileToStorage,
  validateExternalLink,
  extractLinkLabel,
  isImageAttachment,
  isLinkAttachment,
  formatFileSize,
} from '../utils/attachments';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Download,
  Copy,
  Trash2,
  Edit2,
  Send,
  Upload,
  Check,
  AlertCircle,
  File as FileIcon,
  Activity as ActivityIcon,
  Link as LinkIcon,
  ExternalLink,
  ZoomIn,
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
    team,
    userTeamRole,
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

  // Attachment Upload & Link states
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<
    { id: string; name: string; size: number; progress: number }[]
  >([]);
  const [attachmentNotice, setAttachmentNotice] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);
  const [showAddLinkBox, setShowAddLinkBox] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [linkLabelInput, setLinkLabelInput] = useState('');

  // Full-size Image Lightbox state
  const [lightboxAttachment, setLightboxAttachment] = useState<TaskAttachment | null>(null);

  // Mobile swipe-down to close
  const touchStartYRef = useRef<number | null>(null);
  const [swipeOffsetY, setSwipeOffsetY] = useState(0);

  // Initialize values when task changes
  useEffect(() => {
    if (task) {
      setNewDueDate(task.dueDate);
      setNewDueTime(task.dueTime || '17:00');
      setBriefText(task.brief || '');
      setCaptionText(task.caption || '');
      setAttachmentNotice(null);
      setShowAddLinkBox(false);
      setSwipeOffsetY(0);
    }
  }, [task?.id]);

  // Close on Escape key
  useEffect(() => {
    if (!task) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxAttachment) {
          setLightboxAttachment(null);
        } else if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [task, lightboxAttachment, showDeleteConfirm, onClose]);

  if (!task) return null;

  const isDesigner = task.domain === 'designer';
  const isTeamTask = Boolean(task.teamId && team);
  const canDelete = canUserDeleteTask(task, currentUser?.uid, userTeamRole);

  const canRemoveAttachment = (att: TaskAttachment) => {
    if (!isTeamTask) return task.userId === currentUser?.uid || task.createdBy === currentUser?.uid;
    return (
      userTeamRole === 'owner' ||
      userTeamRole === 'admin' ||
      att.uploadedByUid === currentUser?.uid ||
      task.createdBy === currentUser?.uid
    );
  };

  // Deadline calculation
  const now = Date.now();
  const dueTimestamp = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`).getTime();
  const isOverdue = task.status !== 'done' && dueTimestamp < now;
  const isDueSoon = task.status !== 'done' && !isOverdue && dueTimestamp - now <= 24 * 60 * 60 * 1000;

  const deadlineStatus = task.status === 'done' ? (
    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
      Done
    </span>
  ) : isOverdue ? (
    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
      Overdue
    </span>
  ) : isDueSoon ? (
    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
      Due soon
    </span>
  ) : (
    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
      On track
    </span>
  );

  // Priority label styling
  const priorityLabel = {
    urgent: {
      label: 'Urgent priority',
      className: 'text-rose-600 dark:text-rose-400 font-semibold',
    },
    high: {
      label: 'High priority',
      className: 'text-amber-600 dark:text-amber-400 font-semibold',
    },
    medium: {
      label: 'Medium priority',
      className: 'text-slate-600 dark:text-slate-300 font-medium',
    },
    low: {
      label: 'Low priority',
      className: 'text-slate-500 dark:text-slate-400 font-medium',
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

  // Handle File Upload to Firebase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !currentUser) return;

    const files = Array.from(fileList);
    e.target.value = '';
    setAttachmentNotice(null);

    const existingCount = (task.attachments || []).length + uploadingFiles.length;
    if (existingCount + files.length > MAX_ATTACHMENTS_PER_TASK) {
      const msg = `You can attach up to ${MAX_ATTACHMENTS_PER_TASK} files per task (${existingCount}/${MAX_ATTACHMENTS_PER_TASK} used).`;
      setAttachmentNotice({ type: 'error', text: msg });
      showToast(msg, 'error');
      return;
    }

    for (const file of files) {
      const check = validateAttachmentFile(file);
      if (!check.valid) {
        const msg = check.error || 'Unsupported file type or size.';
        setAttachmentNotice({ type: 'error', text: msg });
        showToast(msg, 'error');
        continue;
      }

      const tempId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setUploadingFiles((prev) => [
        ...prev,
        { id: tempId, name: file.name, size: file.size, progress: 5 },
      ]);

      try {
        const uploaded = await uploadTaskFileToStorage({
          file,
          userId: currentUser.uid,
          userDisplayName: currentUser.displayName || currentUser.email || 'User',
          taskId: task.id,
          teamId: task.teamId || null,
          onProgress: (pct) => {
            setUploadingFiles((prev) =>
              prev.map((u) => (u.id === tempId ? { ...u, progress: Math.max(5, pct) } : u))
            );
          },
        });

        await addAttachmentToTask(task.id, {
          name: uploaded.name,
          url: uploaded.url,
          size: uploaded.size,
          type: uploaded.type,
          storagePath: uploaded.storagePath,
          isLink: false,
          uploadedByUid: currentUser.uid,
        });

        setAttachmentNotice({
          type: 'success',
          text: `Attached "${uploaded.name}"`,
        });
      } catch (err: any) {
        console.error('Upload failed:', err);
        const msg = err?.message || `Failed to upload "${file.name}".`;
        setAttachmentNotice({ type: 'error', text: msg });
        showToast(msg, 'error');
      } finally {
        setUploadingFiles((prev) => prev.filter((u) => u.id !== tempId));
      }
    }
  };

  // Handle adding a Link in Task Detail
  const handleAddExternalLink = async () => {
    setAttachmentNotice(null);
    const existingCount = (task.attachments || []).length + uploadingFiles.length;
    if (existingCount >= MAX_ATTACHMENTS_PER_TASK) {
      setAttachmentNotice({
        type: 'error',
        text: `Maximum ${MAX_ATTACHMENTS_PER_TASK} attachments allowed per task.`,
      });
      return;
    }

    const validation = validateExternalLink(linkUrlInput);
    if (!validation.valid || !validation.url) {
      setAttachmentNotice({
        type: 'error',
        text: validation.error || 'Please enter a valid URL.',
      });
      return;
    }

    const cleanLabel = extractLinkLabel(validation.url, linkLabelInput);
    await addAttachmentToTask(task.id, {
      name: cleanLabel,
      url: validation.url,
      size: 0,
      type: 'link',
      isLink: true,
      uploadedByUid: currentUser?.uid,
    });

    setLinkUrlInput('');
    setLinkLabelInput('');
    setShowAddLinkBox(false);
    setAttachmentNotice({
      type: 'success',
      text: `Added link "${cleanLabel}"`,
    });
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

  const standardSteps: { id: TaskStatus; label: string }[] = [
    { id: 'todo', label: 'To do' },
    { id: 'in_progress', label: 'In progress' },
    { id: 'done', label: 'Done' },
  ];

  const currentStatus = task.status === 'pending' ? 'todo' : task.status;

  const allAttachments = task.attachments || [];
  const imageAttachments = allAttachments.filter((att) => isImageAttachment(att));
  const documentAndLinkAttachments = allAttachments.filter((att) => !isImageAttachment(att));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        style={swipeOffsetY > 0 ? { transform: `translateY(${swipeOffsetY}px)` } : undefined}
        onTouchStart={(e) => {
          touchStartYRef.current = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          if (touchStartYRef.current === null) return;
          const deltaY = e.touches[0].clientY - touchStartYRef.current;
          if (deltaY > 0 && deltaY < 220) {
            setSwipeOffsetY(deltaY);
          }
        }}
        onTouchEnd={() => {
          if (swipeOffsetY > 90) {
            onClose();
          } else {
            setSwipeOffsetY(0);
          }
          touchStartYRef.current = null;
        }}
        className="orbit-modal-enter relative w-full h-[94dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white dark:bg-[#1A1A22] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2E2E3A] flex flex-col z-10 overflow-hidden"
      >
        {/* Mobile Swipe Handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 bg-slate-50/50 dark:bg-[#14141A]">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* HEADER */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-[#2E2E3A] shrink-0 space-y-2.5 bg-slate-50/50 dark:bg-[#14141A]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 dark:text-[#A0A0B0]">
              {task.brand && (
                <>
                  <span className="font-semibold text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]">
                    {task.brand}
                  </span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              {task.contentType && (
                <>
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    {task.contentType}
                  </span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span className={priorityLabel.className}>{priorityLabel.label}</span>
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

          <h1
            id="task-detail-title"
            className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F2F2F7] leading-tight"
          >
            {task.title}
          </h1>

          {/* Deadline Line */}
          <div className="flex items-center flex-wrap gap-2.5 text-xs text-slate-600 dark:text-[#A0A0B0] pt-1">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="h-4 w-4 stroke-current text-slate-400 dark:text-[#A0A0B0]" strokeWidth={2} />
              <span>{task.dueDate}</span>
            </div>
            <span aria-hidden="true">·</span>
            <div className="flex items-center gap-1.5 font-sans tabular-nums">
              <Clock className="h-4 w-4 stroke-current text-slate-400 dark:text-[#A0A0B0]" strokeWidth={2} />
              <span>{formatTimeDisplay(task.dueTime || '17:00', timeFormat)}</span>
            </div>
            <span aria-hidden="true">·</span>
            {deadlineStatus}

            <button
              onClick={() => setIsEditingDeadline(!isEditingDeadline)}
              className="text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] font-semibold hover:underline cursor-pointer ml-1"
            >
              Change
            </button>
          </div>

          {isEditingDeadline && (
            <div className="mt-2 p-3 bg-white dark:bg-[#24242E] rounded-xl border border-slate-200 dark:border-[#2E2E3A] flex flex-wrap items-center gap-3 orbit-task-enter">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#2E2E3A] bg-slate-50 dark:bg-[#1A1A22] text-slate-900 dark:text-[#F2F2F7]"
                />
                <input
                  type="time"
                  value={newDueTime}
                  onChange={(e) => setNewDueTime(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#2E2E3A] bg-slate-50 dark:bg-[#1A1A22] text-slate-900 dark:text-[#F2F2F7]"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDeadline}
                  className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] text-white dark:text-[#0F0F14] hover:bg-[var(--orbit-accent-hover,#433B9B)] dark:hover:bg-[#7A68F0] cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingDeadline(false)}
                  className="min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg text-slate-500 dark:text-[#A0A0B0] hover:bg-slate-100 dark:hover:bg-[#1A1A22] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* STATUS BAR */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] shrink-0">
          <div className="text-[11px] font-semibold text-slate-400 dark:text-[#A0A0B0] uppercase tracking-wider mb-2">
            Status
          </div>
          <div className="grid grid-cols-3 gap-2">
            {standardSteps.map((step) => {
              const isCurrent = currentStatus === step.id;
              const isDoneStep = currentStatus === 'done' || (currentStatus === 'in_progress' && step.id === 'todo');

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                    isCurrent
                      ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent,#534AB7)] text-white dark:border-[#8B7BFF] dark:bg-[#8B7BFF] dark:text-[#0F0F14] shadow-xs'
                      : isDoneStep
                      ? 'border-emerald-200 dark:border-[#4ADE80]/30 bg-emerald-50 dark:bg-[#4ADE80]/15 text-emerald-700 dark:text-[#4ADE80]'
                      : 'border-slate-200 dark:border-[#2E2E3A] bg-slate-50 dark:bg-[#24242E] text-slate-600 dark:text-[#A0A0B0] hover:border-slate-300 dark:hover:border-[#3E3E4E]'
                  }`}
                >
                  {isCurrent ? (
                    <Circle className="h-4 w-4 stroke-current fill-current shrink-0" strokeWidth={2} />
                  ) : isDoneStep ? (
                    <CheckCircle2 className="h-4 w-4 stroke-current shrink-0 text-emerald-600 dark:text-[#4ADE80]" strokeWidth={2} />
                  ) : (
                    <Circle className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
                  )}
                  <span className="truncate">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* HORIZONTAL TABS */}
        <div className="px-4 sm:px-6 border-b border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-4 text-xs font-semibold whitespace-nowrap">
            <button
              onClick={() => setActiveTab('overview')}
              className={`min-h-[44px] py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:text-[#8B7BFF]'
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
                      ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:text-[#8B7BFF]'
                      : 'border-transparent text-slate-500 dark:text-[#A0A0B0] hover:text-slate-800 dark:hover:text-[#F2F2F7]'
                  }`}
                >
                  Brief
                </button>
                <button
                  onClick={() => setActiveTab('caption')}
                  className={`min-h-[44px] py-3 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'caption'
                      ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:text-[#8B7BFF]'
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
                    ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:text-[#8B7BFF]'
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
                  ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:text-[#8B7BFF]'
                  : 'border-transparent text-slate-500 dark:text-[#A0A0B0] hover:text-slate-800 dark:hover:text-[#F2F2F7]'
              }`}
            >
              <span>Comments ({task.comments?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`min-h-[44px] py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'activity'
                  ? 'border-[var(--orbit-accent,#534AB7)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:text-[#8B7BFF]'
                  : 'border-transparent text-slate-500 dark:text-[#A0A0B0] hover:text-slate-800 dark:hover:text-[#F2F2F7]'
              }`}
            >
              Activity
            </button>
          </div>
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeTab === 'overview' && (
            <div className="space-y-6 orbit-view-fade">
              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 dark:text-[#A0A0B0] uppercase tracking-wider mb-2">
                  Description
                </h4>
                {task.description || task.notes ? (
                  <p className="text-sm text-slate-800 dark:text-[#F2F2F7] leading-relaxed whitespace-pre-wrap">
                    {task.description || task.notes}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-[#6E6E80] italic">No description provided.</p>
                )}
              </div>

              {/* Assignee if in Team */}
              {task.assigneeName && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-[#A0A0B0] uppercase tracking-wider mb-2">
                    Assignee
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-slate-800 dark:text-[#F2F2F7]">
                    <div className="h-6 w-6 rounded-full bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] text-white dark:text-[#0F0F14] text-[11px] font-semibold flex items-center justify-center">
                      {task.assigneeName.charAt(0).toUpperCase()}
                    </div>
                    <span>{task.assigneeName}</span>
                  </div>
                </div>
              )}

              {/* ATTACHMENTS SECTION */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-[#A0A0B0] uppercase tracking-wider">
                    Attachments ({allAttachments.length}/{MAX_ATTACHMENTS_PER_TASK})
                  </h4>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddLinkBox((prev) => !prev)}
                      disabled={allAttachments.length >= MAX_ATTACHMENTS_PER_TASK}
                      className="min-h-[34px] px-2.5 py-1 rounded-[8px] border border-slate-200 dark:border-[#2E2E3A] text-xs font-semibold text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <LinkIcon className="h-3.5 w-3.5 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]" strokeWidth={2} />
                      <span>Add a link</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={allAttachments.length >= MAX_ATTACHMENTS_PER_TASK}
                      className="min-h-[34px] px-3 py-1 rounded-[8px] bg-[var(--orbit-accent,#534AB7)] hover:bg-[var(--orbit-accent-hover,#433B9B)] dark:bg-[#8B7BFF] dark:hover:bg-[#7A68F0] text-white dark:text-[#0F0F14] text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Upload className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                      <span>Add attachment</span>
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={FILE_INPUT_ACCEPT}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Add Link Box */}
                {showAddLinkBox && (
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-[#2E2E3A] bg-slate-50 dark:bg-[#24242E] space-y-2 orbit-task-enter">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-[#F2F2F7]">
                        Add external link (Google Drive, Dropbox, Figma, etc.)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddLinkBox(false)}
                        className="text-slate-400 hover:text-slate-600 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] cursor-pointer"
                      >
                        <X className="h-4 w-4 stroke-current" strokeWidth={2} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="url"
                        value={linkUrlInput}
                        onChange={(e) => setLinkUrlInput(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-[#2E2E3A] dark:bg-[#1A1A22] dark:text-[#F2F2F7] dark:placeholder-[#6E6E80] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={linkLabelInput}
                        onChange={(e) => setLinkLabelInput(e.target.value)}
                        placeholder="Label (optional)"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-[#2E2E3A] dark:bg-[#1A1A22] dark:text-[#F2F2F7] dark:placeholder-[#6E6E80] focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddExternalLink}
                        className="min-h-[34px] px-3 py-1 rounded-lg bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] text-white dark:text-[#0F0F14] text-xs font-semibold hover:bg-[var(--orbit-accent-hover,#433B9B)] dark:hover:bg-[#7A68F0] cursor-pointer"
                      >
                        Save link
                      </button>
                    </div>
                  </div>
                )}

                {/* Feedback banner */}
                {attachmentNotice && (
                  <div
                    role="status"
                    className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between gap-2 ${
                      attachmentNotice.type === 'error'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {attachmentNotice.type === 'error' ? (
                        <AlertCircle className="h-4 w-4 shrink-0 stroke-current" strokeWidth={2} />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 stroke-current" strokeWidth={2} />
                      )}
                      <span className="truncate">{attachmentNotice.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachmentNotice(null)}
                      className="shrink-0 opacity-75 hover:opacity-100 cursor-pointer"
                      aria-label="Dismiss message"
                    >
                      <X className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                    </button>
                  </div>
                )}

                {/* Active Upload Progress Rows */}
                {uploadingFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadingFiles.map((up) => (
                      <div
                        key={up.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-[#2E2E3A] bg-slate-50/70 dark:bg-[#24242E] space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-[#F2F2F7] truncate">
                            Uploading {up.name}...
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-[#A0A0B0] tabular-nums">
                            {up.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-[#1A1A22] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] transition-all duration-200"
                            style={{ width: `${up.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 1. Grid for Images (Tap to view full size) */}
                {imageAttachments.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-[11px] font-semibold text-slate-500 dark:text-[#A0A0B0]">
                      Images ({imageAttachments.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {imageAttachments.map((imgAtt) => (
                        <div
                          key={imgAtt.id}
                          className="group relative rounded-xl border border-slate-200 dark:border-[#2E2E3A] bg-slate-100 dark:bg-[#24242E] overflow-hidden shadow-2xs"
                        >
                          <button
                            type="button"
                            onClick={() => setLightboxAttachment(imgAtt)}
                            className="w-full h-32 block relative overflow-hidden cursor-pointer focus:outline-none"
                            aria-label={`View full size image ${imgAtt.name}`}
                          >
                            <img
                              src={imgAtt.url}
                              alt={imgAtt.name}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/35 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[11px] font-semibold flex items-center gap-1">
                                <ZoomIn className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                                <span>View</span>
                              </span>
                            </div>
                          </button>

                          <div className="p-2 bg-white dark:bg-[#1A1A22] flex items-center justify-between gap-1.5 border-t border-slate-100 dark:border-[#2E2E3A]">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold text-slate-800 dark:text-[#F2F2F7] truncate">
                                {imgAtt.name}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-[#A0A0B0] tabular-nums">
                                {formatFileSize(imgAtt.size)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={imgAtt.url}
                                download={imgAtt.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Download ${imgAtt.name}`}
                                title="Download image"
                                className="min-w-[32px] min-h-[32px] h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-[var(--orbit-accent,#534AB7)] dark:hover:text-[#8B7BFF] hover:bg-slate-100 dark:hover:bg-[#24242E]"
                              >
                                <Download className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                              </a>
                              {canRemoveAttachment(imgAtt) && (
                                <button
                                  type="button"
                                  onClick={() => deleteAttachmentFromTask(task.id, imgAtt.id)}
                                  aria-label={`Remove ${imgAtt.name}`}
                                  title="Remove image"
                                  className="min-w-[32px] min-h-[32px] h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-[#FF6B6B] hover:bg-rose-50 dark:hover:bg-[#24242E] cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. List for Documents & Links with Download and Remove buttons */}
                {documentAndLinkAttachments.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-[11px] font-semibold text-slate-500 dark:text-[#A0A0B0]">
                      Documents & Links ({documentAndLinkAttachments.length})
                    </span>
                    <div className="space-y-2">
                      {documentAndLinkAttachments.map((att) => {
                        const isLink = isLinkAttachment(att);
                        return (
                          <div
                            key={att.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-[#2E2E3A] bg-slate-50/70 dark:bg-[#24242E]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 rounded-lg bg-white dark:bg-[#1A1A22] border border-slate-200/80 dark:border-[#2E2E3A] flex items-center justify-center text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] shrink-0">
                                {isLink ? (
                                  <LinkIcon className="h-4 w-4 stroke-current" strokeWidth={2} />
                                ) : (
                                  <FileIcon className="h-4 w-4 stroke-current" strokeWidth={2} />
                                )}
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-semibold text-slate-900 dark:text-[#F2F2F7] truncate">
                                  {att.name}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-[#A0A0B0] truncate">
                                  {isLink
                                    ? `${att.url} · ${att.uploadedBy}`
                                    : `${formatFileSize(att.size)} · ${att.uploadedBy}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={att.url}
                                download={isLink ? undefined : att.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-[36px] px-3 py-1 text-xs font-semibold text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] hover:bg-slate-200/70 dark:hover:bg-[#1A1A22] rounded-lg transition-colors flex items-center gap-1.5"
                              >
                                {isLink ? (
                                  <>
                                    <ExternalLink className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                                    <span>Open</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                                    <span>Download</span>
                                  </>
                                )}
                              </a>
                              {canRemoveAttachment(att) && (
                                <button
                                  type="button"
                                  onClick={() => deleteAttachmentFromTask(task.id, att.id)}
                                  className="min-h-[36px] px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-[#FF6B6B] hover:bg-rose-50 dark:hover:bg-[#1A1A22] rounded-lg cursor-pointer flex items-center gap-1"
                                  title="Remove attachment"
                                  aria-label={`Remove ${att.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                                  <span className="hidden sm:inline">Remove</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {allAttachments.length === 0 && uploadingFiles.length === 0 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-[#2E2E3A] text-center text-xs text-slate-400 dark:text-[#6E6E80] hover:border-slate-300 dark:hover:border-[#8B7BFF] cursor-pointer transition-colors"
                  >
                    No files or links attached yet. Tap &ldquo;Add attachment&rdquo; to upload photos or documents (max 10 MB).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BRIEF TAB */}
          {activeTab === 'brief' && (
            <div className="space-y-3 orbit-view-fade">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-400 dark:text-[#A0A0B0] uppercase tracking-wider">
                  Design Brief & Visual Guidelines
                </h4>
                <button
                  type="button"
                  onClick={handleSaveBrief}
                  className="min-h-[36px] px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] text-white dark:text-[#0F0F14] hover:bg-[var(--orbit-accent-hover,#433B9B)] dark:hover:bg-[#7A68F0] cursor-pointer"
                >
                  Save Brief
                </button>
              </div>
              <textarea
                rows={8}
                value={briefText}
                onChange={(e) => setBriefText(e.target.value)}
                placeholder="Key goals, art direction, brand colors, target audience, format specs..."
                className="w-full p-3.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2E2E3A] dark:bg-[#24242E] dark:text-[#F2F2F7] dark:placeholder-[#6E6E80] leading-relaxed focus:ring-2 focus:ring-[#8B7BFF] outline-none"
              />
            </div>
          )}

          {/* CAPTION TAB */}
          {activeTab === 'caption' && (
            <div className="space-y-3 orbit-view-fade">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-400 dark:text-[#A0A0B0] uppercase tracking-wider">
                  Draft Caption, Hashtags & CTA
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-[#2E2E3A] bg-slate-50 dark:bg-[#24242E] text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#2E2E3A] flex items-center gap-1.5 cursor-pointer"
                  >
                    {hasCopiedCaption ? <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-[#4ADE80]" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{hasCopiedCaption ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCaption}
                    className="min-h-[36px] px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] text-white dark:text-[#0F0F14] hover:bg-[var(--orbit-accent-hover,#433B9B)] dark:hover:bg-[#7A68F0] cursor-pointer"
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
                className="w-full p-3.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2E2E3A] dark:bg-[#24242E] dark:text-[#F2F2F7] dark:placeholder-[#6E6E80] leading-relaxed focus:ring-2 focus:ring-[#8B7BFF] outline-none"
              />
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-3 orbit-view-fade">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-[#A0A0B0] uppercase tracking-wider">
                Study Notes & Requirements
              </h4>
              <textarea
                rows={8}
                value={task.notes || ''}
                onChange={(e) => updateTask(task.id, { notes: e.target.value })}
                placeholder="Lecture references, textbook pages, study questions..."
                className="w-full p-3.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2E2E3A] dark:bg-[#24242E] dark:text-[#F2F2F7] dark:placeholder-[#6E6E80] leading-relaxed focus:ring-2 focus:ring-[#8B7BFF] outline-none"
              />
            </div>
          )}

          {/* COMMENTS TAB */}
          {activeTab === 'comments' && (
            <div className="space-y-4 orbit-view-fade">
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 rounded-xl border border-slate-100 dark:border-[#2E2E3A] bg-slate-50 dark:bg-[#24242E]"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-900 dark:text-[#F2F2F7]">
                          {comment.authorName}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-[#A0A0B0]">
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
                  <p className="text-xs text-slate-400 dark:text-[#A0A0B0] text-center py-6">
                    No comments yet. Start the discussion below.
                  </p>
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Write a comment or note..."
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-[#2E2E3A] dark:bg-[#24242E] dark:text-[#F2F2F7] dark:placeholder-[#6E6E80] focus:ring-2 focus:ring-[#8B7BFF] outline-none"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="min-h-[40px] px-4 rounded-xl bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] text-white dark:text-[#0F0F14] hover:bg-[var(--orbit-accent-hover,#433B9B)] dark:hover:bg-[#7A68F0] disabled:opacity-50 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Send className="h-4 w-4 stroke-current" strokeWidth={2} />
                  <span className="sr-only">Send</span>
                </button>
              </form>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="space-y-3 orbit-view-fade">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-[#A0A0B0] uppercase tracking-wider">
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
                        className="flex items-start gap-3 p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#24242E] border border-slate-100 dark:border-[#2E2E3A]"
                      >
                        <ActivityIcon className="h-4 w-4 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] shrink-0 mt-0.5" strokeWidth={2} />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 dark:text-[#F2F2F7]">
                            {act.action}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-[#A0A0B0] mt-0.5">
                            by {act.performedBy} · {new Date(act.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-slate-400 dark:text-[#A0A0B0] py-4 text-center">No activity recorded yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 sm:px-6 py-3.5 border-t border-slate-100 dark:border-[#2E2E3A] bg-slate-50/50 dark:bg-[#14141A] flex items-center justify-between shrink-0">
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

            {canDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-[#FF6B6B] hover:bg-rose-50 dark:hover:bg-[#24242E] rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4 stroke-current" strokeWidth={2} />
                <span>Delete</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleStepClick(task.status === 'done' ? 'todo' : 'done')}
            className={`min-h-[42px] px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-2 ${
              task.status === 'done'
                ? 'bg-slate-200 text-slate-800 dark:bg-[#24242E] dark:text-[#F2F2F7] hover:bg-slate-300 dark:hover:bg-[#2E2E3A]'
                : 'bg-emerald-600 hover:bg-emerald-500 dark:bg-[#4ADE80] dark:hover:bg-[#4ADE80]/90 text-white dark:text-[#0F0F14]'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 stroke-current" strokeWidth={2} />
            <span>{task.status === 'done' ? 'Mark as to do' : 'Mark done'}</span>
          </button>
        </div>

        {/* Full-Size Image Lightbox Overlay */}
        {lightboxAttachment && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs orbit-view-fade"
            onClick={() => setLightboxAttachment(null)}
          >
            <div
              className="relative max-w-4xl w-full flex flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between text-white px-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{lightboxAttachment.name}</p>
                  <p className="text-xs text-slate-300">
                    {formatFileSize(lightboxAttachment.size)} · Uploaded by {lightboxAttachment.uploadedBy}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={lightboxAttachment.url}
                    download={lightboxAttachment.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Download className="h-4 w-4 stroke-current" strokeWidth={2} />
                    <span>Download</span>
                  </a>
                  {canRemoveAttachment(lightboxAttachment) && (
                    <button
                      type="button"
                      onClick={async () => {
                        const idToRemove = lightboxAttachment.id;
                        setLightboxAttachment(null);
                        await deleteAttachmentFromTask(task.id, idToRemove);
                      }}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 stroke-current" strokeWidth={2} />
                      <span>Remove</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setLightboxAttachment(null)}
                    aria-label="Close full-size image"
                    className="min-h-[40px] min-w-[40px] h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="h-5 w-5 stroke-current" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <img
                src={lightboxAttachment.url}
                alt={lightboxAttachment.name}
                className="max-h-[75dvh] max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
            <div className="orbit-modal-enter w-full max-w-sm p-5 rounded-2xl bg-white dark:bg-[#1A1A22] border border-slate-200 dark:border-[#2E2E3A] shadow-xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600 dark:text-[#FF6B6B]">
                <Trash2 className="h-5 w-5 stroke-current" strokeWidth={2} />
                <h4 className="text-sm font-bold text-slate-900 dark:text-[#F2F2F7]">
                  Delete this task?
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#A0A0B0] leading-relaxed">
                This action will delete &ldquo;{task.title}&rdquo; and its attached files. You will have 5 seconds to undo.
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
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 dark:bg-[#FF6B6B] dark:hover:bg-[#FF6B6B]/90 text-white dark:text-[#0F0F14] cursor-pointer shadow-xs"
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
