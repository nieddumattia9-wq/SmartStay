import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDestinationLabel,
  normalizeDestinationCountry,
  normalizeDestinationLabel,
} from "../../src/utils/destinationLabel";

import {
  createStoredSearchMeta,
  normalizeStoredSearchMeta,
} from "../../src/utils/searchMeta";

test(
  "Destination labels remove duplicate country names and trailing country codes",
  () => {
    assert.equal(
      formatDestinationLabel(
        "Florence, Tuscany, Italy",
        "Italy, IT"
      ),
      "Florence, Tuscany, Italy"
    );

    assert.equal(
      formatDestinationLabel(
        "Florence, Tuscany, Italy",
        "IT"
      ),
      "Florence, Tuscany, Italy"
    );

    assert.equal(
      normalizeDestinationCountry(
        "Italy, IT"
      ),
      "Italy"
    );

    assert.equal(
      normalizeDestinationLabel(
        "Florence, Florence, Tuscany, Italy, IT"
      ),
      "Florence, Tuscany, Italy"
    );
  }
);

test(
  "Stored search metadata keeps the centrally normalized destination label",
  () => {
    const meta =
      createStoredSearchMeta({
        destinationLabel:
          "Florence, Tuscany, Italy, IT",
        destinationLatitude:
          43.7696,
        destinationLongitude:
          11.2558,
        smartPreference: {
          selectedIndex: 2,
        },
        budgetInput:
          "500",
        currency:
          "EUR",
        checkIn:
          "2026-08-07",
        checkOut:
          "2026-08-10",
        maxDistanceKm:
          5,
        adults:
          2,
        children:
          0,
        rooms:
          1,
      });

    assert.equal(
      meta.destinationLabel,
      "Florence, Tuscany, Italy"
    );

    assert.equal(
      normalizeStoredSearchMeta({
        ...meta,
        destinationLabel:
          "Florence, Tuscany, Italy, IT",
      })?.destinationLabel,
      "Florence, Tuscany, Italy"
    );
  }
);
