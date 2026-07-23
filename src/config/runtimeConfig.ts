import {
  resolveApiBaseUrl,
} from "./apiBaseUrl";

export const API_URL =
  resolveApiBaseUrl({
    configuredUrl:
      import.meta.env
        .VITE_API_URL,

    isProduction:
      import.meta.env.PROD,

    browserOrigin:
      typeof window !==
        "undefined"
        ? window.location
            .origin
        : null,
  });

export const ANALYTICS_ENABLED =
  String(
    import.meta.env
      .VITE_ANALYTICS_ENABLED ??
    ""
  )
    .trim()
    .toLowerCase() ===
  "true";

export const RELEASE_SHA =
  String(
    import.meta.env
      .VITE_RELEASE_SHA ??
    "development"
  ).trim() ||
  "development";
