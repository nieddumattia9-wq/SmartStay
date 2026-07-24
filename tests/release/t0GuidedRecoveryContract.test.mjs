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
  "T0 guided recovery is specific, local and concise",
  () => {
    const results =
      readText(
        "src/pages/Results/Results.tsx"
      );

    const css =
      readText(
        "src/pages/Results/Results.css"
      );

    const contract =
      readText(
        "src/engine-v2/frontend/constraintAwareEmptyStateV2.ts"
      );

    const adapter =
      readText(
        "src/engine-v2/frontend/smartStayFrontendAdapterV2.ts"
      );

    const recommendationEngine =
      readText(
        "src/engine-v2/recommendation/recommendationRolesEngine.ts"
      );

    assert.match(
      contract,
      /MAXIMUM_RECOVERY_SUGGESTIONS\s*=\s*\n\s*2/
    );

    assert.match(
      contract,
      /recoveryBudgetSuggestions/
    );

    assert.match(
      contract,
      /unlockedHotelCount/
    );

    assert.match(
      adapter,
      /selectedOffer[\s\S]{0,120}completeness[\s\S]{0,120}"reported-complete"/
    );

    assert.match(
      results,
      /handleBudgetRecovery/
    );

    assert.match(
      results,
      /recoveryAction:\s*\n\s*"raise-budget"/
    );

    assert.match(
      results,
      /See more options without starting over/
    );

    assert.match(
      results,
      /These suggestions reuse the current results\./
    );

    assert.match(
      results,
      /Your original criteria stay saved until you choose\./
    );

    assert.match(
      results,
      /data-reuses-current-results="true"/
    );

    assert.ok(
      !results.includes(
        "Search status:"
      ),
      "Completed lifecycle state must not remain as technical UI noise."
    );

    assert.ok(
      !results.includes(
        "const [status, setStatus]"
      ),
      "Removed technical status copy must not leave unused React state."
    );

    assert.ok(
      !results.includes(
        "setStatus("
      ),
      "Results must not keep an unused legacy status setter."
    );

    assert.match(
      css,
      /results-empty-state__suggestion/
    );

    assert.match(
      recommendationEngine,
      /maximumBestChoiceScoreDifference:\s*0\.75/
    );

    assert.match(
      recommendationEngine,
      /maximumInitiallyVisiblePerGroup:\s*3/
    );

    assert.match(
      recommendationEngine,
      /visibleHotelIds:\s*allEquivalentHotelIds\.slice\(0, maximumVisibleCount\)/
    );

    assert.match(
      adapter,
      /bestChoiceGroup[\s\S]{0,400}visibleHotelIds/
    );

    assert.match(
      adapter,
      /visibleBestChoiceHotelIds\.has\(\s*pick\.hotelId\s*\)/
    );

    assert.match(
      results,
      /recommendationPicks\.map\(\(pick\) =>/
    );

    assert.ok(
      !results.includes(
        "recommendationPicks.slice(0, 1)"
      ),
      "Equivalent recommendation cards must not be collapsed to the first pick after recovery."
    );
  }
);
