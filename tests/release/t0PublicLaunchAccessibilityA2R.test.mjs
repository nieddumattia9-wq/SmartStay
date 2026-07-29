import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(
    path,
    "utf8"
  ).replace(/\r\n/g, "\n");
}

function channelToLinear(channel) {
  const normalized =
    channel / 255;

  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow(
        (normalized + 0.055) / 1.055,
        2.4
      );
}

function relativeLuminance(hexColor) {
  const normalized =
    hexColor.replace("#", "");

  const red =
    channelToLinear(
      Number.parseInt(
        normalized.slice(0, 2),
        16
      )
    );

  const green =
    channelToLinear(
      Number.parseInt(
        normalized.slice(2, 4),
        16
      )
    );

  const blue =
    channelToLinear(
      Number.parseInt(
        normalized.slice(4, 6),
        16
      )
    );

  return (
    0.2126 * red +
    0.7152 * green +
    0.0722 * blue
  );
}

function contrastRatio(
  foreground,
  background
) {
  const foregroundLuminance =
    relativeLuminance(foreground);

  const backgroundLuminance =
    relativeLuminance(background);

  const lighter =
    Math.max(
      foregroundLuminance,
      backgroundLuminance
    );

  const darker =
    Math.min(
      foregroundLuminance,
      backgroundLuminance
    );

  return (lighter + 0.05) /
    (darker + 0.05);
}

