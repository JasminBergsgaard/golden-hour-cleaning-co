import { scrollToQuote } from '../helpers/scrollToQuote';


export default function Trust() {

  return (
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
  )
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
    <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />
  );
}
