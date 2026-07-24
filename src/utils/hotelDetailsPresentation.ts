export type HotelAmenityCategoryId =
  | "essentials"
  | "room-comfort"
  | "food-drink"
  | "wellness"
  | "family-accessibility"
  | "transport-parking"
  | "activities-entertainment"
  | "property-services"
  | "other";

export interface HotelAmenityGroup {
  id: HotelAmenityCategoryId;
  title: string;
  items: string[];
}

export interface HotelAmenityPresentation {
  highlights: string[];
  groups: HotelAmenityGroup[];
  totalCount: number;
}

export interface HotelDescriptionPresentation {
  overview: string | null;
  highlights: string[];
}

type AmenityDefinition = {
  id: string;
  label: string;
  category: HotelAmenityCategoryId;
  priority: number;
  patterns: RegExp[];
};

type NormalizedAmenity = {
  id: string;
  label: string;
  category: HotelAmenityCategoryId;
  priority: number;
};

const CATEGORY_ORDER: readonly HotelAmenityCategoryId[] = [
  "essentials",
  "room-comfort",
  "food-drink",
  "wellness",
  "family-accessibility",
  "transport-parking",
  "activities-entertainment",
  "property-services",
  "other",
];

const CATEGORY_TITLES: Record<HotelAmenityCategoryId, string> = {
  essentials: "Essentials",
  "room-comfort": "Room and comfort",
  "food-drink": "Food and drink",
  wellness: "Wellness",
  "family-accessibility": "Families and accessibility",
  "transport-parking": "Transport and parking",
  "activities-entertainment": "Activities and entertainment",
  "property-services": "Property services",
  other: "Other services",
};

