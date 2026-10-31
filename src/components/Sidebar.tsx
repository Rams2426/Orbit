import React, { useState, useEffect, useRef } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { OrbitLogo } from './OrbitLogo';
import { PersonaType, ThemeMode } from '../types/orbit';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Users,
  Plus,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  Sun,
  Moon,
  Monitor,
  LogOut,
  ChevronUp,
  User,
  X,
} from 'lucide-react';

export type SidebarTab = 'home' | 'calendar' | 'tasks' | 'team';

interface SidebarProps {
  currentTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  selectedContentType: string;
  onSelectContentType: (type: string) => void;
  onOpenNewTask: () => void;
  onOpenSettings: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface TypeLegendItem {
  label: string;
  dotClass: string;
  domain: PersonaType;
}

const DESIGNER_TYPES: TypeLegendItem[] = [
  { label: 'Reel', dotClass: 'bg-violet-500', domain: 'designer' },
  { label: 'Post', dotClass: 'bg-sky-500', domain: 'designer' },
  { label: 'Story', dotClass: 'bg-pink-500', domain: 'designer' },
  { label: 'Carousel', dotClass: 'bg-amber-500', domain: 'designer' },
];

const STUDENT_TYPES: TypeLegendItem[] = [
  { label: 'Assignment', dotClass: 'bg-emerald-500', domain: 'student' },
  { label: 'Exam', dotClass: 'bg-rose-500', domain: 'student' },
  { label: 'Class', dotClass: 'bg-teal-500', domain: 'student' },
  { label: 'Study', dotClass: 'bg-indigo-500', domain: 'student' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  selectedContentType,
  onSelectContentType,
  onOpenNewTask,
  onOpenSettings,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const {
    currentUser,
    userProfile,
    tasks,
    team,
    teamMembers,
    theme,
    setTheme,
    logout,
  } = useOrbit();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Personas from user profile
  const personas: PersonaType[] = userProfile?.personas?.length
    ? userProfile.personas
    : ['designer'];
  const hasDesigner = personas.includes('designer');
  const hasStudent = personas.includes('student');
  const hasBoth = hasDesigner && hasStudent;

  // Count badges
  const pendingTasksCount = tasks.filter((t) => t.status !== 'done').length;
  const teamMemberCount = team ? teamMembers.length : 0;

  // Close user menu on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
        if (isMobileOpen) onCloseMobile();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileOpen, onCloseMobile]);

  const workspaceItems: {
    id: SidebarTab;
    label: string;
    icon: React.FC<{ className?: string; strokeWidth?: number }>;
    badge?: number;
  }[] = [
    {
      id: 'home',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      badge: pendingTasksCount,
    },
    {
      id: 'team',
      label: 'Team',
      icon: Users,
      badge: teamMemberCount > 0 ? teamMemberCount : undefined,
    },
  ];

