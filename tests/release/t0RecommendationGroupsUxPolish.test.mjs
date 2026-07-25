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
  "T0 recommendation groups expose one to four equivalent stays",
  () => {
    const roles =
      readText(
        "src/engine-v2/recommendation/recommendationRolesEngine.ts"
      );

    const adapter =
      readText(
        "src/engine-v2/frontend/smartStayFrontendAdapterV2.ts"
      );

    assert.match(
      roles,
      /MAXIMUM_RECOMMENDATIONS_PER_GROUP\s*=\s*\n?\s*4/
    );

    assert.match(
      roles,
      /maximumInitiallyVisiblePerGroup:\s*4/
    );

    assert.ok(
      !roles.includes(
        "Math.min(options.maximumInitiallyVisiblePerGroup, 3)"
      ),
      "Best Choice must share the same four-stay cap as every recommendation group."
    );

    assert.match(
      adapter,
      /MAXIMUM_NEAR_BUDGET_RESULTS\s*=\s*\n?\s*4/
    );

    assert.match(
      roles,
      /maximumInitiallyVisiblePerGroup:[\s\S]{0,180}MAXIMUM_RECOMMENDATIONS_PER_GROUP/
    );

    assert.match(
      roles,
      /initiallyVisibleHotelIds:\s*memberHotelIds\.slice\([\s\S]{0,100}maximumVisibleCount/
    );

    assert.match(
      adapter,
      /group\.initiallyVisibleHotelIds/
    );

    assert.match(
      adapter,
      /recommendationRoles[\s\S]{0,100}\.groups/
    );
  }
);

test(
  "T0 results render one heading per recommendation group",
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
      /const recommendationGroups =/
    );

    assert.match(
      results,
      /recommendationGroups\.map/
    );

    assert.match(
      results,
      /group\.picks\.map/
    );

    assert.ok(
      !results.includes(
        "showRecommendationLabel"
      ),
      "The group heading must provide the recommendation context without repeating an eyebrow on every card."
    );

    assert.match(
      results,
      /comparable stays/
    );

    assert.match(
      results,
      /Sensible near-budget option/
    );

    assert.ok(
      !results.includes(
        "Near-budget alternative"
      )
    );

    assert.ok(
      !results.includes(
        "{recommendationPicks.map((pick) => {"
      ),
      "Recommendation picks must be rendered inside their group instead of repeating the group heading."
    );

    assert.match(
      css,
      /results__recommendation-group/
    );

    assert.match(
      css,
      /results__recommendation-list/
    );
  }
);

test(
  "T0 result summary and SmartStay balance stay compact and transparent",
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
      /formatDestinationLabel/
    );

    assert.match(
      results,
      /results-search-summary__facts/
    );

    assert.match(
      results,
      /No other suitable stays/
    );

    assert.match(
      results,
      /shown first/
    );

    assert.ok(
      !results.includes(
        "Automatic"
      ),
      "Automatic preference selection must not consume a visible badge."
    );

    assert.match(
      results,
      /\{selectedPreference\.title\} for this trip/
    );

    assert.match(
      css,
      /\.results-balance-card\s*\{[\s\S]{0,180}padding:\s*14px 16px/
    );
  }
);

test(
  "T0 details use human map, cancellation and description copy",
  () => {
    const panel =
      readText(
        "src/components/HotelDetailsPanel/HotelDetailsPanel.tsx"
      );

    const panelCss =
      readText(
        "src/components/HotelDetailsPanel/HotelDetailsPanel.css"
      );

    const map =
      readText(
        "src/components/LocationMapPreview/LocationMapPreview.tsx"
      );

    assert.match(
      map,
      /from your selected location/
    );

    assert.match(
      map,
      /Open this stay in Google Maps/
    );

    assert.match(
      map,
      /See the exact location in a new tab\./
    );

    assert.ok(
      !map.includes(
        "not configured in this environment"
      )
    );

    assert.ok(
      !map.includes(
        "Open larger map"
      )
    );

    assert.match(
      panel,
      /getCancellationPolicyDisplay/
    );

    assert.match(
      panel,
      /Free cancellation until/
    );

    assert.match(
      panel,
      /\{cancellationPolicyDisplay\}/
    );

    assert.match(
      panel,
      /Read full description/
    );

    assert.match(
      panel,
      /aria-expanded=\{[\s\S]{0,80}showFullDescription/
    );

    assert.match(
      panelCss,
      /hotel-details-panel__description--collapsed/
    );

    assert.match(
      panelCss,
      /-webkit-line-clamp:\s*4/
    );
  }
);
