import { neutralSearch } from '../../engine-v2/fixtures/providerNeutralRankingSynthetic';
import { createStoredSearchMeta, normalizeStoredSearchMeta } from '../../../src/utils/searchMeta';
import { createRoomsPayload } from '../../../src/utils/searchRoomAssignments';
import { createSearchPartySource } from '../../../src/utils/searchParty';
import { buildSmartStayFrontendRuntimeV2 } from '../../../src/engine-v2/frontend/smartStayFrontendAdapterV2';
import { adaptV2SearchResultToDecisionV3 } from '../../../src/engine-v3/adapter/v2CompatibilityAdapterV3';
import { createIndependentV3ComparableDecisionV3 } from '../../../src/engine-v3/orchestrator/independentDecisionEngineV3';
import { commercialPacket, editCommercialRecord, resealCommercialPacket } from './commercialProtocolsSyntheticV3';
import type { SyntheticCommercialProfileV3 } from '../../../src/engine-v3/evaluation/syntheticCommercialProtocolsV3';

// Invented full stay: all monetary, tax, cancellation and availability controls
// retained. Four documented sleeping places, not an occupancy-derived bed count.
export function familySearch(ages: number[] = [6, 11], rooms = 1) {
  const original = neutralSearch(), guests = { adults: 2, children: ages.length, childAges: ages, rooms };
  const sentRooms = createRoomsPayload(guests);
  const meta = createStoredSearchMeta({ destinationLabel: 'Synthetic City', smartPreference: 'balanced', budgetInput: 900,
    currency: 'EUR', checkIn: original.checkIn, checkOut: original.checkOut, maxDistanceKm: 5,
    ...guests, roomAssignments: sentRooms });
  const restored = normalizeStoredSearchMeta(JSON.parse(JSON.stringify(meta)))!;
  original.hotels.forEach(h => h.offers.forEach(o => { o.roomName = 'Private family suite; 2 double beds; capacity 4 guests'; }));
  const input = { ...original, adults: restored.adults!, children: restored.children!, rooms: restored.rooms!, searchParty: restored.searchParty! };
  return { input, meta, restored, sentRooms };
}
export function familyDecision(ages: number[] = [6, 11], rooms = 1, source?: ReturnType<typeof createSearchPartySource>) {
  const f = familySearch(ages, rooms);
  if (source) f.input.searchParty = source;
  const runtime = buildSmartStayFrontendRuntimeV2(f.input);
  const decision = adaptV2SearchResultToDecisionV3({ searchInput: runtime.searchInput, result: runtime.result });
  const comparable = createIndependentV3ComparableDecisionV3(decision, runtime.result.recommendationRoles.bestChoiceHotelId);
  const selected = f.input.hotels.find(h => h.id === decision.robustness.policyPreferredHotelId);
  if (!selected || comparable.status !== 'recommended') throw new Error('Family synthetic control must recommend');
  return { ...f, runtime, decision, comparable, offer: selected.offers[0], propertyId: selected.id };
}
export async function familyPacket(profile: SyntheticCommercialProfileV3 = 'synthetic-session@1', ages: number[] = [6, 11], rooms = 1) {
  const control = familyDecision(ages, rooms), { packet } = await commercialPacket(profile);
  packet.version = 'synthetic-commercial-packet@1.1';
  packet.expectedScope = { ...packet.expectedScope, propertyId: control.propertyId, offerId: control.offer.id, adults: 2, childAges: [...ages], units: rooms };
  packet.records.forEach((_, i) => editCommercialRecord(packet, i, (_b, d) => {
    d.scope = structuredClone(packet.expectedScope);
    d.terms.roomName = control.offer.roomName;
    const money = d.price ?? d.money;
    if (d.price) money.amount = control.offer.price; else money.minor = control.offer.price * 100;
  }));
  await resealCommercialPacket(packet);
  return { control, packet };
}
