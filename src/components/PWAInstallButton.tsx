import React, { useState } from 'react';
import { usePWAInstall, useOnlineStatus } from '../utils/usePWAInstall';
import { Download, Share, PlusSquare, X, WifiOff } from 'lucide-react';

interface PWAInstallButtonProps {
  compact?: boolean;
  variant?: 'sidebar' | 'menu' | 'login';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  variant = 'sidebar',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'menu' ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-semibold text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] hover:bg-slate-100 dark:hover:bg-[#24242E] transition-colors cursor-pointer text-left"
        >
          <Download className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
          <span>{isIOS ? 'Install on iOS' : 'Install Web App'}</span>
        </button>
      ) : variant === 'login' ? (
        <button
          type="button"
          onClick={handleClick}
          title="Install Orbit App"
          aria-label="Install Orbit App"
          className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] bg-white/80 dark:bg-[#1A1A22] border border-slate-200/80 dark:border-[#2E2E3A] hover:bg-slate-100 dark:hover:bg-[#24242E] backdrop-blur-sm shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
        >
          <Download className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
          <span>Install App</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          title="Install Orbit Web App"
          aria-label="Install Orbit Web App"
          className={`w-full min-h-[40px] flex items-center ${
            compact ? 'justify-center px-0' : 'justify-start gap-2.5 px-3'
          } py-2 rounded-[12px] border border-[var(--orbit-accent,#534AB7)]/30 dark:border-[#8B7BFF]/40 bg-[var(--orbit-accent-light,#EEEDFE)]/60 dark:bg-[#8B7BFF]/15 text-[var(--orbit-accent,#534AB7)] dark:text-[#8B7BFF] hover:bg-[var(--orbit-accent-light,#EEEDFE)] dark:hover:bg-[#8B7BFF]/25 text-xs font-semibold transition-colors cursor-pointer`}
        >
          <Download className="h-4 w-4 stroke-current shrink-0" strokeWidth={2} />
          {!compact && <span className="truncate">Install App</span>}
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 text-left"
          onClick={() => setShowGuide(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1A1A22] border border-slate-200 dark:border-[#2E2E3A] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#2E2E3A] pb-3">
              <h3
                id="pwa-install-title"
                className="text-sm font-bold text-slate-900 dark:text-[#F2F2F7]"
              >
                {isIOS ? 'Install Orbit on iPhone / iPad' : 'Install Orbit on Your Device'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-[#F2F2F7] cursor-pointer"
              >
                <X className="h-4 w-4 stroke-current" strokeWidth={2} />
              </button>
            </div>

            {isIOS ? (
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
            ) : (
              <div className="space-y-3 text-xs text-slate-600 dark:text-[#A0A0B0] leading-relaxed">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#24242E] border border-slate-200/70 dark:border-[#2E2E3A] space-y-1.5">
                  <p className="font-semibold text-slate-900 dark:text-[#F2F2F7]">
                    Option 1: Address Bar Icon
                  </p>
                  <p>
                    Open Orbit in a full browser tab and click the <strong>Install</strong> icon on the right side of the address bar.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#24242E] border border-slate-200/70 dark:border-[#2E2E3A] space-y-1.5">
                  <p className="font-semibold text-slate-900 dark:text-[#F2F2F7]">
                    Option 2: Chrome Menu (⋮)
                  </p>
                  <p>
                    Click the <strong>three dots (⋮)</strong> at the top-right of Chrome &rarr; <strong>Cast, save, and share</strong> &rarr; <strong>Install page as app...</strong>
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[40px] rounded-xl bg-[var(--orbit-accent,#534AB7)] dark:bg-[#8B7BFF] text-white dark:text-[#0F0F14] text-xs font-semibold cursor-pointer transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
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
