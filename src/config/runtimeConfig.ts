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
