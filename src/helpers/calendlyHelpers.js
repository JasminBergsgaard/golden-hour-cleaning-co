export function buildCalendlyUrlWithUtm(baseUrl, result, promo) {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const timestamp = `${mm}-${dd}-${yy}|${hh}:${min}`;

  const utm = new URLSearchParams({
    utm_source: "quote_calculator",
    utm_medium: "website",
    utm_campaign: "cleaning_quote",
    utm_content: [
      `clean_type=${result.cleanType}`,
      `beds=${result.bedrooms}`,
      `baths=${result.bathrooms}`,
      `sf_entered=${result.sqftInput}`,
      `sf_used_for_quote=${result.usedSqft}`,
      `hours_estimated=${result.billableHoursLow}-${result.billableHoursHigh}`,
      `cleaning_frequency=${result.frequency}`,
      `use_eco_products=${result.ecoProducts ? "yes" : "no"}`,
      `promo=${promo.applied ? promo.code : "none"}`,
      `promoAmt=${promo.applied ? promo.amount : 0}`,
      `total_estimated_price_(after_promo)=${result.totalAfterPromoLow}-${result.totalAfterPromoHigh}`,
      `timestamp=${timestamp}`,
    ].join("_"),
  });

  return `${baseUrl}?${utm.toString()}`;
}