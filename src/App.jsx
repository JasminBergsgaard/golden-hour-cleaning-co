import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Services from './components/Services.jsx'
import QuoteCalculator from './components/QuoteCalculator.jsx'
import Footer from './components/Footer.jsx'
import InstantBookLanding from './components/InstantBookLanding.jsx'
import Trust from './components/Trust.jsx'
import { BadgeCheck, CalendarCheck2, Leaf, ShieldCheck, Stars } from 'lucide-react'
import { Badge } from './helpers/ui-elements.jsx'
import InstantQuoteButton from './components/InstantQuoteButton.jsx'

export default function App() {
  const [showCalendly, setShowCalendly] = useState(false)

  return (
    <BrowserRouter>
      <Routes>
        {/* Main Site */}
        <Route
          path="/"
          element={
            <div className="min-h-screen bg-amber-50 text-stone-900 relative">
              {!showCalendly && <Header />}
              {!showCalendly && <InstantQuoteButton />}

              <main
                id="content"
                className="overflow-x-hidden"
                style={{ scrollPaddingTop: 'var(--header-height, 120px)' }}
              >
                <Hero />
                <div className="mx-auto max-w-7xl px-6 pb-16">
                  <div className="grid w-full max-w-xl grid-cols-2 gap-3 text-sm text-stone-700 sm:grid-cols-4">
                    <Badge icon={<ShieldCheck />} label="Licensed & Insured" />
                    <Badge icon={<BadgeCheck />} label="Background-Checked Professionals" />
                    {/* <Badge icon={<Leaf />} label="Non-Toxic Products" /> */}
                    <Badge icon={<CalendarCheck2 />} label="Real-Time Booking" />
                    <Badge icon={<Stars />} label="5-Star Experience" />
                  </div>
                </div>
                <Trust />
                <div className="pt-10">
                  <QuoteCalculator showCalendly={showCalendly} setShowCalendly={setShowCalendly} title="Get a Quote" subtitle="Transparent hourly pricing with eco-friendly supplies and gentle care." />
                </div>
                <Services />
              </main>

              <Footer />
            </div>
          }
        />

        {/* Google Ads Landing Page */}
        <Route path="/instant-booking" element={<InstantBookLanding showCalendly={showCalendly} setShowCalendly={setShowCalendly} />} />
      </Routes>
    </BrowserRouter>
  )
}
