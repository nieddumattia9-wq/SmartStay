import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  existsSync,
  readFileSync,
} from "node:fs";
import test from "node:test";

function readText(
  relativePath
) {
  return readFileSync(
    relativePath,
    "utf8"
  ).replace(
    /\r\n/g,
    "\n"
  );
}

function sha256(
  relativePath
) {
  return crypto
    .createHash("sha256")
    .update(
      readFileSync(relativePath)
    )
    .digest("hex");
}

function readPngMetadata(
  relativePath
) {
  const bytes =
    readFileSync(relativePath);

  assert.ok(
    bytes.subarray(0, 8).equals(
      Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
      ])
    ),
    `Invalid PNG signature: ${relativePath}`
  );

  assert.equal(
    bytes.subarray(12, 16).toString("ascii"),
    "IHDR",
    `PNG IHDR is missing: ${relativePath}`
  );

  return {
    width:
      bytes.readUInt32BE(16),
    height:
      bytes.readUInt32BE(20),
    bitDepth:
      bytes[24],
    colorType:
      bytes[25],
    byteLength:
      bytes.length,
  };
}

const BRAND_LOGO_PATH =
  "public/brand/stayopti-logo.png";

const FAVICON_PATH =
  "public/favicon.png";

test(
  "StayOpti logo and favicon are the approved transparent PNG assets",
  () => {
    for (
      const relativePath
      of [
        BRAND_LOGO_PATH,
        FAVICON_PATH,
      ]
    ) {
      assert.ok(
        existsSync(relativePath),
        `Missing brand asset: ${relativePath}`
      );
    }

    const logo =
      readPngMetadata(
        BRAND_LOGO_PATH
      );

    const favicon =
      readPngMetadata(
        FAVICON_PATH
      );

    assert.deepEqual(
      {
        width:
          logo.width,
        height:
          logo.height,
        bitDepth:
          logo.bitDepth,
        colorType:
          logo.colorType,
      },
      {
        width:
          512,
        height:
          512,
        bitDepth:
          8,
        colorType:
          6,
      }
    );

    assert.deepEqual(
      {
        width:
          favicon.width,
        height:
          favicon.height,
        bitDepth:
          favicon.bitDepth,
        colorType:
          favicon.colorType,
      },
      {
        width:
          64,
        height:
          64,
        bitDepth:
          8,
        colorType:
          6,
      }
    );

    assert.equal(
      sha256(BRAND_LOGO_PATH),
      "9524981fd4f506fb60f22ce1cd773707d122057f129f5e48bda23cd2e36e1a50"
    );

    assert.equal(
      sha256(FAVICON_PATH),
      "5fe70df38ee87eab62f3b4e528595f3e2917db6a4671a9dcb0ef00b05b5d6eec"
    );

    assert.ok(
      logo.byteLength <
        250_000 &&
      favicon.byteLength <
        12_000,
      "StayOpti PNG assets exceed their web size budgets"
    );
  }
);

test(
  "StayOpti final logo is wired only into Navbar and browser metadata",
  () => {
    const index =
      readText("index.html");

    const navbar =
      readText(
        "src/components/Navbar/Navbar.tsx"
      );

    const hero =
      readText(
        "src/components/Hero/Hero.tsx"
      );

    const optimizer =
      readText(
        "src/components/TripOptimizer/TripOptimizer.tsx"
      );

    assert.ok(
      index.includes(
        'type="image/png"'
      ) &&
      index.includes(
        'sizes="64x64"'
      ) &&
      index.includes(
        'href="/favicon.png"'
      ) &&
      index.includes(
        'name="theme-color"\n      content="#16c65b"'
      ),
      "StayOpti PNG favicon or browser theme color is not wired"
    );

    assert.ok(
      navbar.includes(
        'src="/brand/stayopti-logo.png"'
      ) &&
      navbar.includes(
        'aria-label="StayOpti home"'
      ) &&
      navbar.includes(
        'alt=""'
      ) &&
      navbar.includes(
        'aria-hidden="true"'
      ),
      "Navbar does not expose the approved accessible StayOpti logo"
    );

    assert.doesNotMatch(
      navbar,
      /navbar__brand-name|>\s*StayOpti\s*</,
      "Navbar must display only the logo, without a visible wordmark"
    );

    assert.ok(
      hero.includes(
        '<h1 className="hero__title">'
      ) &&
      hero.includes(
        "StayOpti"
      ) &&
      hero.includes(
        "Find the smartest way to travel."
      ),
      "Hero must preserve the StayOpti text title and subtitle"
    );

    assert.doesNotMatch(
      hero,
      /<img\b|hero__brand-mark|stayopti-(?:mark|logo)/,
      "Hero must not display a logo above the StayOpti title"
    );

    assert.ok(
      optimizer.includes(
        "Find my stay"
      ) &&
      !optimizer.includes(
        "Find my StayOpti"
      ),
      "Home search CTA must use the approved Find my stay copy"
    );

    const runtimeBrandSources =
      [
        index,
        navbar,
        hero,
      ].join("\n");

    assert.doesNotMatch(
      runtimeBrandSources,
      /stayopti-mark\.svg|favicon\.svg/,
      "Legacy StayOpti symbols must not remain wired into runtime surfaces"
    );
  }
);

test(
  "StayOpti final Navbar logo keeps deterministic responsive sizing",
  () => {
    const navbarCss =
      readText(
        "src/components/Navbar/Navbar.css"
      );

    const heroCss =
      readText(
        "src/components/Hero/Hero.css"
      );

    assert.ok(
      navbarCss.includes(
        ".navbar__brand-mark"
      ) &&
      navbarCss.includes(
        "width: 40px"
      ) &&
      navbarCss.includes(
        "width: 34px"
      ) &&
      navbarCss.includes(
        "border-radius: 50%"
      ),
      "Navbar logo does not preserve desktop, mobile and focus sizing"
    );

    assert.doesNotMatch(
      navbarCss,
      /navbar__brand-name/,
      "Removed Navbar wordmark styles must not remain"
    );

    assert.doesNotMatch(
      heroCss,
      /hero__brand-mark/,
      "Removed Hero logo styles must not remain"
    );
  }
);

test(
  "StayOpti keeps the accessible Home wordmark color separate from the logo colors",
  () => {
    const heroCss =
      readText(
        "src/components/Hero/Hero.css"
      );

    assert.match(
      heroCss,
      /\.hero__title\s*\{[^}]*color:\s*#159447;/i,
      "The StayOpti Home wordmark must keep the approved WCAG-safe green"
    );

    assert.doesNotMatch(
      heroCss,
      /\.hero__title\s*\{[^}]*color:\s*#16c65b;/i,
      "The brighter asset green must not replace the accessible Home wordmark color"
    );
  }
);

test(
  "StayOpti visual refresh preserves compatibility-sensitive internal identifiers",
  () => {
    const rootPackage =
      JSON.parse(
        readText("package.json")
      );

    const serverPackage =
      JSON.parse(
        readText("server/package.json")
      );

    assert.equal(
      rootPackage.name,
      "smartstay"
    );

    assert.equal(
      serverPackage.name,
      "smartstay-server"
    );

    assert.ok(
      existsSync(
        "tests/release/t0StayOptiPublicBrandCompatibility.test.mjs"
      ),
      "The permanent public-brand compatibility gate must remain present"
    );
  }
);
