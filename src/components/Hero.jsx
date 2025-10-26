import { scrollToId } from '../helpers/scrollToId';

export default function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100 via-amber-50 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 pt-4 md:pt-6 pb-16 md:pb-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="font-lora text-4xl md:text-5xl leading-tight">
              Trusted hands. Quiet presence. Radiant results.
            </h1>
            <p className="mt-4 text-stone-700 md:text-lg">
              Portland Metro's premier non-toxic cleaning for mindful homes and boutique Airbnbs.
              Our thoughtful teams provide immaculate care with plant-based products and a gentle energy that honors your home as a sanctuary.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#services"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId('#services');
                }}
                className="inline-flex items-center rounded-2xl bg-stone-900 px-5 py-3 text-white shadow hover:bg-stone-800"
              >
                See services
              </a>
              <a
                href="#quote"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId('#quote', 8);
                }}
                className="inline-flex items-center rounded-2xl border border-stone-300 bg-white px-5 py-3 shadow-sm hover:shadow">Get an instant quote</a>
            </div>
            <ul className="mt-6 flex flex-wrap items-center gap-4 text-sm text-stone-600">
              <li>Non-toxic supplies</li>
              <li>Insured</li>
              <li>Satisfaction Guarantee</li>
            </ul>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden rounded-3xl shadow-xl ring-1 ring-amber-200">
              <img
                src="src/assets/gh-cleaning-hero.jpg"
                alt="Sunlit, tidy living room with natural textures"
                className="h-full w-full object-cover"
              />
            </div>
            <div aria-hidden className="absolute -bottom-6 -left-6 hidden md:block h-28 w-28 rounded-3xl bg-amber-200/50 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
