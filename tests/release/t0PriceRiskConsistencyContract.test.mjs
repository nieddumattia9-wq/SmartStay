import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const mapperSource =
  readFileSync(
    "server/providers/liteApi/liteApiOfferMapper.js",
    "utf8"
  );

const riskSource =
  readFileSync(
    "src/engine-v2/risk/riskEngine.ts",
    "utf8"
  );

const cardSource =
  readFileSync(
    "src/components/HotelCard/HotelCard.tsx",
    "utf8"
  );

const tradeOffPresentationSource =
  readFileSync(
    "src/engine-v2/frontend/tradeOffPresentationV2.ts",
    "utf8"
  );

const panelSource =
  readFileSync(
    "src/components/HotelDetailsPanel/HotelDetailsPanel.tsx",
    "utf8"
  );

test(
  "T0 price and risk consistency contract remains explicit",
  () => {
    assert.match(
      mapperSource,
      /bookable:\s*\n\s*true/
    );

    assert.match(
      riskSource,
      /refundable\?\.value\s*===\s*\n\s*false/
    );

    assert.match(
      riskSource,
      /thresholdLevel\s*===\s*\n\s*"low"\s*\n\s*\?\s*"medium"/
    );

    assert.ok(
      tradeOffPresentationSource.includes(
        "currentRefundable !== false"
      )
    );

    assert.ok(
      tradeOffPresentationSource.includes(
        "Review the booking conditions before checkout."
      )
    );

    assert.ok(
      cardSource.includes(
        "buildDisplayedTradeOffsV2"
      )
    );

    assert.ok(
      panelSource.includes(
        "Payment timing and accepted methods are shown by the booking partner in secure checkout."
      )
    );
  }
);
