// Hero.jsx
import { scrollToId } from '../helpers/scrollToId';
import hero from '../assets/gh-cleaning-hero.jpg';
import ContactButton from './ContactButton';

export default function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden pt-14">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100 via-amber-50 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 pt-4 md:pt-6 pb-16 md:pb-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="font-lora text-3xl md:text-4xl leading-snug">
              Professional cleaning for busy, discerning homes.
            </h1>

            <p className="mt-4 text-stone-700 md:text-lg">
              Golden Hour brings meticulous, non-toxic cleaning with a calm, grounded presence.
              Designed for high-performing households and boutique rentals who value immaculate results,
              instant online booking, and a team that treats your space like a sanctuary.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ContactButton />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId('#services', 8);
                }}
                className="w-full sm:flex-1 inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white shadow hover:bg-stone-800"
              >
                See Services &amp; Get Quote
              </button>

            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden rounded-3xl shadow-xl ring-1 ring-amber-200">
              <img
                src={hero}
                alt="Sunlit, tidy living room with natural textures"
                className="h-full w-full object-cover"
              />
            </div>
            <div
              aria-hidden
              className="absolute -bottom-6 -left-6 hidden md:block h-28 w-28 rounded-3xl bg-amber-200/50 blur-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
