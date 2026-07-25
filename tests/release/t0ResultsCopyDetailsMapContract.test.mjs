import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

function readText(
  path
) {
  return readFileSync(
    path,
    "utf8"
  ).replace(
    /\r\n/g,
    "\n"
  );
}

test(
  "T0 results copy stays concise while the full list remains user-controlled",
  () => {
    const results =
      readText(
        "src/pages/Results/Results.tsx"
      );

    assert.ok(
      !results.includes(
        "additional options were hidden to keep the results focused"
      )
    );

    assert.ok(
      !results.includes(
        "hidden because"
      )
    );

    assert.match(
      results,
      /const \[showFullList, setShowFullList\][\s\S]{0,80}useState\(false\)/
    );

    assert.match(
      results,
      /results-search-summary__facts/
    );

    assert.match(
      results,
      /other suitable/
    );

    assert.match(
      results,
      /View \{remainingHotels\.length\} other/
    );

    assert.match(
      results,
      /Other suitable stays/
    );
  }
);

test(
  "T0 offer facts are deduplicated and tax copy is concise",
  () => {
    const card =
      readText(
        "src/components/HotelCard/HotelCard.tsx"
      );

    const panel =
      readText(
        "src/components/HotelDetailsPanel/HotelDetailsPanel.tsx"
      );

    assert.match(
      panel,
      /shouldShowCancellationPolicy/
    );

    assert.match(
      panel,
      /Known taxes included in total\./
    );

    assert.match(
      panel,
      /Known taxes included in total; some are payable at the property\./
    );

    assert.ok(
      !panel.includes(
        "Known taxes payable separately are already included in the displayed stay total."
      )
    );

    assert.ok(
      !card.includes(
        'modifier:\n        "warning"'
      ),
      "Non-refundable must remain in What to know instead of being duplicated as a top badge."
    );

    assert.match(
      card,
      /The selected offer is non-refundable\./
    );

    assert.match(
      panel,
      /Hide amenities/
    );
  }
);

test(
  "T0 location map is progressive, clickable and provider-agnostic",
  () => {
    const panel =
      readText(
        "src/components/HotelDetailsPanel/HotelDetailsPanel.tsx"
      );

    const mapComponent =
      readText(
        "src/components/LocationMapPreview/LocationMapPreview.tsx"
      );

    const mapUtility =
      readText(
        "src/utils/locationMapPresentation.ts"
      );

    const runtimeConfig =
      readText(
        "src/config/runtimeConfig.ts"
      );

    const render =
      readText(
        "render.yaml"
      );

    assert.match(
      panel,
      /details\.latitude !==[\s\S]{0,120}details\.longitude !==/
    );

    assert.match(
      panel,
      /LocationMapPreview/
    );

    assert.match(
      mapComponent,
      /loading="lazy"/
    );

    assert.match(
      mapComponent,
      /referrerPolicy="strict-origin-when-cross-origin"/
    );

    assert.match(
      mapComponent,
      /Open in Google Maps/
    );

    assert.match(
      mapComponent,
      /target="_blank"/
    );

    assert.match(
      mapUtility,
      /https:\/\/www\.google\.com\/maps\/search\//
    );

    assert.match(
      mapUtility,
      /https:\/\/www\.google\.com\/maps\/embed\/v1\//
    );

    assert.match(
      runtimeConfig,
      /VITE_GOOGLE_MAPS_EMBED_KEY/
    );

    assert.match(
      render,
      /- key: VITE_GOOGLE_MAPS_EMBED_KEY\n\s+sync: false/
    );

    assert.ok(
      !mapComponent.includes(
        "trackAnalyticsEvent"
      ),
      "Coordinates and map clicks must not be added to analytics."
    );
  }
);
