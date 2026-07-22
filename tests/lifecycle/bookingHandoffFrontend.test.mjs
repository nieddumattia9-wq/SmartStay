import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const panelSource =
  fs.readFileSync(
    new URL(
      "../../src/components/HotelDetailsPanel/HotelDetailsPanel.tsx",
      import.meta.url
    ),
    "utf8"
  );

const apiSource =
  fs.readFileSync(
    new URL(
      "../../src/services/api.ts",
      import.meta.url
    ),
    "utf8"
  );

const resultsSource =
  fs.readFileSync(
    new URL(
      "../../src/pages/Results/Results.tsx",
      import.meta.url
    ),
    "utf8"
  );

const cardSource =
  fs.readFileSync(
    new URL(
      "../../src/components/HotelCard/HotelCard.tsx",
      import.meta.url
    ),
    "utf8"
  );

test(
  "booking UI checks the final total and requires explicit acceptance of changes",
  () => {
    assert.ok(
      panelSource.includes(
        "Check final total"
      )
    );

    assert.ok(
      panelSource.includes(
        "Accept updated total and continue"
      )
    );

    assert.ok(
      panelSource.includes(
        "Continue to secure checkout"
      )
    );

    assert.ok(
      panelSource.includes(
        "recheckBookingOffer"
      )
    );

    assert.ok(
      panelSource.includes(
        "prepareBookingHandoff"
      )
    );

    assert.ok(
      resultsSource.includes(
        "searchId={searchId}"
      )
    );

    assert.ok(
      resultsSource.includes(
        "offerId={"
      )
    );
  }
);

test(
  "the browser receives only opaque SmartStay handoff paths",
  () => {
    assert.ok(
      apiSource.includes(
        "/booking-handoff"
      )
    );

    assert.ok(
      apiSource.includes(
        "/api/booking-handoff/open?"
      )
    );

    assert.equal(
      /providerBookingReference|prebookId/.test(
        apiSource
      ),
      false
    );

    assert.equal(
      /providerBookingReference|prebookId/.test(
        panelSource
      ),
      false
    );
  }
);

test(
  "hotel cards show total stay amounts with cents",
  () => {
    assert.ok(
      cardSource.includes(
        "minimumFractionDigits: 2"
      )
    );

    assert.ok(
      cardSource.includes(
        "maximumFractionDigits: 2"
      )
    );
  }
);
