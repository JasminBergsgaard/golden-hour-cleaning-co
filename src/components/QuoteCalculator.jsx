import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../helpers/contactHelpers";
import CalendlyBooking from "./CalendlyBooking";
import ContactSheet from "./ContactSheet";
import SelectField from "./Fields/SelectField";
import NumberField from "./Fields/NumberField";
import { CFG, CONTACT } from "../constants";
import { buildCalendlyUrlWithUtm } from "../helpers/calendlyHelpers";

/**
 * Golden Hour Cleaning Co. — Quote Calculator (Hourly)
 *
 * Pricing:
 * - Single hourly rate: $75 / hour
 * - Eco-friendly products: +15% (multiplier) — default ON
 * - Clean Types (scope, not rate, but affect time needed):
 *    - Standard  (faster than Deep)
 *    - Deep      (baseline: 2000 sq ft → 6–8 hours)
 *    - Move-In / Move-Out (slower than Deep)
 *
 * Time model:
 * - Base productivity for DEEP CLEAN:
 *   - 2000 sq ft → 6–8 hours for 1 cleaner
 *   - 1000 sq ft → 3–4 hours for 1 cleaner
 *   ⇒ ~250–333 sq ft/hour per cleaner
 *
 * - We estimate hours from:
 *    - Bedrooms, bathrooms, and entered square footage
 *    - Clean type multiplier (deep = baseline, others adjust around it)
 * - Time is shown as a range; price is also shown as a corresponding range.
 *
 * Team size:
 * - If the high-end estimate for 1 cleaner is > 8 hours,
 *   we assign 2 cleaners and cut the on-site window roughly in half.
 * - Total person-hours (and price) stay the same; only duration changes.
 *
 * Frequency discounts (applied to labor before eco upcharge):
 * - weekly: 18%
 * - bi-weekly: 12%
 * - monthly: 5%
 * - one-time: 0%
 *
 * Inputs:
 * - Bedrooms, Bathrooms, and Square Feet
 * - Uses the HIGHER of (entered sqft, estimated sqft from beds/baths)
 *
 * Promo:
 * - GOLDENWELCOME = $50 off Deep Clean only; applied to estimated total (not deposit)
 */

const HOURLY_RATE = 75;
const ECO_MULTIPLIER = 1.15; // 15% upcharge

// Productivity: sq ft per hour per cleaner (for DEEP clean baseline)
const MIN_SQFT_PER_HOUR = 250;  // slower pace → more hours (upper end of time)
const MAX_SQFT_PER_HOUR = 333;  // faster pace → fewer hours (lower end of time)

// Minimum visit length for 1 cleaner (in hours)
const MIN_VISIT_HOURS_ONE_CLEANER = 2;

// Deep is baseline (1.0). Standard is faster; Move-Out is slower.
const CLEAN_TYPE_MULTIPLIER = {
  standard: 0.8, // ~20% less time than deep
  deep: 1.0,     // baseline: 2000 sq ft → 6–8 hours
  move_out: 1.3, // ~30% more time than deep
};

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
  return Math.abs(h - 1) < 1e-9 ? "hour" : "hours";
}

function getDepositByOnSiteHours(onSiteHours) {
  if (onSiteHours <= 3) return 50;
  if (onSiteHours <= 5) return 75;
  if (onSiteHours <= 6) return 100;
  return 125;
}

function pickCalendlySlotAtLeast(minHours) {
  const sorted = [...CFG.bookingSlots].sort((a, b) => a.hours - b.hours);
  const found = sorted.find((s) => s.hours >= minHours);
  return found || sorted[sorted.length - 1];
}

