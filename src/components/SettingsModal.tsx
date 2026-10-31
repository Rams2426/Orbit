import React from 'react';
import { useOrbit, ACCENT_PALETTES } from '../context/OrbitContext';
import {
  ThemeMode,
  AccentColor,
  TextSize,
  WeekStart,
  TimeFormat,
  ReminderTime,
  PersonaType,
  ViewMode,
} from '../types/orbit';
import {
  X,
  Palette,
  Calendar,
  Bell,
  LogOut,
  Sun,
  Moon,
  Laptop,
  Check,
  User,
  Sliders,
  Type,
  Clock,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    userProfile,
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    textSize,
    setTextSize,
    weekStart,
    setWeekStart,
    timeFormat,
    setTimeFormat,
    notificationsEnabled,
    setNotificationsEnabled,
    reminderTime,
    setReminderTime,
    updatePersonas,
    updatePreferredView,
    logout,
  } = useOrbit();

  if (!isOpen) return null;

  const currentPersonas = userProfile?.personas || ['designer'];
  const hasDesigner = currentPersonas.includes('designer');
  const hasStudent = currentPersonas.includes('student');

  const handleTogglePersona = (persona: PersonaType) => {
    let next: PersonaType[];
    if (persona === 'designer') {
      if (hasDesigner) {
        if (!hasStudent) return; // Prevent unchecking if it's the only one
        next = ['student'];
      } else {
        next = hasStudent ? ['designer', 'student'] : ['designer'];
      }
    } else {
      if (hasStudent) {
        if (!hasDesigner) return; // Prevent unchecking if it's the only one
        next = ['designer'];
      } else {
        next = hasDesigner ? ['designer', 'student'] : ['student'];
      }
    }
    updatePersonas(next);
  };

  const currentView = userProfile?.preferredView || 'month';

  const accentColorList: AccentColor[] = ['purple', 'blue', 'green', 'orange', 'pink', 'red'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-auto max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header with Title and ONLY Close (X) button at top right */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:bg-[#534AB7]/20 dark:text-[#8B7BFF]">
              <Sliders className="h-5 w-5 stroke-current" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F2F2F7]">
                Settings
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#A0A0B0]">
                Preferences save automatically
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] cursor-pointer transition-colors"
          >
            <X className="h-5 w-5 stroke-current" strokeWidth={2} />
            <span className="sr-only">Close settings</span>
          </button>
        </div>

        {/* Scrollable Content: 5 clear sections with spacing */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7">
          {/* 1. Profile Section */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-[#A0A0B0] uppercase tracking-wider flex items-center gap-2">
              <User className="h-5 w-5 stroke-current text-[#534AB7] dark:text-[#8B7BFF]" strokeWidth={2} />
              <span>Profile</span>
            </h4>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 flex items-center gap-3.5">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Profile'}
                  className="h-12 w-12 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-[var(--orbit-accent,#534AB7)] text-white font-bold flex items-center justify-center text-base shrink-0 shadow-xs">
                  {currentUser?.displayName?.[0] || 'O'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 dark:text-[#F2F2F7] truncate">
                  {currentUser?.displayName || 'Orbit User'}
                </div>
                <div className="text-xs text-slate-500 dark:text-[#A0A0B0] truncate font-mono mt-0.5">
                  {currentUser?.email || 'Signed in with Google'}
                </div>
              </div>
            </div>
          </section>

          {/* 2. Appearance Section */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 dark:text-[#A0A0B0] uppercase tracking-wider flex items-center gap-2">
              <Palette className="h-5 w-5 stroke-current text-[#534AB7] dark:text-[#8B7BFF]" strokeWidth={2} />
              <span>Appearance</span>
            </h4>

            {/* Theme Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#F2F2F7] mb-2">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Laptop },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const isSelected = theme === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTheme(item.id as ThemeMode)}
                      className={`min-h-[40px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:bg-[#534AB7]/25 dark:text-[#8B7BFF] shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-[#A0A0B0] hover:bg-slate-50 dark:hover:bg-[#24242E] dark:hover:text-[#F2F2F7]'
                      }`}
                    >
                      <Icon className="h-5 w-5 stroke-current shrink-0" strokeWidth={2} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent Color Swatches */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Accent Color
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {accentColorList.map((colorKey) => {
                  const pal = ACCENT_PALETTES[colorKey];
                  const isSelected = accentColor === colorKey;
                  return (
                    <button
                      key={colorKey}
                      onClick={() => setAccentColor(colorKey)}
                      title={pal.label}
                      style={{ backgroundColor: pal.primary }}
                      className={`h-9 w-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-3 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-md scale-105'
                          : 'hover:scale-105 opacity-90 hover:opacity-100'
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text Size */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#F2F2F7] mb-2 flex items-center gap-2">
                <Type className="h-5 w-5 stroke-current text-[#534AB7] dark:text-[#8B7BFF]" strokeWidth={2} />
                <span>Text Size</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'small', label: 'Small', sub: '14px' },
                    { id: 'medium', label: 'Medium', sub: '16px' },
                    { id: 'large', label: 'Large', sub: '18px' },
                  ] as const
                ).map((item) => {
                  const isSelected = textSize === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTextSize(item.id as TextSize)}
                      className={`min-h-[40px] py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:bg-[#534AB7]/25 dark:text-[#8B7BFF] shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-[#A0A0B0] hover:bg-slate-50 dark:hover:bg-[#24242E] dark:hover:text-[#F2F2F7]'
                      }`}
                    >
                      <div>{item.label}</div>
                      <span className="text-[10px] font-normal opacity-70 block">{item.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. Schedule Preferences Section */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 dark:text-[#A0A0B0] uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-5 w-5 stroke-current text-[#534AB7] dark:text-[#8B7BFF]" strokeWidth={2} />
              <span>Schedule Preferences</span>
            </h4>

            {/* What do you use Orbit for? (Checkboxes) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                What do you use Orbit for?
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
                At least one required. Toggling enables custom fields and filter tags.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Designer Checkbox */}
                <label
                  className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-colors ${
                    hasDesigner
                      ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)]/40 dark:bg-[var(--orbit-accent,#534AB7)]/15'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={hasDesigner}
                    onChange={() => handleTogglePersona('designer')}
                    disabled={hasDesigner && !hasStudent}
                    className="mt-0.5 h-4 w-4 rounded text-[var(--orbit-accent,#534AB7)] focus:ring-[var(--orbit-accent,#534AB7)] cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--orbit-accent,#534AB7)]" />
                      <span>Designer</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Brands, Reels, Posts, Stories, Carousels
                    </p>
                  </div>
                </label>

                {/* Student Checkbox */}
                <label
                  className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-colors ${
                    hasStudent
                      ? 'border-emerald-600 bg-emerald-50/40 dark:border-emerald-500 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={hasStudent}
                    onChange={() => handleTogglePersona('student')}
                    disabled={hasStudent && !hasDesigner}
                    className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Student</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Classes, Assignments, Exams, Study Sessions
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Default View */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Default View
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'month', label: 'Calendar' },
                    { id: 'list', label: 'List' },
                  ] as const
                ).map((viewOption) => {
                  const isSelected =
                    (viewOption.id === 'month' && (currentView === 'month' || currentView === 'week')) ||
                    (viewOption.id === 'list' && currentView === 'list');
                  return (
                    <button
                      key={viewOption.id}
                      onClick={() => updatePreferredView(viewOption.id as ViewMode)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:bg-[var(--orbit-accent,#534AB7)]/20 dark:text-white shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {viewOption.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Week Starts On */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Week Starts On
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'monday', label: 'Monday' },
                    { id: 'sunday', label: 'Sunday' },
                  ] as const
                ).map((item) => {
                  const isSelected = weekStart === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setWeekStart(item.id as WeekStart)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:bg-[var(--orbit-accent,#534AB7)]/20 dark:text-white shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Format */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Time Format</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: '12h', label: '12-hour', sub: 'e.g. 2:30 PM' },
                    { id: '24h', label: '24-hour', sub: 'e.g. 14:30' },
                  ] as const
                ).map((item) => {
                  const isSelected = timeFormat === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setTimeFormat(item.id as TimeFormat)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:bg-[var(--orbit-accent,#534AB7)]/20 dark:text-white shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>{item.label}</div>
                      <span className="text-[10px] font-normal opacity-70 block">{item.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 4. Notifications Section */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 dark:text-[#A0A0B0] uppercase tracking-wider flex items-center gap-2">
              <Bell className="h-5 w-5 stroke-current text-[#534AB7] dark:text-[#8B7BFF]" strokeWidth={2} />
              <span>Notifications</span>
            </h4>

            {/* Toggle for Deadline Reminders */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-[#F2F2F7] block">
                  Deadline Reminders
                </span>
                <span className="text-[11px] text-slate-500 dark:text-[#A0A0B0]">
                  Receive browser notifications and sound chimes
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notificationsEnabled ? 'bg-[var(--orbit-accent,#534AB7)]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Reminder Time Selector */}
            <div className={notificationsEnabled ? '' : 'opacity-40 pointer-events-none'}>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#F2F2F7] mb-2">
                Remind Me Before Deadline
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: '1h', label: '1 hour' },
                    { id: '1d', label: '1 day' },
                    { id: '2d', label: '2 days' },
                  ] as const
                ).map((item) => {
                  const isSelected = reminderTime === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setReminderTime(item.id as ReminderTime)}
                      className={`min-h-[40px] py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--orbit-accent,#534AB7)] bg-[var(--orbit-accent-light,#EEEDFE)] text-[var(--orbit-accent,#534AB7)] dark:border-[#8B7BFF] dark:bg-[#534AB7]/25 dark:text-[#8B7BFF] shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-[#A0A0B0] hover:bg-slate-50 dark:hover:bg-[#24242E] dark:hover:text-[#F2F2F7]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 5. Account Section with Sign Out at the Bottom Left */}
          <section className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 dark:text-[#A0A0B0] uppercase tracking-wider mb-3">
              Account
            </h4>
            <div className="flex items-center justify-start">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="min-h-[40px] flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-[#24242E] text-rose-600 dark:text-rose-400 text-xs font-semibold cursor-pointer transition-colors"
              >
                <LogOut className="h-5 w-5 stroke-current" strokeWidth={2} />
                <span>Sign out</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
