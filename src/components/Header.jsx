import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import logo from '../assets/Golden Hour - rectangle.svg'

export default function Header() {
  const [compact, setCompact] = useState(false)
  const compactRef = useRef(compact)
  compactRef.current = compact

  // --- Size & timing ---
  const EXPANDED_H = 288
  const COMPACT_H = 120
  const TRANS_MS = 420
  const HYSTERESIS = 40
  const TOP_EXPAND_Y = 2

  // Collapse earlier:
  const TRIGGER_RATIO = 0.10  // 10% into hero
  const TRIGGER_NUDGE_PX = -24   // negative = sooner

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
    window.addEventListener('resize', onResize)

    const onLoad = () => computeTrigger()
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
      setTimeout(() => { lockedRef.current = false }, ms)
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

        // Expand ONLY when we are at top
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
  const logoHeight = Math.min(height * 0.97, 260)
  const logoScale = compact ? 0.98 : 1

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
          height ${TRANS_MS}ms cubic-bezier(0.16, 1, 0.3, 1),
          box-shadow 300ms ease
        `,
        boxShadow: compact ? '0 2px 12px rgba(0,0,0,0.08)' : 'none',
        willChange: 'height',
        contain: 'layout paint',
      }}
      className="sticky top-0 z-50 backdrop-blur border-b border-amber-200 flex items-center justify-center overflow-hidden"
    >
      <img
        src={logo}
        alt="Golden Hour Cleaning Co."
        style={{
          height: `${logoHeight}px`,
          width: 'auto',
          transform: `scale(${logoScale})`,
          transformOrigin: 'center',
          transition: `transform ${TRANS_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          objectFit: 'contain',
          display: 'block',
          willChange: 'transform',
        }}
      />
    </header>
  )
}
