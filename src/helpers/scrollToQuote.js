export const scrollToQuote = () => {
  const el = document.querySelector("#quote-calculator");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};