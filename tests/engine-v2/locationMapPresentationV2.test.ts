import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsSearchUrl,
  hasValidLocationCoordinates,
} from "../../src/utils/locationMapPresentation";

test(
  "location map presentation validates coordinate boundaries",
  () => {
    assert.equal(
      hasValidLocationCoordinates(
        43.77925,
        11.24626
      ),
      true
    );

    assert.equal(
      hasValidLocationCoordinates(
        91,
        11.24626
      ),
      false
    );

    assert.equal(
      hasValidLocationCoordinates(
        43.77925,
        181
      ),
      false
    );

    assert.equal(
      hasValidLocationCoordinates(
        null,
        11.24626
      ),
      false
    );
  }
);

test(
  "Google Maps link uses coordinates without requiring an API key",
  () => {
    const url =
      buildGoogleMapsSearchUrl({
        latitude:
          43.77925,
        longitude:
          11.24626,
      });

    assert.match(
      url,
      /^https:\/\/www\.google\.com\/maps\/search\/\?/
    );

    assert.match(
      url,
      /api=1/
    );

    assert.match(
      url,
      /query=43\.779250%2C11\.246260/
    );
  }
);

test(
  "Google Maps embed remains optional and uses a restricted frontend key",
  () => {
    assert.equal(
      buildGoogleMapsEmbedUrl({
        apiKey:
          "   ",
        accommodationName:
          "Example stay",
        address:
          "Via Roma 1, Florence",
        latitude:
          43.77925,
        longitude:
          11.24626,
      }),
      null
    );

    const url =
      buildGoogleMapsEmbedUrl({
        apiKey:
          "browser-key",
        accommodationName:
          "Example stay",
        address:
          "Via Roma 1, Florence",
        latitude:
          43.77925,
        longitude:
          11.24626,
      });

    assert.ok(
      url
    );

    assert.match(
      url,
      /^https:\/\/www\.google\.com\/maps\/embed\/v1\/place\?/
    );

    assert.match(
      url,
      /key=browser-key/
    );

    assert.match(
      url,
      /center=43\.779250%2C11\.246260/
    );

    assert.match(
      url,
      /zoom=15/
    );
  }
);
