import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(relativePath, "utf8");
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

test("R3 restores modal focus to the current hotel-card trigger", async () => {
  const [card, results, panel] = await Promise.all([
    read("src/components/HotelCard/HotelCard.tsx"),
    read("src/pages/Results/Results.tsx"),
    read("src/components/HotelDetailsPanel/HotelDetailsPanel.tsx"),
  ]);

  assert.match(card, /function getHotelDetailsTriggerId\(/);
  assert.match(card, /id=\{getHotelDetailsTriggerId\(hotel\.id\)\}/);
  assert.match(results, /const\s*\[\s*detailsReturnFocusId,\s*setDetailsReturnFocusId,\s*\]\s*=\s*useState<string \| null>\(null\)/);
  assert.match(results, /setDetailsReturnFocusId\(\s*\n\s*getHotelDetailsTriggerId\(\s*\n\s*hotel\.id/);
  assert.match(results, /returnFocusId=\{\s*\n\s*detailsReturnFocusId\s*\n\s*\}/);
  assert.doesNotMatch(results, /detailsReturnFocusIdRef|returnFocusId=\{[^}]*\.current/);
  assert.match(panel, /returnFocusId\?: string \| null;/);
  assert.match(panel, /document\.getElementById\(\s*\n\s*returnFocusId/);
  assert.match(panel, /currentReturnTarget\.focus\(\)/);
  assert.match(panel, /\}, \[onClose, returnFocusId\]\);/);
});

test("R3 keeps aria-controls targets mounted and hidden when collapsed", async () => {
  const [card, results] = await Promise.all([
    read("src/components/HotelCard/HotelCard.tsx"),
    read("src/pages/Results/Results.tsx"),
  ]);

  assert.match(card, /aria-controls=\{\s*\n\s*explanationId\s*\n\s*\}/);
  assert.match(card, /id=\{explanationId\}[\s\S]*?hidden=\{!explanationExpanded\}/);
  assert.doesNotMatch(card, /\{explanationExpanded && \(\s*\n\s*<div\s*\n\s*id=\{explanationId\}/);

  assert.match(results, /aria-controls="results-full-list"/);
  assert.match(results, /id="results-full-list"\s*\n\s*hidden=\{!showFullList\}/);
  assert.equal(countMatches(results, /id="results-full-list"/g), 1);
});

test("R3 exposes the Results summary as an atomic polite status", async () => {
  const results = await read("src/pages/Results/Results.tsx");
  const summaryOpening = results.match(
    /<div\s*\n\s*className="results-search-summary__facts"[\s\S]*?>/
  )?.[0] ?? "";

  assert.match(summaryOpening, /role="status"/);
  assert.match(summaryOpening, /aria-live="polite"/);
  assert.match(summaryOpening, /aria-atomic="true"/);
  assert.match(summaryOpening, /aria-label=/);
});

test("R3 applies the four confirmed AA contrast fixes", async () => {
  const [cardCss, panelCss, results] = await Promise.all([
    read("src/components/HotelCard/HotelCard.css"),
    read("src/components/HotelDetailsPanel/HotelDetailsPanel.css"),
    read("src/pages/Results/Results.tsx"),
  ]);

  const reviewRule = cardCss.match(
    /\.hotel-card__review-count\s*\{[\s\S]*?\}/
  )?.[0] ?? "";
  const eyebrowRule = panelCss.match(
    /\.hotel-details-panel__eyebrow,[\s\S]*?\}/
  )?.[0] ?? "";
  const bookingRule = panelCss.match(
    /\.hotel-details-panel__booking\s*\{[\s\S]*?\}/
  )?.[0] ?? "";

  assert.match(reviewRule, /color:\s*#475569/i);
  assert.match(eyebrowRule, /color:\s*#047857/i);
  assert.match(bookingRule, /background:\s*#047857/i);
  assert.match(results, /Full list[\s\S]{0,700}?color: "#047857"|color: "#047857"[\s\S]{0,700}?Full list/);
});
