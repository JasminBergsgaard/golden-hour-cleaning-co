export function buildCalendlyUrlWithUtm(baseUrl, result, level, frequency, bedrooms, bathrooms, promo) {
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
      `sfEntered=${result.sqftInput}`,
      `sfUsed=${result.usedSqft}`,
      `freq=${frequency}`,
      `promo=${promo.applied ? promo.code : "none"}`,
      `promoAmt=${promo.applied ? promo.amount : 0}`,
      `tot=${result.totalAfterPromo}`,
      `ts=${ts}`,
    ].join("_"),
  });

  return `${baseUrl}?${utm.toString()}`;
}