export const CFG = {
  deepRate: 0.35, // $/sq ft (anchor)
  levelMultiplier: { standard: 0.75, deep: 1.0, move_out: 1.3 },
  frequencyDiscount: { weekly: 0.18, bi_weekly: 0.12, monthly: 0.05, one_time: 0.0 },
  roomsToSqft: { base: 300, perBedroom: 400, perBathroom: 150 }, // heuristic

  // Calendly booking slots (now includes 8h)
  bookingSlots: [
    { hours: 2, url: "https://calendly.com/golden-hour-cleaning-company/approx-2-hour-cleaning" },
    { hours: 3, url: "https://calendly.com/golden-hour-cleaning-company/approx-3-hour-cleaning" },
    { hours: 4, url: "https://calendly.com/golden-hour-cleaning-company/approx-4-hour-cleaning" },
    { hours: 5, url: "https://calendly.com/golden-hour-cleaning-company/approx-5-hour-cleaning" },
    { hours: 6, url: "https://calendly.com/golden-hour-cleaning-company/approx-6-hour-cleaning" },
    { hours: 7, url: "https://calendly.com/golden-hour-cleaning-company/approx-7-hour-cleaning" },
    { hours: 8, url: "https://calendly.com/golden-hour-cleaning-company/approx-8-hour-cleaning" },
  ],

  // Promo config
  promos: {
    GOLDENWELCOME: { amount: 50, level: "deep" },
  },
};

export const LEVEL_COPY = {
  standard: { name: "Standard Refresh", rateLabel: "Standard rate" },
  deep: { name: "Deep Glow (Deep Clean)", rateLabel: "Deep Clean rate" },
  move_out: { name: "Move-In / Move-Out", rateLabel: "Move-In/Out rate" },
};

export const CONTACT = {
  bookingUrl: "https://calendly.com/golden-hour-cleaning-company/approx-4-hour-cleaning",
  phone: "+15038934795",
  sms: "+15038934795",
  email: "golden.hour.cleaning.company@gmail.com",
};