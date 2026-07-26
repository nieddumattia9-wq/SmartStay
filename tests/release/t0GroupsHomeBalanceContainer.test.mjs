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
  "D6B Home exposes one contextual non-interactive SmartStay balance indicator",
  () => {
    const trip =
      readText(
        "src/components/TripOptimizer/TripOptimizer.tsx"
      );

    const optimizer =
      readText(
        "src/components/SmartOptimizer/SmartOptimizer.tsx"
      );

    const track =
      readText(
        "src/components/SmartOptimizer/SliderTrack.tsx"
      );

    const combined =
      trip +
      "\n" +
      optimizer;

    assert.equal(
      (
        combined.match(
          /Your SmartStay balance/g
        ) ??
        []
      ).length,
      1,
      "Home must expose one SmartStay balance heading."
    );

    assert.match(
      optimizer,
      /explanation:\s*string/
    );

    assert.match(
      optimizer,
      /isReady:\s*boolean/
    );

    assert.match(
      trip,
      /explanation=\{[\s\S]{0,100}automaticPreferenceBalance/
    );

    assert.match(
      trip,
      /const numericBudget\s*=\s*Number\(/
    );

    assert.match(
      trip,
      /calculateAutomaticPreferenceBalance\(\{[\s\S]{0,500}totalBudget:\s*budget[\s\S]{0,500}nightCount:\s*currentNightCount[\s\S]{0,500}roomCount:\s*guests\.rooms[\s\S]{0,500}maxDistanceKm/
    );

    assert.match(
      trip,
      /value=\{[\s\S]{0,100}effectiveSmartPreference/
    );

    assert.ok(
      !trip.includes(
        "manualSmartPreference"
      )
    );

    assert.ok(
      !combined.includes(
        '"Automatic"'
      )
    );

    assert.ok(
      !combined.includes(
        '"Manual"'
      )
    );

    assert.ok(
      !optimizer.includes(
        "onChange"
      )
    );

    assert.ok(
      !track.includes(
        'role="slider"'
      )
    );

    assert.ok(
      !track.includes(
        "aria-valuenow"
      )
    );

    assert.ok(
      !track.includes(
        "tabIndex"
      )
    );

    assert.ok(
      !track.includes(
        "onPointer"
      )
    );

    assert.ok(
      !track.includes(
        "onKeyDown"
      )
    );

    assert.match(
      track,
      /role="img"/
    );
  }
);

test(
  "D6B Recommendation Groups use one shared visual shell around all comparable cards",
  () => {
    const results =
      readText(
        "src/pages/Results/Results.tsx"
      );

    const css =
      readText(
        "src/pages/Results/Results.css"
      );

    assert.match(
      results,
      /data-recommendation-group=/
    );

    assert.match(
      results,
      /data-recommendation-count=/
    );

    assert.match(
      css,
      /\.results__recommendation-group\s*\{[\s\S]{0,260}padding:\s*18px/
    );

    assert.match(
      css,
      /\.results__recommendation-group\s*\{[\s\S]{0,340}border:\s*1px solid/
    );

    assert.match(
      css,
      /\.results__recommendation-group\s*\{[\s\S]{0,500}linear-gradient/
    );

    assert.match(
      css,
      /results__recommendation-card \+\s*\n?\.results__recommendation-card/
    );

    assert.match(
      results,
      /group\.picks\.map/
    );
  }
);

test(
  "D6B destination presentation is normalized through one shared utility",
  () => {
    const autocomplete =
      readText(
        "src/components/DestinationAutocomplete/DestinationAutocomplete.tsx"
      );

    const searchMeta =
      readText(
        "src/utils/searchMeta.ts"
      );

    const results =
      readText(
        "src/pages/Results/Results.tsx"
      );

    const utility =
      readText(
        "src/utils/destinationLabel.ts"
      );

    assert.match(
      autocomplete,
      /from "\.\.\/\.\.\/utils\/destinationLabel"/
    );

    assert.match(
      searchMeta,
      /from "\.\/destinationLabel"/
    );

    assert.match(
      results,
      /from "\.\.\/\.\.\/utils\/destinationLabel"/
    );

    assert.ok(
      !results.includes(
        "function formatDestinationLabel"
      )
    );

    assert.match(
      utility,
      /export function formatDestinationLabel/
    );

    assert.match(
      utility,
      /\^\[A-Z\]\{2\}\$\/i/
    );
  }
);
