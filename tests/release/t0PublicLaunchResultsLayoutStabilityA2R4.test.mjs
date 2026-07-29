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

test("R4A keeps the Results page at a stable full cross-axis width", async () => {
  const [appCss, resultsCss] = await Promise.all([
    read("src/App.css"),
    read("src/pages/Results/Results.css"),
  ]);

  const appRule = readRule(appCss, ".app");
  const resultsPageRule = readRule(resultsCss, ".results-page");

  assert.match(appRule, /display:\s*flex/i);
  assert.match(appRule, /flex-direction:\s*column/i);
  assert.match(appRule, /align-items:\s*center/i);

  assert.match(resultsPageRule, /width:\s*100%/i);
  assert.match(resultsPageRule, /min-width:\s*0/i);
  assert.match(resultsPageRule, /max-width:\s*100%/i);
});
