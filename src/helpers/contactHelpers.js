export function formatCurrency(n) {
  return `$${(Math.max(0, Math.round(n))).toLocaleString()}`;
}

export function buildSmsLink({ phone, message }) {
  // iOS/Android compatible scheme
  const body = encodeURIComponent(message);
  return `sms:${phone}?&body=${body}`;
}

export function buildMailto({ email, subject, body }) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function formatPhone(e164) {
  const m = (e164 || "").replace(/[^\d]/g, "").match(/^1?(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
