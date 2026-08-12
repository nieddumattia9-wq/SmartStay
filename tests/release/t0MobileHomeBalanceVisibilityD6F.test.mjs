import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(
    relativePath,
    "utf8"
  ).replace(/\r\n/g, "\n");
}

test(
  "D6F places the automatic StayOpti balance before distance and budget in mobile reading order",
  () => {
    const trip = read(
      "src/components/TripOptimizer/TripOptimizer.tsx"
    );

    const guestsIndex =
      trip.indexOf("<GuestsSelector");
    const balanceIndex =
      trip.indexOf("<SmartOptimizer");
    const distanceIndex =
      trip.indexOf("<DistanceSelector");
    const budgetIndex =
      trip.indexOf("<BudgetSelector");

    assert.ok(guestsIndex >= 0);
    assert.ok(balanceIndex > guestsIndex);
    assert.ok(distanceIndex > balanceIndex);
    assert.ok(budgetIndex > distanceIndex);

    assert.equal(
      (trip.match(/<SmartOptimizer/g) ?? []).length,
      1,
      "The Home must keep a single balance indicator."
    );
  }
);

test(
  "D6F preserves the desktop comparison while exposing the requested mobile sequence",
  () => {
    const css = read(
      "src/components/TripOptimizer/TripOptimizer.css"
    );

    assert.match(
      css,
      /grid-template-areas:\s*"guests budget"\s*"distance budget"\s*"balance balance"/
    );

    assert.match(
      css,
      /@media \(max-width: 640px\)[\s\S]*?grid-template-areas:\s*"guests"\s*"balance"\s*"distance"\s*"budget"/
    );

    assert.match(
      css,
      /\.trip-card__balance-indicator\s*\{\s*grid-area:\s*balance;/
    );
  }
);

test(
  "D6F renders savings on the left and comfort on the right without changing preference identities",
  () => {
    const optimizer = read(
      "src/components/SmartOptimizer/SmartOptimizer.tsx"
    );
    const sliderData = read(
      "src/components/SmartOptimizer/sliderData.ts"
    );
    const track = read(
      "src/components/SmartOptimizer/SliderTrack.tsx"
    );

    assert.match(
      optimizer,
      /optimizer-labels[\s\S]*?More savings[\s\S]*?More comfort/
    );

    assert.match(
      optimizer,
      /MAX_INDEX\s*-\s*sanitizeIndex\(index\)/
    );

    const expectedPreferenceOrder = [
      "maximum-comfort",
      "comfort",
      "balanced",
      "savings",
      "maximum-savings",
    ];

    const actualPreferenceOrder = [
      ...sliderData.matchAll(/id:\s*"([^"]+)"/g),
    ].map((match) => match[1]);

    assert.deepEqual(
      actualPreferenceOrder,
      expectedPreferenceOrder,
      "Visual inversion must not reorder the engine-facing preference identities."
    );

    assert.ok(!optimizer.includes("onChange"));
    assert.ok(!track.includes('role="slider"'));
    assert.match(track, /role="img"/);
  }
);
