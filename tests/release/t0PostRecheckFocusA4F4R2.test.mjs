import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PANEL_PATH =
  "src/components/HotelDetailsPanel/HotelDetailsPanel.tsx";

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

test(
  "4F4R2 keeps focus inside the details dialog while rechecking",
  async () => {
    const panel = await readFile(
      PANEL_PATH,
      "utf8"
    );

    const handlerStart = panel.indexOf(
      "async function handleCheckFinalTotal()"
    );

    const handlerEnd = panel.indexOf(
      "useLayoutEffect(() => {",
      handlerStart
    );

    assert.ok(handlerStart >= 0);
    assert.ok(handlerEnd > handlerStart);

    const recheckHandler = panel.slice(
      handlerStart,
      handlerEnd
    );

    assert.match(
      recheckHandler,
      /postRecheckFocusPendingRef\.current\s*=\s*\n\s*true;/
    );

    assert.match(
      recheckHandler,
      /closeButtonRef\.current\?\.focus\(\{\s*\n\s*preventScroll:\s*true,\s*\n\s*\}\);[\s\S]*?setBookingBusy\(\s*\n\s*true/
    );
  }
);

test(
  "4F4R2 focuses the replacement action after every recheck outcome",
  async () => {
    const panel = await readFile(
      PANEL_PATH,
      "utf8"
    );

    assert.match(
      panel,
      /const postRecheckActionRef\s*=\s*\n\s*useRef<HTMLButtonElement>\(null\);/
    );

    assert.match(
      panel,
      /const verificationRegionRef\s*=\s*\n\s*useRef<HTMLElement>\(null\);/
    );

    assert.equal(
      countMatches(
        panel,
        /ref=\{postRecheckActionRef\}/g
      ),
      4
    );

    assert.match(
      panel,
      /<section\s*\n\s*ref=\{verificationRegionRef\}[\s\S]*?className="hotel-details-panel__verification"[\s\S]*?tabIndex=\{-1\}/
    );

    const focusEffect = panel.match(
      /useLayoutEffect\(\(\) => \{[\s\S]*?\n\s*\}\, \[[\s\S]*?bookingRecheck,[\s\S]*?\n\s*\]\);/
    )?.[0] ?? "";

    assert.match(
      focusEffect,
      /bookingBusy\s*\|\|\s*\n\s*!postRecheckFocusPendingRef\.current/
    );

    assert.match(
      focusEffect,
      /postRecheckActionRef\.current\s*\?\?\s*\n\s*verificationRegionRef\.current\s*\?\?\s*\n\s*closeButtonRef\.current\s*\?\?\s*\n\s*panelRef\.current/
    );

    assert.match(
      focusEffect,
      /document\.contains\(\s*\n\s*focusTarget\s*\n\s*\)/
    );

    assert.match(
      focusEffect,
      /postRecheckFocusPendingRef\.current\s*=\s*\n\s*false;[\s\S]*?focusTarget\.focus\(\{\s*\n\s*preventScroll:\s*true/
    );
  }
);
