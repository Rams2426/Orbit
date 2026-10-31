import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { Task, Priority, PersonaType, TaskAttachment } from '../types/orbit';
import {
  MAX_ATTACHMENTS_PER_TASK,
  FILE_INPUT_ACCEPT,
  validateAttachmentFile,
  uploadTaskFileToStorage,
  deleteFileFromStorage,
  validateExternalLink,
  isImageAttachment,
  isLinkAttachment,
  formatFileSize,
} from '../utils/attachments';
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
  Upload,
  Camera,
  FolderOpen,
  Link as LinkIcon,
  File as FileIcon,
  CheckCircle2,
} from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  defaultDueDate?: string;
  defaultDomain?: PersonaType;
  defaultIsTeamTask?: boolean;
}

interface PendingAttachmentItem {
  localId: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  errorText?: string;
  attachment?: TaskAttachment;
  newlyUploadedToStorage?: boolean;
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
    showToast,
  } = useOrbit();

  const userPersonas = useMemo<PersonaType[]>(
    () => (userProfile?.personas?.length ? userProfile.personas : ['designer']),
    [userProfile?.personas]
  );
  const primaryPersona: PersonaType = userPersonas[0] || 'designer';
  const hasDesigner = userPersonas.includes('designer');
  const hasStudent = userPersonas.includes('student');
  const hasBoth = hasDesigner && hasStudent;

  const [domain, setDomain] = useState<PersonaType>(defaultDomain || primaryPersona);
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<string>('Reel');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('17:00');
  const [priority, setPriority] = useState<Priority>('medium');
  const [notes, setNotes] = useState('');

  const [targetSchedule, setTargetSchedule] = useState<'my' | 'partner' | 'team'>('my');
  const [assigneeUid, setAssigneeUid] = useState<string>('');

  // Pre-generated task ID for new tasks so Storage path users/{uid}/tasks/{taskId} is deterministic
  const [draftTaskId, setDraftTaskId] = useState<string>('');

  // Attachments state
  const [attachmentItems, setAttachmentItems] = useState<PendingAttachmentItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [attachmentFeedback, setAttachmentFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // Add a link state
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [linkLabelInput, setLinkLabelInput] = useState('');

  // Hidden file inputs for All Files, Photo Library, and Camera Capture
  const filePickerRef = useRef<HTMLInputElement | null>(null);
  const photoLibraryRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Mobile swipe-down to close
  const touchStartYRef = useRef<number | null>(null);
  const [swipeOffsetY, setSwipeOffsetY] = useState(0);

  // Form submission and error states
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLinkedWithPartner = Boolean(
    activePair && activePair.status === 'active' && activePair.freelancerUid
  );

  const partnerName = useMemo(() => {
    if (!activePair || activePair.status !== 'active' || !activePair.freelancerUid) return null;
    const otherEmail =
      currentUser?.uid === activePair.bossUid
        ? activePair.freelancerEmail
        : activePair.bossEmail;
    return otherEmail ? otherEmail.split('@')[0] : 'Partner';
  }, [activePair, currentUser?.uid]);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setAttachmentFeedback(null);
    setIsSaving(false);
    setShowAddLinkForm(false);
    setLinkUrlInput('');
    setLinkLabelInput('');
    setSwipeOffsetY(0);

    if (task) {
      setDraftTaskId(task.id);
      setTitle(task.title);
      setDueDate(task.dueDate);
      setDueTime(task.dueTime || '17:00');
      setPriority(task.priority || 'medium');
      setNotes(task.notes || '');
      setDomain(task.domain || primaryPersona);
      setContentType(task.contentType || (task.domain === 'student' ? 'Assignment' : 'Reel'));
      setTargetSchedule(task.teamId ? 'team' : task.pairId ? 'partner' : 'my');
      setAssigneeUid(task.assigneeUid || currentUser?.uid || '');
      setAttachmentItems(
        (task.attachments || []).map((att) => ({
          localId: att.id,
          name: att.name,
          size: att.size,
          type: att.type || 'application/octet-stream',
          previewUrl: isImageAttachment(att) ? att.url : undefined,
          progress: 100,
          status: 'done',
          attachment: att,
          newlyUploadedToStorage: false,
        }))
      );
    } else {
      setDraftTaskId(`tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
      setTitle('');
      if (defaultDueDate) {
        setDueDate(defaultDueDate);
      } else {
        const todayStr = new Date().toLocaleDateString('en-CA');
        setDueDate(todayStr);
      }
      setDueTime('17:00');
      setPriority('medium');
      setNotes('');
      setTargetSchedule(defaultIsTeamTask && team ? 'team' : 'my');
      setAssigneeUid(currentUser?.uid || '');

      const initialDomain: PersonaType = defaultDomain || primaryPersona;
      setDomain(initialDomain);
      setContentType(initialDomain === 'student' ? 'Assignment' : 'Reel');
      setAttachmentItems([]);
    }
  }, [
    isOpen,
    task?.id,
    defaultDueDate,
    defaultDomain,
    defaultIsTeamTask,
    primaryPersona,
    team?.id,
    currentUser?.uid,
  ]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        handleCancelAndCleanup();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, attachmentItems]);

  if (!isOpen) return null;

  // Clean up any newly uploaded files if the user cancels without saving
  const handleCancelAndCleanup = async () => {
    const unsavedUploads = attachmentItems.filter(
      (item) => item.newlyUploadedToStorage && item.attachment?.storagePath
    );
    if (unsavedUploads.length > 0) {
      await Promise.allSettled(
        unsavedUploads.map((item) => deleteFileFromStorage(item.attachment?.storagePath))
      );
    }
    onClose();
  };

  const isTeamTaskMode = Boolean(
    (targetSchedule === 'team' || defaultIsTeamTask || task?.teamId) && team
  );
  const activeTeamId = isTeamTaskMode ? task?.teamId || team?.id || null : null;

  // Handle selected or dropped files
  const handleProcessFiles = async (fileList: FileList | File[]) => {
    if (!currentUser) return;
    setAttachmentFeedback(null);

    const incomingFiles = Array.from(fileList);
    if (incomingFiles.length === 0) return;

    const currentCount = attachmentItems.length;
    if (currentCount + incomingFiles.length > MAX_ATTACHMENTS_PER_TASK) {
      setAttachmentFeedback({
        type: 'error',
        text: `You can attach up to ${MAX_ATTACHMENTS_PER_TASK} files or links per task (${currentCount}/${MAX_ATTACHMENTS_PER_TASK} used).`,
      });
      return;
    }

    for (const file of incomingFiles) {
      const check = validateAttachmentFile(file);
      if (!check.valid) {
        setAttachmentFeedback({
          type: 'error',
          text: check.error || `"${file.name}" is not an allowed file type.`,
        });
        continue;
      }

      const localId = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const isImg = (check.mimeType || file.type).startsWith('image/');
      const localPreviewUrl = isImg ? URL.createObjectURL(file) : undefined;

      const newItem: PendingAttachmentItem = {
        localId,
        name: file.name,
        size: file.size,
        type: check.mimeType || file.type,
        previewUrl: localPreviewUrl,
        progress: 5,
        status: 'uploading',
        newlyUploadedToStorage: true,
      };

      setAttachmentItems((prev) => [...prev, newItem]);

      try {
        const uploaded = await uploadTaskFileToStorage({
          file,
          userId: currentUser.uid,
          userDisplayName: currentUser.displayName || currentUser.email || 'User',
          taskId: task?.id || draftTaskId,
          teamId: activeTeamId,
          onProgress: (pct) => {
            setAttachmentItems((prev) =>
              prev.map((item) =>
                item.localId === localId ? { ...item, progress: Math.max(5, pct) } : item
              )
            );
          },
        });

        setAttachmentItems((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  name: uploaded.name,
                  size: uploaded.size,
                  type: uploaded.type || item.type,
                  progress: 100,
                  status: 'done',
                  attachment: uploaded,
                }
              : item
          )
        );
        setAttachmentFeedback({
          type: 'success',
          text: `Uploaded "${uploaded.name}"`,
        });
      } catch (err: any) {
        console.error('Attachment upload failed:', err);
        setAttachmentItems((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  status: 'error',
                  errorText: err?.message || 'Upload failed. Check Storage rules or connection.',
                }
              : item
          )
        );
        setAttachmentFeedback({
          type: 'error',
          text: `Could not upload "${file.name}": ${err?.message || 'Storage error'}`,
        });
      }
    }
  };

  const handleRemoveAttachmentItem = async (localId: string) => {
    const target = attachmentItems.find((item) => item.localId === localId);
    if (!target) return;

    if (target.previewUrl && target.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(target.previewUrl);
    }

    // If it was uploaded during this form session (or if editing an existing task and removing before save),
    // delete from Storage if newly uploaded
    if (target.newlyUploadedToStorage && target.attachment?.storagePath) {
      await deleteFileFromStorage(target.attachment.storagePath);
    }

    setAttachmentItems((prev) => prev.filter((item) => item.localId !== localId));
  };

  const handleAddExternalLink = () => {
    setAttachmentFeedback(null);
    if (attachmentItems.length >= MAX_ATTACHMENTS_PER_TASK) {
      setAttachmentFeedback({
        type: 'error',
        text: `Maximum ${MAX_ATTACHMENTS_PER_TASK} attachments allowed per task.`,
      });
      return;
    }

    const validation = validateExternalLink(linkUrlInput);
    if (!validation.valid || !validation.url) {
      setAttachmentFeedback({
        type: 'error',
        text: validation.error || 'Please enter a valid URL.',
      });
      return;
    }

    let hostnameLabel = validation.url;
    try {
      const u = new URL(validation.url);
      hostnameLabel = u.hostname.replace(/^www\./, '');
    } catch {
      // keep raw
    }

    const cleanLabel = linkLabelInput.trim() || hostnameLabel;
    const linkAtt: TaskAttachment = {
      id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanLabel.slice(0, 120),
      url: validation.url,
      size: 0,
      type: 'link',
      isLink: true,
      uploadedBy: currentUser?.displayName || currentUser?.email || 'User',
      uploadedByUid: currentUser?.uid,
      uploadedAt: new Date().toISOString(),
    };

    setAttachmentItems((prev) => [
      ...prev,
      {
        localId: linkAtt.id,
        name: linkAtt.name,
        size: 0,
        type: 'link',
        progress: 100,
        status: 'done',
        attachment: linkAtt,
        newlyUploadedToStorage: false,
      },
    ]);

    setLinkUrlInput('');
    setLinkLabelInput('');
    setShowAddLinkForm(false);
    setAttachmentFeedback({
      type: 'success',
      text: `Added link "${linkAtt.name}"`,
    });
  };

  const titlePlaceholder =
    domain === 'student' ? 'e.g. Chemistry lab report' : 'e.g. Summer campaign reel';

  const notesLabel = domain === 'student' ? 'Notes' : 'Task description';

  const handleSelectChip = (type: string, chipDomain: PersonaType) => {
    setContentType(type);
    setDomain(chipDomain);
  };

  const isAnyUploading = attachmentItems.some((item) => item.status === 'uploading');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate || !dueTime) {
      setErrorMessage('Please provide a task title, due date, and exact time.');
      return;
    }

    if (isAnyUploading) {
      setErrorMessage('Please wait for file uploads to finish before saving.');
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

      const finalAttachments: TaskAttachment[] = attachmentItems
        .filter((item) => item.status === 'done' && item.attachment)
        .map((item) => item.attachment!);

      // If editing an existing task and any previously saved storage attachments were removed, delete them from Storage now
      if (task?.attachments?.length) {
        const keptIds = new Set(finalAttachments.map((a) => a.id));
        const removedExisting = task.attachments.filter(
          (oldAtt) => !keptIds.has(oldAtt.id) && oldAtt.storagePath && !oldAtt.isLink
        );
        if (removedExisting.length > 0) {
          await Promise.allSettled(
            removedExisting.map((oldAtt) => deleteFileFromStorage(oldAtt.storagePath))
          );
        }
      }

      if (task) {
        await updateTask(task.id, {
          title: title.trim(),
          dueDate,
          dueTime,
          priority,
          notes: notes.trim(),
          contentType: contentType.trim() ? contentType.trim() : undefined,
          domain,
          attachments: finalAttachments,
          ...(task.teamId
            ? {
                assigneeUid: assigneeUid || currentUser?.uid,
                assigneeName: resolvedAssigneeName,
              }
            : {}),
        });
      } else {
        await createTask({
          id: draftTaskId,
          title: title.trim(),
          dueDate,
          dueTime,
          priority,
          notes: notes.trim(),
          contentType: contentType.trim() ? contentType.trim() : undefined,
          domain,
          status: 'todo',
          attachments: finalAttachments,
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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={handleCancelAndCleanup}
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
            handleCancelAndCleanup();
          } else {
            setSwipeOffsetY(0);
          }
          touchStartYRef.current = null;
        }}
        className="orbit-modal-enter relative w-full max-w-lg rounded-t-[20px] sm:rounded-[16px] border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-auto max-h-[92dvh] overflow-y-auto"
      >
        {/* Mobile Swipe Handle Pill */}
        <div className="sm:hidden flex justify-center -mt-1.5 mb-2.5">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3
              id="task-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F2F2F7]"
            >
              {task ? 'Edit task' : 'New task'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-[#A0A0B0] mt-0.5">
              {domain === 'student' ? 'Academic schedule & deadline' : 'Deliverable schedule & deadline'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCancelAndCleanup}
            aria-label="Close modal"
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-[10px] text-slate-500 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] cursor-pointer transition-colors"
          >
            <X className="h-5 w-5 stroke-current" strokeWidth={2} />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-[10px] bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 stroke-current text-rose-600 dark:text-rose-400 mt-0.5" strokeWidth={2} />
            <div className="flex-1">
              <p className="font-semibold text-rose-900 dark:text-rose-200">Unable to save task</p>
              <p className="mt-0.5 text-[11px] leading-relaxed break-words">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200 cursor-pointer"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4 stroke-current" strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="pt-3.5 space-y-3.5">
          {/* 1. Task title */}
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

          {/* 2. Deliverable type chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] mb-1.5">
              Deliverable type
            </label>

            {hasBoth ? (
              <div className="space-y-2.5">
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-[#A0A0B0] uppercase tracking-wider mb-1">
                    Designer Deliverables
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

                <div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-[#A0A0B0] uppercase tracking-wider mb-1">
                    Student Tasks
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

          {/* 3. Date and Time */}
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
                className="w-full px-3 py-2 text-xs font-sans tabular-nums rounded-[10px] border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--orbit-accent,#534AB7)]/30 focus:border-[var(--orbit-accent,#534AB7)] dark:border-slate-700 dark:bg-slate-800 dark:text-[#F2F2F7] transition-colors"
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
                className="w-full px-3 py-2 text-xs font-sans tabular-nums rounded-[10px] border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--orbit-accent,#534AB7)]/30 focus:border-[var(--orbit-accent,#534AB7)] dark:border-slate-700 dark:bg-slate-800 dark:text-[#F2F2F7] transition-colors"
              />
            </div>
          </div>

          {/* 4. Priority */}
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

          {/* 5. Task description / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] mb-1">
              {notesLabel}{' '}
              <span className="text-[11px] font-normal text-slate-500 dark:text-[#A0A0B0]">
                (optional)
              </span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instructions, links, or requirements..."
              className="w-full px-3.5 py-2 text-xs rounded-[10px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--orbit-accent,#534AB7)]/30 focus:border-[var(--orbit-accent,#534AB7)] dark:border-slate-700 dark:bg-slate-800 dark:text-[#F2F2F7] dark:placeholder:text-[#A0A0B0] leading-relaxed transition-colors resize-none"
            />
          </div>

          {/* 6. ATTACHMENTS (OPTIONAL) — Directly below Task description */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-800 dark:text-[#F2F2F7]">
                Attachments{' '}
                <span className="text-[11px] font-normal text-slate-500 dark:text-[#A0A0B0]">
                  (optional · {attachmentItems.length}/{MAX_ATTACHMENTS_PER_TASK})
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowAddLinkForm((prev) => !prev)}
                className="min-h-[32px] px-2.5 py-1 rounded-[8px] text-[11px] font-semibold text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] hover:bg-slate-100 dark:hover:bg-[#24242E] flex items-center gap-1 cursor-pointer"
              >
                <LinkIcon className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                <span>Add a link</span>
              </button>
            </div>

            {/* Hidden Native Inputs */}
            <input
              ref={filePickerRef}
              type="file"
              multiple
              accept={FILE_INPUT_ACCEPT}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleProcessFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={photoLibraryRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleProcessFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleProcessFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {/* Dashed Drop Area */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Add photos or documents"
              onClick={() => filePickerRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  filePickerRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingOver(false);
                if (e.dataTransfer.files?.length) {
                  handleProcessFiles(e.dataTransfer.files);
                }
              }}
              className={`rounded-[12px] border-2 border-dashed p-3.5 text-center transition-all cursor-pointer ${
                isDraggingOver
                  ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)]/60 dark:border-[#8B7BFF] dark:bg-[#534AB7]/20'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-9 w-9 rounded-[10px] bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] shadow-2xs">
                  <Upload className="h-4 w-4 stroke-current" strokeWidth={2} />
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-[#F2F2F7]">
                  Add photos or documents
                </p>
                <p className="text-[11px] text-slate-400 dark:text-[#A0A0B0]">
                  JPG, PNG, WebP, PDF, DOCX, XLSX, PPTX, TXT · Max 10 MB · Up to 5 files
                </p>

                {/* Mobile & Touch Source Options: Take photo, Photo library, Files */}
                <div
                  className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5 pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="sm:hidden min-h-[34px] px-2.5 py-1 rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-[#F2F2F7] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]" strokeWidth={2} />
                    <span>Take photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => photoLibraryRef.current?.click()}
                    className="min-h-[34px] px-2.5 py-1 rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon className="h-3.5 w-3.5 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]" strokeWidth={2} />
                    <span>Photo library</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => filePickerRef.current?.click()}
                    className="min-h-[34px] px-2.5 py-1 rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] flex items-center gap-1.5 cursor-pointer"
                  >
                    <FolderOpen className="h-3.5 w-3.5 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]" strokeWidth={2} />
                    <span>Files</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Optional "Add a link" Inline Input Box */}
            {showAddLinkForm && (
              <div className="p-3 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 space-y-2 orbit-task-enter">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-[#F2F2F7]">
                    Add external link (Google Drive, Dropbox, Figma, etc.)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddLinkForm(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-[#F2F2F7] cursor-pointer"
                    aria-label="Close link form"
                  >
                    <X className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="url"
                    value={linkUrlInput}
                    onChange={(e) => setLinkUrlInput(e.target.value)}
                    placeholder="https://figma.com/file/..."
                    className="w-full px-3 py-1.5 text-xs rounded-[8px] border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-[#F2F2F7] focus:outline-none focus:border-[var(--orbit-accent,#534AB7)]"
                  />
                  <input
                    type="text"
                    value={linkLabelInput}
                    onChange={(e) => setLinkLabelInput(e.target.value)}
                    placeholder="Label (optional, e.g. Figma prototype)"
                    className="w-full px-3 py-1.5 text-xs rounded-[8px] border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-[#F2F2F7] focus:outline-none focus:border-[var(--orbit-accent,#534AB7)]"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddExternalLink}
                    className="min-h-[34px] px-3 py-1 rounded-[8px] bg-[var(--orbit-accent,#534AB7)] text-white text-xs font-semibold hover:bg-[var(--orbit-accent-hover,#433B9B)] cursor-pointer"
                  >
                    Add link
                  </button>
                </div>
              </div>
            )}

            {/* Inline Feedback Message (Success / Error) */}
            {attachmentFeedback && (
              <div
                role="status"
                className={`px-3 py-2 rounded-[10px] text-[11px] font-medium flex items-center justify-between gap-2 ${
                  attachmentFeedback.type === 'error'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {attachmentFeedback.type === 'error' ? (
                    <AlertCircle className="h-4 w-4 shrink-0 stroke-current" strokeWidth={2} />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0 stroke-current" strokeWidth={2} />
                  )}
                  <span className="truncate">{attachmentFeedback.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachmentFeedback(null)}
                  className="shrink-0 opacity-75 hover:opacity-100 cursor-pointer"
                  aria-label="Dismiss attachment message"
                >
                  <X className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                </button>
              </div>
            )}

            {/* Attached Files / Links Rows */}
            {attachmentItems.length > 0 && (
              <div className="space-y-2 pt-0.5">
                {attachmentItems.map((item) => {
                  const isLink = item.type === 'link' || Boolean(item.attachment && isLinkAttachment(item.attachment));
                  const isImg = Boolean(item.previewUrl) || item.type.startsWith('image/');

                  return (
                    <div
                      key={item.localId}
                      className="orbit-task-enter flex items-center gap-3 p-2.5 rounded-[10px] border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80"
                    >
                      {/* Thumbnail for images, or Icon for documents/links */}
                      {isImg && item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="h-10 w-10 rounded-[8px] object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-[8px] bg-slate-100 dark:bg-slate-700/70 flex items-center justify-center text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] shrink-0">
                          {isLink ? (
                            <LinkIcon className="h-4 w-4 stroke-current" strokeWidth={2} />
                          ) : (
                            <FileIcon className="h-4 w-4 stroke-current" strokeWidth={2} />
                          )}
                        </div>
                      )}

                      {/* File Name, Size, and Upload Progress Bar */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900 dark:text-[#F2F2F7] truncate">
                            {item.name}
                          </p>
                          <span className="text-[11px] text-slate-400 dark:text-[#A0A0B0] shrink-0 tabular-nums">
                            {isLink ? 'External link' : formatFileSize(item.size)}
                          </span>
                        </div>

                        {/* Upload Progress Bar */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-200 ${
                                item.status === 'error'
                                  ? 'bg-rose-500'
                                  : item.status === 'done'
                                  ? 'bg-emerald-500'
                                  : 'bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF]'
                              }`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 dark:text-[#A0A0B0] shrink-0 tabular-nums">
                            {item.status === 'error'
                              ? 'Failed'
                              : item.status === 'done'
                              ? 'Ready'
                              : `${item.progress}%`}
                          </span>
                        </div>

                        {item.errorText && (
                          <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400 truncate">
                            {item.errorText}
                          </p>
                        )}
                      </div>

                      {/* Remove X Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachmentItem(item.localId)}
                        aria-label={`Remove ${item.name}`}
                        title="Remove attachment"
                        className="min-w-[36px] min-h-[36px] h-9 w-9 flex items-center justify-center rounded-[8px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-[#24242E] cursor-pointer shrink-0"
                      >
                        <X className="h-4 w-4 stroke-current" strokeWidth={2} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team Task Assignment */}
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

          {/* Collaborative Schedule Assignment */}
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

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={handleCancelAndCleanup}
                disabled={isSaving}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] rounded-[10px] cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || isAnyUploading}
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
