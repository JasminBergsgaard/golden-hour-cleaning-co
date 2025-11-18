export function buildCalendlyUrlWithUtm(baseUrl, result, promo) {
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
      `type=${result.cleanType}`,
      `bed=${result.bedrooms}`,
      `ba=${result.bathrooms}`,
      `sf_heur=${result.estSqft}`,
      `sf_ent=${result.sqftInput}`,
      `sf_low=${result.sqftLow}`,
      `sf_high=${result.sqftHigh}`,
      `hours_est=${result.billableHoursLow}-${result.billableHoursHigh}`,
      `freq=${result.frequency}`,
      `use_eco=${result.ecoProducts ? "yes" : "no"}`,
      `add=${[
        result.addonFridge ? "Fr" : "",
        result.addonOven ? "Ov" : "",
        result.addonSecondKitchen ? "2Kit" : "",
      ]
        .filter(Boolean)
        .join("") || "none"}`,
      `promo=${promo.applied ? promo.code : "none"}`,
      `est_after_promo=${result.totalAfterPromoLow}-${result.totalAfterPromoHigh}`,
      `ts=${ts}`,
    ].join("~"),
  });

  return `${baseUrl}?${utm.toString()}`;
}
