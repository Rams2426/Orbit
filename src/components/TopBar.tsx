import React, { useState, useEffect, useRef } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { ViewMode, PersonaType } from '../types/orbit';
import { OrbitLogo } from './OrbitLogo';
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Plus,
  Settings,
  Sun,
  Moon,
  Search,
  X,
  ChevronDown,
  Bell,
  BellOff,
  User,
  Share2,
  QrCode,
  Check,
  Link as LinkIcon,
  LogOut,
  Users,
  Menu,
  HelpCircle,
} from 'lucide-react';

interface TopBarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedBrand: string;
  onBrandChange: (b: string) => void;
  selectedContentType: string;
  onContentTypeChange: (ct: string) => void;
  selectedDomainFilter: PersonaType | 'all';
  onDomainFilterChange: (df: PersonaType | 'all') => void;
  uniqueBrands: string[];
  uniqueContentTypes: string[];
  onOpenNewTask: () => void;
  onOpenSettings: () => void;
  onOpenShare: () => void;
  onOpenTeam?: () => void;
  onOpenMobileMenu?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  onOpenShortcutsHelp?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onSelectView,
  searchQuery,
  onSearchChange,
  selectedBrand,
  onBrandChange,
  selectedContentType,
  onContentTypeChange,
  selectedDomainFilter,
  onDomainFilterChange,
  uniqueBrands,
  uniqueContentTypes,
  onOpenNewTask,
  onOpenSettings,
  onOpenShare,
  onOpenTeam,
  onOpenMobileMenu,
  darkMode,
  onToggleDarkMode,
  searchInputRef,
  onOpenShortcutsHelp,
}) => {
  const {
    currentUser,
    userProfile,
    activePair,
    createPairAsBoss,
    generateInvite,
    logout,
    notificationPermission,
    enableNotifications,
  } = useOrbit();
  const [showCalendarSubmenu, setShowCalendarSubmenu] = useState(false);
  const [showPersonMenu, setShowPersonMenu] = useState(false);
  const [quickCopied, setQuickCopied] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const personMenuRef = useRef<HTMLDivElement | null>(null);

  // Close person sharing menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personMenuRef.current && !personMenuRef.current.contains(e.target as Node)) {
        setShowPersonMenu(false);
      }
    };
    if (showPersonMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPersonMenu]);

  const handleQuickCopyLink = async () => {
    setIsGeneratingLink(true);
    try {
      let pairId = activePair?.id;
      if (!pairId) {
        pairId = await createPairAsBoss();
      }
      const inv = await generateInvite(pairId);
      const url = `${window.location.origin}${window.location.pathname}?invite=${inv.id}`;
      await navigator.clipboard.writeText(url);
      setQuickCopied(true);
      setTimeout(() => setQuickCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const hasBothPersonas = userProfile?.personas?.length === 2;
  const isFiltered =
    Boolean(searchQuery) ||
    selectedBrand !== 'all' ||
    selectedContentType !== 'all' ||
    selectedDomainFilter !== 'all';

  const isCalendarActive = currentView === 'month' || currentView === 'week';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-[#2E2E3A] dark:bg-[#0F0F14]/95">
      {/* Main Top Row */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Hamburger + Brand + View Switcher */}
        <div className="flex items-center gap-3 sm:gap-5">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              title="Open menu"
              className="md:hidden min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-[12px] border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] transition-colors cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5 stroke-current" strokeWidth={2} />
              <span className="sr-only">Open menu</span>
            </button>
          )}
          <div className="md:hidden">
            <OrbitLogo variant="icon" size={26} />
          </div>

          {/* Calendar / List Toggle in the Header */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-[#2E2E3A] bg-slate-100 dark:bg-[#1A1A22] p-1 text-xs font-medium">
            {/* List button */}
            <button
              onClick={() => onSelectView('list')}
              aria-label="List view"
              className={`min-h-[40px] flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
                currentView === 'list'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#24242E] dark:text-[#F2F2F7]'
                  : 'text-slate-600 hover:text-slate-900 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] hover:bg-slate-200/50 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E]'
              }`}
            >
              <ListIcon
                className={`h-5 w-5 stroke-current shrink-0 ${
                  currentView === 'list' ? 'text-[#534AB7] dark:text-[#8B7BFF]' : 'text-slate-600 dark:text-[#A0A0B0]'
                }`}
                strokeWidth={2}
              />
              <span className="font-semibold">List</span>
            </button>

            {/* Calendar toggle button with Month/Week inside */}
            <div className="relative">
              <button
                onClick={() => {
                  if (isCalendarActive) {
                    setShowCalendarSubmenu(!showCalendarSubmenu);
                  } else {
                    onSelectView('month');
                  }
                }}
                aria-label="Calendar view selector"
                className={`min-h-[40px] flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
                  isCalendarActive
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-[#24242E] dark:text-[#F2F2F7]'
                    : 'text-slate-600 hover:text-slate-900 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] hover:bg-slate-200/50 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E]'
                }`}
              >
                <CalendarIcon
                  className={`h-5 w-5 stroke-current shrink-0 ${
                    isCalendarActive ? 'text-[#534AB7] dark:text-[#8B7BFF]' : 'text-slate-600 dark:text-[#A0A0B0]'
                  }`}
                  strokeWidth={2}
                />
                <span className="capitalize font-semibold">{isCalendarActive ? currentView : 'Calendar'}</span>
                <ChevronDown className="h-5 w-5 stroke-current text-slate-400 dark:text-[#A0A0B0]" strokeWidth={2} />
              </button>

              {/* Sub-menu: Month and Week */}
              {showCalendarSubmenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowCalendarSubmenu(false)}
                  />
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-[#2E2E3A] dark:bg-[#1A1A22]">
                    <button
                      onClick={() => {
                        onSelectView('month');
                        setShowCalendarSubmenu(false);
                      }}
                      className={`min-h-[40px] w-full text-left px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        currentView === 'month'
                          ? 'font-bold text-[#534AB7] bg-indigo-50 dark:bg-[#8B7BFF]/20 dark:text-[#8B7BFF]'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-[#F2F2F7] dark:hover:bg-[#24242E]'
                      }`}
                    >
                      Month View
                    </button>
                    <button
                      onClick={() => {
                        onSelectView('week');
                        setShowCalendarSubmenu(false);
                      }}
                      className={`min-h-[40px] w-full text-left px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        currentView === 'week'
                          ? 'font-bold text-[#534AB7] bg-indigo-50 dark:bg-[#8B7BFF]/20 dark:text-[#8B7BFF]'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-[#F2F2F7] dark:hover:bg-[#24242E]'
                      }`}
                    >
                      Week View
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Team Button in Designer Mode */}
          {(userProfile?.personas?.includes('designer') || !userProfile?.personas?.length) && onOpenTeam && (
            <button
              onClick={onOpenTeam}
              title="Open Team Space"
              aria-label="Team space"
              className="min-h-[40px] flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] text-xs font-semibold text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] dark:active:bg-[#24242E] transition-colors cursor-pointer"
            >
              <Users className="h-5 w-5 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] shrink-0" strokeWidth={2} />
              <span className="hidden sm:inline">Team</span>
            </button>
          )}

          {/* 1-Hour Alerts / Browser Notification Status */}
          <button
            onClick={enableNotifications}
            title={
              notificationPermission === 'granted'
                ? '1-hour deadline browser notifications active'
                : 'Enable 1-hour deadline browser alerts'
            }
            aria-label={notificationPermission === 'granted' ? 'Alerts active' : 'Enable deadline alerts'}
            className={`min-h-[40px] min-w-[40px] flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              notificationPermission === 'granted'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-[#4ADE80]'
                : 'border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-[#2E2E3A] dark:bg-[#1A1A22] dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] dark:hover:bg-[#24242E] dark:active:bg-[#24242E]'
            }`}
          >
            {notificationPermission === 'granted' ? (
              <Bell className="h-5 w-5 stroke-current fill-current shrink-0" strokeWidth={2} />
            ) : (
              <BellOff className="h-5 w-5 stroke-current shrink-0" strokeWidth={2} />
            )}
            <span className="hidden lg:inline">
              {notificationPermission === 'granted' ? 'Alerts On' : 'Enable Alerts'}
            </span>
          </button>

          {/* + New Task Button */}
          <button
            onClick={onOpenNewTask}
            aria-label="New Task"
            className="min-h-[40px] flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white dark:text-[#0F0F14] bg-[var(--orbit-accent,#534AB7)] hover:bg-[var(--orbit-accent-hover,#433B9B)] dark:bg-[#8B7BFF] dark:hover:bg-[#7A68F0] rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-5 w-5 stroke-current shrink-0" strokeWidth={2} />
            <span className="whitespace-nowrap">New Task</span>
          </button>

          {/* Separate Share Button in Main Header */}
          <button
            onClick={onOpenShare}
            title="Share Schedule / Link with Partner"
            aria-label="Share Schedule"
            className="min-h-[40px] min-w-[40px] flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#2E2E3A] bg-white dark:bg-[#1A1A22] hover:bg-slate-50 dark:hover:bg-[#24242E] active:bg-slate-100 dark:active:bg-[#24242E] text-xs font-semibold text-slate-800 dark:text-[#F2F2F7] transition-colors shadow-2xs cursor-pointer"
          >
            <Share2 className="h-5 w-5 stroke-current text-[#534AB7] dark:text-[#8B7BFF] shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Person Logo (Sharing Options & Profile) */}
          <div className="relative" ref={personMenuRef}>
            <button
              onClick={() => setShowPersonMenu((prev) => !prev)}
              title="Person & Sharing Options"
              aria-label="Person and Sharing options"
              className={`min-h-[40px] flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                showPersonMenu
                  ? 'border-[#534AB7] bg-[#EEEDFE] text-[#534AB7] dark:border-[#8B7BFF] dark:bg-[#8B7BFF]/20 dark:text-[#8B7BFF]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-[#2E2E3A] dark:bg-[#1A1A22] dark:text-[#F2F2F7] dark:hover:bg-[#24242E] dark:active:bg-[#24242E]'
              }`}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#534AB7] dark:bg-[#8B7BFF] text-white dark:text-[#0F0F14] shrink-0 overflow-hidden font-bold">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 stroke-current" strokeWidth={2} />
                )}
              </div>
              <span className="text-xs font-semibold hidden md:inline max-w-[80px] truncate">
                {currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'Share'}
              </span>
              <ChevronDown className="h-5 w-5 stroke-current text-slate-400 dark:text-[#A0A0B0]" strokeWidth={2} />
            </button>

            {/* Sharing Popover Menu */}
            {showPersonMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl dark:border-[#2E2E3A] dark:bg-[#1A1A22] z-50 animate-in fade-in duration-100">
                {/* User Header */}
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-[#2E2E3A]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#534AB7] dark:bg-[#8B7BFF] text-white dark:text-[#0F0F14] font-bold text-xs shrink-0">
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName || ''}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 stroke-current" strokeWidth={2} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-[#F2F2F7] truncate">
                      {currentUser?.displayName || 'Orbit User'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-[#A0A0B0] truncate font-mono">
                      {currentUser?.email || ''}
                    </p>
                  </div>
                </div>

                {/* Options for Sharing Section */}
                <div className="py-2.5 space-y-1.5 border-b border-slate-100 dark:border-[#2E2E3A]">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A0A0B0] px-1 mb-1">
                    <span>Options for Sharing</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        activePair?.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-[#4ADE80]'
                          : 'bg-slate-100 text-slate-600 dark:bg-[#24242E] dark:text-[#A0A0B0]'
                      }`}
                    >
                      {activePair?.status === 'active' ? 'Linked' : 'Solo'}
                    </span>
                  </div>

                  {/* Option 1: Open Full Sharing & QR Invite Modal */}
                  <button
                    onClick={() => {
                      setShowPersonMenu(false);
                      onOpenShare();
                    }}
                    className="min-h-[40px] w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-[#F2F2F7] dark:hover:bg-[#24242E] dark:active:bg-[#24242E] cursor-pointer transition-colors text-left"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-[#8B7BFF]/15 text-[#534AB7] dark:text-[#8B7BFF] shrink-0">
                      <QrCode className="h-5 w-5 stroke-current" strokeWidth={2} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-[#F2F2F7]">QR Code & Email Share</div>
                      <div className="text-[10px] text-slate-500 dark:text-[#A0A0B0]">
                        View QR code or email invite to partner
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Quick Copy Link */}
                  <button
                    onClick={handleQuickCopyLink}
                    disabled={isGeneratingLink}
                    className="min-h-[40px] w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-[#F2F2F7] dark:hover:bg-[#24242E] dark:active:bg-[#24242E] cursor-pointer transition-colors text-left"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-[#8B7BFF]/15 text-[#534AB7] dark:text-[#8B7BFF] shrink-0">
                      {quickCopied ? <Check className="h-5 w-5 stroke-current text-emerald-600 dark:text-[#4ADE80]" strokeWidth={2} /> : <LinkIcon className="h-5 w-5 stroke-current" strokeWidth={2} />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-[#F2F2F7] flex items-center justify-between">
                        <span>Copy One-Time Link</span>
                        {quickCopied && <span className="text-[10px] font-bold text-emerald-600 dark:text-[#4ADE80]">Copied!</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-[#A0A0B0]">
                        {isGeneratingLink ? 'Generating link...' : 'Instant link for partner to connect'}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Additional Actions */}
                <div className="pt-2 space-y-1">
                  <button
                    onClick={() => {
                      setShowPersonMenu(false);
                      onOpenSettings();
                    }}
                    className="min-h-[40px] w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-[#F2F2F7] dark:hover:bg-[#24242E] dark:active:bg-[#24242E] cursor-pointer transition-colors text-left"
                  >
                    <Settings className="h-5 w-5 stroke-current text-slate-400 dark:text-[#A0A0B0]" strokeWidth={2} />
                    <span>Settings & Preferences</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowPersonMenu(false);
                      logout();
                    }}
                    className="min-h-[40px] w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-[#FF6B6B] dark:hover:bg-[#24242E] dark:active:bg-[#24242E] cursor-pointer transition-colors text-left"
                  >
                    <LogOut className="h-5 w-5 stroke-current" strokeWidth={2} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-[#2E2E3A] dark:bg-[#1A1A22] dark:text-[#F2F2F7] dark:hover:bg-[#24242E] dark:active:bg-[#24242E] cursor-pointer transition-colors"
          >
            {darkMode ? (
              <Sun className="h-5 w-5 stroke-current" strokeWidth={2} />
            ) : (
              <Moon className="h-5 w-5 stroke-current" strokeWidth={2} />
            )}
            <span className="sr-only">{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>

          {/* Keyboard Shortcuts (?) Help Dialog Button */}
          {onOpenShortcutsHelp && (
            <button
              type="button"
              onClick={onOpenShortcutsHelp}
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts help"
              className="hidden sm:flex min-w-[40px] min-h-[40px] h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-[#2E2E3A] dark:bg-[#1A1A22] dark:text-[#F2F2F7] dark:hover:bg-[#24242E] dark:active:bg-[#24242E] cursor-pointer transition-colors"
            >
              <HelpCircle className="h-5 w-5 stroke-current" strokeWidth={2} />
              <span className="sr-only">Keyboard shortcuts</span>
            </button>
          )}

          {/* Settings Modal */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings"
            aria-label="Settings"
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-[#2E2E3A] dark:bg-[#1A1A22] dark:text-[#F2F2F7] dark:hover:bg-[#24242E] dark:active:bg-[#24242E] cursor-pointer transition-colors"
          >
            <Settings className="h-5 w-5 stroke-current" strokeWidth={2} />
            <span className="sr-only">Settings</span>
          </button>
        </div>
      </div>

      {/* Compact Filter Bar Row */}
      <div className="border-t border-slate-200/80 dark:border-[#2E2E3A] bg-slate-50/50 dark:bg-[#14141A]/60 px-4 sm:px-6 lg:px-8 py-1.5">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 stroke-current text-slate-400 dark:text-[#A0A0B0] pointer-events-none" strokeWidth={2} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tasks... (Press /)"
              aria-label="Search tasks"
              className="w-full pl-9 pr-9 py-1.5 min-h-[36px] text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-[#2E2E3A] dark:bg-[#24242E] dark:text-[#F2F2F7] dark:placeholder-[#6E6E80] dark:focus:ring-[#8B7BFF]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-0 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E]"
              >
                <X className="h-4 w-4 stroke-current" strokeWidth={2} />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {hasBothPersonas && (
              <select
                value={selectedDomainFilter}
                onChange={(e) => onDomainFilterChange(e.target.value as PersonaType | 'all')}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-[#2E2E3A] dark:bg-[#24242E] dark:text-[#F2F2F7] cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="designer">Designer Deliverables</option>
                <option value="student">Student Academics</option>
              </select>
            )}

            {uniqueBrands.length > 0 && (
              <select
                value={selectedBrand}
                onChange={(e) => onBrandChange(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-[#2E2E3A] dark:bg-[#24242E] dark:text-[#F2F2F7] cursor-pointer max-w-[150px] truncate"
              >
                <option value="all">All Brands / Classes</option>
                {uniqueBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}

            {uniqueContentTypes.length > 0 && (
              <select
                value={selectedContentType}
                onChange={(e) => onContentTypeChange(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-[#2E2E3A] dark:bg-[#24242E] dark:text-[#F2F2F7] cursor-pointer max-w-[150px] truncate"
              >
                <option value="all">All Types</option>
                {uniqueContentTypes.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            )}

            {isFiltered && (
              <button
                onClick={() => {
                  onSearchChange('');
                  onBrandChange('all');
                  onContentTypeChange('all');
                  onDomainFilterChange('all');
                }}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] cursor-pointer"
              >
                <X className="h-3 w-3 stroke-current" strokeWidth={2} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
