import { motion } from "framer-motion";
import { CalendarCheck2, BadgeCheck, ShieldCheck, Leaf, Stars } from "lucide-react";

/**
 * Golden Hour Cleaning Co. — Landing Page (React + Tailwind)
 * Standalone version without props.
 *
 * Use this as a full page component. The primary CTA buttons will smooth-scroll
 * to the #quote-calculator section where your quote widget or Calendly embed lives.
 */

export default function InstantBookLanding() {
  const scrollToQuote = () => {
    const el = document.querySelector("#quote-calculator");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-amber-50 text-stone-900">
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-amber-100/60 via-amber-50 to-amber-50" /> */}
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-16 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/60 px-3 py-1 text-xs font-medium text-amber-900">
              <Stars className="h-3.5 w-3.5" /> Luxury • Non-Toxic • Real-Time Booking
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl leading-tight">
              <span className="block">Most cleaning companies take</span>
              <span className="block text-amber-900">2 days to get back to you.</span>
              <span className="mt-2 block text-stone-900">We take <em className="not-italic underline decoration-amber-300 decoration-4 underline-offset-4">2 seconds</em>.</span>
            </h1>
            <p className="mt-5 text-lg text-stone-700 sm:text-xl">
              Get an <strong>instant quote</strong> and reserve your <strong>exact appointment time</strong> online — live availability, no back-and-forth, no waiting.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={scrollToQuote}
                className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-base font-semibold text-amber-50 shadow-lg shadow-stone-900/10 transition hover:translate-y-[-1px] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                <CalendarCheck2 className="mr-2 h-5 w-5" /> Get Instant Quote & Book Now
              </button>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-base font-semibold text-stone-900 transition hover:bg-stone-50"
              >
                See How It Works
              </a>
            </div>

            <p className="mt-2 text-sm text-stone-600">
              You’ll see our <strong>live calendar</strong> and choose your preferred date & time before confirming.
            </p>

            <div className="mt-6 grid w-full max-w-xl grid-cols-2 gap-3 text-sm text-stone-700 sm:grid-cols-4">
              <Badge icon={<ShieldCheck />} label="Licensed & Insured" />
              <Badge icon={<BadgeCheck />} label="Background-Checked Professionals" />
              <Badge icon={<Leaf />} label="Non-Toxic Products" />
              <Badge icon={<CalendarCheck2 />} label="Real-Time Booking" />
              <Badge icon={<Stars />} label="5-Star Experience" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">From Estimate to Booking in 60 Seconds</h2>
          <p className="mt-3 text-stone-700">A calm, seamless flow designed for busy, discerning homeowners.</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <Step number={1} title="Enter Your Details" desc="Answer a few quick questions and see your instant quote." />
          <Step number={2} title="Choose Your Time" desc="View our live calendar and select your exact appointment." />
          <Step number={3} title="Confirm & Relax" desc="Your booking is secured immediately — no back-and-forth calls or emails." />
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={scrollToQuote}
            className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-base font-semibold text-amber-50 shadow-lg shadow-stone-900/10 transition hover:translate-y-[-1px] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            Start Your Instant Quote
          </button>
          <p className="mt-2 text-sm text-stone-600">Secure an exact slot on our schedule in seconds.</p>
        </div>
      </section>

      {/* VALUE / TRUST */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">Luxury Service Meets Effortless Technology</h3>
              <p className="mt-4 text-stone-700">
                You deserve a cleaning experience that feels as good as it looks. We blend meticulous care, non-toxic products,
                and a beautiful, real-time online booking flow to restore harmony to your home — and your schedule.
              </p>
              <ul className="mt-6 grid gap-3 text-stone-800">
                <li className="flex items-start gap-3"><BadgeDot /> Impeccable attention to detail</li>
                <li className="flex items-start gap-3"><BadgeDot /> Vetted professionals with a calm, polished presence</li>
                <li className="flex items-start gap-3"><BadgeDot /> Instant confirmation — no back-and-forth, no waiting</li>
                <li className="flex items-start gap-3"><BadgeDot /> Flexible rescheduling from your confirmation email</li>
              </ul>
              <div className="mt-8">
                <button
                  onClick={scrollToQuote}
                  className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-base font-semibold text-stone-900 transition hover:bg-stone-50"
                >
                  Get Instant Quote & See Availability
                </button>
              </div>
            </div>

            {/* Comparison Card */}
            <div className="rounded-3xl border border-stone-200 bg-amber-50 p-6 shadow-sm">
              <h4 className="text-lg font-semibold">Why clients choose Golden Hour</h4>
              <div className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-amber-100/60 text-stone-800">
                    <tr>
                      <th className="px-4 py-3">Feature</th>
                      <th className="px-4 py-3">Golden Hour</th>
                      <th className="px-4 py-3">Typical Cleaner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    <Row label="Instant Quote" a="Yes" b="No" />
                    <Row label="Real-Time Online Booking" a="Yes" b="Contact form / Email" />
                    <Row label="Non-Toxic Products" a="Yes" b="Varies" />
                    <Row label="Licensed & Insured" a="Yes" b="Often" />
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-stone-600">Benchmarking based on public websites of local competitors.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <figure className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <blockquote className="text-lg text-stone-800">
            “They actually let me book my appointment instantly — no waiting for a quote. The team arrived exactly on time and my home looked and <em>felt</em> amazing.”
          </blockquote>
          <figcaption className="mt-4 text-sm text-stone-600">Samantha — Lake Oswego</figcaption>
        </figure>
      </section>

      {/* FINAL CTA */}
      <section className="bg-stone-900">
        <div className="mx-auto max-w-7xl px-6 py-14 text-amber-50">
          <div className="mx-auto max-w-3xl text-center">
            <h3 className="text-3xl font-semibold sm:text-4xl">Ready for your next clean without the wait?</h3>
            <p className="mt-3 text-amber-100/90">Get your instant quote, choose your appointment, and let us handle the rest.</p>
            <div className="mt-8">
              <button
                onClick={scrollToQuote}
                className="inline-flex items-center justify-center rounded-2xl bg-amber-200 px-5 py-3 text-base font-semibold text-stone-900 shadow-md transition hover:bg-amber-100"
              >
                Get Instant Quote & Book Now
              </button>
            </div>
            <p className="mt-2 text-xs text-amber-200">See live availability. Confirm in seconds.</p>
          </div>
        </div>
      </section>

      {/* QUOTE CALCULATOR MOUNT (placeholder) */}
      <section id="quote-calculator" className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h4 className="text-xl font-semibold">Instant Quote & Booking</h4>
          <p className="mt-1 text-sm text-stone-600">Start below to see your price and reserve an exact time on our calendar.</p>
          <div className="mt-6">
            <div className="grid place-items-center rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
              <CalendarCheck2 className="mb-3 h-6 w-6" />
              <p>Embed your <strong>Quote Calculator</strong> or <strong>Calendly widget</strong> here.</p>
              <p className="text-xs mt-2">This is a placeholder with id="#quote-calculator" for smooth scrolling.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Badge({ icon, label }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2">
      <span className="grid h-5 w-5 place-items-center rounded-md bg-amber-100/80">{icon}</span>
      <span className="text-[13px] font-medium text-stone-800">{label}</span>
    </div>
  );
}

function Step({ number, title, desc }) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-stone-900 font-semibold">{number}</div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-stone-700">{desc}</p>
    </div>
  );
}

function Row({ label, a, b }) {
  return (
    <tr>
      <td className="px-4 py-3 text-stone-700">{label}</td>
      <td className="px-4 py-3 font-medium text-stone-900">{a}</td>
      <td className="px-4 py-3 text-stone-600">{b}</td>
    </tr>
  );
}

function BadgeDot() {
  return (
    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100">
      <span className="h-2 w-2 rounded-full bg-amber-400" />
    </span>
  );
}
