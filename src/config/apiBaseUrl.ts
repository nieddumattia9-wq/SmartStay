const LOCAL_DEVELOPMENT_API_URL =
  "http://localhost:3001/api";

const SAME_ORIGIN_API_URL =
  "/api";

type ResolveApiBaseUrlOptions = {
  configuredUrl?: string | null;
  isProduction: boolean;
  browserOrigin?: string | null;
};

function isLocalHostname(
  hostname: string
) {
  const normalized =
    hostname
      .trim()
      .toLowerCase();

  return (
    normalized ===
      "localhost" ||
    normalized ===
      "127.0.0.1" ||
    normalized ===
      "::1"
  );
}

function normalizeRelativeApiUrl(
  candidate: string
) {
  if (
    !candidate.startsWith(
      "/"
    ) ||
    candidate.startsWith(
      "//"
    )
  ) {
    throw new Error(
      "Relative API URLs must start with a single slash."
    );
  }

  const parsed =
    new URL(
      candidate,
      "https://smartstay.invalid"
    );

  if (
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "VITE_API_URL must not contain a query string or hash."
    );
  }

  const pathname =
    parsed.pathname.replace(
      /\/+$/,
      ""
    );

  if (
    !pathname ||
    pathname ===
      "/"
  ) {
    throw new Error(
      "VITE_API_URL must include an API path."
    );
  }

  return pathname;
}

function normalizeAbsoluteApiUrl(
  candidate: string,
  isProduction: boolean
) {
  const parsed =
    new URL(
      candidate
    );

  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "VITE_API_URL must not contain credentials, a query string, or a hash."
    );
  }

  if (
    isProduction &&
    (
      parsed.protocol !==
        "https:" ||
      isLocalHostname(
        parsed.hostname
      )
    )
  ) {
    throw new Error(
      "Production API URLs must use HTTPS and must not point to localhost."
    );
  }

  if (
    parsed.protocol !==
      "https:" &&
    !(
      parsed.protocol ===
        "http:" &&
      isLocalHostname(
        parsed.hostname
      ) &&
      !isProduction
    )
  ) {
    throw new Error(
      "API URLs must use HTTPS, except for local development."
    );
  }

  parsed.pathname =
    parsed.pathname.replace(
      /\/+$/,
      ""
    );

  if (
    !parsed.pathname ||
    parsed.pathname ===
      "/"
  ) {
    throw new Error(
      "VITE_API_URL must include an API path."
    );
  }

  return parsed.toString()
    .replace(
      /\/$/,
      ""
    );
}

export function resolveApiBaseUrl({
  configuredUrl,
  isProduction,
}: ResolveApiBaseUrlOptions) {
  const candidate =
    typeof configuredUrl ===
      "string"
      ? configuredUrl.trim()
      : "";

  const effectiveCandidate =
    candidate ||
    (
      isProduction
        ? SAME_ORIGIN_API_URL
        : LOCAL_DEVELOPMENT_API_URL
    );

  if (
    effectiveCandidate.startsWith(
      "/"
    )
  ) {
    return normalizeRelativeApiUrl(
      effectiveCandidate
    );
  }

  return normalizeAbsoluteApiUrl(
    effectiveCandidate,
    isProduction
  );
}

export {
  LOCAL_DEVELOPMENT_API_URL,
  SAME_ORIGIN_API_URL,
};
