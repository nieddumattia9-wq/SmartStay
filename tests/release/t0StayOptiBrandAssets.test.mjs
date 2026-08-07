import assert from "node:assert/strict";
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

const BRAND_MARK_PATH =
  "public/brand/stayopti-mark.svg";

const FAVICON_PATH =
  "public/favicon.svg";

test(
  "StayOpti logo and favicon are safe source-controlled SVG assets",
  () => {
    for (
      const relativePath
      of [
        BRAND_MARK_PATH,
        FAVICON_PATH,
      ]
    ) {
      assert.ok(
        existsSync(relativePath),
        `Missing brand asset: ${relativePath}`
      );

      const asset =
        readText(relativePath);

      assert.match(
        asset,
        /^<svg\s[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*viewBox="0 0 96 96"[^>]*>/
      );

      assert.ok(
        asset.includes(
          'stroke="#16C65B"'
        ),
        `Approved logo green is missing from ${relativePath}`
      );

      assert.doesNotMatch(
        asset,
        /<script\b|\bon\w+\s*=|(?:href|src)\s*=|<foreignObject\b|data:/i,
        `Unsafe or external SVG content in ${relativePath}`
      );
    }

    const mark =
      readText(BRAND_MARK_PATH);

    const favicon =
      readText(FAVICON_PATH);

    assert.ok(
      mark.includes(
        "M18 14v12M12 20h12"
      ),
      "The approved sparkle detail is missing from the primary mark"
    );

    assert.ok(
      !favicon.includes(
        "M18 14v12M12 20h12"
      ),
      "The micro favicon must stay simplified"
    );

    for (
      const requiredShape
      of [
        "M61 11c-12.7 0-23 10.2-23 22.8",
        "m50.5 33.5 7.3 7.3 14.5-17",
        "M14 49v31",
      ]
    ) {
      assert.ok(
        mark.includes(requiredShape) &&
        favicon.includes(requiredShape),
        `Core StayOpti symbol is incomplete: ${requiredShape}`
      );
    }
  }
);

test(
  "StayOpti brand assets are wired into metadata, Navbar and Hero",
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

    const navbarCss =
      readText(
        "src/components/Navbar/Navbar.css"
      );

    const heroCss =
      readText(
        "src/components/Hero/Hero.css"
      );

    assert.ok(
      index.includes(
        '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />'
      ) &&
      index.includes(
        'name="theme-color"\n      content="#16c65b"'
      ),
      "StayOpti favicon or browser theme color is not wired"
    );

    for (
      const [
        relativePath,
        source,
      ]
      of [
        [
          "Navbar.tsx",
          navbar,
        ],
        [
          "Hero.tsx",
          hero,
        ],
      ]
    ) {
      assert.ok(
        source.includes(
          'src="/brand/stayopti-mark.svg"'
        ) &&
        source.includes(
          'alt=""'
        ) &&
        source.includes(
          "aria-hidden=\"true\""
        ) &&
        source.includes(
          "StayOpti"
        ),
        `Accessible StayOpti mark integration is incomplete in ${relativePath}`
      );
    }

    assert.ok(
      navbarCss.includes(
        ".navbar__brand-mark"
      ) &&
      navbarCss.includes(
        "width: 40px"
      ) &&
      navbarCss.includes(
        "width: 34px"
      ),
      "Navbar logo does not define deterministic desktop and mobile sizing"
    );

    assert.ok(
      heroCss.includes(
        ".hero__brand-mark"
      ) &&
      heroCss.includes(
        "width: 92px"
      ) &&
      heroCss.includes(
        "width: 68px"
      ) &&
      heroCss.includes(
        "color: #159447"
      ),
      "Hero logo and accessible wordmark do not preserve the approved responsive visual contract"
    );
  }
);

test(
  "StayOpti keeps the accessible Home wordmark color separate from the logo green",
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
  "StayOpti visual integration preserves public text and compatibility boundaries",
  () => {
    const navbar =
      readText(
        "src/components/Navbar/Navbar.tsx"
      );

    const hero =
      readText(
        "src/components/Hero/Hero.tsx"
      );

    assert.ok(
      navbar.includes(
        'aria-label="StayOpti home"'
      ) &&
      navbar.includes(
        '<span className="navbar__brand-name">'
      ) &&
      hero.includes(
        '<h1 className="hero__title">'
      ) &&
      hero.includes(
        "Find the smartest way to travel."
      ),
      "The visible and accessible public wordmark must remain text"
    );

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
