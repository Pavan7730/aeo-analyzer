export function isQuotable(text) {
  const sentences = text.split(".");
  if (sentences.length > 3) return false;

  for (const s of sentences) {
    if (s.trim().split(/\s+/).length > 20) return false;
  }

  if (/\b(today|currently|i |we |our )\b/i.test(text)) return false;

  return true;
}
