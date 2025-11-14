import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import logo from '../assets/Golden Hour - rectangle.svg'

export default function Header() {
  const [compact, setCompact] = useState(false)
  const compactRef = useRef(compact)
  compactRef.current = compact

  // --- Size & timing ---
  const EXPANDED_H = 222
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

  const height = compact ? COMPACT_H : EXPANDED_H
  const innerHeight = Math.max(0, height - BANNER_H)
  const logoHeight = Math.min(innerHeight * 0.97, 260)
  const logoScale = compact ? 0.98 : 1

  useEffect(() => {
    document.documentElement.style.setProperty('--header-height', `${height}px`)
  }, [height])

  const bannerItems = [
    'Serving: Portland • Beaverton • Tigard • Lake Oswego • West Linn • Milwaukie • Tualatin',
    'We use eco-friendly, non-toxic products',
    'Licensed & insured',
    'Flexible weekly • bi-weekly • monthly',
    'Same-week openings available',
    'Easy online booking',
    'Locally owned & operated',
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
        position: 'sticky',
        top: 0,
        zIndex: 100000,
      }}
      className="backdrop-blur border-b border-amber-200 flex flex-col overflow-hidden"
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
      </div>
    </header >
  )
}
