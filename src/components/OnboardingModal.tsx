import React, { useState } from 'react';
import { PersonaType } from '../types/orbit';
import { OrbitLogo } from './OrbitLogo';
import { Palette, GraduationCap, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (personas: PersonaType[]) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [designerSelected, setDesignerSelected] = useState(true);
  const [studentSelected, setStudentSelected] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const personas: PersonaType[] = [];
    if (designerSelected) personas.push('designer');
    if (studentSelected) personas.push('student');
    if (personas.length === 0) return;
    onComplete(personas);
  };

  const hasAtLeastOne = designerSelected || studentSelected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-2xs transition-opacity" />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8">
        <div className="text-center mb-6">
          <div className="mb-3 flex justify-center">
            <OrbitLogo variant="symbol" size={54} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome to Orbit
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            What best describes you? Select at least one to configure your deadline fields.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Designer Card Checkbox */}
          <label
            className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              designerSelected
                ? 'border-[#534AB7] bg-indigo-50/40 dark:border-[#AFA9EC] dark:bg-indigo-950/20'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
            }`}
          >
            <input
              type="checkbox"
              checked={designerSelected}
              onChange={(e) => setDesignerSelected(e.target.checked)}
              className="mt-1 h-4 w-4 rounded text-[#534AB7] focus:ring-[#534AB7]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 shrink-0 text-[#534AB7] dark:text-[#8B7BFF] stroke-current" strokeWidth={2} />
                <span className="text-sm font-semibold text-slate-900 dark:text-[#F2F2F7]">
                  Designer / Creator
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#A0A0B0] leading-relaxed">
                Organized around client brands and deliverables (Reel, Post, Story, Carousel).
              </p>
            </div>
          </label>

          {/* Student Card Checkbox */}
          <label
            className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              studentSelected
                ? 'border-emerald-600 bg-emerald-50/40 dark:border-emerald-500 dark:bg-emerald-950/20'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
            }`}
          >
            <input
              type="checkbox"
              checked={studentSelected}
              onChange={(e) => setStudentSelected(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 stroke-current" strokeWidth={2} />
                <span className="text-sm font-semibold text-slate-900 dark:text-[#F2F2F7]">
                  Student / Academic
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#A0A0B0] leading-relaxed">
                Structured around courses, assignments, exams, and study sessions.
              </p>
            </div>
          </label>

          {designerSelected && studentSelected && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-[#A0A0B0] border border-slate-100 dark:border-slate-800">
              Both modes selected: Tasks will be color-coded with a top filter to view Designer or Student deadlines.
            </div>
          )}

          {!hasAtLeastOne && (
            <p className="text-xs text-rose-600 dark:text-rose-400 text-center font-medium">
              Please select at least one category to continue.
            </p>
          )}

          <button
            type="submit"
            disabled={!hasAtLeastOne}
            className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-xs ${
              hasAtLeastOne
                ? 'bg-[#534AB7] hover:bg-[#433B9B] dark:hover:bg-[#433B9B] cursor-pointer active:scale-98'
                : 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed opacity-60'
            }`}
          >
            <span>Continue to My Schedule</span>
            <ArrowRight className="h-5 w-5 shrink-0 stroke-current" strokeWidth={2} />
          </button>

          <p className="text-[11px] text-center text-slate-400">
            You can always modify these preferences later in Settings.
          </p>
        </form>
      </div>
    </div>
  );
};
