const IDEMPOTENCY_KEY_MIN_LENGTH =
  16;

const IDEMPOTENCY_KEY_MAX_LENGTH =
  128;

const IDEMPOTENCY_KEY_PATTERN =
  /^[A-Za-z0-9._~:-]+$/;

export function normalizeSearchIdempotencyKey(
  value: unknown
): string | null {
  const key =
    typeof value === "string"
      ? value.trim()
      : "";

  if (
    key.length <
      IDEMPOTENCY_KEY_MIN_LENGTH ||
    key.length >
      IDEMPOTENCY_KEY_MAX_LENGTH ||
    !IDEMPOTENCY_KEY_PATTERN.test(
      key
    )
  ) {
    return null;
  }

  return key;
}

export function createSearchIdempotencyKey() {
  const cryptoApi =
    globalThis.crypto;

  if (
    !cryptoApi ||
    typeof cryptoApi.randomUUID !==
      "function"
  ) {
    throw new Error(
      "Secure browser UUID generation is unavailable."
    );
  }

  return cryptoApi.randomUUID();
}
