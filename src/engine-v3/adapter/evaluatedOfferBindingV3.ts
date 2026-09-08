import type { SmartStayEngineV2SearchResult } from '../../engine-v2/orchestrator/smartStayEngineV2';
import type { SmartStaySelectedOfferV2 } from '../../engine-v2/offers/intentAwareOfferSelectionV2';
import { selectHotelOffers } from '../../utils/hotelOfferSelection';

/** Identity is lookup only. Never rerun offer selection with a reduced context. */
export function resolveEvaluatedOfferV3(
  result: SmartStayEngineV2SearchResult,
  hotelId: string,
): SmartStaySelectedOfferV2 | null {
  const rows = result.recommendationRoles.evaluations.filter(row => row.hotelId === hotelId);
  if (rows.length !== 1) throw new Error('EVALUATED_OFFER_BINDING_AMBIGUOUS');
  const selected = rows[0].metrics.selectedOffer ?? null;
  const evaluation = result.evaluations.find(row => row.hotel.id === hotelId);
  if (!evaluation || (selected && evaluation.hotel.offers.filter(offer => offer.id === selected.offerId).length !== 1)) {
    throw new Error('EVALUATED_OFFER_SOURCE_MISMATCH');
  }
  if (selected) {
    // Enumerate normalized offers for verification only; never select a new primary.
    const source = selectHotelOffers(evaluation.hotel).offers.find(row => row.offer.id === selected.offerId);
    if (!source || selected.hotelId !== hotelId || selected.amount !== source.amount ||
        selected.currency !== source.currency || selected.completeness !== source.completeness ||
        selected.roomName !== source.offer.roomName || selected.bookable !== (source.offer.bookable === true) ||
        selected.refundable !== (typeof source.offer.refundable === 'boolean' ? source.offer.refundable : null) ||
        selected.freeCancellationUntil !== (source.offer.freeCancellationUntil?.trim() || null)) {
      throw new Error('EVALUATED_OFFER_VALUES_MISMATCH');
    }
  }
  for (const pick of result.recommendationRoles.picks.filter(row => row.hotelId === hotelId)) {
    if (JSON.stringify(pick.metrics.selectedOffer ?? null) !== JSON.stringify(selected)) {
      throw new Error('EVALUATED_OFFER_PICK_MISMATCH');
    }
  }
  return selected;
}
