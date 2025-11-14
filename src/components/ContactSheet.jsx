import { useState, useRef, useEffect } from "react";
import { formatCurrency, buildMailto, buildSmsLink, formatPhone } from '../helpers/contactHelpers';

export default function ContactSheet({ phone, sms, email, context }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const firstActionRef = useRef(null);

  const levelLabel =
    context.level === "standard" ? "Standard Refresh" :
      context.level === "move_out" ? "Move-In / Move-Out" : "Deep Glow";

  const humanFreq =
    context.frequency === "weekly" ? "Weekly" :
      context.frequency === "bi_weekly" ? "Bi-weekly" :
        context.frequency === "monthly" ? "Monthly" : "One-time";

  const summary =
    `Hello Golden Hour — I have a question about my quote.\n` +
    `Service: ${levelLabel}\n` +
    `Bedrooms: ${context.bedrooms}\n` +
    `Bathrooms: ${context.bathrooms}\n` +
    `Square footage entered: ${context.sqftInput.toLocaleString()} sq ft\n` +
    `Square footage used for quote: ${context.sqft.toLocaleString()} sq ft\n` +
    `Cleaning frequency: ${humanFreq}\n` +
    `${context.promo ? `Promo applied: ${context.promo.code} (−${formatCurrency(context.promo.amount)})\n` : ""}` +
    `Estimated total: ${formatCurrency(context.total)}\n\n` +
    `My question: `;

  const smsHref = buildSmsLink({ phone: sms, message: summary });
  const mailHref = buildMailto({
    email,
    subject: `Question about my quote — ${levelLabel}`,
    body: summary,
  });

  // Close on outside click / Esc / scroll
  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onScroll = () => {
      setOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  // Focus the first action when opening
  useEffect(() => {
    if (open && firstActionRef.current) {
      firstActionRef.current.focus();
    }
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        aria-controls="contact-sheet"
        className="inline-flex w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-900 hover:bg-stone-50"
      >
        Questions? Call / Text / Email
      </button>

      {open && (
        <div
          id="contact-sheet"
          className="absolute bottom-full mb-2 right-0 z-40 w-72 max-h:[60vh] overflow-auto rounded-xl border border-stone-200 bg-white p-3 shadow-xl sm:w-80
                     md:right-auto md:left-1/2 md:-translate-x-1/2"
        >
          {/* Arrow pointing down toward the button */}
          <div
            aria-hidden
            className="absolute -bottom-2 right-6 h-0 w-0"
            style={{
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "8px solid rgba(255,255,255,0.95)",
              filter: "drop-shadow(0 -1px 1px rgba(0,0,0,0.08))",
            }}
          />

          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-stone-800">Contact us</div>
            <button
              type="button"
              aria-label="Close contact options"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100"
            >
              ✕
            </button>
          </div>

          <p className="mt-1 text-xs text-stone-600">
            We’ll receive your quote details so we can help fast.
          </p>

          <div className="mt-3 space-y-2">
            <a
              ref={firstActionRef}
              href={`tel:${phone}`}
              className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 hover:bg-stone-50"
            >
              <div className="min-w-0">
                <div className="text-sm text-stone-800 truncate">
                  Call {formatPhone(phone)}
                </div>
              </div>
              <span className="text-xs text-stone-500 shrink-0">Tap to dial</span>
            </a>

            <a
              href={smsHref}
              className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 hover:bg-stone-50"
            >
              <div className="min-w-0">
                <div className="text-sm text-stone-800 truncate">Text us</div>
              </div>
              <span className="text-xs text-stone-500 shrink-0">Opens SMS</span>
            </a>

            <a
              href={mailHref}
              className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 hover:bg-stone-50"
            >
              <div className="min-w-0">
                <div className="text-sm text-stone-800">Email</div>
                <div className="text-xs text-stone-700 break-all">
                  {email}
                </div>
              </div>
              <span className="text-xs text-stone-500 shrink-0">Opens email</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
