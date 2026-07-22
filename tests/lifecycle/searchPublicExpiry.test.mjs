import assert from "node:assert/strict";
import test from "node:test";

import publicSearchPresenterModule from "../../server/presenters/publicSearchPresenter.js";
import searchLifecycleModule from "../../server/utils/searchLifecycle.js";

const {
  createPublicSearchSession,
  createPublicSearchStatus,
} = publicSearchPresenterModule;

const {
  deriveSearchLifecycle,
} = searchLifecycleModule;

test(
  "public search session contracts expose expiry without internal provider state",
  () => {
    const source = {
      success:
        true,
      searchId:
        "ss1.generation.search",
      status:
        "Completed",
      searchIncomplete:
        false,
      isContinuing:
        false,
      currency:
        "EUR",
      totalHotels:
        0,
      hotels:
        [],
      createdAt:
        100,
      updatedAt:
        200,
      expiresAt:
        300,
      providerContext: {
        secret:
          "hidden",
      },
      continuation: {
        cursor:
          "hidden",
      },
    };

    const session =
      createPublicSearchSession(
        source
      );

    const status =
      createPublicSearchStatus(
        source
      );

    assert.equal(
      session.expiresAt,
      300
    );

    assert.equal(
      status.expiresAt,
      300
    );

    for (
      const payload of
      [
        session,
        status,
      ]
    ) {
      const serialized =
        JSON.stringify(
          payload
        );

      assert.equal(
        serialized.includes(
          "hidden"
        ),
        false
      );
    }
  }
);


test(
  "null retry guidance remains absent in the public lifecycle",
  () => {
    const lifecycle =
      deriveSearchLifecycle({
        success:
          true,
        status:
          "InProgress",
        searchIncomplete:
          true,
        retryAfterMs:
          null,
      });

    assert.equal(
      lifecycle.retryAfterMs,
      null
    );
  }
);
