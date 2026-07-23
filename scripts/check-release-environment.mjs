import {
  createRequire,
} from "node:module";

const require =
  createRequire(
    import.meta.url
  );

const {
  CONDITIONAL_ANALYTICS_RELEASE_ENVIRONMENT_KEYS,
  REQUIRED_RELEASE_ENVIRONMENT_KEYS,
  assertReleaseEnvironment,
} =
  require(
    "../server/config/releaseEnvironment.js"
  );

function createSafeFailure(
  error
) {
  return {
    result:
      "FAIL",

    code:
      error?.code ??
      "RELEASE_ENVIRONMENT_CHECK_FAILED",

    message:
      error?.message ??
      "Release environment check failed.",

    issues:
      Array.isArray(
        error?.issues
      )
        ? error.issues.map(
            ({
              field,
              code,
              message,
            }) => ({
              field,
              code,
              message,
            })
          )
        : [],
  };
}

try {
  const result =
    assertReleaseEnvironment({
      environment:
        process.env,
    });

  if (
    result.release !==
      true
  ) {
    const error =
      new Error(
        "Release environment variables are not active."
      );

    error.code =
      "RELEASE_ENVIRONMENT_REQUIRED";

    throw error;
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        result:
          "PASS",

        deploymentEnvironment:
          result
            .deploymentEnvironment,

        runtimeStateMode:
          result
            .runtimeStateMode,

        analyticsEnabled:
          result
            .analyticsEnabled,

        analyticsStorageMode:
          result
            .analyticsStorageMode,

        checkedKeys:
          REQUIRED_RELEASE_ENVIRONMENT_KEYS,

        conditionalAnalyticsKeys:
          result.analyticsEnabled
            ? CONDITIONAL_ANALYTICS_RELEASE_ENVIRONMENT_KEYS
            : [],
      },
      null,
      2
    )}\n`
  );
} catch (error) {
  process.stderr.write(
    `${JSON.stringify(
      createSafeFailure(
        error
      ),
      null,
      2
    )}\n`
  );

  process.exitCode =
    1;
}
