import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

function fail(code) { throw new Error(code); }
function option(name) {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((entry) => entry.startsWith(prefix));
  return value?.slice(prefix.length) ?? null;
}
function assertOutsideRepository(repositoryRoot, target) {
  const absolute = resolve(target);
  if (!isAbsolute(absolute)) fail("MANUAL_CAPTURE_OUTPUT_ABSOLUTE_PATH_REQUIRED");
  const relation = relative(resolve(repositoryRoot), absolute);
  if (relation === "" || (!relation.startsWith(`..${sep}`) && relation !== ".." && !isAbsolute(relation))) fail("MANUAL_CAPTURE_REPOSITORY_OUTPUT_PROHIBITED");
  return absolute;
}
function writeNew(path, value) {
  if (existsSync(path)) fail("MANUAL_CAPTURE_REFUSES_OVERWRITE");
  writeFileSync(path, value, { encoding: "utf8", flag: "wx" });
}

const repositoryRoot = resolve(option("repository-root") ?? process.cwd());
const compiledRoot = resolve(option("compiled-root") ?? fail("MANUAL_CAPTURE_COMPILED_ROOT_REQUIRED"));
const outputDirectory = assertOutsideRepository(repositoryRoot, option("output-directory") ?? fail("MANUAL_CAPTURE_OUTPUT_REQUIRED"));
const modulePath = resolve(compiledRoot, "src/engine-v3/evaluation/manualPublicMarketDecisionGoldenCaptureV3.js");
const manual = await import(new URL(`file:///${modulePath.replaceAll("\\", "/")}`).href);
const mode = option("mode") ?? "initialize";
mkdirSync(outputDirectory, { recursive: true });

if (mode === "initialize") {
  const draft = {
    captureVersion: manual.STAYOPTI_MANUAL_MARKET_CAPTURE_VERSION_V3,
    captureId: "MANUAL_CAPTURE_001",
    lifecycle: "DRAFT",
    destinationBucket: "",
    checkin: "",
    checkout: "",
    adults: 2,
    childrenAges: [],
    rooms: 1,
    currency: "EUR",
    budgetMinorUnits: 0,
    preferenceProfile: "",
    hardConstraints: [],
    consumerSurfaceClass: "",
    loggedOut: true,
    membershipDiscountApplied: false,
    personalizedDiscountApplied: false,
    collectionWindowStart: "",
    collectionWindowEnd: "",
    selectionFrozenBeforeJudgment: true,
    alternatives: [],
  };
  writeNew(resolve(outputDirectory, "manual-market-capture.html"), manual.renderManualMarketCaptureInterfaceHtmlV3());
  writeNew(resolve(outputDirectory, "manual-market-capture-draft.json"), `${JSON.stringify(draft, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ status: "DRAFT_CREATED", outputDirectory, networkCalls: 0, credentialsLoaded: false })}\n`);
} else if (mode === "validate") {
  const inputPath = resolve(option("input") ?? fail("MANUAL_CAPTURE_INPUT_REQUIRED"));
  const capture = JSON.parse(readFileSync(inputPath, "utf8"));
  const validation = manual.validateManualMarketCaptureV3(capture);
  process.stdout.write(`${JSON.stringify({ status: validation.lifecycle, valid: validation.valid, issues: validation.issues, networkCalls: 0, credentialsLoaded: false })}\n`);
  if (!validation.valid) process.exitCode = 2;
} else {
  fail("MANUAL_CAPTURE_MODE_UNSUPPORTED");
}
