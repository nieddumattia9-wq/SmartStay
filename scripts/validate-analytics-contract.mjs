import path from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  loadAnalyticsContract,
} from "./analyticsContractCore.mjs";

const scriptDirectory =
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const repositoryRoot =
  path.resolve(
    scriptDirectory,
    ".."
  );

const contractPath =
  process.argv[2]
    ? path.resolve(
        process.argv[2]
      )
    : path.join(
        repositoryRoot,
        "contracts",
        "analytics-event-contract.v1.json"
      );

const contract =
  loadAnalyticsContract(
    contractPath
  );

process.stdout.write(
  JSON.stringify(
    {
      status:
        "PASS",
      contractVersion:
        contract.contractVersion,
      eventVersion:
        contract.eventVersion,
      eventCount:
        Object.keys(
          contract.events
        ).length,
      transport:
        contract.transport.mode,
      analyticsEnabledByDefault:
        contract.transport.defaultEnabled,
      cookiesAllowed:
        contract.transport.cookiesAllowed,
      crossSessionTracking:
        contract.session.crossSessionTracking,
    },
    null,
    2
  ) +
  "\n"
);
