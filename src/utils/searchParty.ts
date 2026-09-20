/** Search facts, not a provider's child/adult classification or a scoring policy. */
export const SEARCH_PARTY_VERSION = 'stayopti.search-party@1' as const;
export interface SearchPartySource {
  version: typeof SEARCH_PARTY_VERSION;
  childAges: unknown;
  roomAssignments: unknown;
}
export interface PartyCounts { adults: number | null; children: number | null; rooms: number | null }
export type AgeState = 'KNOWN' | 'UNKNOWN' | 'PARTIAL' | 'INVALID';
export interface AgeMeaning { state: AgeState; ages: number[] | null }
export interface SearchPartyMeaning extends PartyCounts {
  version: typeof SEARCH_PARTY_VERSION;
  ageInformation: AgeMeaning;
  assignmentState: 'KNOWN' | 'UNKNOWN' | 'INVALID';
  // Ordinal is the room in the actual request. Never sort/merge rooms.
  assignments: Array<{ ordinal: number; adults: number; children: number; ages: number[] }> | null;
}
const nonnegative = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
export function interpretChildAges(value: unknown, count: number | null): AgeMeaning {
  if (!nonnegative(count)) return { state: 'INVALID', ages: null };
  if (value === null || value === undefined) return count === 0 ? { state: 'KNOWN', ages: [] } : { state: 'UNKNOWN', ages: null };
  if (!Array.isArray(value) || value.length > count || value.some(x => x !== null && !nonnegative(x))) return { state: 'INVALID', ages: null };
  if (value.length < count || value.some(x => x === null)) return { state: 'PARTIAL', ages: null };
  return { state: 'KNOWN', ages: [...value].sort((a, b) => a - b) };
}
export function createSearchPartySource(childAges: unknown, roomAssignments: unknown = null): SearchPartySource {
  return { version: SEARCH_PARTY_VERSION, childAges: structuredClone(childAges ?? null), roomAssignments: structuredClone(roomAssignments ?? null) };
}
export function resolveSearchParty(source: SearchPartySource, counts: PartyCounts): SearchPartyMeaning {
  const result: SearchPartyMeaning = { version: SEARCH_PARTY_VERSION, ...counts,
    ageInformation: interpretChildAges(source?.childAges, counts.children), assignmentState: 'UNKNOWN', assignments: null };
  if (!source || source.version !== SEARCH_PARTY_VERSION || !nonnegative(counts.adults) || counts.adults < 1 || !nonnegative(counts.rooms) || counts.rooms < 1) {
    result.ageInformation = { state: 'INVALID', ages: null }; result.assignmentState = 'INVALID'; return result;
  }
  if (source.roomAssignments === null || source.roomAssignments === undefined) return result;
  if (!Array.isArray(source.roomAssignments) || source.roomAssignments.length !== counts.rooms) { result.assignmentState = 'INVALID'; return result; }
  const assignments: NonNullable<SearchPartyMeaning['assignments']> = [];
  for (const [ordinal, room] of source.roomAssignments.entries()) {
    if (!room || typeof room !== 'object' || !nonnegative(room.adults) || room.adults < 1 || !nonnegative(room.children)) { result.assignmentState = 'INVALID'; return result; }
    const ages = interpretChildAges(room.childAges, room.children);
    if (ages.state !== 'KNOWN') { result.assignmentState = 'INVALID'; return result; }
    assignments.push({ ordinal, adults: room.adults, children: room.children, ages: ages.ages! });
  }
  const totalAges = assignments.flatMap(r => r.ages).sort((a, b) => a - b);
  if (assignments.reduce((n, r) => n + r.adults, 0) !== counts.adults || assignments.reduce((n, r) => n + r.children, 0) !== counts.children || result.ageInformation.state !== 'KNOWN' || JSON.stringify(totalAges) !== JSON.stringify(result.ageInformation.ages)) {
    result.assignmentState = 'INVALID'; return result;
  }
  result.assignmentState = 'KNOWN'; result.assignments = assignments; return result;
}
export function validSearchPartyMeaning(value: SearchPartyMeaning, counts: PartyCounts): boolean {
  if (!value || value.version !== SEARCH_PARTY_VERSION || value.adults !== counts.adults || value.children !== counts.children || value.rooms !== counts.rooms || !value.ageInformation) return false;
  const a = value.ageInformation;
  if (!['KNOWN', 'UNKNOWN', 'PARTIAL', 'INVALID'].includes(a.state) || !['KNOWN', 'UNKNOWN', 'INVALID'].includes(value.assignmentState)) return false;
  if (a.state === 'KNOWN') {
    const checked = interpretChildAges(a.ages, counts.children);
    if (checked.state !== 'KNOWN' || JSON.stringify(checked.ages) !== JSON.stringify(a.ages)) return false;
  } else if (a.ages !== null) return false;
  if (value.assignmentState !== 'KNOWN') return value.assignments === null;
  if (!Array.isArray(value.assignments) || value.assignments.some(r => !r || typeof r !== 'object')) return false;
  const checked = resolveSearchParty(createSearchPartySource(a.ages, value.assignments.map(r => ({ adults: r.adults, children: r.children, childAges: r.ages }))), counts);
  return checked.assignmentState === 'KNOWN' && checked.assignments!.every((r, i) => {
    const original = value.assignments![i];
    return r.ordinal === original.ordinal && r.adults === original.adults && r.children === original.children &&
      JSON.stringify(r.ages) === JSON.stringify(original.ages);
  });
}
export function sameChildAgeGroup(a: unknown, b: unknown, count: number): boolean {
  const left = interpretChildAges(a, count), right = interpretChildAges(b, count);
  return left.state === 'KNOWN' && right.state === 'KNOWN' && JSON.stringify(left.ages) === JSON.stringify(right.ages);
}
