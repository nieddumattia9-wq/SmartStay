import type { HotelOffer } from "../types/hotel";
import { compareExplicitInstants } from "../../server/shared/explicit-instant.mjs";

// Shared UI material-change projection; only explicit deadline instants receive
// temporal equivalence. All other commercial checks retain their prior semantics.
export function getOfferDisplayAmount(
  offer: HotelOffer
) {
  return (
    typeof offer.totalKnownCost ===
      "number" &&
    Number.isFinite(
      offer.totalKnownCost
    ) &&
    offer.totalKnownCost > 0
      ? offer.totalKnownCost
      : offer.price
  );
}

export function getMaterialChangedFields(
  originalOffer:
    HotelOffer |
    null,
  confirmedOffer:
    HotelOffer |
    null
) {
  if (
    !originalOffer ||
    !confirmedOffer
  ) {
    return [] as string[];
  }

  const changedFields =
    new Set<string>();

  const originalAmount =
    getOfferDisplayAmount(
      originalOffer
    );

  const confirmedAmount =
    getOfferDisplayAmount(
      confirmedOffer
    );

  if (
    originalOffer.currency !==
      confirmedOffer.currency ||
    Math.abs(
      originalAmount -
      confirmedAmount
    ) >
      0.009
  ) {
    changedFields.add(
      "totalKnownCost"
    );
  }

  for (
    const [
      field,
      originalValue,
      confirmedValue,
    ]
    of [
      [
        "includedTaxes",
        originalOffer.includedTaxes,
        confirmedOffer.includedTaxes,
      ],
      [
        "excludedTaxes",
        originalOffer.excludedTaxes,
        confirmedOffer.excludedTaxes,
      ],
      [
        "unknownTaxes",
        originalOffer.unknownTaxes,
        confirmedOffer.unknownTaxes,
      ],
    ] as const
  ) {
    const normalizedOriginal =
      typeof originalValue ===
        "number" &&
      Number.isFinite(
        originalValue
      )
        ? originalValue
        : 0;

    const normalizedConfirmed =
      typeof confirmedValue ===
        "number" &&
      Number.isFinite(
        confirmedValue
      )
        ? confirmedValue
        : 0;

    if (
      Math.abs(
        normalizedOriginal -
        normalizedConfirmed
      ) >
        0.009
    ) {
      changedFields.add(
        field
      );
    }
  }

  if (
    originalOffer.refundable !==
    confirmedOffer.refundable
  ) {
    changedFields.add(
      "refundable"
    );
  }

  if (
    originalOffer.cancellationPolicy !==
    confirmedOffer.cancellationPolicy
  ) {
    changedFields.add(
      "cancellationPolicy"
    );
  }

  if (
    !compareExplicitInstants(
      originalOffer.freeCancellationUntil,
      confirmedOffer.freeCancellationUntil
    ).equivalent
  ) {
    changedFields.add(
      "freeCancellationUntil"
    );
  }

  if (
    originalOffer.roomName !==
    confirmedOffer.roomName
  ) {
    changedFields.add(
      "roomName"
    );
  }

  if (
    originalOffer.mealPlan !==
    confirmedOffer.mealPlan
  ) {
    changedFields.add(
      "mealPlan"
    );
  }

  if (
    originalOffer.taxesIncluded !==
    confirmedOffer.taxesIncluded
  ) {
    changedFields.add(
      "taxesIncluded"
    );
  }

  if (
    originalOffer.bookable !==
    confirmedOffer.bookable
  ) {
    changedFields.add(
      "bookable"
    );
  }

  return [
    ...changedFields,
  ];
}