test(
  "39C25A.2R uses a button date trigger with valid conditional popup relationships",
  () => {
    const calendar = read(
      "src/components/BookingCalendar/BookingCalendar.tsx"
    );

    assert.match(
      calendar,
      /<button[\s\S]*?ref=\{triggerRef\}[\s\S]*?id=\{inputId\}[\s\S]*?aria-haspopup="dialog"[\s\S]*?aria-expanded=\{isOpen\}/
    );

    assert.match(
      calendar,
      /aria-controls=\{[\s\S]*?isOpen[\s\S]*?\? popupId[\s\S]*?: undefined/
    );

    assert.match(
      calendar,
      /trigger\.focus\(\{[\s\S]*?preventScroll:\s*true/
    );

    assert.ok(
      !calendar.includes(
        "readOnly"
      )
    );

    assert.ok(
      !calendar.includes(
        "onFocus={openCalendar}"
      )
    );
  }
);

test(
  "39C25A.2R exposes aria-controls only while conditional dialogs exist",
  () => {
    const guests = read(
      "src/components/GuestsSelector/GuestsSelector.tsx"
    );

    const accounts = read(
      "src/components/AccountAccessControls/AccountAccessControls.tsx"
    );

    assert.match(
      guests,
      /aria-controls=\{[\s\S]*?isOpen[\s\S]*?\? popupId[\s\S]*?: undefined/
    );

    assert.match(
      accounts,
      /accountAction === "login"[\s\S]*?\? ACCOUNT_DIALOG_ID[\s\S]*?: undefined/
    );

    assert.match(
      accounts,
      /accountAction === "signup"[\s\S]*?\? ACCOUNT_DIALOG_ID[\s\S]*?: undefined/
    );
  }
);

test(
  "39C25A.2R keeps every remediated text contrast at WCAG AA thresholds",
  () => {
    const navbarCss = read(
      "src/components/Navbar/Navbar.css"
    );

    const heroCss = read(
      "src/components/Hero/Hero.css"
    );

    const calendarCss = read(
      "src/components/BookingCalendar/BookingCalendar.css"
    );

    const budgetCss = read(
      "src/components/BudgetSelector/BudgetSelector.css"
    );

    const distanceCss = read(
      "src/components/DistanceSelector/DistanceSelector.css"
    );

    const tripCss = read(
      "src/components/TripOptimizer/TripOptimizer.css"
    );

    const accountCss = read(
      "src/components/AccountAccessControls/AccountAccessControls.css"
    );

    const feedbackCss = read(
      "src/pages/BetaFeedback/BetaFeedback.css"
    );

    const responsiveCss = read(
      "src/styles/frontendMobile.css"
    );

    assert.match(
      navbarCss,
      /\.navbar__signup\s*\{[\s\S]*?background:\s*#047857/
    );

    assert.match(
      heroCss,
      /\.hero__title\s*\{[\s\S]*?color:\s*#159447/
    );

    assert.match(
      calendarCss,
      /\.calendar-grid__weekday\s*\{[\s\S]*?color:\s*#64748b/
    );

    assert.match(
      calendarCss,
      /\.calendar-grid__day--today\s*\{[\s\S]*?color:\s*#047857/
    );

    assert.match(
      budgetCss,
      /\.budget-selector__scale\s*\{[\s\S]*?color:\s*#64748b/
    );

    assert.match(
      budgetCss,
      /\.budget-selector__helper\s*\{[\s\S]*?color:\s*#64748b/
    );

    assert.match(
      distanceCss,
      /\.distance-selector__labels\s*\{[\s\S]*?color:\s*#64748b/
    );

    assert.match(
      distanceCss,
      /\.distance-selector__helper\s*\{[\s\S]*?color:\s*#64748b/
    );

    assert.match(
      tripCss,
      /\.trip-card__submit\s*\{[\s\S]*?background:\s*#047857/
    );

    assert.match(
      accountCss,
      /\.account-access__continue\s*\{[\s\S]*?background:\s*#047857/
    );

    assert.match(
      feedbackCss,
      /\.beta-feedback-form button\s*\{[\s\S]*?background:\s*#047857/
    );

    assert.match(
      responsiveCss,
      /\.results-page__eyebrow\s*\{[\s\S]*?color:\s*#047857/
    );

    const normalTextPairs = [
      ["#ffffff", "#047857"],
      ["#64748b", "#ffffff"],
      ["#64748b", "#f8fafc"],
      ["#047857", "#ffffff"],
      ["#047857", "#f8fafc"],
      ["#2563eb", "#f8fafc"],
      ["#1d4ed8", "#f8fafc"],
      ["#15803d", "#f8fafc"],
      ["#166534", "#f8fafc"],
    ];

    for (const [
      foreground,
      background,
    ] of normalTextPairs) {
      assert.ok(
        contrastRatio(
          foreground,
          background
        ) >= 4.5,
        `${foreground} on ${background} must reach 4.5:1`
      );
    }

    assert.ok(
      contrastRatio(
        "#159447",
        "#f8fafc"
      ) >= 3,
      "The large SmartStay hero title must reach 3:1"
    );
  }
);

test(
  "39C25A.2R preserves bright preference accents while using accessible title colors",
  () => {
    const sliderData = read(
      "src/components/SmartOptimizer/sliderData.ts"
    );

    const optimizer = read(
      "src/components/SmartOptimizer/SmartOptimizer.tsx"
    );

    assert.match(
      sliderData,
      /id: "balanced"[\s\S]*?color: "#16E06E"[\s\S]*?textColor: "#047857"/
    );

    assert.match(
      optimizer,
      /selectedOption\.textColor/
    );

    assert.match(
      optimizer,
      /<SliderTrack[\s\S]*?color=\{[\s\S]*?selectedOption\.color/
    );
  }
);

test(
  "39C25A.2R keeps one coherent accessible green hierarchy across the Home",
  () => {
    const navbarCss = read(
      "src/components/Navbar/Navbar.css"
    );

    const heroCss = read(
      "src/components/Hero/Hero.css"
    );

    const destinationCss = read(
      "src/components/DestinationAutocomplete/DestinationAutocomplete.css"
    );

    const calendarCss = read(
      "src/components/BookingCalendar/BookingCalendar.css"
    );

    const guestsCss = read(
      "src/components/GuestsSelector/GuestsSelector.css"
    );

    const budgetCss = read(
      "src/components/BudgetSelector/BudgetSelector.css"
    );

    const distanceCss = read(
      "src/components/DistanceSelector/DistanceSelector.css"
    );

    const tripCss = read(
      "src/components/TripOptimizer/TripOptimizer.css"
    );

    assert.match(
      heroCss,
      /\.hero__title\s*\{[\s\S]*?color:\s*#159447/
    );

    assert.match(
      navbarCss,
      /\.navbar__signup\s*\{[\s\S]*?background:\s*#047857/
    );

    assert.match(
      tripCss,
      /\.trip-card__submit\s*\{[\s\S]*?background:\s*#047857/
    );

    assert.match(
      destinationCss,
      /\.destination-autocomplete__mark\s*\{[\s\S]*?color:\s*#047857/
    );

    assert.match(
      destinationCss,
      /\.destination-autocomplete__icon\s*\{[\s\S]*?color:\s*#159447/
    );

    assert.match(
      calendarCss,
      /\.booking-calendar__icon\s*\{[\s\S]*?color:\s*#159447/
    );

    assert.match(
      guestsCss,
      /\.guests-selector__left\s*\{[\s\S]*?color:\s*#159447/
    );

    assert.match(
      budgetCss,
      /\.budget-selector__icon\s*\{[\s\S]*?color:\s*#159447/
    );

    assert.match(
      distanceCss,
      /\.distance-selector__icon\s*\{[\s\S]*?color:\s*#159447/
    );

    assert.match(
      budgetCss,
      /#16a34a 0,[\s\S]*?#16a34a var\(--budget-progress\)/
    );

    assert.match(
      budgetCss,
      /\.budget-selector__range::-webkit-slider-thumb[\s\S]*?border:\s*3px solid #16a34a[\s\S]*?background:\s*#16a34a/
    );

    assert.match(
      distanceCss,
      /accent-color:\s*#16a34a/
    );

    assert.match(
      guestsCss,
      /\.counter button:hover:not\(:disabled\)[\s\S]*?color:\s*#047857/
    );

    assert.match(
      budgetCss,
      /\.budget-selector__clear:hover\s*\{[\s\S]*?color:\s*#047857/
    );

    assert.ok(
      !budgetCss.includes(
        "#86dba8"
      )
    );

    assert.ok(
      !budgetCss.includes(
        "#22c55e"
      )
    );

    assert.ok(
      !distanceCss.includes(
        "#22c55e"
      )
    );

    assert.ok(
      !destinationCss.includes(
        "#16e06e"
      )
    );

    assert.ok(
      !guestsCss.includes(
        "#16e06e"
      )
    );

    assert.ok(
      contrastRatio(
        "#ffffff",
        "#047857"
      ) >= 4.5,
      "Primary CTA white text must reach 4.5:1"
    );

    assert.ok(
      contrastRatio(
        "#159447",
        "#f8fafc"
      ) >= 3,
      "Large brand title must reach 3:1"
    );
  }
);
