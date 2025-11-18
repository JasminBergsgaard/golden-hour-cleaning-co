import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../helpers/contactHelpers";
import CalendlyBooking from "./CalendlyBooking";
import ContactSheet from "./ContactSheet";
import SelectField from "./Fields/SelectField";
import NumberField from "./Fields/NumberField";
import { CFG, CONTACT } from "../constants";
import { buildCalendlyUrlWithUtm } from "../helpers/calendlyHelpers";

/**
 * Golden Hour Cleaning Co. — Quote Calculator (Hybrid Sq Ft + Time)
 *
 * Hybrid model:
 * - We estimate TWO square footages:
 *    1) Heuristic from bedrooms + bathrooms
 *    2) The value you enter in the "Total Sq Ft" field
 * - We use these to create a LOW–HIGH range:
 *    sqftLow  = smaller of (heuristic, entered)
 *    sqftHigh = larger  of (heuristic, entered)
 *    (If no sqft is entered, both = heuristic.)
 *
 * - We then estimate cleaning time from sq ft and clean type
 *   and multiply by an hourly rate behind the scenes to get a
 *   price RANGE. This protects against under-estimating size
 *   while still honoring the customer’s entry.
 *
 * Frequency discounts (applied before eco upcharge):
 * - weekly: 18%
 * - bi-weekly: 12%
 * - monthly: 5%
 * - one-time: 0%
 *
 * Promo:
 * - GOLDENWELCOME = $50 off Deep Clean only; applied to estimated total (not deposit)
 */

const HOURLY_RATE = 75;          // used internally, never shown in UI
const ECO_MULTIPLIER = 1.15;     // 15% upcharge
const SQFT_PER_HOUR_BASE = 290;  // average productivity per cleaner (deep baseline)
const MIN_VISIT_HOURS_ONE_CLEANER = 2;

