import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHotelAmenityPresentation,
  presentHotelDescription,
} from "../../src/utils/hotelDetailsPresentation";

test(
  "Hotel details presentation deduplicates amenity aliases",
  () => {
    const presentation =
      buildHotelAmenityPresentation(
        [
          "WiFi available",
          "Free WiFi",
          "Swimming pool",
        ],
        [
          "Wireless internet",
          "Indoor pool",
        ]
      );

    assert.equal(
      presentation.totalCount,
      2
    );

    assert.deepEqual(
      presentation.highlights,
      [
        "Free Wi-Fi",
        "Swimming pool",
      ]
    );
  }
);

test(
  "Hotel details presentation keeps wellness separate from entertainment",
  () => {
    const presentation =
      buildHotelAmenityPresentation([
        "Swimming pool",
        "Karaoke",
        "Billiards",
        "24-hour front desk",
      ]);

    const wellness =
      presentation.groups.find(
        (group) =>
          group.id === "wellness"
      );

    const entertainment =
      presentation.groups.find(
        (group) =>
          group.id ===
          "activities-entertainment"
      );

    const propertyServices =
      presentation.groups.find(
        (group) =>
          group.id ===
          "property-services"
      );

    assert.deepEqual(
      wellness?.items,
      ["Swimming pool"]
    );

    assert.deepEqual(
      entertainment?.items,
      ["Karaoke", "Billiards"]
    );

    assert.deepEqual(
      propertyServices?.items,
      ["24-hour front desk"]
    );
  }
);

test(
  "Hotel description presentation removes provider bullet artifacts and promotional calls to action",
  () => {
    const presentation =
      presentHotelDescription(
        [
          "A comfortable stay near the centre.",
          "Top Features:",
          "? Free access to the indoor pool",
          "? Walking distance to the station",
          "Ready to experience the perfect blend of comfort? Book now!",
        ].join("\n")
      );

    assert.equal(
      presentation.overview,
      "A comfortable stay near the centre."
    );

    assert.deepEqual(
      presentation.highlights,
      [
        "Free access to the indoor pool",
        "Walking distance to the station",
      ]
    );

    const rendered =
      JSON.stringify(presentation);

    assert.ok(
      !rendered.includes("?")
    );

    assert.ok(
      !/book now/i.test(rendered)
    );
  }
);
