export default function Services() {
  return (
    <section id="services" className="mx-auto max-w-6xl px-4 pt-14 pb-20">
      <h2 className="font-serif text-3xl mt-0">Services</h2>
      <p className="mt-1 text-stone-700">
        We bill by the hour at <span className="font-medium">$75/hr</span>, using your home’s size
        and service type to estimate a time range. Eco-friendly products are our default—
        conventional options are available on request.
      </p>

      <div className="mt-6 md:mt-8 grid md:grid-cols-3 gap-6">
        <ServiceCard
          title="Standard Refresh"
          desc="Weekly or bi-weekly upkeep for homes that already feel pretty tidy."
          items={[
            "Kitchen & bath surfaces",
            "Dust & high-touch areas",
            "Floors vacuum & mop",
          ]}
          price="$75/hr • lighter upkeep"
          cta="Calculate My Quote"
          levelKey="standard"
        />
        <ServiceCard
          title="Deep Glow"
          desc="A full-home reset — perfect if it’s been 2+ months since your last deep clean or things are feeling a bit built up."
          items={[
            "Baseboards & edges",
            "Bathroom detail",
            "Appliance exteriors",
          ]}
          price="$75/hr • full-home reset"
          cta="Calculate My Quote"
          featured
          levelKey="deep"
        />

        <ServiceCard
          title="Move-In Serenity"
          desc="Empty-home detail clean so you can move in (or hand over keys) feeling clear."
          items={[
            "Inside cabinets & drawers",
            "Detail corners",
            "Final floor finish",
          ]}
          price="$75/hr • most intensive"
          cta="Calculate My Quote"
          levelKey="move_out"
        />
      </div>
    </section>
  );
}

function ServiceCard({
  title,
  desc,
  items,
  price,
  cta = "Calculate My Quote",
  featured = false,
  levelKey,
}) {
  function handleSelectLevel(e) {
    e.preventDefault();

    // Update URL (keeps the selection shareable & refresh-safe)
    try {
      const url = new URL(window.location.href);
      url.hash = "quote";
      url.searchParams.set("level", levelKey);
      window.history.replaceState({}, "", url);
    } catch { }

    // Notify the calculator
    window.dispatchEvent(new CustomEvent("setQuoteLevel", { detail: levelKey }));

    // Smooth scroll to the calculator
    const el = document.getElementById("quote");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className={`rounded-3xl border p-6 shadow-sm bg-white ${featured ? "border-stone-900 shadow-xl" : "border-amber-200"
        }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <span className="text-sm text-stone-500">{price}</span>
      </div>

      <p className="mt-2 text-sm text-stone-700">{desc}</p>

      <ul className="mt-4 space-y-1 text-sm text-stone-700">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>

      {/* Button that selects the level in the calculator */}
      <a
        href="#quote"
        onClick={handleSelectLevel}
        aria-label={`Calculate my quote for ${title}`}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-2 text-white hover:bg-stone-800"
      >
        {cta}
      </a>

      <p className="mt-2 text-xs text-stone-500">
        Quotes are based on estimated hours at $75/hr. Final price is confirmed after a quick walkthrough.
      </p>
    </div>
  );
}