  const handleNavClick = (tab: SidebarTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const handleTypeClick = (typeLabel: string) => {
    if (selectedContentType === typeLabel) {
      onSelectContentType('all');
    } else {
      onSelectContentType(typeLabel);
    }
    onCloseMobile();
  };

  const renderTypeButton = (item: TypeLegendItem, compact: boolean) => {
    const isSelected = selectedContentType === item.label;
    return (
      <button
        key={`${item.domain}-${item.label}`}
        type="button"
        onClick={() => handleTypeClick(item.label)}
        title={`Filter by ${item.label}`}
        aria-pressed={isSelected}
        className={`w-full min-h-[40px] flex items-center ${
          compact ? 'justify-center px-2' : 'justify-between px-3'
        } py-2 rounded-[12px] text-xs font-medium transition-colors cursor-pointer ${
          isSelected
            ? 'bg-[var(--orbit-accent,#534AB7)]/15 text-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF]/20 dark:text-[#8B7BFF] font-semibold ring-1 ring-[var(--orbit-accent,#534AB7)]/30 dark:ring-[#8B7BFF]/40'
            : 'text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-200/70 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.dotClass}`} />
          {!compact && <span className="truncate">{item.label}</span>}
        </div>
        {!compact && isSelected && (
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
            Active
          </span>
        )}
      </button>
    );
  };

  const renderSidebarContent = (compact: boolean, isMobileDrawer: boolean) => (
    <div className="flex flex-col h-full select-none">
      {/* 1. Top: Orbit Logo + Sleek Capsule / Floating Edge Collapse Toggle */}
      <div
        className={`relative flex items-center ${
          compact ? 'justify-center px-2' : 'justify-between px-4'
        } h-16 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0`}
      >
        {!compact ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <OrbitLogo variant="horizontal" size={28} />
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="group relative flex items-center justify-center rounded-[12px] p-1.5 hover:bg-slate-200/70 dark:hover:bg-[#24242E] transition-colors cursor-pointer"
          >
            <OrbitLogo variant="icon" size={28} />
          </button>
        )}

        {isMobileDrawer ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-[12px] text-slate-600 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7] hover:bg-slate-200/70 dark:hover:bg-[#24242E] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5 stroke-current" strokeWidth={2} />
            <span className="sr-only">Close menu</span>
          </button>
        ) : !compact ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="group relative flex items-center gap-1 h-8 px-2.5 rounded-full border border-slate-200/90 dark:border-slate-700/80 bg-white/90 dark:bg-[#1E1E26] text-slate-600 dark:text-[#A0A0B0] shadow-2xs hover:border-[var(--orbit-accent,#534AB7)]/50 dark:hover:border-[#8B7BFF]/50 hover:text-[var(--orbit-accent,#534AB7)] dark:hover:text-[#8B7BFF] hover:shadow-xs active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <span className="h-3 w-0.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-[var(--orbit-accent,#534AB7)] dark:group-hover:bg-[#8B7BFF] transition-colors" />
            <ChevronsLeft
              className="h-3.5 w-3.5 stroke-current transition-transform duration-200 group-hover:-translate-x-0.5"
              strokeWidth={2.2}
            />
            <span className="sr-only">Collapse sidebar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="group absolute -right-3.5 top-1/2 -translate-y-1/2 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E1E26] text-slate-600 dark:text-[#F2F2F7] shadow-md hover:border-[var(--orbit-accent,#534AB7)] dark:hover:border-[#8B7BFF] hover:text-[var(--orbit-accent,#534AB7)] dark:hover:text-[#8B7BFF] hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <ChevronsRight
              className="h-3.5 w-3.5 stroke-current transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.2}
            />
            <span className="sr-only">Expand sidebar</span>
          </button>
        )}
      </div>

      {/* 2. Filled Accent "New task" Button */}
      <div className={`px-3 pt-4 pb-2 shrink-0 ${compact ? 'flex justify-center' : ''}`}>
        <button
          type="button"
          onClick={() => {
            onOpenNewTask();
            onCloseMobile();
          }}
          title="New task"
          aria-label="New task"
          className={`min-h-[44px] ${
            compact ? 'w-11 px-0 justify-center' : 'w-full px-4 justify-center gap-2'
          } flex items-center rounded-[12px] bg-[var(--orbit-accent,#534AB7)] hover:bg-[var(--orbit-accent-hover,#433B9B)] dark:bg-[#8B7BFF] dark:hover:bg-[#7A68F0] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer`}
        >
          <Plus className="h-5 w-5 stroke-current shrink-0" strokeWidth={2} />
          {!compact && <span>New task</span>}
        </button>
      </div>

      {/* Scrollable Middle Section: WORKSPACE */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
        {/* 3. Section: WORKSPACE */}
        <div className="space-y-1">
          {!compact && (
            <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A0A0B0]">
              WORKSPACE
            </div>
          )}

          {workspaceItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full min-h-[44px] flex items-center ${
                  compact ? 'justify-center px-0' : 'justify-between px-3'
                } py-2.5 rounded-[12px] text-xs font-semibold transition-colors cursor-pointer relative ${
                  isActive
                    ? 'bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] text-white shadow-xs'
                    : 'text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-200/70 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-5 w-5 stroke-current shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-600 dark:text-[#A0A0B0]'
                    }`}
                    strokeWidth={1.9}
                  />
                  {!compact && <span className="truncate">{item.label}</span>}
                </div>

                {!compact && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-full tabular-nums ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-[#F2F2F7]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {compact && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-slate-100 dark:ring-[#14141A]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Bottom of Sidebar: User Avatar, Name, Email + Popover Menu */}
      <div
        className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 shrink-0 relative"
        ref={userMenuRef}
      >
        {showUserMenu && (
          <div
            className={`absolute bottom-full mb-2 ${
              compact ? 'left-3 w-60' : 'left-3 right-3'
            } rounded-[14px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E1E26] p-2 shadow-xl z-50 space-y-1.5 animate-in fade-in duration-150`}
          >
            {/* Settings Item */}
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(false);
                onOpenSettings();
                onCloseMobile();
              }}
              className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-semibold text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] transition-colors cursor-pointer text-left"
            >
              <Settings className="h-4 w-4 stroke-current text-slate-500 dark:text-[#A0A0B0]" strokeWidth={2} />
              <span>Settings</span>
            </button>

            {/* Theme Switcher: Light / Dark / System */}
            <div className="px-2 py-1.5 border-t border-b border-slate-100 dark:border-slate-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A0A0B0] px-1 mb-1.5">
                Theme
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Monitor },
                  ] as { id: ThemeMode; label: string; icon: React.FC<{ className?: string; strokeWidth?: number }> }[]
                ).map((tOpt) => {
                  const TIcon = tOpt.icon;
                  const activeTheme = theme === tOpt.id;
                  return (
                    <button
                      key={tOpt.id}
                      type="button"
                      onClick={() => setTheme(tOpt.id)}
                      className={`min-h-[36px] flex flex-col items-center justify-center gap-0.5 rounded-[8px] text-[10px] font-semibold transition-colors cursor-pointer ${
                        activeTheme
                          ? 'bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] text-white'
                          : 'text-slate-600 dark:text-[#A0A0B0] hover:bg-slate-100 dark:hover:bg-[#24242E]'
                      }`}
                    >
                      <TIcon className="h-3.5 w-3.5 stroke-current" strokeWidth={2} />
                      <span>{tOpt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sign out */}
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(false);
                logout();
              }}
              className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-[#24242E] transition-colors cursor-pointer text-left"
            >
              <LogOut className="h-4 w-4 stroke-current" strokeWidth={2} />
              <span>Sign out</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowUserMenu((prev) => !prev)}
          aria-expanded={showUserMenu}
          aria-label="User account menu"
          className={`w-full min-h-[48px] flex items-center ${
            compact ? 'justify-center px-0' : 'justify-between px-2.5'
          } py-2 rounded-[12px] hover:bg-slate-200/70 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] transition-colors cursor-pointer text-left`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--orbit-accent,#534AB7)] text-white font-bold text-xs shrink-0 overflow-hidden">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 stroke-current text-white" strokeWidth={2} />
              )}
            </div>

            {!compact && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-[#F2F2F7] truncate">
                  {currentUser?.displayName || 'Orbit User'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-[#A0A0B0] truncate font-mono">
                  {currentUser?.email || ''}
                </p>
              </div>
            )}
          </div>

          {!compact && (
            <ChevronUp
              className={`h-4 w-4 stroke-current text-slate-400 dark:text-[#A0A0B0] shrink-0 transition-transform ${
                showUserMenu ? 'rotate-180' : ''
              }`}
              strokeWidth={2}
            />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar (md and up) */}
      <aside
        aria-label="Main sidebar navigation"
        className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40 border-r border-slate-200/90 dark:border-slate-800/90 bg-slate-100/90 dark:bg-[#14141A] backdrop-blur-md transition-all duration-200 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderSidebarContent(isCollapsed, false)}
      </aside>

      {/* Mobile Slide-Over Sidebar Drawer (below md) — slides in and out < 300ms */}
      <div
        className={`fixed inset-0 z-50 md:hidden flex transition-opacity duration-200 ease-out ${
          isMobileOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isMobileOpen}
      >
        {/* Dimmed Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />

        {/* Slide-in / Slide-out Sidebar Panel */}
        <aside
          aria-label="Mobile navigation drawer"
          className={`relative z-10 w-72 max-w-[85vw] h-full bg-slate-100 dark:bg-[#14141A] border-r border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-200 ease-out ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderSidebarContent(false, true)}
        </aside>
      </div>
    </>
  );
};
