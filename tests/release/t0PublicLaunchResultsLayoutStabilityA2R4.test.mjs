import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(relativePath, "utf8");
}

function readRule(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?\\}`))?.[0] ?? "";
}

function sectionBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test("R4C keeps one stable Results shell through loading, ranking and final content", async () => {
  const [appCss, resultsCss, mobileCss, resultsSource] = await Promise.all([
    read("src/App.css"),
    read("src/pages/Results/Results.css"),
    read("src/styles/frontendMobile.css"),
    read("src/pages/Results/Results.tsx"),
  ]);

  const appRule = readRule(appCss, ".app");
  const sharedResultsRule = readRule(mobileCss, ".results-page");
  const competingResultsRules = resultsCss.match(/(?:^|\n)\.results-page\s*\{/g) ?? [];

  assert.match(appRule, /display:\s*flex/i);
  assert.match(appRule, /flex-direction:\s*column/i);
  assert.match(appRule, /align-items:\s*center/i);

  assert.equal(
    competingResultsRules.length,
    0,
    "Results.css must not compete with the shared Results sizing rule.",
  );

  assert.match(sharedResultsRule, /width:\s*100%/i);
  assert.match(sharedResultsRule, /min-width:\s*0/i);
  assert.match(sharedResultsRule, /max-width:\s*1300px/i);
  assert.match(sharedResultsRule, /margin:\s*clamp\(24px,\s*4vw,\s*40px\)\s+auto/i);
  assert.doesNotMatch(sharedResultsRule, /width:\s*auto/i);
  assert.doesNotMatch(sharedResultsRule, /align-self:\s*stretch/i);

  const loadingBranch = sectionBetween(
    resultsSource,
    "    if (loading) {",
    "    if (\n      hotels.length > 0 &&",
  );
  const rankingBranch = sectionBetween(
    resultsSource,
    "    if (\n      hotels.length > 0 &&",
    "    if (error || engineError) {",
  );

  for (const branch of [loadingBranch, rankingBranch]) {
    assert.match(branch, /className="results-page results-page--pending"/);
    assert.match(branch, /aria-busy="true"/);
    assert.match(branch, /className="results-state results-state--loading"/);
    assert.match(branch, /role="status"/);
    assert.match(branch, /aria-live="polite"/);
  }

  assert.match(loadingBranch, /Loading hotels\.\.\./);
  assert.match(rankingBranch, /SmartStay Engine V2 is ranking your stays\.\.\./);

  const pendingShellCount = (
    resultsSource.match(/className="results-page results-page--pending"/g) ?? []
  ).length;
  assert.equal(pendingShellCount, 2);

  assert.match(
    resultsSource,
    /return \(\s*<div className="results-page">\s*<section className="results-page__header">/,
    "The final Results view must keep the same outer results-page shell.",
  );
});