const DEFINITIONS: readonly AmenityDefinition[] = [
  { id: "wifi", label: "Free Wi-Fi", category: "essentials", priority: 1, patterns: [/\b(?:free\s+)?wi[\s-]?fi\b/i, /\bwireless internet\b/i, /\binternet access\b/i] },
  { id: "air-conditioning", label: "Air conditioning", category: "essentials", priority: 2, patterns: [/\bair conditioning\b/i, /\bair-conditioned\b/i] },
  { id: "private-bathroom", label: "Private bathroom", category: "essentials", priority: 3, patterns: [/\bprivate bathroom\b/i, /\ben ?suite\b/i] },
  { id: "heating", label: "Heating", category: "essentials", priority: 4, patterns: [/\bheating\b/i] },
  { id: "non-smoking", label: "Non-smoking rooms", category: "essentials", priority: 5, patterns: [/\bnon[-\s]?smoking\b/i, /\bsmoke[-\s]?free\b/i] },
  { id: "soundproofing", label: "Soundproof rooms", category: "room-comfort", priority: 10, patterns: [/\bsoundproof/i] },
  { id: "balcony", label: "Balcony", category: "room-comfort", priority: 11, patterns: [/\bbalcony\b/i] },
  { id: "terrace", label: "Terrace", category: "room-comfort", priority: 12, patterns: [/\bterrace\b/i] },
  { id: "room-service", label: "Room service", category: "room-comfort", priority: 13, patterns: [/\broom service\b/i] },
  { id: "restaurant", label: "Restaurant", category: "food-drink", priority: 20, patterns: [/\brestaurant\b/i] },
  { id: "breakfast", label: "Breakfast", category: "food-drink", priority: 21, patterns: [/\bbreakfast\b/i] },
  { id: "bar", label: "Bar", category: "food-drink", priority: 22, patterns: [/\bbar\b/i] },
  { id: "kitchen", label: "Kitchen facilities", category: "food-drink", priority: 23, patterns: [/\bkitchen(?:ette)?\b/i, /\bcooking facilities\b/i] },
  { id: "swimming-pool", label: "Swimming pool", category: "wellness", priority: 30, patterns: [/\bswimming pool\b/i, /\bindoor pool\b/i, /\boutdoor pool\b/i, /\brooftop pool\b/i] },
  { id: "fitness", label: "Fitness centre", category: "wellness", priority: 31, patterns: [/\bfitness cent(?:er|re)\b/i, /\bgym\b/i] },
  { id: "spa", label: "Spa", category: "wellness", priority: 32, patterns: [/\bspa\b/i, /\bwellness cent(?:er|re)\b/i] },
  { id: "sauna", label: "Sauna", category: "wellness", priority: 33, patterns: [/\bsauna\b/i] },
  { id: "family-rooms", label: "Family rooms", category: "family-accessibility", priority: 40, patterns: [/\bfamily rooms?\b/i] },
  { id: "lift", label: "Lift", category: "family-accessibility", priority: 41, patterns: [/\blift\b/i, /\belevator\b/i] },
  { id: "accessible", label: "Accessibility features", category: "family-accessibility", priority: 42, patterns: [/\bwheelchair\b/i, /\baccessible\b/i, /\baccessibility\b/i, /\bdisabled guests?\b/i] },
  { id: "child-friendly", label: "Child-friendly facilities", category: "family-accessibility", priority: 43, patterns: [/\bchildren(?:'s)?\b/i, /\bplayground\b/i, /\bkids?\b/i] },
  { id: "parking", label: "Parking", category: "transport-parking", priority: 50, patterns: [/\bparking\b/i, /\bcar park\b/i] },
  { id: "airport-shuttle", label: "Airport shuttle", category: "transport-parking", priority: 51, patterns: [/\bairport shuttle\b/i, /\bairport transfer\b/i] },
  { id: "shuttle", label: "Shuttle service", category: "transport-parking", priority: 52, patterns: [/\bshuttle service\b/i] },
  { id: "bicycle", label: "Bicycle rental", category: "transport-parking", priority: 53, patterns: [/\bbicycle rental\b/i, /\bbike rental\b/i] },
  { id: "car-rental", label: "Car rental", category: "transport-parking", priority: 54, patterns: [/\bcar rental\b/i, /\bcar hire\b/i] },
  { id: "karaoke", label: "Karaoke", category: "activities-entertainment", priority: 60, patterns: [/\bkaraoke\b/i] },
  { id: "billiards", label: "Billiards", category: "activities-entertainment", priority: 61, patterns: [/\bbilliards?\b/i, /\bpool table\b/i] },
  { id: "games", label: "Games area", category: "activities-entertainment", priority: 62, patterns: [/\bgames? room\b/i, /\bboard games?\b/i, /\bgames? area\b/i] },
  { id: "nightclub", label: "Nightclub", category: "activities-entertainment", priority: 63, patterns: [/\bnight ?club\b/i] },
  { id: "tennis", label: "Tennis", category: "activities-entertainment", priority: 64, patterns: [/\btennis\b/i] },
  { id: "front-desk", label: "24-hour front desk", category: "property-services", priority: 70, patterns: [/\b24[-\s]?hour front desk\b/i, /\b24[-\s]?hour reception\b/i, /\breception open 24\b/i] },
  { id: "luggage-storage", label: "Luggage storage", category: "property-services", priority: 71, patterns: [/\bluggage storage\b/i, /\bbaggage storage\b/i] },
  { id: "laundry", label: "Laundry service", category: "property-services", priority: 72, patterns: [/\blaundry\b/i] },
  { id: "housekeeping", label: "Housekeeping", category: "property-services", priority: 73, patterns: [/\bhousekeeping\b/i, /\bdaily cleaning\b/i] },
  { id: "concierge", label: "Concierge", category: "property-services", priority: 74, patterns: [/\bconcierge\b/i] },
  { id: "business-centre", label: "Business centre", category: "property-services", priority: 75, patterns: [/\bbusiness cent(?:er|re)\b/i, /\bmeeting rooms?\b/i] },
];

const HEADING_PATTERN =
  /^(?:top features?|features?|highlights?|convenient location|location highlights?|amenities?|facilities?)\s*:?\s*$/i;

const PROMOTIONAL_PATTERN =
  /\b(?:ready to experience|book now|unforgettable stay|perfect blend|reserve now|do not miss)\b/i;

const LIST_MARKER_PATTERN =
  /^(?:\?|[•▪◦·*-]|\d+[.)])\s+/;

function normalizeWhitespace(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function normalizeLookup(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanAmenityLabel(value: unknown) {
  if (typeof value !== "string") return "";

  return normalizeWhitespace(
    value
      .replace(LIST_MARKER_PATTERN, "")
      .replace(/[.;:,]+$/g, "")
  );
}

function inferCategory(normalized: string): HotelAmenityCategoryId {
  if (/\b(?:room|bed|bath|balcony|terrace|soundproof|heating|air conditioning)\b/.test(normalized)) return "room-comfort";
  if (/\b(?:restaurant|bar|breakfast|kitchen|food|drink|cafe)\b/.test(normalized)) return "food-drink";
  if (/\b(?:pool|fitness|gym|spa|sauna|massage|wellness)\b/.test(normalized)) return "wellness";
  if (/\b(?:family|children|kids|lift|elevator|wheelchair|accessible)\b/.test(normalized)) return "family-accessibility";
  if (/\b(?:parking|shuttle|airport|transport|bicycle|bike|car rental|car hire)\b/.test(normalized)) return "transport-parking";
  if (/\b(?:karaoke|billiard|games|nightclub|tennis|golf|entertainment)\b/.test(normalized)) return "activities-entertainment";
  if (/\b(?:reception|front desk|luggage|laundry|housekeeping|concierge|business)\b/.test(normalized)) return "property-services";
  return "other";
}

function normalizeAmenity(value: unknown): NormalizedAmenity | null {
  const label = cleanAmenityLabel(value);
  if (!label) return null;

  const definition = DEFINITIONS.find((candidate) =>
    candidate.patterns.some((pattern) => pattern.test(label))
  );

  if (definition) {
    return {
      id: definition.id,
      label: definition.label,
      category: definition.category,
      priority: definition.priority,
    };
  }

  const normalized = normalizeLookup(label);
  if (!normalized) return null;

  return {
    id: `other:${normalized}`,
    label,
    category: inferCategory(normalized),
    priority: 100,
  };
}

function uniqueText(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = normalizeLookup(value);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function buildHotelAmenityPresentation(
  amenities: readonly unknown[] = [],
  facilities: readonly unknown[] = [],
  highlightLimit = 8
): HotelAmenityPresentation {
  const uniqueById = new Map<string, NormalizedAmenity>();

  for (const item of [...amenities, ...facilities]) {
    const normalized = normalizeAmenity(item);
    if (!normalized) continue;

    const existing = uniqueById.get(normalized.id);
    if (!existing || normalized.priority < existing.priority) {
      uniqueById.set(normalized.id, normalized);
    }
  }

  const sortedItems = [...uniqueById.values()].sort(
    (first, second) =>
      first.priority - second.priority ||
      first.label.localeCompare(second.label)
  );

  const groups = CATEGORY_ORDER
    .map((categoryId) => ({
      id: categoryId,
      title: CATEGORY_TITLES[categoryId],
      items: sortedItems
        .filter((item) => item.category === categoryId)
        .map((item) => item.label),
    }))
    .filter((group) => group.items.length > 0);

  return {
    highlights: sortedItems
      .slice(0, Math.max(0, highlightLimit))
      .map((item) => item.label),
    groups,
    totalCount: sortedItems.length,
  };
}

export function presentHotelDescription(
  value: string | null | undefined
): HotelDescriptionPresentation {
  if (typeof value !== "string" || !value.trim()) {
    return { overview: null, highlights: [] };
  }

  const normalized = value
    .replace(/\r\n?/g, "\n")
    .replace(/(^|\n)\s*\?\s+/g, "$1- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const overviewLines: string[] = [];
  const highlightLines: string[] = [];

  for (const rawLine of normalized.split("\n")) {
    const line = normalizeWhitespace(rawLine);

    if (
      !line ||
      HEADING_PATTERN.test(line) ||
      PROMOTIONAL_PATTERN.test(line)
    ) {
      continue;
    }

    if (LIST_MARKER_PATTERN.test(line)) {
      const item = normalizeWhitespace(
        line.replace(LIST_MARKER_PATTERN, "")
      );

      if (item && !PROMOTIONAL_PATTERN.test(item)) {
        highlightLines.push(item);
      }

      continue;
    }

    overviewLines.push(line);
  }

  return {
    overview: uniqueText(overviewLines).join(" ") || null,
    highlights: uniqueText(highlightLines).slice(0, 8),
  };
}
