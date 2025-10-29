import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../helpers/contactHelpers";
import CalendlyBooking from "./CalendlyBooking";
import ContactSheet from "./ContactSheet";
import SelectField from "./Fields/SelectField";
import NumberField from "./Fields/NumberField";
import { CFG, CONTACT, LEVEL_COPY } from '../constants';
import { buildCalendlyUrlWithUtm } from "../helpers/calendlyHelpers";


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
 *  Rule for reserved window:
 * - Must be >= the high end of the estimate (rounded up to whole hours).
 * - Must be <= (high end + 1 hour).
 * - Choose the smallest Calendly slot inside that range.
 *
 * Inputs:
 * - Bedrooms, Bathrooms, and Square Feet
 * - Uses the HIGHER of (entered sqft, estimated sqft from beds/baths)
 *
 * Promo:
 * - GOLDENWELCOME = $50 off Deep Clean only; applied to estimated total (not deposit)
 */

export default function QuoteCalculator({ showCalendly, setShowCalendly }) {
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [sqft, setSqft] = useState(1200);
  const [level, setLevel] = useState("deep"); // "standard" | "deep" | "move_out"
  const [frequency, setFrequency] = useState("one_time"); // "weekly" | "bi_weekly" | "monthly" | "one_time"
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
      if (lv && ["standard", "deep", "move_out"].includes(lv)) setLevel(lv);
    } catch { }
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
    if (rule.level && rule.level !== level) {
      setPromoValid(false);
      setPromoError("This code only applies to a Deep Clean.");
      return;
    }

    setPromoValid(true);
    setPromoError(null);
  }, [promoCode, level]);

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
    return Math.abs(h - 1) < 1e-9 ? "hour" : "hours";
  }
  function getDepositByHours(hours) {
    return clampCurrency(CFG.bookingDepositByHours[hours] ?? CFG.bookingDepositByHours[3]);
  }
  function pickCalendlySlotByHours(hours) {
    const slot = [...CFG.bookingSlots].sort((a, b) => a.hours - b.hours).find(s => s.hours === hours);
    return slot || CFG.bookingSlots[1];
  }
  function nextSlotAtLeast(minHours) {
    const sorted = [...CFG.bookingSlots].sort((a, b) => a.hours - b.hours);
    const found = sorted.find(s => s.hours >= minHours);
    return found ? found.hours : sorted[sorted.length - 1].hours;
  }
  function getMaxSqftForOneCleaner(levelKey) {
    const mult = CFG.levelMultiplier[levelKey] ?? 1.0;
    const { sqftPerHourDeep, maxHoursPerVisit } = CFG.labor;
    return Math.floor((sqftPerHourDeep * maxHoursPerVisit) / Math.max(0.0001, mult));
  }

  async function onScheduleClick(e) {
    e.preventDefault();
    const base = result.calendlyUrl || CONTACT.bookingUrl;
    const url = buildCalendlyUrlWithUtm(
      base,
      result,
      level,
      frequency,
      bedrooms,
      bathrooms,
      { applied: promoValid, code: promoCode.trim().toUpperCase(), amount: promoValid ? 50 : 0 }
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

    // Rates
    const mult = CFG.levelMultiplier[level] ?? 1.0;
    const standardRate = CFG.deepRate * (CFG.levelMultiplier.standard ?? 0.75);
    const baseStandardRaw = usedSqft * standardRate;

    const leveledRaw = usedSqft * (CFG.deepRate * mult);
    const disc = CFG.frequencyDiscount[frequency] || 0;
    const discountAmountRaw = leveledRaw * disc;
    const totalRaw = leveledRaw - discountAmountRaw;
    const levelAdjustmentRaw = leveledRaw - baseStandardRaw;

    // Time estimate (1 cleaner)
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

    // Reservation sizing (strict >= high, <= high+1)
    const estHighRaw = baseOnSite * (1 + variability);   // true high (unrounded)
    const minWhole = Math.ceil(estHighRaw);              // at least this many whole hours
    const capLimit = estHighRaw + 1;                     // at most this many hours

    const sortedSlots = [...CFG.bookingSlots].sort((a, b) => a.hours - b.hours);
    const slotsInRange = sortedSlots.filter(s => s.hours >= minWhole && s.hours <= capLimit);

    let finalReservedHours;
    if (slotsInRange.length) {
      finalReservedHours = slotsInRange[0].hours;        // smallest that fits the range
    } else {
      // If no exact slot fits (should be rare with 8h available), fall back to next >= minWhole
      finalReservedHours = nextSlotAtLeast(minWhole);
    }

    const bookingFeeRaw = getDepositByHours(finalReservedHours);
    const slot = pickCalendlySlotByHours(finalReservedHours);

    const maxSqftOneCleaner = getMaxSqftForOneCleaner(level);
    const exceedsCap = usedSqft > maxSqftOneCleaner;

    const sameRange = Math.abs(rangeHigh - rangeLow) < 1e-9;
    const timeDisplayText = sameRange
      ? `~${trimHours(mid)} ${hoursUnit(mid)}`
      : `${trimHours(rangeLow)}–${trimHours(rangeHigh)} ${hoursUnit(rangeHigh)}`;

    // Promo (client-side): $50 off Deep Clean only
    const promoDiscount = promoValid ? 50 : 0;
    const totalAfterPromo = clampCurrency(totalRaw - promoDiscount);

    return {
      bedrooms,
      bathrooms,
      sqftInput: safeSqftInput,
      estSqft: Math.round(estSqft),
      usedSqft: Math.round(usedSqft),

      deepRate: CFG.deepRate,
      standardRate,
      effectiveRateForLevel: CFG.deepRate * mult,

      base: clampCurrency(baseStandardRaw),
      levelAdj: clampCurrency(levelAdjustmentRaw),
      freqDiscount: clampCurrency(discountAmountRaw),
      total: clampCurrency(totalRaw),

      promoDiscount: clampCurrency(promoDiscount),
      totalAfterPromo,

      bookingFee: clampCurrency(bookingFeeRaw),
      reservedWindowHours: finalReservedHours,
      calendlyUrl: slot?.url || CONTACT.bookingUrl,

      time: {
        teamSize: teamSizeDefault,
        personHours: Math.max(personHoursRaw, minOnSiteHours * teamSizeDefault),
        onSiteHours: mid,
        onSiteRangeLow: rangeLow,
        onSiteRangeHigh: rangeHigh,
        displayText: timeDisplayText,
      },

      maxSqftOneCleaner,
      exceedsCap,
    };
  }, [bedrooms, bathrooms, sqft, level, frequency, promoValid]);

  return (
    <div className='pt-10'>
      <div
        id="quote"
        className="mx-auto max-w-4xl rounded-3xl border border-amber-200 bg-white p-6 shadow-sm md:p-8 pt-14"
      >
        <h2 className="font-serif text-2xl md:text-3xl">Get a Quote</h2>
        <p className="mt-1 text-stone-600">
          Transparent pricing with eco-friendly supplies and gentle care.
        </p>

        {/* Inputs */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border p-4">
            <label className="font-medium text-stone-800">Bedrooms & Bathrooms</label>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <NumberField label="Bedrooms" value={bedrooms} setValue={setBedrooms} min={0} />
              <NumberField label="Bathrooms" value={bathrooms} setValue={setBathrooms} min={1} />
            </div>
            <p className="mt-2 text-xs text-stone-500">
              Select how many bedrooms and bathrooms you’d like us to care for.
              Our system estimates total square footage from your selection so your quote reflects the right amount of time and attention.
            </p>
          </div>

          <div className="rounded-2xl border p-4">
            <label className="font-medium text-stone-800">Square Feet</label>
            <div className="mt-4">
              <NumberField label="Total Sq Ft" value={sqft} setValue={setSqft} min={0} step={50} />
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

        {/* Level, Frequency & Promo */}
        <div className="mt-6 rounded-2xl border p-4 relative">
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
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
              {promoError && <p className="mt-1 text-xs text-red-600">{promoError}</p>}
              {promoValid && !promoError && (
                <p className="mt-1 text-xs text-green-700">Code applied: −$50</p>
              )}
              <p className="mt-1 text-[11px] text-stone-500">
                Applies to Deep Clean only. Discount reduces the estimated total; booking deposit unchanged.
              </p>
            </div>
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
              {promoValid && (
                <li className="flex justify-between text-emerald-800">
                  <span>Promo (GOLDENWELCOME)</span>
                  <span className="tabular-nums">−${result.promoDiscount}</span>
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border p-4 bg-amber-50/60">
            <label className="font-medium text-stone-800">Your quote</label>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-4xl font-semibold tabular-nums">{formatCurrency(result.totalAfterPromo)}</div>
                <div className="text-xs text-stone-600">Estimated total</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-stone-700">Booking deposit (based on size chart & time estimate)</div>
                <div className="text-lg font-medium tabular-nums">{formatCurrency(result.bookingFee)}</div>
              </div>
            </div>

            {/* Time estimate + reserved window */}
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
                    We’ll reserve an{" "}
                    <span className="font-medium">
                      {result.reservedWindowHours} {hoursUnit(result.reservedWindowHours)}
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

            {/* Dual CTA */}
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
                <button
                  type="button"
                  onClick={onScheduleClick}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-3 text-white hover:bg-stone-800"
                  aria-label="Book online now"
                >
                  Schedule & Pay Deposit
                </button>
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
                  total: result.totalAfterPromo, // include promo
                  frequency,
                  promo: promoValid ? { code: promoCode.trim().toUpperCase(), amount: result.promoDiscount } : null,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-stone-600">
              Final price confirmed after a quick walkthrough. Booking deposit fully applied to your total; refundable up to 24 hours before your appointment.
            </p>
          </div>
        </div>

        {/* Calendly modal */}
        <CalendlyBooking url={calendlyUrl} isOpen={showCalendly} setOpen={setShowCalendly} />
      </div>
    </div>
  );
}
