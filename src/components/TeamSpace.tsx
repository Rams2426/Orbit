import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { useOrbit } from '../context/OrbitContext';
import { Task, TeamInvite, TeamRole } from '../types/orbit';
import { ListView } from './ListView';
import { CalendarView } from './CalendarView';
import {
  Users,
  Plus,
  QrCode,
  Settings,
  Copy,
  Mail,
  Check,
  RefreshCw,
  Ban,
  Search,
  X,
  Calendar as CalendarIcon,
  List as ListIcon,
  LogOut,
  Shield,
  ArrowLeft,
  Menu,
} from 'lucide-react';

interface TeamSpaceProps {
  onOpenNewTeamTask: () => void;
  onOpenNewSoloTask: () => void;
  onOpenEditTask: (task: Task) => void;
  onOpenNewTaskForDate: (dateStr: string, isTeam: boolean) => void;
  onBackHome: () => void;
  onOpenMobileMenu?: () => void;
  selectedContentType?: string;
}

export const TeamSpace: React.FC<TeamSpaceProps> = ({
  onOpenNewTeamTask,
  onOpenNewSoloTask,
  onOpenEditTask,
  onOpenNewTaskForDate,
  onBackHome,
  onOpenMobileMenu,
  selectedContentType = 'all',
}) => {
  const {
    currentUser,
    team,
    teamMembers,
    userTeamRole,
    teamTasks,
    soloTasks,
    createTeam,
    generateTeamInvite,
    revokeTeamInvite,
    joinTeam,
    leaveTeam,
    removeTeamMember,
    updateTeamMemberRole,
    updateTeamName,
    showToast,
  } = useOrbit();

  // Create / Join Team states
  const [newTeamName, setNewTeamName] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Team Space toggles
  const [scheduleScope, setScheduleScope] = useState<'team' | 'my'>('team');
  const [viewType, setViewType] = useState<'list' | 'month' | 'week'>('list');
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Invite Modal states
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [activeInvite, setActiveInvite] = useState<TeamInvite | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  // Team Settings Modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editTeamNameInput, setEditTeamNameInput] = useState('');

  useEffect(() => {
    if (team) {
      setEditTeamNameInput(team.name);
    }
  }, [team]);

  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string>('');

  // Generate QR code whenever activeInvite changes
  useEffect(() => {
    if (!activeInvite) {
      setQrDataUrl('');
      return;
    }
    const inviteUrl = `${window.location.origin}${window.location.pathname}?teamInvite=${activeInvite.id}`;
    QRCode.toDataURL(inviteUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: '#1E1B4B',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(console.error);
  }, [activeInvite]);

  // Generate preview QR on the Create a team screen when no team exists yet
  useEffect(() => {
    if (team) return;
    const previewUrl = `${window.location.origin}${window.location.pathname}?team=${encodeURIComponent(
      newTeamName.trim() || 'orbit-team'
    )}`;
    QRCode.toDataURL(previewUrl, {
      width: 180,
      margin: 2,
      color: {
        dark: '#1E1B4B',
        light: '#FFFFFF',
      },
    })
      .then((url) => setPreviewQrDataUrl(url))
      .catch(console.error);
  }, [team, newTeamName]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      setIsCreating(true);
      await createTeam(newTeamName.trim(), requireApproval);
      setNewTeamName('');
      // Immediately open Invite QR modal after creating team
      setIsInviteOpen(true);
    } catch (err: any) {
      showToast(err?.message || 'Failed to create team', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Auto-generate invite when opening Invite modal if none active
  useEffect(() => {
    if (isInviteOpen && team && !activeInvite && !isGeneratingInvite) {
      handleGenerateNewInvite();
    }
  }, [isInviteOpen, team]);

  const handleGenerateNewInvite = async () => {
    if (!team) return;
    try {
      setIsGeneratingInvite(true);
      if (activeInvite && !activeInvite.revoked) {
        await revokeTeamInvite(activeInvite.id).catch(() => {});
      }
      const inv = await generateTeamInvite();
      setActiveInvite(inv);
    } catch (err: any) {
      showToast(err?.message || 'Could not generate invite', 'error');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleRevokeCurrentInvite = async () => {
    if (!activeInvite) return;
    await revokeTeamInvite(activeInvite.id);
    setActiveInvite({ ...activeInvite, revoked: true });
  };

  const inviteLink = activeInvite
    ? `${window.location.origin}${window.location.pathname}?teamInvite=${activeInvite.id}`
    : '';

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    showToast('Invite link copied!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendInviteEmail = () => {
    if (!inviteLink || !team) return;
    const subject = encodeURIComponent(`Join "${team.name}" on Orbit`);
    const body = encodeURIComponent(
      `Hi,\n\nYou've been invited to join the "${team.name}" team schedule on Orbit.\n\nClick this single-use link (valid for 24 hours) to join:\n${inviteLink}\n`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleJoinByInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    let code = joinCodeInput.trim();
    if (code.includes('teamInvite=')) {
      const urlParams = new URLSearchParams(code.split('?')[1] || '');
      code = urlParams.get('teamInvite') || code;
    }
    setIsJoining(true);
    const res = await joinTeam(code);
    setIsJoining(false);
    if (!res.success) {
      showToast(res.message, 'error');
    } else {
      setJoinCodeInput('');
    }
  };

  // Filtered tasks based on My tasks / Team toggle, member chip, and search query
  const displayedTasks = useMemo(() => {
    const sourceTasks = scheduleScope === 'team' ? teamTasks : soloTasks;
    return sourceTasks.filter((t) => {
      if (scheduleScope === 'team' && selectedAssigneeFilter !== 'all') {
        if (t.assigneeUid !== selectedAssigneeFilter) return false;
      }
      if (selectedContentType !== 'all' && t.contentType !== selectedContentType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesNotes = (t.notes || '').toLowerCase().includes(q);
        const matchesAssignee = (t.assigneeName || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesAssignee) return false;
      }
      return true;
    });
  }, [scheduleScope, teamTasks, soloTasks, selectedAssigneeFilter, searchQuery, selectedContentType]);

  // Empty State: No Team Yet -> "Create a team" screen with QR code
  if (!team) {
    return (
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 pb-24">
        <div className="flex items-center gap-3 mb-5">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              className="md:hidden min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-[12px] border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] cursor-pointer"
            >
              <Menu className="h-5 w-5 stroke-current" strokeWidth={2} />
            </button>
          )}
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 stroke-current" strokeWidth={2} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="rounded-[16px] border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
            <div className="md:col-span-3 space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[var(--orbit-accent-light,#EEEDFE)] dark:bg-[#8B7BFF]/20 text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6 stroke-current" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#F2F2F7]">
                    Create a team
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A0A0B0] mt-1 leading-relaxed">
                    Collaborate on a shared deliverable calendar, assign tasks to team members, and
                    invite teammates with a single-use QR code.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateTeam} className="space-y-4 pt-2 border-t border-slate-100 dark:border-[#2E2E3A]">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] mb-1.5">
                    Team name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g. Studio North"
                    className="w-full px-3.5 py-2.5 text-xs rounded-[10px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--orbit-accent,#534AB7)]/30 focus:border-[var(--orbit-accent,#534AB7)] dark:border-[#2E2E3A] dark:bg-[#24242E] dark:text-[#F2F2F7] dark:placeholder:text-[#6E6E80]"
                  />
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-[#F2F2F7] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-[#2E2E3A] text-[var(--orbit-accent,#534AB7)] focus:ring-[var(--orbit-accent,#534AB7)]"
                  />
                  <span>Require owner approval before new members can enter</span>
                </label>

                <button
                  type="submit"
                  disabled={isCreating || !newTeamName.trim()}
                  className="min-h-[42px] px-5 py-2.5 text-xs font-semibold text-white dark:text-[#0F0F14] bg-[var(--orbit-accent,#534AB7)] hover:bg-[var(--orbit-accent-hover,#433B9B)] dark:bg-[#8B7BFF] dark:hover:bg-[#9B8EFF] rounded-[12px] shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4 stroke-current" strokeWidth={2.5} />
                  <span>{isCreating ? 'Creating team...' : 'Create team & get QR invite'}</span>
                </button>
              </form>

              {/* Join existing team by code or link */}
              <div className="pt-5 border-t border-slate-100 dark:border-[#2E2E3A] space-y-3">
                <h2 className="text-xs font-semibold text-slate-700 dark:text-[#F2F2F7]">
                  Have a team invite link or code?
                </h2>
                <form onSubmit={handleJoinByInput} className="flex gap-2">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    placeholder="Paste invite link or code..."
                    className="flex-1 px-3.5 py-2 text-xs rounded-[10px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2E2E3A] dark:bg-[#24242E] dark:text-[#F2F2F7] dark:placeholder:text-[#6E6E80]"
                  />
                  <button
                    type="submit"
                    disabled={isJoining || !joinCodeInput.trim()}
                    className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[10px] border border-slate-200 dark:border-[#2E2E3A] bg-slate-100 dark:bg-[#24242E] text-slate-900 dark:text-[#F2F2F7] hover:bg-slate-200 dark:hover:bg-[#2E2E3A] cursor-pointer disabled:opacity-50"
                  >
                    {isJoining ? 'Joining...' : 'Join team'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Instant QR Invite Preview Card */}
            <div className="md:col-span-2 flex flex-col items-center justify-center p-5 rounded-[14px] border border-slate-200/80 dark:border-[#2E2E3A] bg-slate-50/70 dark:bg-[#24242E] text-center space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-[#F2F2F7]">
                <QrCode className="h-4 w-4 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]" strokeWidth={2} />
                <span>Team QR Invite</span>
              </div>
              {previewQrDataUrl && (
                <div className="p-3 rounded-xl bg-white border border-slate-200 dark:border-[#2E2E3A] shadow-xs">
                  <img
                    src={previewQrDataUrl}
                    alt="Team QR code preview"
                    className="h-36 w-36 object-contain"
                  />
                </div>
              )}
              <p className="text-[11px] text-slate-500 dark:text-[#A0A0B0] leading-relaxed">
                Enter your team name and click <strong>Create team</strong> to activate your 24-hour
                single-use invite QR code and shareable link.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canInvite = userTeamRole === 'owner' || userTeamRole === 'admin';

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 space-y-5 pb-24">
      {/* Team Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-[16px] border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] shadow-xs">
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              className="md:hidden min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-[12px] border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#24242E] text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#2E2E3A] cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5 stroke-current" strokeWidth={2} />
            </button>
          )}
          <div className="h-10 w-10 rounded-xl bg-[var(--orbit-accent-light,#EEEDFE)] dark:bg-[#8B7BFF]/20 text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] flex items-center justify-center font-bold text-sm shrink-0">
            <Users className="h-5 w-5 stroke-current" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F2F2F7]">
                {team.name}
              </h1>
              <span className="text-xs text-slate-400 dark:text-[#A0A0B0]">·</span>
              <span className="text-xs font-medium text-slate-500 dark:text-[#A0A0B0] font-mono tabular-nums">
                {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#A0A0B0] capitalize">
              Your role: {userTeamRole || 'member'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canInvite && (
            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="min-h-[40px] px-3.5 py-2 rounded-[10px] border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#24242E] text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#2E2E3A] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <QrCode className="h-4 w-4 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]" strokeWidth={2} />
              <span>Invite</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Team settings"
            title="Team settings"
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-[10px] border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#24242E] text-slate-600 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#2E2E3A] cursor-pointer transition-colors"
          >
            <Settings className="h-5 w-5 stroke-current" strokeWidth={2} />
            <span className="sr-only">Team settings</span>
          </button>

          <button
            type="button"
            onClick={() =>
              scheduleScope === 'team' ? onOpenNewTeamTask() : onOpenNewSoloTask()
            }
            className="min-h-[40px] px-4 py-2 rounded-[10px] bg-[var(--orbit-accent,#534AB7)] hover:bg-[var(--orbit-accent-hover,#433B9B)] dark:bg-[#8B7BFF] dark:hover:bg-[#9B8EFF] text-xs font-semibold text-white dark:text-[#0F0F14] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4 stroke-current" strokeWidth={2.5} />
            <span>{scheduleScope === 'team' ? 'Add team task' : 'Add my task'}</span>
          </button>
        </div>
      </div>

      {/* Controls Bar: My tasks / Team toggle + List / Calendar toggle + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* My tasks / Team toggle */}
          <div className="flex items-center p-1 rounded-[10px] bg-slate-100 dark:bg-[#1A1A22] border border-slate-200 dark:border-[#2E2E3A] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setScheduleScope('my')}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] transition-all cursor-pointer ${
                scheduleScope === 'my'
                  ? 'bg-white text-slate-900 dark:bg-[#24242E] dark:text-[#F2F2F7] shadow-2xs'
                  : 'text-slate-600 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7]'
              }`}
            >
              My tasks
            </button>
            <button
              type="button"
              onClick={() => setScheduleScope('team')}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] transition-all cursor-pointer ${
                scheduleScope === 'team'
                  ? 'bg-[var(--orbit-accent,#534AB7)] text-white dark:bg-[#8B7BFF] dark:text-[#0F0F14] shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7]'
              }`}
            >
              Team ({teamTasks.length})
            </button>
          </div>

          {/* List / Calendar (Month / Week) toggle */}
          <div className="flex items-center p-1 rounded-[10px] bg-slate-100 dark:bg-[#1A1A22] border border-slate-200 dark:border-[#2E2E3A] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewType('list')}
              className={`min-h-[36px] px-3 py-1.5 rounded-[8px] flex items-center gap-1.5 transition-all cursor-pointer ${
                viewType === 'list'
                  ? 'bg-white text-slate-900 dark:bg-[#24242E] dark:text-[#F2F2F7] shadow-2xs'
                  : 'text-slate-600 dark:text-[#A0A0B0]'
              }`}
            >
              <ListIcon className="h-4 w-4 stroke-current" strokeWidth={2} />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewType('month')}
              className={`min-h-[36px] px-3 py-1.5 rounded-[8px] flex items-center gap-1.5 transition-all cursor-pointer ${
                viewType === 'month'
                  ? 'bg-white text-slate-900 dark:bg-[#24242E] dark:text-[#F2F2F7] shadow-2xs'
                  : 'text-slate-600 dark:text-[#A0A0B0]'
              }`}
            >
              <CalendarIcon className="h-4 w-4 stroke-current" strokeWidth={2} />
              <span>Month</span>
            </button>
            <button
              type="button"
              onClick={() => setViewType('week')}
              className={`min-h-[36px] px-3 py-1.5 rounded-[8px] flex items-center gap-1.5 transition-all cursor-pointer ${
                viewType === 'week'
                  ? 'bg-white text-slate-900 dark:bg-[#24242E] dark:text-[#F2F2F7] shadow-2xs'
                  : 'text-slate-600 dark:text-[#A0A0B0]'
              }`}
            >
              <span>Week</span>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 stroke-current text-slate-400 dark:text-[#A0A0B0]" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-[10px] border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] text-slate-900 dark:text-[#F2F2F7] placeholder:text-slate-400 dark:placeholder:text-[#6E6E80] focus:outline-none focus:border-[var(--orbit-accent,#534AB7)] dark:focus:border-[#8B7BFF]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-[#F2F2F7] cursor-pointer"
            >
              <X className="h-4 w-4 stroke-current" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Member Filter Chips (when viewing Team schedule) */}
      {scheduleScope === 'team' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedAssigneeFilter('all')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-[10px] text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
              selectedAssigneeFilter === 'all'
                ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:bg-[#8B7BFF]/20 dark:text-[#8B7BFF]'
                : 'border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] text-slate-600 dark:text-[#A0A0B0] dark:hover:bg-[#24242E]'
            }`}
          >
            Everyone
          </button>
          {teamMembers.map((m) => {
            const isSelected = selectedAssigneeFilter === m.uid;
            return (
              <button
                key={m.uid}
                type="button"
                onClick={() => setSelectedAssigneeFilter(m.uid)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-[10px] text-xs font-semibold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:bg-[#8B7BFF]/20 dark:text-[#8B7BFF]'
                    : 'border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] text-slate-600 dark:text-[#A0A0B0] dark:hover:bg-[#24242E]'
                }`}
              >
                <span className="h-5 w-5 rounded-full bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] text-white dark:text-[#0F0F14] text-[10px] font-bold flex items-center justify-center">
                  {m.displayName.charAt(0).toUpperCase()}
                </span>
                <span>{m.displayName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content View: List or Calendar */}
      {viewType === 'list' ? (
        <ListView
          tasks={displayedTasks}
          onOpenEditTask={onOpenEditTask}
          onOpenNewTask={() =>
            scheduleScope === 'team' ? onOpenNewTeamTask() : onOpenNewSoloTask()
          }
        />
      ) : (
        <CalendarView
          currentView={viewType}
          tasks={displayedTasks}
          onOpenEditTask={onOpenEditTask}
          onOpenNewTaskForDate={(dateStr) =>
            onOpenNewTaskForDate(dateStr, scheduleScope === 'team')
          }
        />
      )}

      {/* Team QR Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-[16px] bg-white dark:bg-[#1A1A22] border border-slate-200 dark:border-[#2E2E3A] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#2E2E3A] pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F2F2F7]">
                  Invite to {team.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#A0A0B0]">
                  Single-use QR code & link · Expires in 24 hours
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                aria-label="Close invite modal"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-[#F2F2F7] cursor-pointer"
              >
                <X className="h-5 w-5 stroke-current" strokeWidth={2} />
              </button>
            </div>

            {activeInvite?.revoked ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  This invite code has been revoked.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateNewInvite}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[10px] bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] text-white dark:text-[#0F0F14] cursor-pointer"
                >
                  Generate new invite
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-[#24242E] border border-slate-200/80 dark:border-[#2E2E3A]">
                  {qrDataUrl ? (
                    <div className="p-3 rounded-xl bg-white border border-slate-200 dark:border-[#2E2E3A] shadow-xs">
                      <img
                        src={qrDataUrl}
                        alt="Team Invite QR Code"
                        className="h-44 w-44 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-44 w-44 flex items-center justify-center text-xs text-slate-400 dark:text-[#6E6E80]">
                      Generating QR...
                    </div>
                  )}
                  <span className="mt-2 text-[11px] font-mono text-slate-500 dark:text-[#A0A0B0]">
                    Code: {activeInvite?.id || '...'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="min-h-[40px] px-3 py-2 rounded-[10px] border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#24242E] text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#2E2E3A] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedLink ? (
                      <Check className="h-4 w-4 stroke-current text-emerald-500 dark:text-[#4ADE80]" strokeWidth={2} />
                    ) : (
                      <Copy className="h-4 w-4 stroke-current" strokeWidth={2} />
                    )}
                    <span>{copiedLink ? 'Copied' : 'Copy link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendInviteEmail}
                    className="min-h-[40px] px-3 py-2 rounded-[10px] border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#24242E] text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#2E2E3A] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="h-4 w-4 stroke-current" strokeWidth={2} />
                    <span>Send by email</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#2E2E3A]">
                  <button
                    type="button"
                    onClick={handleRevokeCurrentInvite}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-[#24242E] rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Ban className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                    <span>Revoke code</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateNewInvite}
                    disabled={isGeneratingInvite}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] hover:bg-slate-100 dark:hover:bg-[#24242E] rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                    <span>Generate new</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Team Settings & Members Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg p-6 rounded-[16px] bg-white dark:bg-[#1A1A22] border border-slate-200 dark:border-[#2E2E3A] shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#2E2E3A] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF]" strokeWidth={2} />
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F2F2F7]">
                  Team settings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Close team settings"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-[#F2F2F7] cursor-pointer"
              >
                <X className="h-5 w-5 stroke-current" strokeWidth={2} />
              </button>
            </div>

            {/* Rename Team (Owner only) */}
            {userTeamRole === 'owner' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#F2F2F7]">
                  Team name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editTeamNameInput}
                    onChange={(e) => setEditTeamNameInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-[10px] border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#24242E] text-slate-900 dark:text-[#F2F2F7] focus:outline-none focus:border-[#8B7BFF]"
                  />
                  <button
                    type="button"
                    onClick={() => updateTeamName(editTeamNameInput)}
                    className="min-h-[38px] px-4 py-1.5 text-xs font-semibold rounded-[10px] bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] text-white dark:text-[#0F0F14] cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Members List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-[#A0A0B0] uppercase tracking-wider">
                Members ({teamMembers.length})
              </h4>
              <div className="space-y-2">
                {teamMembers.map((member) => {
                  const isSelf = member.uid === currentUser?.uid;
                  const canRemove =
                    !isSelf &&
                    (userTeamRole === 'owner' ||
                      (userTeamRole === 'admin' && member.role === 'member'));

                  return (
                    <div
                      key={member.uid}
                      className="flex items-center justify-between gap-2 p-3 rounded-[10px] border border-slate-200 dark:border-[#2E2E3A] bg-slate-50/60 dark:bg-[#24242E]"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-[#F2F2F7] truncate">
                          {member.displayName} {isSelf ? '(You)' : ''}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-[#A0A0B0] truncate font-mono">
                          {member.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {userTeamRole === 'owner' && !isSelf ? (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              updateTeamMemberRole(member.uid, e.target.value as TeamRole)
                            }
                            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] text-slate-800 dark:text-[#F2F2F7] cursor-pointer focus:outline-none"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Transfer Owner</option>
                          </select>
                        ) : (
                          <span className="text-xs font-semibold capitalize text-slate-600 dark:text-[#A0A0B0] px-2">
                            {member.role}
                          </span>
                        )}

                        {canRemove && (
                          <button
                            type="button"
                            onClick={() => removeTeamMember(member.uid)}
                            className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-[#2E2E3A] cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leave Team */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#2E2E3A] flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-[#A0A0B0]">
                {userTeamRole === 'owner' && teamMembers.length > 1
                  ? 'Transfer ownership to another member before leaving.'
                  : 'Leave this team space and return to solo schedule.'}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await leaveTeam();
                    setIsSettingsOpen(false);
                  } catch (err: any) {
                    showToast(err?.message || 'Cannot leave team', 'error');
                  }
                }}
                className="min-h-[38px] px-3.5 py-1.5 rounded-[10px] text-xs font-semibold text-rose-600 dark:text-[#FF6B6B] border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-[#24242E] flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="h-4 w-4 stroke-current" strokeWidth={2} />
                <span>Leave team</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
