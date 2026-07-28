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

const card =
  readText(
    "src/components/HotelCard/HotelCard.tsx"
  );
const tradeOffPresentation =
  readText(
    "src/engine-v2/frontend/tradeOffPresentationV2.ts"
  );
const adapter =
  readText(
    "src/engine-v2/frontend/smartStayFrontendAdapterV2.ts"
  );
const budget =
  readText(
    "src/components/BudgetSelector/BudgetSelector.tsx"
  );
const budgetCss =
  readText(
    "src/components/BudgetSelector/BudgetSelector.css"
  );

test(
  "D6E uses one semantically deduplicated trade-off list for collapsed and expanded cards",
  () => {
    assert.match(
      card,
      /buildDisplayedTradeOffsV2\(\{/
    );
    assert.match(
      card,
      /const tradeOffPreview\s*=\s*\n\s*fullTradeOffs\.slice\(/
    );
    assert.match(
      card,
      /\{fullTradeOffs\.map\(/
    );
    assert.ok(
      !card.includes(
        "function buildTradeOffPreview"
      )
    );

    assert.match(
      tradeOffPresentation,
      new RegExp(
        "selectDistinctTradeOffMessagesV2\\(\\s*candidates,\\s*2\\s*\\)"
      )
    );
    assert.match(
      tradeOffPresentation,
      /category === "booking-risk"/
    );
    assert.match(
      tradeOffPresentation,
      /currentRefundable !== false \|\| selectedRefundable !== false/
    );
  }
);

test(
  "D6E keeps generic booking risk only for factors not already explained",
  () => {
    assert.match(
      adapter,
      /hasIndependentRiskFactorsV2/
    );
    assert.match(
      adapter,
      /riskCoverage/
    );
    assert.match(
      adapter,
      /selectDistinctTradeOffMessagesV2/
    );
    assert.match(
      adapter,
      /explicitRiskTradeOffs/
    );
    assert.match(
      adapter,
      /hasIndependentRisk[\s\S]*?explicitRiskTradeOffs/
    );
    assert.match(
      tradeOffPresentation,
      /offer-non-refundable|non-refundable/
    );
    assert.match(
      tradeOffPresentation,
      /startsWith\("location-"\)/
    );
    assert.match(
      tradeOffPresentation,
      /data-confidence-medium/
    );
    assert.match(
      tradeOffPresentation,
      /materialFactorCodes/
    );
  }
);

test(
  "D6E does not turn technical location fallbacks into generic booking uncertainty",
  () => {
    const nonMaterialBlock =
      tradeOffPresentation.match(
        /const NON_MATERIAL_RISK_FACTOR_CODES_V2[\s\S]*?\]\);/
      )?.[0] ??
      "";

    assert.match(
      nonMaterialBlock,
      /location-warning:selected-location-coordinates-unavailable/
    );
    assert.match(
      nonMaterialBlock,
      /location-warning:property-coordinates-unavailable/
    );
    assert.match(
      nonMaterialBlock,
      /location-warning:provider-distance-reference-unverified/
    );
    assert.ok(
      !nonMaterialBlock.includes(
        "explicit-distance-limit-unverified"
      ),
      "A hard distance limit that cannot be verified must remain material."
    );
    assert.match(
      tradeOffPresentation,
      /case "location":[\s\S]*?return !coverage\.location/
    );
  }
);

test(
  "D6E presents an unset budget as neutral without assigning a hidden search budget",
  () => {
    assert.match(
      budget,
      /: "Not set"/
    );
    assert.match(
      budget,
      /data-budget-state=\{/
    );
    assert.match(
      budget,
      /"--budget-progress"/
    );
    assert.match(
      budget,
      /handleSliderPointerUp/
    );
    assert.match(
      budget,
      /aria-valuetext=\{/
    );
    assert.match(
      budget,
      /"Budget not set"/
    );
    assert.match(
      budget,
      /const sliderProgress\s*=\s*[\s\S]*?hasBudget[\s\S]*?getSliderProgress\([\s\S]*?: 0;/
    );
    assert.match(
      budget,
      /Use the slider or enter an exact total budget/
    );

    const unsetBlock =
      budgetCss.match(
        /\.budget-selector__range--unset\s*\{([\s\S]*?)\}/
      )?.[1] ??
      "";

    const unsetWebkitThumb =
      budgetCss.match(
        /\.budget-selector__range--unset::\-webkit-slider-thumb\s*\{([\s\S]*?)\}/
      )?.[1] ??
      "";

    assert.match(
      unsetBlock,
      /#cbd5e1/
    );
    assert.match(
      unsetBlock,
      /100% 8px/
    );
    assert.ok(
      !/opacity\s*:/.test(
        unsetBlock
      ),
      "The unset state must not be a faded green value."
    );
    assert.match(
      unsetWebkitThumb,
      /background:\s*#ffffff/
    );
    assert.match(
      unsetWebkitThumb,
      /border-color:\s*#94a3b8/
    );
  }
);
