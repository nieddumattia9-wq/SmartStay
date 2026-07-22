import type {
  BookingOfferRecheckResponse,
  HotelDetailsResponse,
} from "../types/hotel";

import {
  normalizeSearchIdempotencyKey,
} from "../utils/searchIdempotency";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001/api";

const STANDARD_REQUEST_TIMEOUT_MS =
  25_000;

const HOTEL_REQUEST_TIMEOUT_MS =
  165_000;

type ApiRequestErrorOptions = {
  message: string;
  status?: number | null;
  code?: string | null;
  retryAfterMs?: number | null;
};

export class ApiRequestError extends Error {

  readonly status:
    number | null;

  readonly code:
    string | null;

  readonly retryAfterMs:
    number | null;

  constructor({
    message,
    status = null,
    code = null,
    retryAfterMs = null,
  }: ApiRequestErrorOptions) {

    super(
      message
    );

    this.name =
      "ApiRequestError";

    this.status =
      status;

    this.code =
      code;

    this.retryAfterMs =
      typeof retryAfterMs === "number" &&
      Number.isFinite(
        retryAfterMs
      ) &&
      retryAfterMs >= 0
        ? retryAfterMs
        : null;

  }

}

function getResponseRetryAfterMs(
  response: Response,
  data: unknown
) {
  const dataRetryAfterValue =
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
      ? (
          data as Record<
            string,
            unknown
          >
        ).retryAfterMs
      : null;

  const dataRetryAfterMs =
    dataRetryAfterValue !== null &&
    dataRetryAfterValue !== undefined &&
    dataRetryAfterValue !== ""
      ? Number(
          dataRetryAfterValue
        )
      : Number.NaN;

  if (
    Number.isFinite(
      dataRetryAfterMs
    ) &&
    dataRetryAfterMs >= 0
  ) {
    return dataRetryAfterMs;
  }

  const retryAfterHeader =
    response.headers.get(
      "Retry-After"
    );

  if (!retryAfterHeader) {
    return null;
  }

  const retryAfterSeconds =
    Number(
      retryAfterHeader
    );

  if (
    Number.isFinite(
      retryAfterSeconds
    ) &&
    retryAfterSeconds >= 0
  ) {
    return retryAfterSeconds * 1000;
  }

  const retryAt =
    Date.parse(
      retryAfterHeader
    );

  return Number.isFinite(retryAt)
    ? Math.max(
        0,
        retryAt - Date.now()
      )
    : null;
}

async function requestJson<T>(
  url: string,
  options?: RequestInit,
  fallbackErrorMessage = "API request failed.",
  timeoutMs = STANDARD_REQUEST_TIMEOUT_MS,
  timeoutErrorMessage =
    "The request took too long. Please try again."
): Promise<T> {

  const controller =
    new AbortController();

  const timeoutId =
    window.setTimeout(
      () => controller.abort(),
      timeoutMs
    );

  try {

    const response = await fetch(
      url,
      {
        ...options,
        signal: controller.signal,
      }
    );

    const data = await response
      .json()
      .catch(() => null);

    if (!response.ok) {

      const responseMessage =
        typeof data?.message ===
          "string" &&
        data.message.trim()
          ? data.message
          : fallbackErrorMessage;

      const responseCode =
        typeof data?.code ===
          "string" &&
        data.code.trim()
          ? data.code
          : null;

      throw new ApiRequestError({
        message:
          responseMessage,

        status:
          response.status,

        code:
          responseCode,

        retryAfterMs:
          getResponseRetryAfterMs(
            response,
            data
          ),
      });

    }

    return data as T;

  } catch (error) {

    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {

      throw new ApiRequestError({
        message:
          timeoutErrorMessage,

        status:
          408,

        code:
          "REQUEST_TIMEOUT",
      });

    }

    if (
      error instanceof
      ApiRequestError
    ) {

      throw error;

    }

    if (error instanceof TypeError) {

      const isOffline =
        typeof navigator !==
          "undefined" &&
        navigator.onLine ===
          false;

      throw new ApiRequestError({
        message:
          isOffline
            ? "You appear to be offline."
            : fallbackErrorMessage,

        code:
          isOffline
            ? "NETWORK_OFFLINE"
            : "NETWORK_ERROR",
      });

    }

    if (error instanceof Error) {

      throw new ApiRequestError({
        message:
          error.message ||
          fallbackErrorMessage,
      });

    }

    throw new ApiRequestError({
      message:
        fallbackErrorMessage,
    });

  } finally {

    window.clearTimeout(
      timeoutId
    );

  }

}

