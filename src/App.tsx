import React, { useState, useEffect, useMemo, useRef } from 'react';
import { OrbitProvider, useOrbit } from './context/OrbitContext';
import { LoginScreen } from './components/LoginScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { Sidebar, SidebarTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { HomeDashboard, StatFilterType } from './components/HomeDashboard';
import { ListView } from './components/ListView';
import { CalendarView } from './components/CalendarView';
import { TeamSpace } from './components/TeamSpace';
import { BottomNav, MainTab } from './components/BottomNav';
import { TaskModal } from './components/TaskModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { InviteModal } from './components/InviteModal';
import { SettingsModal } from './components/SettingsModal';
import { Task, ViewMode, PersonaType } from './types/orbit';
import { Bell, CheckCircle2, X, AlertCircle, RotateCcw, Users, Keyboard } from 'lucide-react';

const OrbitApp: React.FC = () => {
  const {
    currentUser,
    tasks,
    loadingAuth,
    needsOnboarding,
    completeOnboarding,
    updatePreferredView,
    activeAlertTask,
    dismissAlertTask,
    toggleTaskDone,
    theme,
    setTheme,
    toast,
    dismissToast,
    selectedTaskForDetail,
    setSelectedTaskForDetail,
    joinTeam,
  } = useOrbit();

  const isDarkMode = typeof document !== 'undefined'
    ? document.documentElement.classList.contains('dark')
    : theme === 'dark';

  const toggleDarkMode = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  // Main Active Tab: Always starts on 'home' and never auto-switches away unless user navigates
  const [currentTab, setCurrentTab] = useState<SidebarTab>('home');

  // Sub-view for calendar (month vs week)
  const [calendarSubView, setCalendarSubView] = useState<'month' | 'week'>('month');
  const [jumpToTodaySignal, setJumpToTodaySignal] = useState<number>(0);

  // Stat filter passed from Dashboard stat cards to Tasks list
  const [statFilter, setStatFilter] = useState<StatFilterType>('all');

  // Persisted Left Sidebar collapsed state (desktop) & mobile slide-over drawer state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('orbit_sidebar_collapsed') === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Keyboard shortcuts help dialog ("?")
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('orbit_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleSelectTab = (tab: SidebarTab) => {
    setCurrentTab(tab);
    if (tab === 'tasks') {
      updatePreferredView('list');
    } else if (tab === 'calendar') {
      updatePreferredView(calendarSubView);
    } else {
      updatePreferredView(tab as ViewMode);
    }
  };

  const handleSelectStatFilterFromDashboard = (filter: StatFilterType) => {
    setStatFilter(filter);
    setCurrentTab('tasks');
    updatePreferredView('list');
  };

  // Filter States for Dashboard, Tasks, and Calendar views
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedContentType, setSelectedContentType] = useState('all');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<PersonaType | 'all'>('all');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState<Task | null>(null);
  const [modalDefaultDueDate, setModalDefaultDueDate] = useState<string | undefined>(undefined);
  const [modalDefaultDomain, setModalDefaultDomain] = useState<PersonaType | undefined>(undefined);
  const [modalDefaultIsTeamTask, setModalDefaultIsTeamTask] = useState<boolean>(false);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // URL ?teamInvite=... confirmation modal state
  const [pendingTeamInviteCode, setPendingTeamInviteCode] = useState<string | null>(null);
  const [isJoiningTeamFromUrl, setIsJoiningTeamFromUrl] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const teamInviteParam = params.get('teamInvite');
    if (teamInviteParam) {
      setPendingTeamInviteCode(teamInviteParam);
    }
  }, []);

  // Handlers for Task Modal
  const handleOpenNewTask = () => {
    setSelectedTaskToEdit(null);
    setModalDefaultDueDate(undefined);
    setModalDefaultDomain(undefined);
    setModalDefaultIsTeamTask(false);
    setIsTaskModalOpen(true);
  };

  const handleOpenNewTeamTask = () => {
    setSelectedTaskToEdit(null);
    setModalDefaultDueDate(undefined);
    setModalDefaultDomain('designer');
    setModalDefaultIsTeamTask(true);
    setIsTaskModalOpen(true);
  };

  const handleOpenNewTaskForDate = (dateStr: string, isTeam = false) => {
    setSelectedTaskToEdit(null);
    setModalDefaultDueDate(dateStr);
    setModalDefaultDomain(isTeam ? 'designer' : undefined);
    setModalDefaultIsTeamTask(isTeam);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setSelectedTaskToEdit(task);
    setModalDefaultDueDate(undefined);
    setModalDefaultDomain(undefined);
    setModalDefaultIsTeamTask(Boolean(task.teamId));
    setIsTaskModalOpen(true);
  };

  // Global Desktop Keyboard Shortcuts:
  // N -> New task
  // / -> Focus search input (switches to Tasks if on Home)
  // T -> Jump to Today in Calendar
  // ? -> Toggle Keyboard Shortcuts Help Dialog
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!currentUser || needsOnboarding) return;
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (e.key === 'Escape' && isShortcutsModalOpen) {
        setIsShortcutsModalOpen(false);
        return;
      }

      if (isInputFocused || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleOpenNewTask();
      } else if (e.key === '/') {
        e.preventDefault();
        if (currentTab === 'home' || currentTab === 'team') {
          setCurrentTab('tasks');
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 50);
        } else {
          searchInputRef.current?.focus();
        }
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        if (currentTab !== 'calendar') {
          setCurrentTab('calendar');
        }
        setJumpToTodaySignal((prev) => prev + 1);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentUser, needsOnboarding, currentTab, isShortcutsModalOpen]);

  const handleConfirmJoinTeamFromUrl = async () => {
    if (!pendingTeamInviteCode) return;
    setIsJoiningTeamFromUrl(true);
    try {
      const res = await joinTeam(pendingTeamInviteCode);
      if (res.success) {
        setCurrentTab('team');
      }
    } finally {
      setIsJoiningTeamFromUrl(false);
      setPendingTeamInviteCode(null);
      const url = new URL(window.location.href);
      url.searchParams.delete('teamInvite');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleCancelJoinTeamFromUrl = () => {
    setPendingTeamInviteCode(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('teamInvite');
    window.history.replaceState({}, '', url.toString());
  };

  // Extract unique brands and content types for dropdown options
  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.brand && t.brand.trim()) set.add(t.brand.trim());
    });
    return Array.from(set).sort();
  }, [tasks]);

  const uniqueContentTypes = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.contentType && t.contentType.trim()) set.add(t.contentType.trim());
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Filtered Tasks (Used in Tasks and Calendar views)
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesBrand = (task.brand || '').toLowerCase().includes(q);
        const matchesNotes = (task.notes || '').toLowerCase().includes(q);
        const matchesDesc = (task.description || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesBrand && !matchesNotes && !matchesDesc) return false;
      }

      // 2. Brand Filter
      if (selectedBrand !== 'all' && task.brand !== selectedBrand) {
        return false;
      }

      // 3. Content Type Filter (also controlled by Sidebar TYPES section)
      if (selectedContentType !== 'all' && task.contentType !== selectedContentType) {
        return false;
      }

      // 4. Domain Filter (Designer vs Student)
      if (selectedDomainFilter !== 'all' && task.domain !== selectedDomainFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, selectedBrand, selectedContentType, selectedDomainFilter]);

  // Auth loading state with skeleton placeholder
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#534AB7] border-t-transparent" />
          <p className="text-xs font-medium tracking-wide">Loading Orbit...</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* 1-Hour Deadline Browser Alert Banner */}
      {activeAlertTask && (
        <div className="bg-[#534AB7] text-white px-4 py-2.5 text-xs shadow-md sticky top-0 z-50 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <Bell className="h-5 w-5 animate-bounce shrink-0 stroke-current" strokeWidth={2} />
            <div className="truncate font-medium">
              <strong>Deadline Alert:</strong> &quot;{activeAlertTask.title}&quot; is due at{' '}
              <span className="font-mono underline">{activeAlertTask.dueTime}</span> (within 1 hour)!
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                toggleTaskDone(activeAlertTask.id);
                dismissAlertTask();
              }}
              className="min-h-[40px] px-3.5 py-1.5 rounded-[10px] bg-white text-[#534AB7] font-semibold text-xs hover:bg-slate-100 active:bg-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <CheckCircle2 className="h-5 w-5 stroke-current" strokeWidth={2} />
              <span>Mark Done</span>
            </button>
            <button
              onClick={dismissAlertTask}
              className="min-h-[40px] min-w-[40px] h-10 w-10 flex items-center justify-center rounded-[10px] text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20 cursor-pointer transition-colors"
              title="Dismiss alert"
              aria-label="Dismiss alert"
            >
              <X className="h-5 w-5 stroke-current" strokeWidth={2} />
              <span className="sr-only">Dismiss alert</span>
            </button>
          </div>
        </div>
      )}

      {/* First Login Onboarding Modal */}
      <OnboardingModal
        isOpen={needsOnboarding}
        onComplete={(personas) => completeOnboarding(personas)}
      />

      {/* Main Experience */}
      {!needsOnboarding && (
        <>
          {/* Left Sidebar Menu (Fixed on Desktop, Slide-over Drawer on Mobile) */}
          <Sidebar
            currentTab={currentTab}
            onSelectTab={handleSelectTab}
            selectedContentType={selectedContentType}
            onSelectContentType={setSelectedContentType}
            onOpenNewTask={handleOpenNewTask}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebarCollapse}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          {/* Main Content Wrapper offset by desktop sidebar width */}
          <div
            className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
              isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
            }`}
          >
            {/* TopBar for search, filters, and profile access across calendar/tasks views */}
            {currentTab !== 'home' && currentTab !== 'team' && (
              <TopBar
                currentView={currentTab === 'tasks' ? 'list' : calendarSubView}
                onSelectView={(v) => {
                  if (v === 'list') {
                    setCurrentTab('tasks');
                  } else if (v === 'month' || v === 'week') {
                    setCurrentTab('calendar');
                    setCalendarSubView(v);
                  }
                }}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedBrand={selectedBrand}
                onBrandChange={setSelectedBrand}
                selectedContentType={selectedContentType}
                onContentTypeChange={setSelectedContentType}
                selectedDomainFilter={selectedDomainFilter}
                onDomainFilterChange={setSelectedDomainFilter}
                uniqueBrands={uniqueBrands}
                uniqueContentTypes={uniqueContentTypes}
                onOpenNewTask={handleOpenNewTask}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                onOpenShare={() => setIsInviteModalOpen(true)}
                onOpenTeam={() => setCurrentTab('team')}
                onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
                darkMode={isDarkMode}
                onToggleDarkMode={toggleDarkMode}
                searchInputRef={searchInputRef}
                onOpenShortcutsHelp={() => setIsShortcutsModalOpen(true)}
              />
            )}

            {/* Views with short cross-fade when switching */}
            <main key={currentTab} className="flex-1 flex flex-col orbit-view-fade">
              {/* 1. Home Dashboard */}
              {currentTab === 'home' && (
                <HomeDashboard
                  onOpenNewTask={handleOpenNewTask}
                  onOpenEditTask={handleOpenEditTask}
                  onOpenCalendar={() => setCurrentTab('calendar')}
                  onOpenSettings={() => setIsSettingsModalOpen(true)}
                  onOpenTeam={() => setCurrentTab('team')}
                  onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
                  selectedContentType={selectedContentType}
                  onClearContentType={() => setSelectedContentType('all')}
                  onSelectStatFilter={handleSelectStatFilterFromDashboard}
                />
              )}

              {/* 2. Calendar View */}
              {currentTab === 'calendar' && (
                <CalendarView
                  currentView={calendarSubView}
                  tasks={filteredTasks}
                  onOpenEditTask={handleOpenEditTask}
                  onOpenNewTaskForDate={(dateStr) => handleOpenNewTaskForDate(dateStr, false)}
                  jumpToTodaySignal={jumpToTodaySignal}
                />
              )}

              {/* 3. Tasks List View */}
              {currentTab === 'tasks' && (
                <ListView
                  tasks={filteredTasks}
                  onOpenEditTask={handleOpenEditTask}
                  onOpenNewTask={handleOpenNewTask}
                  searchQuery={searchQuery}
                  statFilter={statFilter}
                  onClearStatFilter={() => setStatFilter('all')}
                />
              )}

              {/* 4. Team Space View */}
              {currentTab === 'team' && (
                <TeamSpace
                  onOpenNewTeamTask={handleOpenNewTeamTask}
                  onOpenNewSoloTask={handleOpenNewTask}
                  onOpenEditTask={handleOpenEditTask}
                  onOpenNewTaskForDate={handleOpenNewTaskForDate}
                  onBackHome={() => setCurrentTab('home')}
                  onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
                  selectedContentType={selectedContentType}
                />
              )}
            </main>
          </div>

          {/* Mobile Bottom Menu: Home, Calendar, Tasks */}
          <BottomNav
            currentTab={currentTab === 'team' ? 'home' : (currentTab as MainTab)}
            onSelectTab={(tab) => handleSelectTab(tab)}
          />

          {/* Modals */}
          <TaskModal
            isOpen={isTaskModalOpen}
            onClose={() => setIsTaskModalOpen(false)}
            task={selectedTaskToEdit}
            defaultDueDate={modalDefaultDueDate}
            defaultDomain={modalDefaultDomain}
            defaultIsTeamTask={modalDefaultIsTeamTask}
          />

          <TaskDetailModal
            task={selectedTaskForDetail}
            onClose={() => setSelectedTaskForDetail(null)}
            onEdit={(t) => {
              setSelectedTaskForDetail(null);
              handleOpenEditTask(t);
            }}
          />

          <InviteModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
          />

          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
          />

          {/* Keyboard Shortcuts Help Dialog ("?") */}
          {isShortcutsModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
              onClick={() => setIsShortcutsModalOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="shortcuts-dialog-title"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1E1E26] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 orbit-modal-enter"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-[var(--orbit-accent-light,#EEEDFE)] dark:bg-[#262344] text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] flex items-center justify-center">
                      <Keyboard className="h-5 w-5 stroke-current" strokeWidth={2} />
                    </div>
                    <div>
                      <h3
                        id="shortcuts-dialog-title"
                        className="text-sm font-bold text-slate-900 dark:text-[#F2F2F7]"
                      >
                        Keyboard Shortcuts
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-[#A0A0B0]">
                        Navigate Orbit faster on desktop
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsShortcutsModalOpen(false)}
                    aria-label="Close keyboard shortcuts help"
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-[#F2F2F7] cursor-pointer"
                  >
                    <X className="h-4 w-4 stroke-current" strokeWidth={2} />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  {[
                    { key: 'N', desc: 'Open New task modal' },
                    { key: '/', desc: 'Focus instant task search' },
                    { key: 'T', desc: 'Jump to Today in Calendar' },
                    { key: '← ↑ ↓ →', desc: 'Move through days in Calendar' },
                    { key: 'Enter', desc: 'Open focused Calendar day' },
                    { key: 'Esc', desc: 'Close active modal or dialog' },
                    { key: '?', desc: 'Show or hide this shortcuts guide' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70"
                    >
                      <span className="text-slate-700 dark:text-[#F2F2F7] font-medium">
                        {item.desc}
                      </span>
                      <kbd className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-bold text-slate-800 dark:text-[#8B7BFF] shadow-2xs">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Join Team from QR / Invite Link Confirmation Modal */}
          {pendingTeamInviteCode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1E1E26] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl orbit-modal-enter">
                <div className="h-11 w-11 rounded-xl bg-[#EEEDFE] dark:bg-[#262344] text-[#534AB7] dark:text-[#8B7BFF] flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 stroke-current" strokeWidth={2} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F2F2F7]">
                  Join team?
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A0A0B0] mt-1.5 leading-relaxed">
                  You were invited to join a team schedule on Orbit. Would you like to join now?
                </p>
                <div className="flex items-center justify-end gap-2.5 mt-6">
                  <button
                    type="button"
                    onClick={handleCancelJoinTeamFromUrl}
                    className="min-h-[40px] px-4 py-2 rounded-[10px] text-xs font-semibold text-slate-600 dark:text-[#A0A0B0] hover:bg-slate-100 dark:hover:bg-[#24242E] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isJoiningTeamFromUrl}
                    onClick={handleConfirmJoinTeamFromUrl}
                    className="min-h-[40px] px-4 py-2 rounded-[10px] text-xs font-semibold bg-[#534AB7] dark:bg-[#8B7BFF] hover:bg-[#433B9B] dark:hover:bg-[#7A68F0] text-white cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isJoiningTeamFromUrl ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Instant Action Toast Notification (with optional Undo button) */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 md:bottom-6 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-[12px] bg-slate-900 text-white dark:bg-[#1E1E26] dark:text-[#F2F2F7] shadow-xl border border-slate-800 dark:border-slate-700 orbit-modal-enter text-xs font-semibold backdrop-blur-md"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 stroke-current text-emerald-400 dark:text-emerald-400 shrink-0" strokeWidth={2} />
          ) : (
            <AlertCircle className="h-5 w-5 stroke-current text-rose-400 dark:text-rose-400 shrink-0" strokeWidth={2} />
          )}
          <span>{toast.message}</span>
          {toast.undoAction && (
            <button
              type="button"
              onClick={toast.undoAction}
              className="min-h-[34px] px-3 py-1 rounded-[8px] bg-[#534AB7] dark:bg-[#8B7BFF] text-white hover:opacity-90 flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-opacity"
            >
              <RotateCcw className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
              <span>Undo</span>
            </button>
          )}
          <button
            onClick={dismissToast}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center -mr-2 text-slate-400 hover:text-white dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4 stroke-current" strokeWidth={2} />
            <span className="sr-only">Dismiss</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <OrbitProvider>
      <OrbitApp />
    </OrbitProvider>
  );
}
