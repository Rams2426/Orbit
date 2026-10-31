import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useOrbit } from '../context/OrbitContext';
import { Invite } from '../types/orbit';
import { X, Copy, Check, Mail, QrCode, ShieldCheck, Clock } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose }) => {
  const { activePair, generateInvite, createPairAsBoss, currentUser } = useOrbit();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    const initInvite = async () => {
      try {
        let pairId = activePair?.id;
        if (!pairId) {
          pairId = await createPairAsBoss();
        }
        const inv = await generateInvite(pairId);
        if (isMounted) {
          setInvite(inv);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to generate invite:', err);
        if (isMounted) setLoading(false);
      }
    };

    initInvite();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activePair]);

  // Render QR Code once invite is generated
  useEffect(() => {
    if (!invite || !canvasRef.current) return;

    const fullUrl = `${window.location.origin}${window.location.pathname}?invite=${invite.id}`;
    QRCode.toCanvas(
      canvasRef.current,
      fullUrl,
      {
        width: 160,
        margin: 1,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff',
        },
      },
      (err) => {
        if (err) console.error('QR code generation error:', err);
      }
    );
  }, [invite]);

  if (!isOpen) return null;

  const inviteUrl = invite
    ? `${window.location.origin}${window.location.pathname}?invite=${invite.id}`
    : '';

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = () => {
    if (!inviteUrl) return;
    const subject = encodeURIComponent('Connect on Orbit Deadline Schedule');
    const body = encodeURIComponent(
      `Hi,\n\nHere is an invite link to connect our schedules on Orbit:\n\n${inviteUrl}\n\nOnce accepted, we will have a synchronized schedule where deadlines can be shared.\n\nBest regards,\n${currentUser?.displayName || 'Orbit User'}`
    );
    window.location.href = `mailto:${encodeURIComponent(emailInput)}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-[#534AB7] dark:text-[#8B7BFF]">
              <QrCode className="h-5 w-5 stroke-current" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F2F2F7]">
                Link with Another Person
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#A0A0B0]">
                Optional connection to share and assign deadlines
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invite modal"
            className="min-w-[40px] min-h-[40px] h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-[#A0A0B0] hover:text-slate-900 dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#24242E] active:bg-slate-200 dark:active:bg-[#24242E] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5 stroke-current" strokeWidth={2} />
            <span className="sr-only">Close invite modal</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-[#A0A0B0]">
            Generating single-use invite link...
          </div>
        ) : (
          <div className="py-4 space-y-5">
            {/* Security note */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-[#A0A0B0]">
              <ShieldCheck className="h-5 w-5 stroke-current text-[#534AB7] dark:text-[#8B7BFF] shrink-0 mt-0.5" strokeWidth={2} />
              <span>
                Once connected, your partner can view and add deadlines directly to your schedule. Your personal tasks remain yours.
              </span>
            </div>

            {/* Copy Link Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#F2F2F7] mb-1.5">
                Single-Use Invite Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F2F2F7] select-all min-h-[40px]"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#534AB7] hover:bg-[#433B9B] text-white flex items-center gap-2 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? (
                    <Check className="h-5 w-5 stroke-current" strokeWidth={2} />
                  ) : (
                    <Copy className="h-5 w-5 stroke-current" strokeWidth={2} />
                  )}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#A0A0B0]">
                <Clock className="h-4 w-4 stroke-current" strokeWidth={2} />
                <span>Expires in 72 hours. Single-use only.</span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
              <div className="p-2 bg-white rounded-lg shadow-xs">
                <canvas ref={canvasRef} className="block" />
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-[#A0A0B0] text-center font-medium">
                Scan with phone camera to connect
              </p>
            </div>

            {/* Email Option */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#F2F2F7] mb-1.5">
                Send by Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="partner@example.com"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#534AB7] dark:border-slate-700 dark:bg-slate-800 dark:text-[#F2F2F7] dark:placeholder-[#A0A0B0] min-h-[40px]"
                />
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F2F2F7] dark:hover:bg-[#24242E] dark:active:bg-[#24242E] flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Mail className="h-5 w-5 stroke-current" strokeWidth={2} />
                  <span>Draft Email</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
