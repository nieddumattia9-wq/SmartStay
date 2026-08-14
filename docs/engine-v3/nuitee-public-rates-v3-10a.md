# StayOpti Engine V3-10A - Nuitee public-rate semantics

## Purpose

V3-10A closes the external public-rate consistency gate discovered after V3-10. It is a narrow Nuitee/LiteAPI integration correction; it does not replace V3-11, alter Engine V2 ranking, enable public Engine V3, or enable the public SPLIT card.

Nuitee support confirmed that the sandbox/account is configured for public rates, the response field names remain unchanged, request margin still applies, and `suggestedSellingPrice` is not a public-display gate for these rates.

## Validated sandbox evidence

The controlled validation used a sandbox credential and made exactly four non-booking calls: Rates, POST Prebook, GET Prebook, and a read-only White Label route probe. It made no booking, payment, promo-code, production, deployment, or repository mutation call.

For the selected Florence stay (15-18 September 2026, two adults, EUR), Rates returned 51 usable offers. The selected offer was stable across the validation chain:

- room: Twin Room;
- meal plan: Room Only;
- cancellation: non-refundable;
- Rates `offerRetailRate`: EUR 461.78;
- Rates `suggestedSellingPrice`: EUR 476.32;
- provider commission: EUR 34.19;
- included VAT: EUR 38.87;
- excluded property-pay taxes: EUR 0.00;
- POST Prebook stay amount: EUR 461.78;
- GET Prebook stay amount: EUR 461.77.

The one-cent GET Prebook variation is provider-confirmed recheck evidence. It is not silently forced back to the earlier amount; the existing canonical recheck and user-confirmation flow remains responsible for material changes.

## Frozen price interpretation

For the support-confirmed public-rate account:

1. `offerRetailRate` is the provider-confirmed public stay price used by search and checkout mapping.
2. `suggestedSellingPrice` is retained only as an internal diagnostic reference and cannot block, replace, or leak into the public offer.
3. A managed offer without a positive `offerRetailRate` or without verifiable commission evidence fails closed; it must not fall back to displaying `suggestedSellingPrice`.
4. The server-owned request margin remains 8 percent. The provider account default markup reported by support is not applied again by StayOpti.
5. Included and excluded taxes keep their existing disclosure semantics and are never inferred.

## Recheck and legacy safety

New Nuitee public offers carry pricing schema version 2 with `providerPriceMode: offer-retail-rate` and `publicPriceFloorMode: reference-only`. Prebook must still return a finite positive price. A valid provider reprice is passed to canonical offer recheck for deterministic comparison and confirmation.

Previously stored or legacy offers whose policy says `publicPriceFloorMode: enforced` keep the older fail-closed below-target guard. This makes the patch backward-safe and reversible without weakening historical offer constraints.

## Privacy and product boundaries

Pricing controls, provider references, commission data, and the SSP diagnostic remain private and are stripped from public offers. V3-10A performs no live provider call by itself and adds no booking or payment behavior.

The White Label validation established route reachability only; it did not execute browser JavaScript or independently read the rendered price. A post-patch sandbox verification is therefore required before V3-11 shadow/canary/promotion work begins.
