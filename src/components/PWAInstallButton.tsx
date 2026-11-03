import React, { useState } from 'react';
import { usePWAInstall, useOnlineStatus } from '../utils/usePWAInstall';
import { Download, Share, PlusSquare, X, WifiOff } from 'lucide-react';

interface PWAInstallButtonProps {
  compact?: boolean;
  variant?: 'sidebar' | 'menu';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  variant = 'sidebar',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    if (variant === 'menu') {
      return (
        <button
          type="button"
          onClick={install}
          className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-semibold text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] hover:bg-slate-100 dark:hover:bg-[#24242E] transition-colors cursor-pointer text-left"
        >
          <Download className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
          <span>Install Web App</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={install}
        title="Install Orbit Web App"
        aria-label="Install Orbit Web App"
        className={`w-full min-h-[40px] flex items-center ${
          compact ? 'justify-center px-0' : 'justify-start gap-2.5 px-3'
        } py-2 rounded-[12px] border border-[var(--orbit-accent,#534AB7)]/30 dark:border-[#8B7BFF]/40 bg-[var(--orbit-accent-light,#EEEDFE)]/60 dark:bg-[#8B7BFF]/15 text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] hover:bg-[var(--orbit-accent-light,#EEEDFE)] dark:hover:bg-[#8B7BFF]/25 text-xs font-semibold transition-colors cursor-pointer`}
      >
        <Download className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
        {!compact && <span className="truncate">Install App</span>}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        {variant === 'menu' ? (
          <button
            type="button"
            onClick={() => setShowIOSGuide(true)}
            className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-semibold text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] hover:bg-slate-100 dark:hover:bg-[#24242E] transition-colors cursor-pointer text-left"
          >
            <Download className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
            <span>Install on iOS</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowIOSGuide(true)}
            title="Install Orbit on iOS"
            aria-label="Install Orbit on iOS"
            className={`w-full min-h-[40px] flex items-center ${
              compact ? 'justify-center px-0' : 'justify-start gap-2.5 px-3'
            } py-2 rounded-[12px] border border-[var(--orbit-accent,#534AB7)]/30 dark:border-[#8B7BFF]/40 bg-[var(--orbit-accent-light,#EEEDFE)]/60 dark:bg-[#8B7BFF]/15 text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] hover:bg-[var(--orbit-accent-light,#EEEDFE)] dark:hover:bg-[#8B7BFF]/25 text-xs font-semibold transition-colors cursor-pointer`}
          >
            <Download className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
            {!compact && <span className="truncate">Install on iOS</span>}
          </button>
        )}

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ios-install-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1A1A22] border border-slate-200 dark:border-[#2E2E3A] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#2E2E3A] pb-3">
                <h3
                  id="ios-install-title"
                  className="text-sm font-bold text-slate-900 dark:text-[#F2F2F7]"
                >
                  Install Orbit on iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-[#F2F2F7] cursor-pointer"
                >
                  <X className="h-4 w-4 stroke-current" strokeWidth={2} />
                </button>
              </div>
              <div className="space-y-3 text-xs text-slate-600 dark:text-[#A0A0B0]">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#24242E] border border-slate-200/70 dark:border-[#2E2E3A]">
                  <Share className="h-4 w-4 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] shrink-0" strokeWidth={2} />
                  <span>
                    1. Tap the <strong className="text-slate-900 dark:text-[#F2F2F7]">Share</strong> button in Safari&apos;s toolbar.
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#24242E] border border-slate-200/70 dark:border-[#2E2E3A]">
                  <PlusSquare className="h-4 w-4 stroke-current text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] shrink-0" strokeWidth={2} />
                  <span>
                    2. Scroll down and tap <strong className="text-slate-900 dark:text-[#F2F2F7]">Add to Home Screen</strong>.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[40px] rounded-xl bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] text-white dark:text-[#0F0F14] text-xs font-semibold cursor-pointer transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 md:bottom-6 left-5 z-50 flex items-center gap-2.5 rounded-xl bg-[#1A1A22] border border-[#FFB84D]/50 px-3.5 py-2.5 text-xs font-semibold text-[#F2F2F7] shadow-xl"
    >
      <WifiOff className="h-4 w-4 stroke-current text-[#FFB84D] shrink-0" strokeWidth={2} />
      <span>Offline Mode — Changes will sync when reconnected</span>
    </div>
  );
};