// Deep is baseline (1.0). Standard is faster; Move-Out is slower.
const CLEAN_TYPE_MULTIPLIER = {
  standard: 0.8,
  deep: 1.0,
  move_out: 1.3,
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
  const [cleanType, setCleanType] = useState("deep");
  const [frequency, setFrequency] = useState("one_time");
  const [ecoProducts, setEcoProducts] = useState(true);
  const [isLevelTipOpen, setIsLevelTipOpen] = useState(false);
  const [calendlyUrl, setCalendlyUrl] = useState(null);

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoValid, setPromoValid] = useState(false);
  const [promoError, setPromoError] = useState(null);

  // Read ?level= from URL and listen for external "setQuoteLevel"
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const lv = url.searchParams.get("level");
      if (lv && ["standard", "deep", "move_out"].includes(lv)) {
        setCleanType(lv);
      }
    } catch {
      // ignore
    }

    function onSetQuoteLevel(e) {
      const next = e?.detail;
      if (
        typeof next === "string" &&
        ["standard", "deep", "move_out"].includes(next)
      ) {
        setCleanType(next);
        setIsLevelTipOpen(false);
        const el = document.getElementById("quote");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    window.addEventListener("setQuoteLevel", onSetQuoteLevel);
    return () =>
      window.removeEventListener("setQuoteLevel", onSetQuoteLevel);
  }, []);

  // Promo validation (client-side UX)
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

  // -----------------------------
  // Calculation
  // -----------------------------
  const result = useMemo(() => {
    const safeSqftInput = Math.max(
      0,
      Number.isFinite(Number(sqft)) ? Number(sqft) : 0
    );

    // Heuristic sqft from rooms
    const estSqft =
      CFG.roomsToSqft.base +
      bedrooms * CFG.roomsToSqft.perBedroom +
      bathrooms * CFG.roomsToSqft.perBathroom;

    // Hybrid range from heuristic + entered
    let sqftLow;
    let sqftHigh;

    if (safeSqftInput <= 0) {
      // No usable entry → both ends are heuristic
      sqftLow = estSqft;
      sqftHigh = estSqft;
    } else {
      sqftLow = Math.min(estSqft, safeSqftInput);
      sqftHigh = Math.max(estSqft, safeSqftInput);
    }

    // Clean type multiplier (deep/move-out take more time)
    const cleanMult = CLEAN_TYPE_MULTIPLIER[cleanType] ?? 1.0;

    // Person-hours for ONE cleaner from sq ft
    const billableHoursLowRaw = Math.max(
      MIN_VISIT_HOURS_ONE_CLEANER,
      (sqftLow * cleanMult) / SQFT_PER_HOUR_BASE
    );
    const billableHoursHighRaw = Math.max(
      MIN_VISIT_HOURS_ONE_CLEANER,
      (sqftHigh * cleanMult) / SQFT_PER_HOUR_BASE
    );

    // Decide team size based on the HIGH end
    const cleaners = billableHoursHighRaw > 8 ? 2 : 1;

    // On-site time per cleaner
    const onSiteRangeLowRaw = billableHoursLowRaw / cleaners;
    const onSiteRangeHighRaw = billableHoursHighRaw / cleaners;

    const onSiteRangeLow = roundTo(onSiteRangeLowRaw, 0.5);
    const onSiteRangeHigh = roundTo(onSiteRangeHighRaw, 0.5);

    const billableHoursLow = onSiteRangeLow * cleaners;
    const billableHoursHigh = onSiteRangeHigh * cleaners;

    const hasTimeRange =
      Math.abs(onSiteRangeHigh - onSiteRangeLow) >= 0.26 ||
      Math.abs(billableHoursHigh - billableHoursLow) >= 0.26;

    const timeDisplayText = !hasTimeRange
      ? `~${trimHours(onSiteRangeHigh)} ${hoursUnit(onSiteRangeHigh)}`
      : `${trimHours(onSiteRangeLow)}–${trimHours(
        onSiteRangeHigh
      )} ${hoursUnit(onSiteRangeHigh)}`;

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

    const totalAfterPromoLow = clampCurrency(
      totalBeforePromoLowRaw - promoDiscountLow
    );
    const totalAfterPromoHigh = clampCurrency(
      totalBeforePromoHighRaw - promoDiscountHigh
    );

    // Booking / Calendly window: use upper end of on-site time per cleaner
    const minReservedHoursPerCleaner = Math.ceil(onSiteRangeHigh);
    const slot = pickCalendlySlotAtLeast(minReservedHoursPerCleaner);
    const reservedWindowHours = slot.hours;
    const bookingFeeRaw = getDepositByOnSiteHours(reservedWindowHours);

    return {
      bedrooms,
      bathrooms,
      sqftInput: Math.round(safeSqftInput),
      estSqft: Math.round(estSqft),
      sqftLow: Math.round(sqftLow),
      sqftHigh: Math.round(sqftHigh),
      // For backwards compatibility: "sq ft used for quote" = high end
      usedSqft: Math.round(sqftHigh),

      hourlyRate: HOURLY_RATE,
      billableHoursLow,
      billableHours: billableHoursHigh, // high end
      billableHoursHigh, // alias

      // Use HIGH-end values in the detailed breakdown (most conservative)
      baseLabor: clampCurrency(baseLaborHighRaw),
      freqDiscount: clampCurrency(freqDiscountHighRaw),
      ecoUpcharge: clampCurrency(ecoUpchargeHighRaw),
      total: clampCurrency(totalBeforePromoHighRaw),

      promoDiscount: clampCurrency(promoDiscountHigh),

      // Range totals for display
      totalAfterPromoLow,
      totalAfterPromoHigh,
      // Compatibility: "totalAfterPromo" = upper end
      totalAfterPromo: totalAfterPromoHigh,

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

  const hasSqftRange = result.sqftLow !== result.sqftHigh;
  const hasHourRange = result.billableHoursLow !== result.billableHours;

  async function onScheduleClick(e) {
    e.preventDefault();
    const base = result.calendlyUrl || CONTACT.bookingUrl;
    const url = buildCalendlyUrlWithUtm(base, result, {
      applied: promoValid,
      code: promoCode.trim().toUpperCase(),
      amount: promoValid ? 50 : 0,
    });
    setCalendlyUrl(url);
    setShowCalendly(true);
  }

  return (
    <div
      id="quote-calculator"
      className="mx-auto max-w-4xl rounded-3xl border border-amber-200 bg-white p-6 shadow-sm md:p-8 pt-14"
    >
      <h2 className="font-serif text-2xl md:text-3xl">{title}</h2>

      {/* Updated copy under header */}
      <p className="mt-1 text-stone-600">
        {subtitle ||
          "Instant, size-based pricing with eco-friendly supplies and gentle care."}
      </p>

      {/* Inputs */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <label className="font-medium text-stone-800">
            Bedrooms &amp; Bathrooms
          </label>
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
            We’ll estimate your home’s size from this so your quote reflects the
            right amount of time and attention.
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
              Enter your best estimate. If it looks different from what we’d
              expect based on bedrooms and bathrooms, we’ll show a price range
              between both.
            </p>

            {result.sqftInput > 0 && result.sqftInput !== result.estSqft && (
              <p className="mt-1 text-xs text-stone-500">
                We’re using{" "}
                <span className="font-medium">
                  {result.estSqft.toLocaleString()} sq ft
                </span>{" "}
                (estimated from bedrooms &amp; bathrooms) and{" "}
                <span className="font-medium">
                  {result.sqftInput.toLocaleString()} sq ft
                </span>{" "}
                (your entry) to create this range, so you’re covered even if the
                exact square footage is a bit off.
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
                  View the “Services” section below for details on what each
                  clean type includes.
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
                      View the <span className="italic">Services</span> section
                      below for details on what each clean type includes.
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
              Eco is our Golden Hour standard. Uncheck if you prefer
              conventional supplies.
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
              <p className="mt-1 text-xs text-green-700">
                Code applied: −$50
              </p>
            )}
            <p className="mt-1 text-[11px] text-stone-500">
              Applies to Deep Clean only. Discount reduces the estimated total;
              booking deposit unchanged.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {/* Breakdown (high-end, simplified, no hourly wording) */}
        <div className="rounded-2xl border p-4">
          <label className="font-medium text-stone-800">Breakdown</label>
          <ul className="mt-3 space-y-1 text-sm text-stone-700">
            {/* Home size used for estimate */}
            <li className="flex justify-between">
              <span>Home size used for estimate</span>
              <span className="tabular-nums">
                {hasSqftRange
                  ? `${result.sqftLow.toLocaleString()}–${result.sqftHigh.toLocaleString()} sq ft`
                  : `${result.sqftHigh.toLocaleString()} sq ft`}
              </span>
            </li>

            {/* Base clean: use upper estimate as conservative anchor */}
            <li className="flex justify-between">
              <span>Base clean (upper estimate)</span>
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
              {/* PRICE: solid vs range */}
              <div className="text-3xl md:text-4xl font-semibold tabular-nums">
                {result.totalAfterPromoLow === result.totalAfterPromoHigh
                  ? formatCurrency(result.totalAfterPromoHigh)
                  : `${formatCurrency(
                    result.totalAfterPromoLow
                  )} – ${formatCurrency(result.totalAfterPromoHigh)}`}
              </div>

              {/* SQFT + HOURS: solid vs range */}
              <div className="text-xs text-stone-600">
                {hasSqftRange || hasHourRange ? "Estimated range " : "Estimated "}
                based on{" "}
                {hasSqftRange ? (
                  <>
                    {result.sqftLow.toLocaleString()}–{" "}
                    {result.sqftHigh.toLocaleString()} sq ft
                  </>
                ) : (
                  <>{result.sqftHigh.toLocaleString()} sq ft</>
                )}{" "}
                and{" "}
                {hasHourRange ? (
                  <>
                    {result.billableHoursLow.toFixed(1)}–{" "}
                    {result.billableHours.toFixed(1)}{" "}
                    {hoursUnit(result.billableHours)}
                  </>
                ) : (
                  <>
                    {result.billableHours.toFixed(1)}{" "}
                    {hoursUnit(result.billableHours)}
                  </>
                )}{" "}
                of cleaning time.
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
              sooner — your price is based on home size, not how many people are
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
              Schedule &amp; Pay Deposit
            </button>

            <ContactSheet
              phone={CONTACT.phone}
              sms={CONTACT.sms}
              email={CONTACT.email}
              context={{
                level: cleanType,
                sqftLow: result.sqftLow,
                sqftHigh: result.sqftHigh,
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
                hourlyRate: result.hourlyRate, // still available if you want it later, but not shown
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
            Final price is confirmed after a quick in-person walkthrough. Booking
            deposit is fully applied to your total and refundable up to 24 hours
            before your appointment.
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
