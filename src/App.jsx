import { useState } from 'react'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Services from './components/Services.jsx'
import QuoteCalculator from './components/QuoteCalculator.jsx'
import ContactButton from './components/ContactButton.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  const [showCalendly, setShowCalendly] = useState(false);

  return (
    <div className="min-h-screen bg-amber-50 text-stone-900 relative">
      {!showCalendly && <Header />}
      {!showCalendly && <ContactButton />}

      <main
        id="content"
        className="overflow-x-hidden"
        style={{ scrollPaddingTop: 'var(--header-height, 120px)' }}
      >
        <Hero />
        <QuoteCalculator showCalendly={showCalendly} setShowCalendly={setShowCalendly} />
        <Services />
      </main>
      <Footer />
    </div>
  )
}
