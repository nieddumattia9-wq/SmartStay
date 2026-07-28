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

test(
  "D6E keeps calendar state connected and uses native button semantics",
  () => {
    const bookingCalendar = read(
      "src/components/BookingCalendar/BookingCalendar.tsx"
    );

    const calendarGrid = read(
      "src/components/BookingCalendar/CalendarGrid.tsx"
    );

    assert.match(
      bookingCalendar,
      /<Calendar[\s\S]*?initialDate=\{[\s\S]*?checkIn[\s\S]*?new Date\(\)[\s\S]*?checkIn=\{checkIn\}[\s\S]*?checkOut=\{checkOut\}[\s\S]*?onSelectDay=\{handleSelectDay\}/
    );

    assert.match(
      calendarGrid,
      /aria-pressed=\{isSelected\}/
    );

    assert.match(
      calendarGrid,
      /aria-current=\{[\s\S]*?day\.isToday[\s\S]*?"date"/
    );

    assert.match(
      calendarGrid,
      /within selected stay/
    );

    assert.ok(
      !calendarGrid.includes(
        'role="grid"'
      )
    );

    assert.ok(
      !calendarGrid.includes(
        'role="gridcell"'
      )
    );

    assert.ok(
      !calendarGrid.includes(
        "aria-selected"
      )
    );
  }
);

test(
  "D6E restores popup focus and preserves mobile centering during animation",
  () => {
    const bookingCalendar = read(
      "src/components/BookingCalendar/BookingCalendar.tsx"
    );

    const bookingCalendarCss = read(
      "src/components/BookingCalendar/BookingCalendar.css"
    );

    const guests = read(
      "src/components/GuestsSelector/GuestsSelector.tsx"
    );

    const guestsCss = read(
      "src/components/GuestsSelector/GuestsSelector.css"
    );

    assert.match(
      bookingCalendar,
      /closeCalendar\(true\)/
    );

    assert.match(
      bookingCalendar,
      /trigger\.focus\(\{[\s\S]*?preventScroll:\s*true/
    );

    assert.match(
      guests,
      /closeSelector\(true\)/
    );

    assert.match(
      guests,
      /triggerRef\.current\?\.focus\(\{[\s\S]*?preventScroll:\s*true/
    );

    assert.match(
      bookingCalendarCss,
      /@keyframes bookingCalendarFadeMobile[\s\S]*?translateX\(-50%\)[\s\S]*?translateX\(-50%\)/
    );

    assert.match(
      guestsCss,
      /@keyframes guests-popup-mobile[\s\S]*?translateX\(-50%\)[\s\S]*?translateX\(-50%\)/
    );

    assert.match(
      bookingCalendarCss,
      /prefers-reduced-motion:\s*reduce[\s\S]*?animation:\s*none/
    );

    assert.match(
      guestsCss,
      /prefers-reduced-motion:\s*reduce[\s\S]*?animation:\s*none/
    );
  }
);

test(
  "D6E aligns guest ages with the public contract and makes the trigger a true toggle",
  () => {
    const guests = read(
      "src/components/GuestsSelector/GuestsSelector.tsx"
    );

    assert.match(
      guests,
      /Adults[\s\S]*?Ages 13\+/
    );

    assert.match(
      guests,
      /Children[\s\S]*?Ages 0–12/
    );

    assert.ok(
      !guests.includes(
        "Ages 18+"
      )
    );

    assert.match(
      guests,
      /aria-controls=\{[\s\S]*?isOpen[\s\S]*?\? popupId[\s\S]*?: undefined/
    );

    assert.match(
      guests,
      /onClick=\{\(\) => \{[\s\S]*?if \(isOpen\)[\s\S]*?closeSelector\(\)[\s\S]*?openSelector\(\)/
    );
  }
);

test(
  "D6E supports submit by Enter and announces destination loading",
  () => {
    const tripOptimizer = read(
      "src/components/TripOptimizer/TripOptimizer.tsx"
    );

    const destination = read(
      "src/components/DestinationAutocomplete/DestinationAutocomplete.tsx"
    );

    assert.match(
      tripOptimizer,
      /<form[\s\S]*?className="trip-card"[\s\S]*?aria-label="Search stays"[\s\S]*?onSubmit=\{\(event\)/
    );

    assert.match(
      tripOptimizer,
      /type="submit"[\s\S]*?className="trip-card__submit"/
    );

    assert.match(
      destination,
      /role="status"/
    );

    assert.match(
      destination,
      /aria-live="polite"/
    );

    assert.match(
      destination,
      /aria-label="Destination"/
    );

    assert.match(
      destination,
      /aria-busy=\{loading\}/
    );
  }
);

test(
  "D6E removes the nested main and connects expandable controls",
  () => {
    const results = read(
      "src/pages/Results/Results.tsx"
    );

    const details = read(
      "src/components/HotelDetailsPanel/HotelDetailsPanel.tsx"
    );

    const detailsCss = read(
      "src/components/HotelDetailsPanel/HotelDetailsPanel.css"
    );

    const cardCss = read(
      "src/components/HotelCard/HotelCard.css"
    );

    const mapCss = read(
      "src/components/LocationMapPreview/LocationMapPreview.css"
    );

    assert.ok(
      !results.includes(
        '<main className="results-page">'
      )
    );

    assert.match(
      results,
      /aria-controls="results-full-list"/
    );

    assert.match(
      results,
      /id="results-full-list"/
    );

    assert.match(
      details,
      /aria-controls=\{[\s\S]*?descriptionId/
    );

    assert.match(
      details,
      /aria-controls=\{[\s\S]*?amenitiesId/
    );

    assert.match(
      detailsCss,
      /\.hotel-details-panel__description-toggle\s*\{[\s\S]*?min-height:\s*44px/
    );

    assert.match(
      detailsCss,
      /\.hotel-details-panel__amenity-toggle\s*\{[\s\S]*?min-height:\s*44px/
    );

    assert.match(
      cardCss,
      /\.hotel-card__engine-toggle\s*\{[\s\S]*?min-height:\s*44px/
    );

    assert.match(
      mapCss,
      /\.hotel-location-map__link\s*\{[\s\S]*?min-height:\s*44px/
    );
  }
);

test(
  "D6E preserves Login and Sign up while giving both an honest dialog action",
  () => {
    const navbar = read(
      "src/components/Navbar/Navbar.tsx"
    );

    const accountControls = read(
      "src/components/AccountAccessControls/AccountAccessControls.tsx"
    );

    assert.match(
      navbar,
      /AccountAccessControls/
    );

    assert.match(
      accountControls,
      />\s*Login\s*</
    );

    assert.match(
      accountControls,
      />\s*Sign up\s*</
    );

    assert.match(
      accountControls,
      /aria-haspopup="dialog"/
    );

    assert.match(
      accountControls,
      /role="dialog"/
    );

    assert.match(
      accountControls,
      /aria-modal="true"/
    );

    assert.match(
      accountControls,
      /Account features are being prepared[\s\S]*?controlled beta/
    );

    assert.match(
      accountControls,
      /booking partner without signing in/
    );
  }
);

test(
  "D6E traps and restores account-dialog focus with mobile-safe targets",
  () => {
    const accountControls = read(
      "src/components/AccountAccessControls/AccountAccessControls.tsx"
    );

    const accountControlsCss = read(
      "src/components/AccountAccessControls/AccountAccessControls.css"
    );

    assert.match(
      accountControls,
      /event\.key === "Escape"/
    );

    assert.match(
      accountControls,
      /dialogElement\.contains\([\s\S]*?document\.activeElement/
    );

    assert.match(
      accountControls,
      /openerRef\.current\?\.focus/
    );

    assert.match(
      accountControlsCss,
      /\.navbar__login,[\s\S]*?\.navbar__signup\s*\{[\s\S]*?min-height:\s*44px/
    );

    assert.match(
      accountControlsCss,
      /\.navbar__login\s*\{[\s\S]*?min-width:\s*44px/
    );

    assert.match(
      accountControlsCss,
      /\.account-access__close\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px/
    );

    assert.match(
      accountControlsCss,
      /max-height:\s*calc\(100dvh - 40px\)/
    );

    assert.match(
      accountControlsCss,
      /overscroll-behavior:\s*contain/
    );
  }
);

test(
  "D6E keeps the account dialog capture non-null inside the delayed key handler",
  () => {
    const accountControls = read(
      "src/components/AccountAccessControls/AccountAccessControls.tsx"
    );

    assert.match(
      accountControls,
      /const currentDialog\s*=\s*dialogRef\.current;/
    );

    assert.match(
      accountControls,
      /if \(!currentDialog\) \{[\s\S]*?return;[\s\S]*?\}/
    );

    assert.match(
      accountControls,
      /const dialogElement:\s*HTMLElement\s*=\s*currentDialog;/
    );

    assert.match(
      accountControls,
      /dialogElement\.querySelectorAll<HTMLElement>/
    );

    assert.match(
      accountControls,
      /dialogElement\.focus\(/
    );

    assert.match(
      accountControls,
      /dialogElement\.contains\(/
    );

    assert.ok(
      !/\bdialog\.(?:querySelectorAll|focus|contains)\b/.test(
        accountControls
      )
    );
  }
);

test(
  "D6E removes render-time ref access from the destination combobox",
  () => {
    const destination = read(
      "src/components/DestinationAutocomplete/DestinationAutocomplete.tsx"
    );

    assert.match(
      destination,
      /const \[hasSelectedDestination, setHasSelectedDestination\][\s\S]*?useState\(false\)/
    );

    assert.match(
      destination,
      /setHasSelectedDestination\(true\)/
    );

    assert.match(
      destination,
      /setHasSelectedDestination\(false\)/
    );

    assert.match(
      destination,
      /const showDropdown\s*=[\s\S]*?!hasSelectedDestination;/
    );

    assert.ok(
      !/const showDropdown\s*=[\s\S]{0,240}selectedDestinationLabelRef\.current/.test(
        destination
      )
    );

    assert.ok(
      !destination.includes(
        "export const cleanDestinationCountry"
      )
    );

    assert.match(
      destination,
      /normalizeDestinationCountry\([\s\S]*?destination\.country/
    );

    assert.match(
      destination,
      /\}, \[[\s\S]*?closeDropdown,[\s\S]*?debouncedQuery,[\s\S]*?\]\);/
    );
  }
);

test(
  "D6E clears the blocking baseline lint errors without changing engine contracts",
  () => {
    const comfort = read(
      "src/engine-v2/comfort/comfortFlexibilityEngine.ts"
    );

    const marketContext = read(
      "src/engine-v2/market-context/marketContextStatistics.ts"
    );

    const legacyEngine = read(
      "src/utils/smartStayEngine.ts"
    );

    assert.ok(
      !/let score:\s*number \| null = null;/.test(
        comfort
      )
    );

    assert.match(
      comfort,
      /const score = \(\(\) => \{[\s\S]*?preferredUnitTypes\.length === 0[\s\S]*?return null;[\s\S]*?return 100;[\s\S]*?return 75;[\s\S]*?return 25;/
    );

    assert.ok(
      !marketContext.includes(
        "const DISTRIBUTION_FIELDS"
      )
    );

    assert.match(
      marketContext,
      /type SmartStayMarketDistributionFieldV2 =/ 
    );

    assert.match(
      marketContext,
      /field:\s*SmartStayMarketDistributionFieldV2/
    );

    assert.match(
      legacyEngine,
      /Reflect\.deleteProperty\([\s\S]*?"originalIndex"[\s\S]*?Reflect\.deleteProperty\([\s\S]*?"budgetPriority"/
    );

    assert.ok(
      !/\.map\(\(\{[\s\S]*?originalIndex,[\s\S]*?budgetPriority,[\s\S]*?\.\.\.evaluation/.test(
        legacyEngine
      )
    );
  }
);

test(
  "D6E keeps future outside-month days readable while past dates remain disabled",
  () => {
    const bookingCalendarCss = read(
      "src/components/BookingCalendar/BookingCalendar.css"
    );

    const calendarGrid = read(
      "src/components/BookingCalendar/CalendarGrid.tsx"
    );

    assert.match(
      bookingCalendarCss,
      /\.calendar-grid__day--outside\s*\{[\s\S]*?color:\s*#0f172a;/
    );

    assert.match(
      bookingCalendarCss,
      /\.calendar-grid__day--outside:hover:not\(:disabled\)\s*\{[\s\S]*?background:\s*#f1f5f9;[\s\S]*?color:\s*#0f172a;[\s\S]*?transform:\s*scale\(1\.05\);/
    );

    assert.match(
      bookingCalendarCss,
      /\.calendar-grid__day--disabled\s*\{[\s\S]*?color:\s*#7c8798;[\s\S]*?opacity:\s*\.55;/
    );

    assert.match(
      calendarGrid,
      /disabled=\{day\.isPast\}/
    );

    assert.ok(
      !/\.calendar-grid__day--outside:hover\s*\{[\s\S]*?background:\s*transparent;/.test(
        bookingCalendarCss
      )
    );
  }
);
