// Provider-neutral interpretation of bounded amenity assertions. Unknown prose
// is retained; recognizing a service name alone does not qualify its assertion.
export type AmenityPresence = "present" | "absent" | "unknown" | "conflicting";
export type AmenityCost = "free" | "paid" | "unknown" | "conflicting";
export type AmenityAlias = string | RegExp;
export interface AmenityClaim {
  text: string;
  sourceIndex: number;
  presence: Exclude<AmenityPresence, "conflicting">;
  cost: Exclude<AmenityCost, "conflicting">;
}
export interface AmenityEvidence {
  presence: AmenityPresence;
  cost: AmenityCost;
  claims: AmenityClaim[];
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[-\u2010-\u2015]/g, " ").replace(/\s+/g, " ").trim();
}

function findService(text: string, aliases: readonly AmenityAlias[]) {
  const matches = aliases.map((alias) => {
    const pattern = typeof alias === "string"
      ? new RegExp(`\\b${normalize(alias).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
      : new RegExp(alias.source, alias.flags.replace(/[gy]/g, ""));
    return pattern.exec(text);
  }).filter((match): match is RegExpExecArray => match !== null);
  return matches.sort((a, b) => b[0].length - a[0].length || a.index - b.index)[0] ?? null;
}

function classify(text: string, sourceIndex: number, aliases: readonly AmenityAlias[]): AmenityClaim | null {
  const normalized = normalize(text);
  const match = findService(normalized, aliases);
  if (!match) return null;
  const unknown: AmenityClaim = { text, sourceIndex, presence: "unknown", cost: "unknown" };
  // Replace only the recognized phrase. All other words must satisfy a complete
  // assertion rule; this does not delete unknown modifiers or negative clauses.
  const clause = (normalized.slice(0, match.index) + "@service" + normalized.slice(match.index + match[0].length))
    .replace(/[(),.;:]/g, " ").replace(/\s+/g, " ").trim();
  if (/^(?:(?:no|without|senza) @service(?: available| provided| access)?|@service(?: is| are)? (?:not available|unavailable|not provided|not offered|non disponibile|non disponibili|non presente))$/.test(clause)) {
    return { ...unknown, presence: "absent" };
  }
  if (/^(?:(?:free|complimentary|gratuito|gratuita) @service(?: available| access)?|@service(?: is| are)? (?:free|complimentary|free of charge|gratuito|gratuita))$/.test(clause)) {
    return { ...unknown, presence: "present", cost: "free" };
  }
  if (/^(?:(?:paid) @service|@service(?: is| are)? (?:surcharge|paid|at extra cost|additional charge|a pagamento))$/.test(clause)) {
    return { ...unknown, presence: "present", cost: "paid" };
  }
  if (/^@service(?:(?: is| are)? (?:available|provided|offered|disponibile|disponibili))?$/.test(clause)) {
    return { ...unknown, presence: "present" };
  }
  return unknown;
}

export function qualifyAmenityEvidence(values: readonly unknown[], aliases: readonly AmenityAlias[]): AmenityEvidence {
  const claims = values.flatMap((value, index) => {
    const claim = typeof value === "string" ? classify(value, index, aliases) : null;
    return claim ? [claim] : [];
  });
  const positive = claims.some((claim) => claim.presence === "present");
  const negative = claims.some((claim) => claim.presence === "absent");
  const uncertain = claims.some((claim) => claim.presence === "unknown");
  const costs = new Set(claims.filter((claim) => claim.presence === "present" && claim.cost !== "unknown").map((claim) => claim.cost));
  return {
    presence: positive && negative ? "conflicting" : uncertain ? "unknown" : positive ? "present" : negative ? "absent" : "unknown",
    cost: costs.size > 1 ? "conflicting" : costs.size === 1 ? [...costs][0] : "unknown",
    claims,
  };
}
