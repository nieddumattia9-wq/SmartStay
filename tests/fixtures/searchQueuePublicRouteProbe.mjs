import express from "../../server/node_modules/express/index.js";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const {
  closeOperationalState,
} = require(
  "../../server/state/operationalState.js"
);

function send(message) {
  if (
    typeof process.send ===
      "function"
  ) {
    process.send(message);
    return;
  }

  process.stdout.write(
    `${JSON.stringify(message)}\n`
  );
}

async function listen(app) {
  return new Promise(
    (resolve, reject) => {
      const server =
        app.listen(
          0,
          "127.0.0.1",
          () =>
            resolve(server)
        );
      server.on(
        "error",
        reject
      );
    }
  );
}

async function closeServer(server) {
  if (!server) {
    return;
  }

  await new Promise(
    (resolve) =>
      server.close(resolve)
  );
}

async function postSearch(
  baseUrl,
  payload,
  idempotencyKey
) {
  const response =
    await fetch(
      `${baseUrl}/search-hotels`,
      {
        method:
          "POST",
        headers: {
          "content-type":
            "application/json",
          "idempotency-key":
            idempotencyKey,
        },
        body:
          JSON.stringify(payload),
      }
    );
  const body =
    await response.json();

  return {
    status:
      response.status,
    replayed:
      response.headers.get(
        "idempotency-replayed"
      ),
    coalesced:
      response.headers.get(
        "idempotency-coalesced"
      ),
    cacheControl:
      response.headers.get(
        "cache-control"
      ),
    body,
  };
}

async function main() {
  const route = require(
    "../../server/routes/search.js"
  );
  const app = express();
  let server = null;

  try {
    app.use(express.json());
    app.use("/api", route);
    server = await listen(app);
    const address =
      server.address();
    const baseUrl =
      `http://127.0.0.1:${address.port}/api`;
    const payload = {
      destinationId:
        "rome",
      checkIn:
        "2026-09-01",
      checkOut:
        "2026-09-04",
      rooms: [
        {
          adults:
            2,
          children:
            0,
          childAges: [],
        },
      ],
    };
    const first =
      await postSearch(
        baseUrl,
        payload,
        "public-queue-route-0001"
      );
    const replay =
      await postSearch(
        baseUrl,
        payload,
        "public-queue-route-0001"
      );
    const searchId =
      first.body?.searchId;
    const statusResponse =
      await fetch(
        `${baseUrl}/search-status?searchId=${encodeURIComponent(searchId)}`
      );
    const statusBody =
      await statusResponse.json();

    send({
      ok:
        true,
      first,
      replay,
      status: {
        httpStatus:
          statusResponse.status,
        body:
          statusBody,
      },
    });
  }
  finally {
    await closeServer(server);
    await closeOperationalState();
  }
}

main().catch((error) => {
  send({
    ok:
      false,
    errorCode:
      error?.code ?? null,
    errorMessage:
      error?.message ??
      "public queue route probe failed",
  });
  process.exitCode = 1;
});