function createSearchIdQuery(
  searchId?: string | null
) {

  if (!searchId) {

    return "";

  }

  return `?searchId=${encodeURIComponent(searchId)}`;

}

export async function searchDestinations(
  query: string
) {

  return requestJson(
    `${API_URL}/search-destinations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
      }),
    },
    "Unable to search destinations.",
    STANDARD_REQUEST_TIMEOUT_MS,
    "Destination search took too long. Please try again."
  );

}

export async function searchHotels(
  payload: unknown,
  idempotencyKey: string
) {
  const normalizedIdempotencyKey =
    normalizeSearchIdempotencyKey(
      idempotencyKey
    );

  if (!normalizedIdempotencyKey) {
    throw new ApiRequestError({
      message:
        "Unable to start hotel search safely.",

      code:
        "IDEMPOTENCY_KEY_INVALID",
    });
  }

  return requestJson(
    `${API_URL}/search-hotels`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key":
          normalizedIdempotencyKey,
      },
      body: JSON.stringify(payload),
    },
    "Unable to search hotels.",
    HOTEL_REQUEST_TIMEOUT_MS,
    "The hotel search took too long. Please try again."
  );

}

export async function continueHotelSearch(
  searchId: string
) {

  return requestJson(
    `${API_URL}/search-hotels/continue`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        searchId,
      }),
    },
    "Unable to continue hotel search.",
    HOTEL_REQUEST_TIMEOUT_MS,
    "The hotel search took too long to continue. Please try again."
  );

}

export function createBookingRedirectUrl(
  searchId?: string | null,
  hotelId?: string | null,
  offerId?: string | null
) {
  const normalizedSearchId =
    searchId?.trim() ?? "";

  const normalizedHotelId =
    hotelId?.trim() ?? "";

  const normalizedOfferId =
    offerId?.trim() ?? "";

  if (
    !normalizedSearchId ||
    !normalizedHotelId ||
    !normalizedOfferId
  ) {
    return null;
  }

  const searchParams =
    new URLSearchParams({
      searchId:
        normalizedSearchId,

      hotelId:
        normalizedHotelId,

      offerId:
        normalizedOfferId,
    });

  return `${API_URL}/booking-redirect?${searchParams.toString()}`;
}

export async function recheckBookingOffer(
  searchId: string,
  hotelId: string,
  offerId: string
): Promise<BookingOfferRecheckResponse> {
  return requestJson<BookingOfferRecheckResponse>(
    `${API_URL}/booking-offer-recheck`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        searchId,
        hotelId,
        offerId,
      }),
      cache:
        "no-store",
    },
    "Unable to verify this booking offer.",
    HOTEL_REQUEST_TIMEOUT_MS,
    "The booking provider took too long to verify this offer."
  );
}

export async function getHotelDetails(
  hotelId: string,
  searchId?: string | null,
  offerId?: string | null
): Promise<HotelDetailsResponse> {

  return requestJson<HotelDetailsResponse>(
    `${API_URL}/hotel-details`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hotelId,
        searchId,
        offerId,
      }),
    },
    "Unable to retrieve hotel details.",
    HOTEL_REQUEST_TIMEOUT_MS,
    "Hotel details took too long to load. Please try again."
  );

}

export async function getSearchStatus(
  searchId?: string | null
) {

  return requestJson(
    `${API_URL}/search-status${createSearchIdQuery(searchId)}`,
    {
      cache:
        "no-store",
    },
    "Unable to retrieve search status.",
    STANDARD_REQUEST_TIMEOUT_MS,
    "Retrieving the search status took too long."
  );

}

export async function getSearchSession(
  searchId?: string | null
) {

  return requestJson(
    `${API_URL}/search-session${createSearchIdQuery(searchId)}`,
    {
      cache:
        "no-store",
    },
    "Unable to retrieve search session.",
    STANDARD_REQUEST_TIMEOUT_MS,
    "Retrieving the search results took too long."
  );

}
