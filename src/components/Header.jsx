import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import logo from '../assets/Golden Hour - rectangle.svg'

export default function Header() {
  const [compact, setCompact] = useState(false)
  const [open, setOpen] = useState(false)
  const compactRef = useRef(compact)
  compactRef.current = compact

  // --- Size & timing ---
  const EXPANDED_H = 288
  const COMPACT_H = 120
  const BANNER_H = 36
  const TRANS_MS = 420
  const HYSTERESIS = 40
  const TOP_EXPAND_Y = 2

  const TRIGGER_RATIO = 0.1
  const TRIGGER_NUDGE_PX = -24

  const headerRef = useRef(null)
  const triggerYRef = useRef(0)
  const tickingRef = useRef(false)
  const lockedRef = useRef(false)

  const contactWrapRef = useRef(null)
  const firstActionRef = useRef(null)

  const computeTrigger = () => {
    const hero = document.querySelector('#hero')
    if (!hero) return
    const rect = hero.getBoundingClientRect()
    const pageY = window.scrollY + rect.top
    triggerYRef.current = pageY + rect.height * TRIGGER_RATIO + TRIGGER_NUDGE_PX
  }

  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--header-height', `${COMPACT_H}px`)
  }, [])

  useEffect(() => {
    const hero = document.querySelector('#hero')
    computeTrigger()

    const onResize = () => computeTrigger()
    const onLoad = () => computeTrigger()
    window.addEventListener('resize', onResize)
    window.addEventListener('load', onLoad)

    let ro
    if (hero && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => computeTrigger())
      ro.observe(hero)
    }

    const raf = requestAnimationFrame(computeTrigger)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', onLoad)
      ro?.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    const lockFor = (ms) => {
      lockedRef.current = true
      setTimeout(() => (lockedRef.current = false), ms)
    }

    const onScroll = () => {
      if (tickingRef.current || lockedRef.current) return
      tickingRef.current = true
      requestAnimationFrame(() => {
        const y = Math.max(0, window.scrollY)
        const triggerY = triggerYRef.current || 0

        if (!compactRef.current && y >= triggerY + HYSTERESIS) {
          setCompact(true)
          lockFor(TRANS_MS + 80)
        }
        if (compactRef.current && y <= TOP_EXPAND_Y) {
          setCompact(false)
          lockFor(TRANS_MS + 80)
        }
        tickingRef.current = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // --- Popover: close on outside click / Esc; focus first action when opening
  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return
      if (contactWrapRef.current && !contactWrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (open && firstActionRef.current) {
      firstActionRef.current.focus()
    }
  }, [open])

  const height = compact ? COMPACT_H : EXPANDED_H
  const innerHeight = Math.max(0, height - BANNER_H)
  const logoHeight = Math.min(innerHeight * 0.97, 260)
  const logoScale = compact ? 0.98 : 1

  const bannerItems = [
    'Serving: Portland • Beaverton • Tigard • Lake Oswego • Milwaukie • Vancouver (WA)',
    'Eco-friendly, non-toxic products',
    'Licensed & insured',
    'Flexible weekly • bi-weekly • monthly',
    'Same-week openings available',
    'Easy online booking',
    'Questions? Call or Text us: (503) 893-4795',
  ]

  return (
    <header
      ref={headerRef}
      onClick={() => {
        const hero = document.querySelector('#hero')
        const header = headerRef.current
        if (!hero || !header) return
        const top = hero.getBoundingClientRect().top + window.scrollY - header.offsetHeight
        window.scrollTo({ top, behavior: 'smooth' })
      }}
      style={{
        cursor: 'pointer',
        backgroundColor: '#a7eff1',
        height,
        transition: `
          height ${TRANS_MS}ms cubic-bezier(0.16,1,0.3,1),
          box-shadow 300ms ease
        `,
        boxShadow: compact ? '0 2px 12px rgba(0,0,0,0.08)' : 'none',
        willChange: 'height',
        contain: 'layout paint',
      }}
      className="sticky top-0 z-50 backdrop-blur border-b border-amber-200 flex flex-col overflow-hidden"
      aria-label="Site header"
    >
      {/* --- Announcement bar --- */}
      <div
        className="relative w-full border-b border-amber-200 overflow-hidden"
        style={{
          height: BANNER_H,
          background: 'linear-gradient(to right, #fde68a, #a7eff1)',
          maskImage:
            'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)',
        }}
        role="region"
        aria-label="Service announcements"
      >
        <div
          style={{
            display: 'inline-flex',
            minWidth: 'max-content',
            height: '100%',
            alignItems: 'center',
            animation: 'ghc-marquee 30s linear infinite',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = 'paused')}
          onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = 'running')}
        >
          {[...bannerItems, ...bannerItems].map((text, i) => (
            <span
              key={i}
              className="px-6 text-sm font-medium text-slate-800"
              style={{ lineHeight: `${BANNER_H}px` }}
            >
              {text}
            </span>
          ))}
        </div>

        <style>{`
          @keyframes ghc-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @media (prefers-reduced-motion: reduce) {
            [aria-label="Service announcements"] > div {
              animation: none !important;
              transform: translateX(0) !important;
            }
          }
        `}</style>
      </div>

      {/* --- Logo area --- */}
      <div className="relative w-full flex items-center justify-center" style={{ height: innerHeight }}>
        <img
          src={logo}
          alt="Golden Hour Cleaning Co."
          style={{
            height: `${logoHeight}px`,
            width: 'auto',
            transform: `scale(${logoScale})`,
            transformOrigin: 'center',
            transition: `transform ${TRANS_MS}ms cubic-bezier(0.16,1,0.3,1)`,
            objectFit: 'contain',
            display: 'block',
            willChange: 'transform',
          }}
        />

        {/* --- Contact popover trigger & panel (right, under marquee) --- */}
        <div
          ref={contactWrapRef}
          className="absolute"
          onClick={(e) => e.stopPropagation()} // prevent header scroll-to-hero
          style={{
            top: 12,
            right: 20,
            zIndex: 70, // over the logo
          }}
        >
          {/* Trigger button */}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open ? 'true' : 'false'}
            aria-controls="contact-popover"
            onClick={() => setOpen((v) => !v)}
            className="px-5 md:px-6 h-11 md:h-12 rounded-full bg-amber-400 text-slate-900 font-semibold shadow-lg border border-amber-300 hover:shadow-xl active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-300"
            style={{
              transform: `scale(${compact ? 0.92 : 1})`,
              transition: `transform ${TRANS_MS}ms cubic-bezier(0.16,1,0.3,1), box-shadow 200ms ease`,
            }}
          >
            Contact
          </button>

          {/* Popover */}
          {open && (
            <div
              id="contact-popover"
              role="dialog"
              aria-label="Contact options"
              aria-modal="false"
              className="absolute mt-2 w-[220px] rounded-xl border border-amber-200 bg-white/95 backdrop-blur p-2 shadow-xl"
              style={{
                right: 0, // align to right edge of trigger
              }}
            >
              {/* caret/arrow */}
              <div
                aria-hidden
                className="absolute -top-2 right-6 h-0 w-0"
                style={{
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderBottom: '8px solid rgba(255,255,255,0.95)',
                  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.08))',
                }}
              />

              <div className="flex flex-col gap-2">
                <a
                  ref={firstActionRef}
                  href="tel:+15038934795"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <span>📞 Call</span>
                </a>

                <a
                  href="sms:+15038934795"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <span>💬 Text</span>
                </a>
                <a
                  href="mailto:golden.hour.cleaning.company@gmail.com"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <span>✉️ Email</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
