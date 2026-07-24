import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

function readText(path) {
  return readFileSync(
    path,
    "utf8"
  ).replace(
    /\r\n/g,
    "\n"
  );
}

test(
  "T0 hotel details use a centred accessible modal",
  () => {
    const component =
      readText(
        "src/components/HotelDetailsPanel/HotelDetailsPanel.tsx"
      );

    const css =
      readText(
        "src/components/HotelDetailsPanel/HotelDetailsPanel.css"
      );

    assert.match(
      component,
      /role="dialog"/
    );

    assert.match(
      component,
      /aria-modal="true"/
    );

    assert.match(
      component,
      /event\.key === "Escape"/
    );

    assert.match(
      component,
      /event\.target ===\s*event\.currentTarget/
    );

    assert.match(
      css,
      /place-items:\s*center/
    );

    assert.match(
      css,
      /backdrop-filter:\s*blur\(/
    );

    assert.ok(
      !/justify-content:\s*flex-end/.test(
        css
      ),
      "The desktop details experience must not regress to a side drawer."
    );
  }
);

test(
  "T0 amenity and provider copy presentation is structured",
  () => {
    const component =
      readText(
        "src/components/HotelDetailsPanel/HotelDetailsPanel.tsx"
      );

    const presentation =
      readText(
        "src/utils/hotelDetailsPresentation.ts"
      );

    assert.match(
      component,
      /buildHotelAmenityPresentation/
    );

    assert.match(
      component,
      /presentHotelDescription/
    );

    assert.match(
      component,
      /View all \$\{amenityPresentation\.totalCount\} amenities/
    );

    for (
      const category
      of [
        "Essentials",
        "Food and drink",
        "Wellness",
        "Activities and entertainment",
        "Transport and parking",
      ]
    ) {
      assert.ok(
        presentation.includes(
          category
        ),
        `Missing canonical amenity category: ${category}`
      );
    }

    assert.match(
      presentation,
      /id:\s*"wifi"/
    );

    assert.match(
      presentation,
      /id:\s*"swimming-pool"/
    );

    assert.match(
      presentation,
      /id:\s*"karaoke"/
    );
  }
);

test(
  "T0 result cards prioritise decision information and cannot bypass recheck",
  () => {
    const card =
      readText(
        "src/components/HotelCard/HotelCard.tsx"
      );

    const results =
      readText(
        "src/pages/Results/Results.tsx"
      );

    assert.match(
      card,
      /SmartStay fit/
    );

    assert.match(
      card,
      /Guest rating/
    );

    assert.match(
      card,
      /Why it stands out/
    );

    assert.match(
      card,
      /What to know/
    );

    assert.match(
      card,
      /Non-refundable/
    );

    assert.ok(
      !/bookingUrl/.test(
        card
      ),
      "HotelCard must not expose a direct booking URL before recheck."
    );

    assert.ok(
      !/createBookingRedirectUrl/.test(
        results
      ),
      "Results must not create direct booking redirects."
    );

    assert.ok(
      !/\.redirectable ===/.test(
        results
      ),
      "Results must not restore the legacy redirectable bridge."
    );

    assert.match(
      card,
      /Full SmartStay comparison/
    );

    assert.match(
      results,
      /displayOfferOverride=/
    );

    assert.match(
      results,
      /onOfferRechecked=/
    );
  }
);

test(
  "T0 recheck disclosure protects against silent offer changes",
  () => {
    const component =
      readText(
        "src/components/HotelDetailsPanel/HotelDetailsPanel.tsx"
      );

    assert.match(
      component,
      /getMaterialChangedFields/
    );

    assert.match(
      component,
      /Previously shown:/
    );

    assert.match(
      component,
      /Review the verified total/
    );

    assert.match(
      component,
      /requiresChangeAcceptance/
    );
  }
);
