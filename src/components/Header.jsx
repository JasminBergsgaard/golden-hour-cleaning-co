import { useEffect, useRef, useState } from 'react'
import logo from '../assets/Golden Hour - rectangle.svg'

export default function Header() {
  const [compact, setCompact] = useState(false)
  const compactRef = useRef(compact)
  compactRef.current = compact

  useEffect(() => {
    const hero = document.querySelector('#hero')
    if (!hero) return

    // Hysteresis: expand when hero >= 65% in view, compact when <= 45%
    const ENTER = 0.65
    const EXIT = 0.45

    // Use the viewport as the root (root: null).
    // rootMargin pulls the top boundary down by the compact header height
    // so the toggle happens where it *looks* right with a sticky header.
    const io = new IntersectionObserver(
      ([e]) => {
        const ratio = e.intersectionRatio
        const next =
          compactRef.current ? (ratio > ENTER ? false : true)
            : (ratio < EXIT ? true : false)
        if (next !== compactRef.current) setCompact(next)
      },
      {
        root: null,
        rootMargin: '-120px 0px 0px 0px',
        threshold: [0, EXIT, ENTER, 1],
      }
    )

    io.observe(hero)
    return () => io.disconnect()
  }, [])

  // Sizes
  const EXPANDED_H = 288 // 18rem
  const COMPACT_H = 120
  const height = compact ? COMPACT_H : EXPANDED_H

  // Logo sizing
  const logoHeight = Math.min(height * 0.97, 260)
  const logoScale = compact ? 0.98 : 1

  // Keep anchor offsets aligned
  useEffect(() => {
    document.documentElement.style.setProperty('--header-height', `${Math.round(height)}px`)
  }, [height])

  return (
    <header
      onClick={() => {
        const hero = document.querySelector('#hero')
        const header = document.querySelector('header')
        if (!hero || !header) return

        const headerHeight = header.offsetHeight
        const top = hero.getBoundingClientRect().top + window.scrollY - headerHeight
        window.scrollTo({ top, behavior: 'smooth' })
      }}
      style={{
        cursor: 'pointer',
        backgroundColor: '#a7eff1',
        height,
        transition: 'height 300ms cubic-bezier(.2,.8,.2,1), box-shadow 300ms ease',
        boxShadow: compact ? '0 2px 10px rgba(0,0,0,0.08)' : 'none',
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
          transition: 'transform 200ms linear',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </header>

  )
}
