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
  "D6D restores one full-width recommendation card per desktop row",
  () => {
    const results =
      read(
        "src/pages/Results/Results.css"
      );

    assert.match(
      results,
      /D6D DESKTOP STACKED GROUPS/
    );

    assert.match(
      results,
      /@media \(min-width:\s*980px\)[\s\S]*?\.results__recommendation-list\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column/
    );

    assert.match(
      results,
      /\.results__recommendation-list[\s\S]*?\.hotel-card\s*\{[\s\S]*?flex-direction:\s*row/
    );
  }
);

test(
  "D6D uses a compact mobile decision-card layout",
  () => {
    const card =
      read(
        "src/components/HotelCard/HotelCard.css"
      );

    assert.match(
      card,
      /D6D MOBILE DECISION CARD/
    );

    assert.match(
      card,
      /@media \(max-width:\s*680px\)[\s\S]*?\.hotel-card\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns/
    );

    assert.match(
      card,
      /\.hotel-card__content,[\s\S]*?\.hotel-card__main\s*\{[\s\S]*?display:\s*contents/
    );

    assert.match(
      card,
      /\.hotel-card__decision-panel li:not\(:first-child\)\s*\{[\s\S]*?display:\s*none/
    );

    assert.match(
      card,
      /\.hotel-card__bottom\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/
    );

    assert.match(
      card,
      /@media \(max-width:\s*380px\)[\s\S]*?\.hotel-card__bottom\s*\{[\s\S]*?grid-template-columns:\s*1fr/
    );
  }
);
