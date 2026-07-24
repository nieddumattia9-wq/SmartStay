import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

function readText(path) {
  return readFileSync(
    path,
    "utf8"
  ).replace(
    /\r\n/g,
    "\n"
  );
}

function assertContains(
  text,
  expected,
  label
) {
  assert.ok(
    text.includes(
      expected
    ),
    `${label}: missing ${JSON.stringify(expected)}.`
  );
}

test(
  "controlled beta blocks indexing through three independent surfaces",
  () => {
    const index =
      readText(
        "index.html"
      );

    const robots =
      readText(
        "public/robots.txt"
      );

    const render =
      readText(
        "render.yaml"
      );

    assert.match(
      index,
      /name="robots"[\s\S]*content="noindex, nofollow, noarchive, nosnippet"/
    );

    assert.equal(
      robots.trim(),
      [
        "User-agent: *",
        "Disallow: /",
      ].join("\n")
    );

    assertContains(
      render,
      "        name: X-Robots-Tag\n" +
        "        value: noindex, nofollow, noarchive, nosnippet\n",
      "Render noindex header"
    );
  }
);

test(
  "controlled beta exposes privacy and feedback without fake frontend security",
  () => {
    const app =
      readText(
        "src/App.tsx"
      );

    const footer =
      readText(
        "src/components/BetaFooter/BetaFooter.tsx"
      );

    const privacy =
      readText(
        "src/pages/Privacy/Privacy.tsx"
      );

    const feedback =
      readText(
        "src/pages/BetaFeedback/BetaFeedback.tsx"
      );

    assertContains(
      app,
      'path="/privacy"',
      "privacy route"
    );

    assertContains(
      app,
      'path="/feedback"',
      "feedback route"
    );

    assertContains(
      footer,
      'to="/privacy"',
      "privacy link"
    );

    assertContains(
      footer,
      'to="/feedback"',
      "feedback link"
    );

    assertContains(
      footer,
      "Private controlled beta. Please do not share this link publicly.",
      "private beta notice"
    );

    for (
      const expected
      of [
        "No analytics cookies are used.",
        "Do Not Track and Global Privacy Control disable collection.",
        "at most 30 days",
        "at most 180 days",
        "same private channel",
        "does not collect payment-card details",
      ]
    ) {
      assertContains(
        privacy,
        expected,
        "privacy notice"
      );
    }

    assert.match(
      feedback,
      /SmartStay does not submit the text\s+automatically\./
    );

    assert.match(
      feedback,
      /import type \{\s*FormEvent,?\s*\} from "react";/
    );

    assert.ok(
      !/import \{[^}]*\bFormEvent\b[^}]*\} from "react";/s.test(
        feedback
      ),
      "FormEvent must remain a type-only import with verbatimModuleSyntax."
    );

    assertContains(
      feedback,
      "navigator.clipboard.writeText",
      "feedback copy"
    );

    assertContains(
      feedback,
      "same private channel",
      "feedback return path"
    );

    assert.ok(
      !/\bfetch\s*\(/.test(
        feedback
      ),
      "The beta feedback page must not silently submit free text."
    );

    const combined =
      [
        app,
        footer,
        privacy,
        feedback,
      ].join("\n");

    assert.ok(
      !/(VITE_)?BETA_(ACCESS_)?CODE|inviteCode|accessCode/i.test(
        combined
      ),
      "A frontend-only beta code would be security theatre."
    );
  }
);

test(
  "controlled beta analytics are explicit, private and operationally bounded",
  () => {
    const render =
      readText(
        "render.yaml"
      );

    const operations =
      readText(
        "docs/CONTROLLED_BETA_OPERATIONS.md"
      );

    const privacyContract =
      readText(
        "docs/ANALYTICS_PRIVACY.md"
      );

    assertContains(
      render,
      "      - key: ANALYTICS_ENABLED\n" +
        '        value: "true"\n',
      "backend analytics"
    );

    assert.equal(
      (
        render.match(
          /- key: VITE_ANALYTICS_ENABLED\n\s+value: "true"/g
        ) ?? []
      ).length,
      2
    );

    assertContains(
      render,
      "      - key: ANALYTICS_ADMIN_TOKEN\n" +
        "        sync: false\n",
      "admin token"
    );

    assertContains(
      render,
      "      - key: ANALYTICS_STORAGE_MODE\n" +
        "        value: in-memory-single-instance\n",
      "storage truth"
    );

    assertContains(
      render,
      "      - key: ANALYTICS_VOLATILE_STORAGE_ACKNOWLEDGED\n" +
        '        value: "true"\n',
      "volatile acknowledgement"
    );

    for (
      const expected
      of [
        /10-20 real\s+testers/,
        /frontend-only\s+password/,
        /add the token\s+manually/,
        /avoid unnecessary deploys/,
        /capture the aggregate report regularly/,
        /Pause invitations immediately/,
      ]
    ) {
      assert.match(
        operations,
        expected
      );
    }

    assertContains(
      privacyContract,
      "## Public controlled-beta notice",
      "privacy contract"
    );
  }
);

test(
  "controlled beta checks are permanent release tests",
  () => {
    const packageJson =
      JSON.parse(
        readText(
          "package.json"
        )
      );

    const workflow =
      readText(
        ".github/workflows/release-gate.yml"
      );

    assert.equal(
      packageJson.scripts["test:beta"],
      "node --test tests/beta/*.test.mjs"
    );

    assert.match(
      packageJson.scripts.test,
      /npm run test:beta/
    );

    assertContains(
      workflow,
      "            docs/CONTROLLED_BETA_OPERATIONS.md\n",
      "release evidence"
    );
  }
);
