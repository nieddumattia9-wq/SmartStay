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

test("R4B gives Results one stable flex cross-axis sizing contract", async () => {
  const [appCss, resultsCss, mobileCss] = await Promise.all([
    read("src/App.css"),
    read("src/pages/Results/Results.css"),
    read("src/styles/frontendMobile.css"),
  ]);

  const appRule = readRule(appCss, ".app");
  const mobileResultsRule = readRule(mobileCss, ".results-page");
  const resultsPageRules = resultsCss.match(/(?:^|\n)\.results-page\s*\{/g) ?? [];

  assert.match(appRule, /display:\s*flex/i);
  assert.match(appRule, /flex-direction:\s*column/i);
  assert.match(appRule, /align-items:\s*center/i);

  assert.equal(
    resultsPageRules.length,
    0,
    "Results.css must not compete with the final shared Results sizing rule.",
  );

  assert.match(mobileResultsRule, /align-self:\s*stretch/i);
  assert.match(mobileResultsRule, /width:\s*auto/i);
  assert.match(mobileResultsRule, /min-width:\s*0/i);
  assert.match(mobileResultsRule, /max-width:\s*1300px/i);
  assert.match(mobileResultsRule, /margin:\s*clamp\(24px,\s*4vw,\s*40px\)\s+auto/i);
});
