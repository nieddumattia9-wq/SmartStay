const { createHash } = require("node:crypto");

// Canonicalization chooses a deterministic display representative, not merit.
// Exact values/opaque identifiers stay in the retained offer observations.
function observationKey(value) {
  if (Array.isArray(value)) return JSON.stringify(value.map(item => JSON.parse(observationKey(item))));
  if (value && typeof value === "object") {
    return JSON.stringify(Object.fromEntries(Object.keys(value).sort()
      .filter(key => value[key] !== undefined)
      .map(key => [key, JSON.parse(observationKey(value[key]))])));
  }
  return JSON.stringify(value ?? null);
}

function offerFingerprint(offer) {
  return createHash("sha256").update(observationKey(offer)).digest("hex");
}

function mergeOffers(first = [], second = []) {
  // Only equivalent JSON observations may collapse. Incomplete or disagreeing
  // variants must not be discarded by a completeness score.
  return [...new Map([...first, ...second].map(offer => [observationKey(offer), offer]))]
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, offer]) => offer);
}

function normalizeCurrency(value) {
  const currency = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function positiveAmount(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function selectCommercialSummary(offers, { searchCurrency } = {}) {
  const currency = normalizeCurrency(searchCurrency);
  const comparable = currency ? offers.filter(offer => offer &&
    normalizeCurrency(offer.currency) === currency && positiveAmount(offer.price) !== null) : [];
  const cost = offer => positiveAmount(offer.totalKnownCost) ?? positiveAmount(offer.price);
  const sorted = [...comparable].sort((a, b) => cost(a) - cost(b) ||
    positiveAmount(a.price) - positiveAmount(b.price) ||
    (observationKey(a) < observationKey(b) ? -1 : observationKey(a) > observationKey(b) ? 1 : 0));
  const offer = sorted[0] ?? null;
  const status = !currency
    ? (searchCurrency === undefined || searchCurrency === null || searchCurrency === ""
      ? "SEARCH_CURRENCY_MISSING" : "SEARCH_CURRENCY_INVALID")
    : offer ? "SELECTED" : "NO_COMPARABLE_OFFER";
  return {
    offer,
    summary: {
      version: "search-currency-summary@1", status, searchCurrency: currency,
      offerCount: offers.length, comparableOfferCount: comparable.length,
      selectedOfferId: offer?.id ?? null,
      selectedOfferFingerprint: offer ? offerFingerprint(offer) : null,
      // Known cost is not certified complete cost, availability, or a role.
      selectionBasis: offer ? "KNOWN_COST_THEN_PRICE_IN_SEARCH_CURRENCY" : null,
    },
  };
}

module.exports = { mergeOffers, normalizeCurrency, offerFingerprint, selectCommercialSummary };
