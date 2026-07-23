"use strict";

const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|set-cookie|api[-_]?key|secret|token|password|passphrase|providercontext|providerofferreference|providerbookingreference|prebookid|deeplink|cardnumber|cvv|cvc|paymentmethod/i;

const SENSITIVE_ENVIRONMENT_KEY_PATTERN =
  /api[-_]?key|secret|token|password|passphrase|private|credential/i;

const MAX_DEPTH =
  8;

const MAX_ARRAY_ITEMS =
  50;

const MAX_STRING_LENGTH =
  4000;

function collectSecretValues(
  environment
) {
  return Object.entries(
    environment ??
    {}
  )
    .filter(
      ([
        key,
        value,
      ]) =>
        SENSITIVE_ENVIRONMENT_KEY_PATTERN.test(
          key
        ) &&
        typeof value ===
          "string" &&
        value.length >=
          8
    )
    .map(
      ([
        ,
        value,
      ]) =>
        value
    )
    .sort(
      (
        left,
        right
      ) =>
        right.length -
        left.length
    );
}

function sanitizeString(
  value,
  secretValues
) {
  let sanitized =
    String(value);

  for (
    const secret of
    secretValues
  ) {
    sanitized =
      sanitized.split(
        secret
      ).join(
        "[REDACTED]"
      );
  }

  sanitized =
    sanitized
      .replace(
        /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
        "Bearer [REDACTED]"
      )
      .replace(
        /([?&](?:api[_-]?key|token|secret|password|prebookId|offerId)=)[^&#\s]+/gi,
        "$1[REDACTED]"
      );

  if (
    sanitized.length >
    MAX_STRING_LENGTH
  ) {
    return (
      sanitized.slice(
        0,
        MAX_STRING_LENGTH
      ) +
      "…[TRUNCATED]"
    );
  }

  return sanitized;
}

function sanitizeForLogs(
  value,
  {
    secretValues =
      [],
    includeErrorStack =
      false,
    depth =
      0,
    seen =
      new WeakSet(),
  } = {}
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return value;
  }

  if (
    typeof value ===
      "string"
  ) {
    return sanitizeString(
      value,
      secretValues
    );
  }

  if (
    typeof value ===
      "bigint"
  ) {
    return value.toString();
  }

  if (
    typeof value ===
      "function"
  ) {
    return "[FUNCTION]";
  }

  if (
    depth >=
      MAX_DEPTH
  ) {
    return "[MAX_DEPTH]";
  }

  if (
    value instanceof
      Error
  ) {
    const errorResult = {
      name:
        sanitizeString(
          value.name,
          secretValues
        ),

      message:
        sanitizeString(
          value.message,
          secretValues
        ),

      code:
        value.code ??
        null,

      status:
        value.status ??
        value.statusCode ??
        null,
    };

    if (
      includeErrorStack &&
      typeof value.stack ===
        "string"
    ) {
      errorResult.stack =
        sanitizeString(
          value.stack,
          secretValues
        );
    }

    return errorResult;
  }

  if (
    typeof value !==
      "object"
  ) {
    return sanitizeString(
      value,
      secretValues
    );
  }

  if (
    seen.has(value)
  ) {
    return "[CIRCULAR]";
  }

  seen.add(value);

  if (
    Array.isArray(value)
  ) {
    return value
      .slice(
        0,
        MAX_ARRAY_ITEMS
      )
      .map(
        (item) =>
          sanitizeForLogs(
            item,
            {
              secretValues,
              includeErrorStack,
              depth:
                depth + 1,
              seen,
            }
          )
      );
  }

  const result =
    {};

  for (
    const [
      key,
      child,
    ] of Object.entries(
      value
    )
  ) {
    if (
      SENSITIVE_KEY_PATTERN.test(
        key
      )
    ) {
      result[key] =
        "[REDACTED]";

      continue;
    }

    result[key] =
      sanitizeForLogs(
        child,
        {
          secretValues,
          includeErrorStack,
          depth:
            depth + 1,
          seen,
        }
      );
  }

  return result;
}

function createSecurityLogger({
  environment =
    process.env,
  includeErrorStack =
    false,
  write =
    (line) =>
      console.log(line),
  now =
    () =>
      new Date(),
} = {}) {
  if (
    typeof write !==
      "function"
  ) {
    throw new TypeError(
      "Security logger write must be a function."
    );
  }

  const secretValues =
    collectSecretValues(
      environment
    );

  function emit(
    level,
    event,
    data =
      {}
  ) {
    const record = {
      timestamp:
        now()
          .toISOString(),

      level,

      event:
        String(event),

      ...sanitizeForLogs(
        data,
        {
          secretValues,
          includeErrorStack,
        }
      ),
    };

    write(
      JSON.stringify(
        record
      )
    );

    return record;
  }

  const logger = {
    debug:
      (
        event,
        data
      ) =>
        emit(
          "debug",
          event,
          data
        ),

    info:
      (
        event,
        data
      ) =>
        emit(
          "info",
          event,
          data
        ),

    warn:
      (
        event,
        data
      ) =>
        emit(
          "warn",
          event,
          data
        ),

    error:
      (
        event,
        data
      ) =>
        emit(
          "error",
          event,
          data
        ),

    child(
      context =
        {}
    ) {
      const sanitizedContext =
        sanitizeForLogs(
          context,
          {
            secretValues,
            includeErrorStack,
          }
        );

      return {
        debug:
          (
            event,
            data =
              {}
          ) =>
            emit(
              "debug",
              event,
              {
                ...sanitizedContext,
                ...data,
              }
            ),

        info:
          (
            event,
            data =
              {}
          ) =>
            emit(
              "info",
              event,
              {
                ...sanitizedContext,
                ...data,
              }
            ),

        warn:
          (
            event,
            data =
              {}
          ) =>
            emit(
              "warn",
              event,
              {
                ...sanitizedContext,
                ...data,
              }
            ),

        error:
          (
            event,
            data =
              {}
          ) =>
            emit(
              "error",
              event,
              {
                ...sanitizedContext,
                ...data,
              }
            ),
      };
    },
  };

  return Object.freeze(
    logger
  );
}

module.exports = {
  SENSITIVE_KEY_PATTERN,
  collectSecretValues,
  createSecurityLogger,
  sanitizeForLogs,
  sanitizeString,
};
