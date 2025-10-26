import { useEffect, useMemo, useState } from "react";
import { formatCurrency, buildMailto, buildSmsLink } from "../helpers/contactHelpers";

/**
 * Golden Hour Cleaning Co. — Quote Calculator (JS)
 *
 * Pricing:
 * - Deep Clean (anchor): $0.35 / sq ft
 * - Standard: 25% lower (× 0.75)
 * - Move-In/Out: 30% higher (× 1.30)
 * - Frequency discounts (after level): weekly 18%, bi-weekly 12%, monthly 5%, one-time 0%
 *
 * Booking fee:
 * - Flat, tiered (configurable via CFG.bookingFeeTiers, matched against the ESTIMATED TOTAL)
 *
 * Time estimate:
 * - Based on deep-level productivity (sq ft/hour/cleaner), scaled by service level multiplier.
 * - Shows on-site hours for one cleaner (default assumption), with a ± variability range.
 *
 * Inputs:
 * - Bedrooms, Bathrooms, and Square Feet
 * - Uses the HIGHER of (entered sqft, estimated sqft from beds/baths)
 */

export default function QuoteCalculator() {
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [sqft, setSqft] = useState(1200);
  const [level, setLevel] = useState("deep"); // "standard" | "deep" | "move_out"
  const [frequency, setFrequency] = useState("one_time"); // "weekly" | "bi_weekly" | "monthly" | "one_time"
  const [isLevelTipOpen, setIsLevelTipOpen] = useState(false); // mobile tooltip state

  // -----------------------------
  // Config
  // -----------------------------
  const CFG = {
    deepRate: 0.35, // $/sq ft (anchor)
    levelMultiplier: { standard: 0.75, deep: 1.0, move_out: 1.3 },
    frequencyDiscount: { weekly: 0.18, bi_weekly: 0.12, monthly: 0.05, one_time: 0.0 },
    roomsToSqft: { base: 300, perBedroom: 400, perBathroom: 150 }, // heuristic

    // Flat booking fee tiers (first threshold that the estimated TOTAL is <= gets applied).
    bookingFeeTiers: [
      { threshold: 199, fee: 25 },
      { threshold: 399, fee: 50 },
      { threshold: 699, fee: 75 },
      { threshold: Infinity, fee: 100 },
    ],

    // Labor/time assumptions (tweak as needed)
    labor: {
      sqftPerHourDeep: 400, // deep-clean productivity per cleaner (sq ft/hour)
      teamSizeDefault: 1,   // <-- assume ONE cleaner by default
      variability: 0.15,    // ±15% range for real-world variance
      minOnSiteHours: 1.0,  // don’t show below this (short visits still have overhead)
      roundTo: 0.5,         // round displayed hours to nearest 0.5h
    },
  };

  const LEVEL_COPY = {
    standard: { name: "Standard Refresh", rateLabel: "Standard rate" },
    deep: { name: "Deep Glow (Deep Clean)", rateLabel: "Deep Clean rate" },
    move_out: { name: "Move-In / Move-Out", rateLabel: "Move-In/Out rate" },
  };

  const CONTACT = {
    bookingUrl: "https://your-booking-link.example.com", // ← update
    phone: "+15038934795",                                // ← update
    sms: "+15038934795",
    email: "golden.hour.cleaning.company@gmail.com",      // ← update
  };

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const lv = url.searchParams.get("level");
      if (lv && ["standard", "deep", "move_out"].includes(lv)) setLevel(lv);
    } catch {
      /* noop */
    }

    function onSetQuoteLevel(e) {
      const next = e?.detail;
      if (typeof next === "string" && ["standard", "deep", "move_out"].includes(next)) {
        setLevel(next);
        setIsLevelTipOpen(false);
        const el = document.getElementById("quote");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    window.addEventListener("setQuoteLevel", onSetQuoteLevel);
    return () => window.removeEventListener("setQuoteLevel", onSetQuoteLevel);
  }, []);

  // -----------------------------
  // Helpers
  // -----------------------------
  function clampCurrency(n) {
    return Math.max(0, Math.round(n));
  }

  function formatSigned(amount) {
    const sign = amount >= 0 ? "+" : "−";
    return `${sign}$${Math.abs(amount)}`;
  }

  function getFlatBookingFee(totalRaw) {
    const tier = CFG.bookingFeeTiers.find(t => totalRaw <= t.threshold) || CFG.bookingFeeTiers[CFG.bookingFeeTiers.length - 1];
    return clampCurrency(tier.fee);
  }

  function roundTo(n, step = 0.5) {
    return Math.round(n / step) * step;
  }

  // -----------------------------
  // Calculation
  // -----------------------------
  const result = useMemo(() => {
    const safeSqftInput = Math.max(0, Number.isFinite(sqft) ? sqft : 0);

    // Estimate sqft from beds/baths (heuristic)
    const estSqft =
      CFG.roomsToSqft.base +
      bedrooms * CFG.roomsToSqft.perBedroom +
      bathrooms * CFG.roomsToSqft.perBathroom;

    // Use the higher of entered sqft and estimated sqft
    const usedSqft = Math.max(safeSqftInput, estSqft);

    // Rates (keep deep as anchor for totals; show base as Standard for UX)
    const mult = CFG.levelMultiplier[level] ?? 1.0;
    const standardRate = CFG.deepRate * (CFG.levelMultiplier.standard ?? 0.75); // 0.2625 with current config
    const baseStandardRaw = usedSqft * standardRate;

    // Level adjustment (totals unchanged)
    const leveledRaw = usedSqft * (CFG.deepRate * mult); // identical total math as before
    const levelAdjustmentRaw = leveledRaw - baseStandardRaw; // delta from Standard

    // Frequency discount after level (pricing only)
    const disc = CFG.frequencyDiscount[frequency] || 0;
    const discountAmountRaw = leveledRaw * disc;

    // Totals
    const totalRaw = leveledRaw - discountAmountRaw;

    // Flat booking fee (tiered)
    const bookingFeeRaw = getFlatBookingFee(totalRaw);

    // ---- Time estimate for ONE cleaner ----
    const {
      sqftPerHourDeep,
      teamSizeDefault,
      variability,
      minOnSiteHours,
      roundTo: roundStep,
    } = CFG.labor;

    // Person-hours at deep level, scaled by level multiplier (more scope → more time)
    const personHoursRaw = (usedSqft / Math.max(1, sqftPerHourDeep)) * mult;

    // For one cleaner, on-site hours = person-hours
    const onSiteHoursRaw = personHoursRaw / Math.max(1, teamSizeDefault); // teamSizeDefault = 1

    // Apply min + variability range, then round for display
    const baseOnSite = Math.max(onSiteHoursRaw, minOnSiteHours);
    const low = roundTo(baseOnSite * (1 - variability), roundStep);
    const high = roundTo(baseOnSite * (1 + variability), roundStep);
    const mid = roundTo(baseOnSite, roundStep);

    return {
      bedrooms,
      bathrooms,
      sqftInput: safeSqftInput,
      estSqft: Math.round(estSqft),
      usedSqft: Math.round(usedSqft),
      deepRate: CFG.deepRate,
      standardRate,
      effectiveRateForLevel: CFG.deepRate * mult, // $/sq ft for selected level

      base: clampCurrency(baseStandardRaw),           // Base (Standard)
      levelAdj: clampCurrency(levelAdjustmentRaw),    // ± delta from Standard
      freqDiscount: clampCurrency(discountAmountRaw), // − delta
      total: clampCurrency(totalRaw),
      bookingFee: clampCurrency(bookingFeeRaw),
      levelMult: mult,

      // Time (one cleaner)
      time: {
        teamSize: teamSizeDefault, // 1
        personHours: Math.max(personHoursRaw, minOnSiteHours * teamSizeDefault),
        onSiteHours: mid,
        onSiteRangeLow: low,
        onSiteRangeHigh: high,
      },
    };
  }, [bedrooms, bathrooms, sqft, level, frequency]);

  return (
    <div
      id="quote"
      className="mx-auto max-w-4xl rounded-3xl border border-amber-200 bg-white p-6 shadow-sm md:p-8"
    >
      <h2 className="font-serif text-2xl md:text-3xl">Get a Quote</h2>
      <p className="mt-1 text-stone-600">
        Transparent pricing with eco-friendly supplies and gentle care.
      </p>

      {/* Inputs: Beds/Baths & Square Feet */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <label className="font-medium text-stone-800">Bedrooms & Bathrooms</label>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <NumberField label="Bedrooms" value={bedrooms} setValue={setBedrooms} min={0} />
            <NumberField label="Bathrooms" value={bathrooms} setValue={setBathrooms} min={1} />
          </div>
          <p className="mt-2 text-xs text-stone-500">
            We estimate size from rooms and compare with your square footage to ensure enough time and care.
          </p>
        </div>

        <div className="rounded-2xl border p-4">
          <label className="font-medium text-stone-800">Square Feet</label>
          <div className="mt-4">
            <NumberField label="Total Sq Ft" value={sqft} setValue={setSqft} min={0} step={50} />
            {/* DYNAMIC rate copy based on selected level */}
            <p className="mt-1 text-xs text-stone-500">
              {LEVEL_COPY[level]?.rateLabel || "Selected level rate"}: $
              {result.effectiveRateForLevel.toFixed(2)} per sq ft.
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Using <span className="font-medium">{result.usedSqft.toLocaleString()} sq ft</span> (higher of entered{" "}
              {result.sqftInput.toLocaleString()} and estimated {result.estSqft.toLocaleString()} based on Bedrooms & Bathrooms selection).
            </p>
          </div>
        </div>
      </div>

      {/* Level & Frequency */}
      <div className="mt-6 rounded-2xl border p-4 relative">
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          {/* LEVEL with mobile-friendly tooltip */}
          <div className="relative group">
            <label className="text-stone-700 flex items-center gap-2">
              Level
              <button
                type="button"
                aria-label="More info about levels"
                onClick={() => setIsLevelTipOpen((s) => !s)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 text-stone-700 text-xs hover:bg-stone-300 md:pointer-events-none md:cursor-default"
              >
                ?
              </button>
              <div className="pointer-events-none absolute left-1/2 top-full z-10 hidden -translate-x-1/2 md:block">
                <div className="mt-1 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg bg-stone-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                  View the “Services” section below for details on what each service level includes.
                </div>
              </div>
            </label>

            <SelectField
              value={level}
              setValue={setLevel}
              options={[
                { value: "standard", label: "Standard Refresh (~$0.26/sq ft)" },
                { value: "deep", label: "Deep Glow (Deep Clean) ($0.35/sq ft)" },
                { value: "move_out", label: "Move-In / Move-Out (~$0.46/sq ft)" },
              ]}
            />

            {isLevelTipOpen && (
              <div className="md:hidden fixed inset-x-4 bottom-4 z-50">
                <div className="rounded-xl bg-stone-900 px-4 py-3 text-xs text-white shadow-2xl">
                  <div className="flex items-start justify-between gap-3">
                    <p className="pr-2">
                      View the <span className="italic">Services</span> section below for details on what each service level includes.
                    </p>
                    <button
                      type="button"
                      aria-label="Close tooltip"
                      onClick={() => setIsLevelTipOpen(false)}
                      className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded bg-stone-700/60 text-white"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FREQUENCY */}
          <SelectField
            label="Frequency"
            value={frequency}
            setValue={setFrequency}
            options={[
              { value: "one_time", label: "One-time" },
              { value: "monthly", label: "Monthly (−5%)" },
              { value: "bi_weekly", label: "Bi-weekly (−12%)" },
              { value: "weekly", label: "Weekly (−18%)" },
            ]}
          />
        </div>

        <p className="mt-2 text-xs text-stone-500">
          Current effective rate for this level: ${result.effectiveRateForLevel.toFixed(3)}/sq ft
        </p>
      </div>

      {/* Summary */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <label className="font-medium text-stone-800">Breakdown</label>
          <ul className="mt-3 space-y-1 text-sm text-stone-700">
            <li className="flex justify-between">
              <span>
                Base (Standard): {result.usedSqft.toLocaleString()} sq ft × ${result.standardRate.toFixed(2)}/sq ft
              </span>
              <span className="tabular-nums">${result.base}</span>
            </li>
            <li className="flex justify-between">
              <span>Level adjustment</span>
              <span className="tabular-nums">{formatSigned(result.levelAdj)}</span>
            </li>
            <li className="flex justify-between">
              <span>Frequency discount</span>
              <span className="tabular-nums">−${result.freqDiscount}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border p-4 bg-amber-50/60">
          <label className="font-medium text-stone-800">Your quote</label>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-4xl font-semibold tabular-nums">{formatCurrency(result.total)}</div>
              <div className="text-xs text-stone-600">Estimated total</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-stone-700">Booking deposit (applied to total)</div>
              <div className="text-lg font-medium tabular-nums">{formatCurrency(result.bookingFee)}</div>
            </div>
          </div>

          {/* Time estimate under total (ONE cleaner) */}
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
            <div className="text-sm text-stone-800">
              Estimated time on site (1 cleaner):{" "}
              <span className="font-medium tabular-nums">
                {result.time.onSiteRangeLow.toFixed(1)}–{result.time.onSiteRangeHigh.toFixed(1)} hrs
              </span>
            </div>
            <div className="mt-1 text-xs text-stone-600">
              We may add a second cleaner to finish sooner if needed — price unchanged; only duration changes.
            </div>
          </div>

          {/* Dual CTA row (unchanged) */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a
              href={CONTACT.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-3 text-white hover:bg-stone-800"
              aria-label="Book online now"
            >
              Schedule & Pay Deposit
            </a>

            <ContactSheet
              phone={CONTACT.phone}
              sms={CONTACT.sms}
              email={CONTACT.email}
              context={{
                level,
                sqft: result.usedSqft,
                total: result.total,
                frequency,
              }}
            />
          </div>

          <p className="mt-2 text-xs text-stone-600">
            Final price confirmed after a quick walkthrough. Booking deposit fully applied to your total; refundable up to 24 hours before your appointment.
          </p>
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Reusable inputs
// -----------------------------
function NumberField({ label, value, setValue, min = 0, step = 1 }) {
  return (
    <label className="block text-sm">
      <span className="text-stone-700">{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => setValue(parseInt(e.target.value || "0"))}
        className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
    </label>
  );
}

function SelectField({ label, value, setValue, options }) {
  return (
    <label className="block text-sm">
      {label && <span className="text-stone-700">{label}</span>}
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-1 w-full rounded-xl border bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ContactSheet({ phone, sms, email, context }) {
  const [open, setOpen] = useState(false);

  const levelLabel =
    context.level === "standard" ? "Standard Refresh" :
      context.level === "move_out" ? "Move-In / Move-Out" : "Deep Glow";

  const humanFreq =
    context.frequency === "weekly" ? "Weekly" :
      context.frequency === "bi_weekly" ? "Bi-weekly" :
        context.frequency === "monthly" ? "Monthly" : "One-time";

  const summary =
    `Hello Golden Hour — I have a question about my quote.\n` +
    `Service: ${levelLabel}\n` +
    `Sq Ft (used): ${context.sqft.toLocaleString()} sq ft\n` +
    `Frequency: ${humanFreq}\n` +
    `Estimated total: ${formatCurrency(context.total)}\n\n` +
    `My question: `;

  const smsHref = buildSmsLink({ phone: sms, message: summary });
  const mailHref = buildMailto({
    email,
    subject: `Question about my quote — ${levelLabel}`,
    body: summary,
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        aria-controls="contact-sheet"
        className="inline-flex w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 hover:bg-stone-50"
      >
        Questions? Call / Text / Email
      </button>

      {open && (
        <div
          id="contact-sheet"
          className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-stone-200 bg-white p-3 shadow-xl sm:w-80
                     md:right-auto md:left-1/2 md:-translate-x-1/2"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-stone-800">Contact us</div>
            <button
              type="button"
              aria-label="Close contact options"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100"
            >
              ✕
            </button>
          </div>

          <p className="mt-1 text-xs text-stone-600">
            We’ll receive your quote details so we can help fast.
          </p>

          <div className="mt-3 space-y-2">
            <a href={`tel:${phone}`} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-stone-50">
              <span className="text-sm text-stone-800">Call {formatPhone(phone)}</span>
              <span className="text-xs text-stone-500">Tap to dial</span>
            </a>

            <a href={smsHref} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-stone-50">
              <span className="text-sm text-stone-800">Text us</span>
              <span className="text-xs text-stone-500">Opens SMS</span>
            </a>

            <a href={mailHref} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-stone-50">
              <span className="text-sm text-stone-800">Email {email}</span>
              <span className="text-xs text-stone-500">Opens email</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function formatPhone(e164) {
  const m = (e164 || "").replace(/[^\d]/g, "").match(/^1?(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
