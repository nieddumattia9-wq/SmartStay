import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(
    relativePath,
    "utf8"
  );
}

test(
  "D6C keeps Home compact without removing the automatic balance indicator",
  () => {
    const hero =
      read(
        "src/components/Hero/Hero.css"
      );

    const trip =
      read(
        "src/components/TripOptimizer/TripOptimizer.css"
      );

    const smart =
      read(
        "src/components/SmartOptimizer/SmartOptimizer.css"
      );

    const tripTsx =
      read(
        "src/components/TripOptimizer/TripOptimizer.tsx"
      );

    assert.match(
      hero,
      /\.hero\s*\{[\s\S]*?margin-top:\s*18px/
    );

    assert.match(
      trip,
      /\.trip-card\s*\{[\s\S]*?margin-top:\s*20px;[\s\S]*?padding:\s*18px 16px/
    );

    assert.match(
      smart,
      /\.smart-optimizer--guided\s*\{[\s\S]*?padding:\s*13px 15px 12px/
    );

    assert.match(
      tripTsx,
      /calculateAutomaticPreferenceBalance\(\{[\s\S]*?totalBudget:\s*budget[\s\S]*?nightCount:\s*currentNightCount[\s\S]*?roomCount:\s*guests\.rooms[\s\S]*?maxDistanceKm/
    );
  }
);

test(
  "D6C uses a two-column desktop comparison and one compact mobile column",
  () => {
    const results =
      read(
        "src/pages/Results/Results.css"
      );

    const card =
      read(
        "src/components/HotelCard/HotelCard.css"
      );

    assert.match(
      results,
      /@media \(min-width:\s*980px\)[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
    );

    assert.match(
      results,
      /:has\([\s\S]*?:only-child[\s\S]*?\)[\s\S]*?grid-template-columns:\s*1fr/
    );

    assert.match(
      results,
      /@media \(max-width:\s*640px\)[\s\S]*?\.results__recommendation-list\s*\{[\s\S]*?flex-direction:\s*column/
    );

    assert.match(
      card,
      /@media \(max-width:\s*480px\)[\s\S]*?height:\s*165px/
    );

    assert.match(
      card,
      /\.hotel-card__engine-subtitle\s*\{[\s\S]*?display:\s*none/
    );
  }
);

test(
  "D6C restores mobile Loading dots while respecting reduced motion",
  () => {
    const loading =
      read(
        "src/components/LoadingScreen/LoadingScreen.css"
      );

    assert.match(
      loading,
      /prefers-reduced-motion:\s*no-preference[\s\S]*?loadingDotPulse/
    );

    assert.match(
      loading,
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.loading-dot[\s\S]*?animation:\s*none/
    );

    assert.match(
      loading,
      /will-change:\s*[\s\S]*?transform[\s\S]*?opacity/
    );
  }
);