export default function QuoteCalculator({
  showCalendly,
  setShowCalendly,
  title,
  subtitle,
}) {
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [sqft, setSqft] = useState(1800);
  const [cleanType, setCleanType] = useState("deep"); // "standard" | "deep" | "move_out"
  const [frequency, setFrequency] = useState("one_time"); // "weekly" | "bi_weekly" | "monthly" | "one_time"
  const [ecoProducts, setEcoProducts] = useState(true); // default selected
  const [isLevelTipOpen, setIsLevelTipOpen] = useState(false);
  const [calendlyUrl, setCalendlyUrl] = useState(null);

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoValid, setPromoValid] = useState(false);
  const [promoError, setPromoError] = useState(null);

  // Read ?level= from URL and listen for external "setQuoteLevel"
  // (We still call it "level" for compatibility, but it now maps to cleanType.)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const lv = url.searchParams.get("level");
      if (lv && ["standard", "deep", "move_out"].includes(lv)) setCleanType(lv);
    } catch { }
    function onSetQuoteLevel(e) {
      const next = e?.detail;
      if (typeof next === "string" && ["standard", "deep", "move_out"].includes(next)) {
        setCleanType(next);
        setIsLevelTipOpen(false);
        const el = document.getElementById("quote");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    window.addEventListener("setQuoteLevel", onSetQuoteLevel);
    return () => window.removeEventListener("setQuoteLevel", onSetQuoteLevel);
  }, []);

  // -----------------------------
  // Promo validation (client-side UX)
  // -----------------------------
  useEffect(() => {
    if (!promoCode) {
      setPromoValid(false);
      setPromoError(null);
      return;
    }

    const code = promoCode.trim().toUpperCase();
    if (!(code in CFG.promos)) {
      setPromoValid(false);
      setPromoError("Invalid promo code.");
      return;
    }

    const rule = CFG.promos[code];
    if (rule.level && rule.level !== cleanType) {
      setPromoValid(false);
      setPromoError("This code only applies to a Deep Clean.");
      return;
    }

    setPromoValid(true);
    setPromoError(null);
  }, [promoCode, cleanType]);

  async function onScheduleClick(e) {
    e.preventDefault();
    const base = result.calendlyUrl || CONTACT.bookingUrl;
    const url = buildCalendlyUrlWithUtm(
      base,
      result,
      {
        applied: promoValid,
        code: promoCode.trim().toUpperCase(),
        amount: promoValid ? 50 : 0,
      },
    );
    setCalendlyUrl(url);
    setShowCalendly(true);
  }

  // -----------------------------
  // Calculation
  // -----------------------------
  const result = useMemo(() => {
    const safeSqftInput = Math.max(0, Number.isFinite(sqft) ? sqft : 0);

    // Heuristic sqft from rooms
    const estSqft =
      CFG.roomsToSqft.base +
      bedrooms * CFG.roomsToSqft.perBedroom +
      bathrooms * CFG.roomsToSqft.perBathroom;

    // Use the higher of entered vs estimated
    const usedSqft = Math.max(safeSqftInput, estSqft);

    // Clean type multiplier (deep/move-out take more time)
    const cleanMult = CLEAN_TYPE_MULTIPLIER[cleanType] ?? 1.0;

    // --- Time range for ONE cleaner (person-hours) based on productivity band ---
    // Lower hours (faster pace) uses MAX_SQFT_PER_HOUR
    let hoursLowOneCleanerRaw = (usedSqft / MAX_SQFT_PER_HOUR) * cleanMult;
    // Higher hours (slower pace) uses MIN_SQFT_PER_HOUR
    let hoursHighOneCleanerRaw = (usedSqft / MIN_SQFT_PER_HOUR) * cleanMult;

    // Enforce a minimum visit length for very small spaces
    if (hoursHighOneCleanerRaw < MIN_VISIT_HOURS_ONE_CLEANER) {
      hoursHighOneCleanerRaw = MIN_VISIT_HOURS_ONE_CLEANER;
    }
    if (hoursLowOneCleanerRaw < MIN_VISIT_HOURS_ONE_CLEANER) {
      hoursLowOneCleanerRaw = MIN_VISIT_HOURS_ONE_CLEANER;
    }
    if (hoursLowOneCleanerRaw > hoursHighOneCleanerRaw) {
      hoursLowOneCleanerRaw = hoursHighOneCleanerRaw;
    }

    // Decide team size based on the HIGH end for 1 cleaner
    const cleaners = hoursHighOneCleanerRaw > 8 ? 2 : 1;

    // On-site time per cleaner (divide total person-hours by cleaners)
    const onSiteRangeLowRaw = hoursLowOneCleanerRaw / cleaners;
    const onSiteRangeHighRaw = hoursHighOneCleanerRaw / cleaners;

    const onSiteRangeLow = roundTo(onSiteRangeLowRaw, 0.5);
    const onSiteRangeHigh = roundTo(onSiteRangeHighRaw, 0.5);

    const sameRange = Math.abs(onSiteRangeHigh - onSiteRangeLow) < 0.26; // ~quarter hour
    const timeDisplayText = sameRange
      ? `~${trimHours(onSiteRangeHigh)} ${hoursUnit(onSiteRangeHigh)}`
      : `${trimHours(onSiteRangeLow)}–${trimHours(onSiteRangeHigh)} ${hoursUnit(
        onSiteRangeHigh
      )}`;

    // …then derive total billable hours from on-site time × cleaners
    const billableHoursLow = onSiteRangeLow * cleaners;
    const billableHoursHigh = onSiteRangeHigh * cleaners;

    // Labor pricing LOW
    const baseLaborLowRaw = billableHoursLow * HOURLY_RATE;
    const disc = CFG.frequencyDiscount[frequency] || 0;
    const freqDiscountLowRaw = baseLaborLowRaw * disc;
    const subtotalLowAfterFreq = baseLaborLowRaw - freqDiscountLowRaw;

    // Labor pricing HIGH
    const baseLaborHighRaw = billableHoursHigh * HOURLY_RATE;
    const freqDiscountHighRaw = baseLaborHighRaw * disc;
    const subtotalHighAfterFreq = baseLaborHighRaw - freqDiscountHighRaw;

    // Eco upcharge
    const ecoMultiplier = ecoProducts ? ECO_MULTIPLIER : 1;

    const totalBeforePromoLowRaw = subtotalLowAfterFreq * ecoMultiplier;
    const ecoUpchargeLowRaw = totalBeforePromoLowRaw - subtotalLowAfterFreq;

    const totalBeforePromoHighRaw = subtotalHighAfterFreq * ecoMultiplier;
    const ecoUpchargeHighRaw = totalBeforePromoHighRaw - subtotalHighAfterFreq;

    // Promo (client-side): $50 off Deep Clean only
    const promoDiscountLow = promoValid ? 50 : 0;
    const promoDiscountHigh = promoValid ? 50 : 0;

    const totalAfterPromoLow = clampCurrency(totalBeforePromoLowRaw - promoDiscountLow);
    const totalAfterPromoHigh = clampCurrency(totalBeforePromoHighRaw - promoDiscountHigh);

    // Booking / Calendly window: use upper end of on-site time per cleaner
    const minReservedHoursPerCleaner = Math.ceil(onSiteRangeHigh);
    const slot = pickCalendlySlotAtLeast(minReservedHoursPerCleaner);
    const reservedWindowHours = slot.hours;
    const bookingFeeRaw = getDepositByOnSiteHours(reservedWindowHours);

    return {
      bedrooms,
      bathrooms,
      sqftInput: safeSqftInput,
      estSqft: Math.round(estSqft),
      usedSqft: Math.round(usedSqft),

      hourlyRate: HOURLY_RATE,
      billableHoursLow,
      billableHours: billableHoursHigh, // high end
      billableHoursHigh, // high end

      // Use HIGH-end values in the detailed breakdown (most conservative)
      baseLabor: clampCurrency(baseLaborHighRaw),
      freqDiscount: clampCurrency(freqDiscountHighRaw),
      ecoUpcharge: clampCurrency(ecoUpchargeHighRaw),
      total: clampCurrency(totalBeforePromoHighRaw),

      promoDiscount: clampCurrency(promoDiscountHigh),

      // Range totals for display
      totalAfterPromoLow,
      totalAfterPromoHigh, // keep name for compatibility

      bookingFee: clampCurrency(bookingFeeRaw),
      reservedWindowHours,
      calendlyUrl: slot?.url || CONTACT.bookingUrl,

      time: {
        cleaners,
        onSiteRangeLow,
        onSiteRangeHigh,
        displayText: timeDisplayText,
      },

      cleanType,
      ecoProducts,
      frequency,
    };
  }, [bedrooms, bathrooms, sqft, cleanType, frequency, ecoProducts, promoValid]);

  return (
    <div
      id="quote-calculator"
      className="mx-auto max-w-4xl rounded-3xl border border-amber-200 bg-white p-6 shadow-sm md:p-8 pt-14"
    >
      <h2 className="font-serif text-2xl md:text-3xl">{title}</h2>
      <p className="mt-1 text-stone-600">{subtitle}</p>

      {/* Inputs */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <label className="font-medium text-stone-800">Bedrooms & Bathrooms</label>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <NumberField
              label="Bedrooms"
              value={bedrooms}
              setValue={setBedrooms}
              min={0}
            />
            <NumberField
              label="Bathrooms"
              value={bathrooms}
              setValue={setBathrooms}
              min={1}
            />
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Select how many bedrooms and bathrooms you’d like us to care for.
            Our system estimates total square footage from your selection so your
            quote reflects the right amount of time and attention.
          </p>
        </div>

        <div className="rounded-2xl border p-4">
          <label className="font-medium text-stone-800">Square Feet</label>
          <div className="mt-4">
            <NumberField
              label="Total Sq Ft"
              value={sqft}
              setValue={setSqft}
              min={0}
              step={50}
            />
            <p className="mt-1 text-xs text-stone-500">
              We estimate hours from your home size and clean type, then multiply by{" "}
              <span className="font-medium">${HOURLY_RATE}/hour</span>.
            </p>
            {result.sqftInput.toLocaleString() !==
              result.estSqft.toLocaleString() && (
                <p className="mt-1 text-xs text-stone-500">
                  Using{" "}
                  <span className="font-medium">
                    {result.usedSqft.toLocaleString()} sq ft
                  </span>{" "}
                  (higher of entered {result.sqftInput.toLocaleString()} and estimated{" "}
                  {result.estSqft.toLocaleString()} based on Bedrooms & Bathrooms).
                </p>
              )}
          </div>
        </div>
      </div>

      {/* Clean Type, Frequency, Eco, & Promo */}
      <div className="mt-6 rounded-2xl border p-4 relative">
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          {/* Clean Type */}
          <div className="relative group">
            <label className="text-stone-700 flex items-center gap-2">
              Clean Type
              <button
                type="button"
                aria-label="More info about clean types"
                onClick={() => setIsLevelTipOpen((s) => !s)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 text-stone-700 text-xs hover:bg-stone-300 md:pointer-events-none md:cursor-default"
              >
                ?
              </button>
              <div className="pointer-events-none absolute left-1/2 top-full z-10 hidden -translate-x-1/2 md:block">
                <div className="mt-1 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg bg-stone-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                  View the “Services” section below for details on what each clean
                  type includes.
                </div>
              </div>
            </label>

            <SelectField
              value={cleanType}
              setValue={setCleanType}
              options={[
                { value: "standard", label: "Standard Clean" },
                { value: "deep", label: "Deep Clean" },
                { value: "move_out", label: "Move-In / Move-Out" },
              ]}
            />
            {isLevelTipOpen && (
              <div className="md:hidden fixed inset-x-4 bottom-4 z-50">
                <div className="rounded-xl bg-stone-900 px-4 py-3 text-xs text-white shadow-2xl">
                  <div className="flex items-start justify-between gap-3">
                    <p className="pr-2">
                      View the <span className="italic">Services</span> section below
                      for details on what each clean type includes.
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

          {/* Frequency */}
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

          {/* Eco Products */}
          <div>
            <label className="block text-stone-700">Products</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="eco-products"
                type="checkbox"
                checked={ecoProducts}
                onChange={(e) => setEcoProducts(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-400"
              />
              <label
                htmlFor="eco-products"
                className="text-sm text-stone-700 cursor-pointer"
              >
                Use eco-friendly products (+15%)
              </label>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">
              Eco is our Golden Hour standard. Uncheck if you prefer conventional supplies.
            </p>
          </div>

          {/* Promo Code */}
          <div>
            <label className="block text-stone-700">Promo code</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Enter code"
                className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
                inputMode="text"
                autoCapitalize="characters"
              />
            </div>
            {promoError && (
              <p className="mt-1 text-xs text-red-600">{promoError}</p>
            )}
            {promoValid && !promoError && (
              <p className="mt-1 text-xs text-green-700">Code applied: −$50</p>
            )}
            <p className="mt-1 text-[11px] text-stone-500">
              Applies to Deep Clean only. Discount reduces the estimated total;
              booking deposit unchanged.
            </p>
          </div>
        </div>

        <p className="mt-2 text-xs text-stone-500">
          We’ll estimate the time your home needs and quote at{" "}
          <span className="font-medium">${HOURLY_RATE}/hour</span>, plus a 15% eco
          upcharge when selected.
        </p>
      </div>

      {/* Summary */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {/* Breakdown */}
        <div className="rounded-2xl border p-4">
          <label className="font-medium text-stone-800">Breakdown</label>
          <ul className="mt-3 space-y-1 text-sm text-stone-700">
            <li className="flex justify-between">
              <span>
                Estimated labor (upper range):{" "}
                {result.billableHours.toFixed(1)} hours × ${HOURLY_RATE}/hr
              </span>
              <span className="tabular-nums">
                ${result.baseLabor.toLocaleString()}
              </span>
            </li>

            {result.freqDiscount > 0 && (
              <li className="flex justify-between">
                <span>Frequency discount</span>
                <span className="tabular-nums">
                  −${result.freqDiscount.toLocaleString()}
                </span>
              </li>
            )}

            {result.ecoUpcharge > 0 && (
              <li className="flex justify-between">
                <span>Eco-friendly products (+15%)</span>
                <span className="tabular-nums">
                  {formatSigned(result.ecoUpcharge)}
                </span>
              </li>
            )}

            {promoValid && (
              <li className="flex justify-between text-emerald-800">
                <span>Promo (GOLDENWELCOME)</span>
                <span className="tabular-nums">
                  −${result.promoDiscount.toLocaleString()}
                </span>
              </li>
            )}
          </ul>
        </div>

        {/* Total & Time */}
        <div className="rounded-2xl border p-4 bg-amber-50/60">
          <label className="font-medium text-stone-800">Your quote</label>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-3xl md:text-4xl font-semibold tabular-nums">
                {formatCurrency(result.totalAfterPromoLow)} –{" "}
                {formatCurrency(result.totalAfterPromoHigh)}
              </div>
              <div className="text-xs text-stone-600">
                Estimated range based on{" "}
                {result.billableHoursLow.toFixed(1)}–{" "}
                {result.billableHours.toFixed(1)}{" "}
                {hoursUnit(result.billableHours)} of cleaning time.
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-stone-700">
                Booking deposit <small>(applied to your final total)</small>
              </div>
              <div className="text-lg font-medium tabular-nums">
                {formatCurrency(result.bookingFee)}
              </div>
            </div>
          </div>

          {/* Time estimate + reserved window */}
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
            <div className="text-sm text-stone-800">
              Estimated time on site:{" "}
              <span className="font-medium tabular-nums">
                {result.time.displayText}
              </span>{" "}
              with{" "}
              <span className="font-medium">
                {result.time.cleaners}{" "}
                {result.time.cleaners === 1 ? "cleaner" : "cleaners"}
              </span>
              .
            </div>
            <div className="mt-1 text-xs text-stone-600">
              We’ll reserve an{" "}
              <span className="font-medium">
                {result.reservedWindowHours}{" "}
                {hoursUnit(result.reservedWindowHours)}
              </span>{" "}
              arrival window to ensure enough time.
            </div>
            <div className="mt-1 text-xs text-stone-600">
              Larger jobs may be completed with two cleaners so your visit finishes
              sooner — your price is based on total cleaning hours, not how many people are
              on-site.
            </div>
          </div>

          {/* Dual CTA */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onScheduleClick}
              className="inline-flex w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-3 text-white hover:bg-stone-800"
              aria-label="Book online now"
            >
              Schedule & Pay Deposit
            </button>

            <ContactSheet
              phone={CONTACT.phone}
              sms={CONTACT.sms}
              email={CONTACT.email}
              context={{
                level: cleanType,
                sqft: result.usedSqft,
                sqftInput: result.sqftInput,
                bedrooms,
                bathrooms,
                total: result.totalAfterPromo, // upper end
                totalLow: result.totalAfterPromoLow,
                frequency,
                ecoProducts,
                cleaners: result.time.cleaners,
                billableHoursLow: result.billableHoursLow,
                billableHours: result.billableHours,
                hourlyRate: result.hourlyRate,
                promo: promoValid
                  ? {
                    code: promoCode.trim().toUpperCase(),
                    amount: result.promoDiscount,
                  }
                  : null,
              }}
            />
          </div>

          <p className="mt-2 text-xs text-stone-600">
            Final price is confirmed after a quick in-person walkthrough. Booking deposit is
            fully applied to your total and refundable up to 24 hours before your
            appointment.
          </p>
        </div>
      </div>

      {/* Calendly modal */}
      <CalendlyBooking
        url={calendlyUrl}
        isOpen={showCalendly}
        setOpen={setShowCalendly}
      />
    </div>
  );
}
