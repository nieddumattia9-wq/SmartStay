import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  pathToFileURL,
} from "node:url";
import test from "node:test";
import ts from "typescript";

async function importPreferenceBalance() {
  const source = await readFile(
    "src/utils/preferenceBalance.ts",
    "utf8"
  );

  const compiled =
    ts.transpileModule(
      source,
      {
        compilerOptions: {
          module:
            ts.ModuleKind.ESNext,
          target:
            ts.ScriptTarget.ES2022,
        },
      }
    ).outputText;

  const temporaryDirectory =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "smartstay-r4d-"
      )
    );

  const modulePath =
    path.join(
      temporaryDirectory,
      "preferenceBalance.mjs"
    );

  await writeFile(
    modulePath,
    compiled,
    "utf8"
  );

  return {
    module:
      await import(
        pathToFileURL(
          modulePath
        ).href
      ),

    cleanup: () =>
      rm(
        temporaryDirectory,
        {
          recursive: true,
          force: true,
        }
      ),
  };
}

test(
  "R4D keeps Full SmartStay comparison collapsed until the matching Show control is activated",
  async () => {
    const [
      cardSource,
      cardCss,
    ] = await Promise.all([
      readFile(
        "src/components/HotelCard/HotelCard.tsx",
        "utf8"
      ),

      readFile(
        "src/components/HotelCard/HotelCard.css",
        "utf8"
      ),
    ]);

    assert.match(
      cardSource,
      /useState\(\s*false\s*\)/
    );

    assert.match(
      cardSource,
      /aria-expanded=\{\s*explanationExpanded\s*\}/
    );

    assert.match(
      cardSource,
      /id=\{explanationId\}[\s\S]{0,160}hidden=\{!explanationExpanded\}/
    );

    assert.match(
      cardCss,
      /\.hotel-card__explanation-groups\[hidden\]\s*\{[\s\S]{0,80}display:\s*none;/
    );
  }
);

test(
  "R4D preserves Maximum Savings for an extremely constrained budget even with flexible distance",
  async () => {
    const {
      module,
      cleanup,
    } =
      await importPreferenceBalance();

    try {
      const calculate =
        module.calculateAutomaticPreferenceBalance;

      const fourNights =
        calculate({
          hasDestination: true,
          totalBudget: 100,
          nightCount: 4,
          roomCount: 1,
          maxDistanceKm: null,
        });

      const tenNights =
        calculate({
          hasDestination: true,
          totalBudget: 100,
          nightCount: 10,
          roomCount: 1,
          maxDistanceKm: null,
        });

      assert.equal(
        fourNights.budgetPerRoomNight,
        25
      );

      assert.equal(
        fourNights.selectedIndex,
        4
      );

      assert.equal(
        tenNights.budgetPerRoomNight,
        10
      );

      assert.equal(
        tenNights.selectedIndex,
        4
      );

      assert.match(
        tenNights.explanation,
        /strongly prioritize the lowest reliable total prices/
      );
    } finally {
      await cleanup();
    }
  }
);

test(
  "R4D keeps flexible-distance softening only for low but non-extreme budgets",
  async () => {
    const {
      module,
      cleanup,
    } =
      await importPreferenceBalance();

    try {
      const calculate =
        module.calculateAutomaticPreferenceBalance;

      const flexible =
        calculate({
          hasDestination: true,
          totalBudget: 250,
          nightCount: 5,
          roomCount: 1,
          maxDistanceKm: null,
        });

      const constrained =
        calculate({
          hasDestination: true,
          totalBudget: 250,
          nightCount: 5,
          roomCount: 1,
          maxDistanceKm: 2,
        });

      assert.equal(
        flexible.budgetPerRoomNight,
        50
      );

      assert.equal(
        flexible.selectedIndex,
        3
      );

      assert.equal(
        constrained.selectedIndex,
        4
      );
    } finally {
      await cleanup();
    }
  }
);

test(
  "R4D does not turn a generous budget into a savings profile",
  async () => {
    const {
      module,
      cleanup,
    } =
      await importPreferenceBalance();

    try {
      const result =
        module.calculateAutomaticPreferenceBalance({
          hasDestination: true,
          totalBudget: 1500,
          nightCount: 3,
          roomCount: 1,
          maxDistanceKm: null,
        });

      assert.equal(
        result.budgetPerRoomNight,
        500
      );

      assert.equal(
        result.selectedIndex,
        0
      );
    } finally {
      await cleanup();
    }
  }
);
