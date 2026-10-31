import React, { useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { OrbitLogo } from './OrbitLogo';
import { usePrefersReducedMotion } from '../utils/usePrefersReducedMotion';
import { Sun, Moon } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle, theme, setTheme } = useOrbit();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const isDarkMode = typeof document !== 'undefined'
    ? document.documentElement.classList.contains('dark') || theme === 'dark'
    : theme === 'dark';

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
      setErrorMsg('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 overflow-hidden transition-colors duration-300">
      {/* Background Ambience: Faint slow-moving gradient & drifting celestial dots */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Soft centered ambient glow */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-3xl ${
            prefersReducedMotion ? '' : 'ambient-glow-animated'
          }`}
          style={{
            background: isDarkMode
              ? 'radial-gradient(circle, rgba(83, 74, 183, 0.16) 0%, rgba(175, 169, 236, 0.05) 45%, transparent 70%)'
              : 'radial-gradient(circle, rgba(83, 74, 183, 0.08) 0%, rgba(238, 237, 254, 0.5) 45%, transparent 70%)',
          }}
        />

        {/* Tiny subtle drifting celestial dots */}
        <div
          className={`absolute w-1 h-1 rounded-full bg-[#534AB7]/30 dark:bg-[#AFA9EC]/35 ${
            prefersReducedMotion ? '' : 'particle-float-1'
          }`}
          style={{ top: '22%', left: '18%' }}
        />
        <div
          className={`absolute w-1.5 h-1.5 rounded-full bg-[#534AB7]/25 dark:bg-[#AFA9EC]/30 ${
            prefersReducedMotion ? '' : 'particle-float-2'
          }`}
          style={{ top: '28%', right: '20%' }}
        />
        <div
          className={`absolute w-1 h-1 rounded-full bg-[#534AB7]/25 dark:bg-[#AFA9EC]/30 ${
            prefersReducedMotion ? '' : 'particle-float-3'
          }`}
          style={{ bottom: '26%', left: '24%' }}
        />
        <div
          className={`absolute w-1.5 h-1.5 rounded-full bg-[#534AB7]/20 dark:bg-[#AFA9EC]/25 ${
            prefersReducedMotion ? '' : 'particle-float-1'
          }`}
          style={{ bottom: '22%', right: '22%' }}
        />
        <div
          className={`absolute w-0.5 h-0.5 rounded-full bg-[#534AB7]/30 dark:bg-[#AFA9EC]/35 ${
            prefersReducedMotion ? '' : 'particle-float-2'
          }`}
          style={{ top: '15%', left: '52%' }}
        />
      </div>

      {/* Top right Theme Toggle for testing light and dark mode */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={toggleTheme}
          className="min-h-[40px] min-w-[40px] p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-[#A0A0B0] dark:hover:text-[#F2F2F7] bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 dark:hover:bg-[#24242E] dark:active:bg-[#24242E] backdrop-blur-sm shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? (
            <Sun className="h-5 w-5 stroke-current" strokeWidth={2} />
          ) : (
            <Moon className="h-5 w-5 stroke-current" strokeWidth={2} />
          )}
          <span className="sr-only">{isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-sm text-center flex flex-col items-center">
        {/* 1. Orbit Logo with smooth looping dot on tilted ring & pulsing center */}
        <div className="mb-6 flex justify-center login-entrance-logo">
          <OrbitLogo
            variant="symbol"
            size={84}
            animated={!prefersReducedMotion}
            theme={isDarkMode ? 'dark' : 'light'}
          />
        </div>

        {/* 2. Wordmark "Orbit" */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-[#F2F2F7] login-entrance-title">
          Orbit
        </h1>

        {/* 3. Tagline */}
        <p className="mt-2 text-sm text-slate-500 dark:text-[#A0A0B0] font-medium login-entrance-tagline">
          Schedule your time. Use it well.
        </p>

        {errorMsg && (
          <p className="mt-4 text-xs text-rose-600 dark:text-rose-400 font-medium">
            {errorMsg}
          </p>
        )}

        {/* 4. Action Button & Secure Caption */}
        <div className="mt-8 w-full space-y-3 login-entrance-button">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="group relative w-full min-h-[44px] py-3.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-[#24242E] dark:active:bg-[#24242E] text-slate-900 dark:text-[#F2F2F7] font-semibold text-sm transition-all duration-200 ease-out shadow-xs hover:shadow-md dark:hover:shadow-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-xs motion-reduce:transform-none motion-reduce:hover:transform-none"
          >
            {/* Google Icon - 20px (h-5 w-5) */}
            <svg
              className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Google logo"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          <p className="text-xs text-slate-400 dark:text-slate-500 font-normal">
            Secure sign-in with Google
          </p>
        </div>
      </div>
    </div>
  );
};
