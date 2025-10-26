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
 * Booking deposit:
 * - Based on the SIZE CHART (used sqft → reserved hours → deposit amount), but never less
 *   than the rounded-up high end of the estimated time range (snapped to {2,3,4,6,7,9}).
 *   Chart:
 *     0–700 → 2h → $50
 *     701–1050 → 3h → $75
 *     1051–1400 → 4h → $100
 *     1401–2100 → 6h → $125
 *     2101–2450 → 7h → $150
 *     2451–3150+ → 9h → $200
 *
 * Time estimate:
 * - Computed from productivity assumptions (1 cleaner) and shown as a range (or ~X hr if collapsed).
 * - Reserved window/CTA aligns with the greater of the chart window and the rounded-up high end.
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

    // Labor/time assumptions (for the displayed estimate range, 1 cleaner)
    labor: {
      sqftPerHourDeep: 400, // deep-clean productivity per cleaner (sq ft/hour)
      teamSizeDefault: 1,   // assume ONE cleaner by default
      variability: 0.15,    // ±15% range for real-world variance
      minOnSiteHours: 1.0,  // don’t show below this (short visits still have overhead)
      roundTo: 0.5,         // round displayed hours to nearest 0.5h
      maxHoursPerVisit: 9,  // hard cap per visit for one cleaner
    },

    // Calendly booking slots (used with the chart hours)
    bookingSlots: [
      { hours: 2, url: "https://calendly.com/golden-hour-cleaning-company/approx-2-hour-cleaning" },
      { hours: 3, url: "https://calendly.com/golden-hour-cleaning-company/approx-3-hour-cleaning" },
      { hours: 4, url: "https://calendly.com/golden-hour-cleaning-company/approx-4-hour-cleaning" },
      { hours: 6, url: "https://calendly.com/golden-hour-cleaning-company/approx-6-hour-cleaning" },
      { hours: 7, url: "https://calendly.com/golden-hour-cleaning-company/approx-7-hour-cleaning" },
      { hours: 9, url: "https://calendly.com/golden-hour-cleaning-company/approx-9-hour-cleaning" },
    ],

    // Booking DEPOSIT by RESERVED HOURS (from the chart)
    bookingDepositByHours: {
      2: 50,
      3: 75,
      4: 100,
      6: 125,
      7: 150,
      9: 200,
    },
  };

  const LEVEL_COPY = {
    standard: { name: "Standard Refresh", rateLabel: "Standard rate" },
    deep: { name: "Deep Glow (Deep Clean)", rateLabel: "Deep Clean rate" },
    move_out: { name: "Move-In / Move-Out", rateLabel: "Move-In/Out rate" },
  };

  // Fallback (shouldn’t be used unless something’s off)
  const CONTACT = {
    bookingUrl: "https://calendly.com/golden-hour-cleaning-company/approx-4-hour-cleaning",
    phone: "+15038934795",
    sms: "+15038934795",
    email: "golden.hour.cleaning.company@gmail.com",
  };

  // -----------------------------
  // Accept external level via URL param + CustomEvent
  // -----------------------------
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
  function roundTo(n, step = 0.5) {
    return Math.round(n / step) * step;
  }
  function trimHours(h) {
    const s = h.toFixed(1);
    return s.endsWith(".0") ? String(Math.round(h)) : s;
  }
  function hoursUnit(h) {
    return Math.abs(h - 1) < 1e-9 ? "hr" : "hrs";
  }

  // SIZE CHART: usedSqft → reserved hours
  function getHoursBySqft(sqft) {
    if (sqft <= 700) return 2;
    if (sqft <= 1050) return 3;
    if (sqft <= 1400) return 4;
    if (sqft <= 2100) return 6;
    if (sqft <= 2450) return 7;
    // 2451 – 3150+ → 9h (cap at 9h bucket)
    return 9;
  }

  function getDepositByHours(hours) {
    return clampCurrency(CFG.bookingDepositByHours[hours] ?? CFG.bookingDepositByHours[3]);
  }

  function pickCalendlySlotByHours(hours) {
    const slot = [...CFG.bookingSlots].sort((a, b) => a.hours - b.hours).find(s => s.hours === hours);
    return slot || CFG.bookingSlots[1]; // default to 3h if exact not found
  }

  function nextSlotAtLeast(minHours) {
    const sorted = [...CFG.bookingSlots].sort((a, b) => a.hours - b.hours);
    const found = sorted.find(s => s.hours >= minHours);
    return found ? found.hours : sorted[sorted.length - 1].hours; // cap at largest slot (9h)
  }

  // Max sq ft one cleaner can handle in maxHoursPerVisit for a given level
  function getMaxSqftForOneCleaner(levelKey) {
    const mult = CFG.levelMultiplier[levelKey] ?? 1.0;
    const { sqftPerHourDeep, maxHoursPerVisit } = CFG.labor;
    return Math.floor((sqftPerHourDeep * maxHoursPerVisit) / Math.max(0.0001, mult));
  }

  // ---------- Snapshot logging + UTM builder + CTA handler ----------
  function logQuoteSnapshot(payload) {
    const url = "/api/quote-snapshots"; // implement this endpoint in your app
    const data = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([data], { type: "application/json" });
        navigator.sendBeacon(url, blob);
        return Promise.resolve();
      } catch {
        // fall through to fetch
      }
    }

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data,
      keepalive: true,
    }).catch(() => { });
  }

  function buildCalendlyUrlWithUtm(baseUrl, result, level, frequency, bedrooms, bathrooms) {
    // Timestamp: MM-DD-YY|HH:MM (local time)
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ts = `${mm}-${dd}-${yy}|${hh}:${min}`;

    const utm = new URLSearchParams({
      utm_source: "quote_calculator",
      utm_medium: "website",
      utm_campaign: "cleaning_quote",
      utm_content: [
        `lvl=${level}`,
        `bd=${bedrooms}`,
        `ba=${bathrooms}`,
        `sfEntered=${result.sqftInput}`, // user-entered sqft
        `sfUsed=${result.usedSqft}`,     // the sqft actually used in pricing
        `freq=${frequency}`,
        `tot=${result.total}`,
        `ts=${ts}`,
      ].join("_"),
    });

    return `${baseUrl}?${utm.toString()}`;
  }

  async function onScheduleClick(e) {
    e.preventDefault();

    // const payload = {
    //   ts: new Date().toISOString(),
    //   bedrooms,
    //   bathrooms,
    //   sqftInput: result.sqftInput,   // entered
    //   usedSqft: result.usedSqft,     // used
    //   level,
    //   frequency,
    //   pricing: {
    //     standardRate: result.standardRate,
    //     effectiveRate: result.effectiveRateForLevel,
    //     base: result.base,
    //     levelAdj: result.levelAdj,
    //     freqDiscount: result.freqDiscount,
    //     total: result.total,
    //     bookingDeposit: result.bookingFee,
    //   },
    //   time: {
    //     reservedWindowHours: result.reservedWindowHours,
    //     display: result.time.displayText,
    //     teamSize: result.time.teamSize,
    //   },
    //   exceedsCap: result.exceedsCap,
    // };

    const base = result.calendlyUrl || CONTACT.bookingUrl;
    const url = buildCalendlyUrlWithUtm(base, result, level, frequency, bedrooms, bathrooms);
    window.open(url, "_blank", "noopener,noreferrer");
  }
  // ---------- END handlers ----------

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
    const standardRate = CFG.deepRate * (CFG.levelMultiplier.standard ?? 0.75);
    const baseStandardRaw = usedSqft * standardRate;

    // Level adjustment
    const leveledRaw = usedSqft * (CFG.deepRate * mult);
    const levelAdjustmentRaw = leveledRaw - baseStandardRaw;

    // Frequency discount after level
    const disc = CFG.frequencyDiscount[frequency] || 0;
    const discountAmountRaw = leveledRaw * disc;

    // Totals
    const totalRaw = leveledRaw - discountAmountRaw;

    // ---- Display time estimate (1 cleaner) ----
    const {
      sqftPerHourDeep,
      teamSizeDefault,
      variability,
      minOnSiteHours,
      roundTo: roundStep,
    } = CFG.labor;

    const personHoursRaw = (usedSqft / Math.max(1, sqftPerHourDeep)) * mult;
    const onSiteHoursRaw = personHoursRaw / Math.max(1, teamSizeDefault);
    const baseOnSite = Math.max(onSiteHoursRaw, minOnSiteHours);
    const rangeLow = roundTo(baseOnSite * (1 - variability), roundStep);
    const rangeHigh = roundTo(baseOnSite * (1 + variability), roundStep);
    const mid = roundTo(baseOnSite, roundStep);

    // ---- SIZE CHART baseline window ----
    const chartHours = getHoursBySqft(Math.round(usedSqft));

    // ---- Align reserved window with estimate (no shorter than chart) ----
    const estHighRoundedUp = Math.ceil(rangeHigh);
    const minHoursNeeded = Math.max(chartHours, estHighRoundedUp);
    const finalReservedHours = nextSlotAtLeast(minHoursNeeded);

    // ---- Deposit + Calendly from FINAL reserved hours ----
    const bookingFeeRaw = getDepositByHours(finalReservedHours);
    const slot = pickCalendlySlotByHours(finalReservedHours);

    // ---- Visit-cap check (one cleaner) ----
    const maxSqftOneCleaner = getMaxSqftForOneCleaner(level);
    const exceedsCap = usedSqft > maxSqftOneCleaner;

    // ---- User-facing hours text (avoid "1.0–1.0 hrs") ----
    const sameRange = Math.abs(rangeHigh - rangeLow) < 1e-9;
    const timeDisplayText = sameRange
      ? `~${trimHours(mid)} ${hoursUnit(mid)}`
      : `${trimHours(rangeLow)}–${trimHours(rangeHigh)} hrs`;

    return {
      bedrooms,
      bathrooms,
      sqftInput: safeSqftInput,          // entered
      estSqft: Math.round(estSqft),      // heuristic (not sent in UTM)
      usedSqft: Math.round(usedSqft),    // used
      deepRate: CFG.deepRate,
      standardRate,
      effectiveRateForLevel: CFG.deepRate * mult,

      base: clampCurrency(baseStandardRaw),           // Base (Standard)
      levelAdj: clampCurrency(levelAdjustmentRaw),    // ± delta from Standard
      freqDiscount: clampCurrency(discountAmountRaw), // − delta
      total: clampCurrency(totalRaw),

      // From FINAL reserved hours (kept consistent with estimate)
      bookingFee: clampCurrency(bookingFeeRaw),
      reservedWindowHours: finalReservedHours,
      calendlyUrl: slot?.url || CONTACT.bookingUrl,

      // Display time (1 cleaner)
      time: {
        teamSize: teamSizeDefault, // 1
        personHours: Math.max(personHoursRaw, minOnSiteHours * teamSizeDefault),
        onSiteHours: mid,
        onSiteRangeLow: rangeLow,
        onSiteRangeHigh: rangeHigh,
        displayText: timeDisplayText,
      },

      // Cap info
      maxSqftOneCleaner,
      exceedsCap,
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
              <div className="text-sm text-stone-700">Booking deposit (based on size chart & time estimate)</div>
              <div className="text-lg font-medium tabular-nums">{formatCurrency(result.bookingFee)}</div>
            </div>
          </div>

          {/* Time estimate + reserved window (hide when over cap; fixed alignment) */}
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
            {!result.exceedsCap && (
              <>
                <div className="text-sm text-stone-800">
                  Estimated time on site (1 cleaner):{" "}
                  <span className="font-medium tabular-nums">
                    {result.time.displayText}
                  </span>
                </div>
                <div className="mt-1 text-xs text-stone-600">
                  We’ll reserve a{" "}
                  <span className="font-medium">
                    {result.reservedWindowHours} {result.reservedWindowHours === 1 ? "hour" : "hours"}
                  </span>{" "}
                  window to ensure enough time.
                </div>
                <div className="mt-1 text-sm text-stone-800">
                  We may add a second cleaner to finish sooner if needed — price unchanged; only duration changes.
                </div>
              </>
            )}

            {result.exceedsCap && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                For one cleaner, our maximum per visit at this service level is{" "}
                <span className="font-semibold">{result.maxSqftOneCleaner.toLocaleString()} sq ft</span>.{" "}
                This looks larger — please call or text us to schedule a longer or multi-cleaner visit.
              </div>
            )}
          </div>

          {/* Dual CTA row with dynamic Calendly link (or call if over cap) */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {result.exceedsCap ? (
              <button
                type="button"
                onClick={() => window.open(`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`, "_self")}
                className="inline-flex w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-3 text-white hover:bg-stone-800"
                aria-label="Call to book — larger home"
              >
                Call to Book — Larger Home
              </button>
            ) : (
              <a
                href={result.calendlyUrl || CONTACT.bookingUrl}
                onClick={onScheduleClick}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-3 text-white hover:bg-stone-800"
                aria-label="Book online now"
              >
                Schedule & Pay Deposit
              </a>
            )}

            <ContactSheet
              phone={CONTACT.phone}
              sms={CONTACT.sms}
              email={CONTACT.email}
              context={{
                level,
                sqft: result.usedSqft,
                sqftInput: result.sqftInput,
                bedrooms,
                bathrooms,
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
    `Bedrooms: ${context.bedrooms}\n` +
    `Bathrooms: ${context.bathrooms}\n` +
    `Square footage entered: ${context.sqftInput.toLocaleString()} sq ft\n` +
    `Square footage used for quote: ${context.sqft.toLocaleString()} sq ft\n` +
    `Cleaning frequency: ${humanFreq}\n` +
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
