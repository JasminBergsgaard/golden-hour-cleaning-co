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
