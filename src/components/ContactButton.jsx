// ContactButton.jsx
import { useState, useRef, useEffect } from 'react';

export default function ContactButton() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const firstActionRef = useRef(null);

  // Close on outside click / Esc
  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);

    const onScroll = () => {
      setOpen(false);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (open && firstActionRef.current) firstActionRef.current.focus();
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full sm:w-auto sm:flex-1"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open ? 'true' : 'false'}
        aria-controls="contact-popover"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-900 shadow-sm hover:bg-stone-50"
      >
        Call / Text / Email Us Now!
      </button>

      {/* Popover */}
      {open && (
        <div
          id="contact-popover"
          role="dialog"
          aria-label="Contact options"
          aria-modal="false"
          className="absolute bottom-full mb-2 right-0 w-[220px] rounded-xl border border-amber-200 bg-white/95 backdrop-blur p-2 shadow-xl"
          style={{ zIndex: 100003 }}
        >
          {/* Arrow pointing down toward the button */}
          <div
            aria-hidden
            className="absolute -bottom-2 right-6 h-0 w-0"
            style={{
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid rgba(255,255,255,0.95)',
              filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.08))',
            }}
          />

          <div className="flex flex-col gap-2">
            <a
              ref={firstActionRef}
              href="tel:+15038934795"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              📞 Call
            </a>
            <a
              href="sms:+15038934795"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              💬 Text
            </a>
            <a
              href="mailto:golden.hour.cleaning.company@gmail.com"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              ✉️ Email
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
