import React from 'react';
import { Home, Calendar, CheckSquare } from 'lucide-react';

export type MainTab = 'home' | 'calendar' | 'tasks';

interface BottomNavProps {
  currentTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const navItems = [
    { id: 'home' as MainTab, label: 'Home', icon: Home },
    { id: 'calendar' as MainTab, label: 'Calendar', icon: Calendar },
    { id: 'tasks' as MainTab, label: 'Tasks', icon: CheckSquare },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
    >
      <div className="max-w-md sm:max-w-xl mx-auto flex items-center justify-around px-4 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex-1 min-h-[48px] py-1 px-3 flex flex-col items-center justify-center rounded-[10px] transition-all cursor-pointer ${
                isActive
                  ? 'text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] hover:bg-slate-100/60 dark:hover:bg-[#24242E] dark:active:bg-[#24242E]'
              }`}
            >
              <div className="relative">
                <Icon
                  className="h-5 w-5 stroke-current transition-transform duration-150"
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF]" />
                )}
              </div>
              <span className="text-[11px] leading-tight mt-1 truncate max-w-[80px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
