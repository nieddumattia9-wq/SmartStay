const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001/api";

const STANDARD_REQUEST_TIMEOUT_MS =
  25_000;

const HOTEL_REQUEST_TIMEOUT_MS =
  165_000;

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

      throw new Error(
        data?.message ||
        fallbackErrorMessage
      );

    }

    return data as T;

  } catch (error) {

    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {

      throw new Error(
        timeoutErrorMessage
      );

    }

    if (error instanceof TypeError) {

      throw new Error(
        fallbackErrorMessage
      );

    }

    if (error instanceof Error) {

      throw error;

    }

    throw new Error(
      fallbackErrorMessage
    );

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
  payload: unknown
) {

  return requestJson(
    `${API_URL}/search-hotels`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

export async function getHotelDetails(
  hotelId: string,
  searchId?: string | null
) {

  return requestJson(
    `${API_URL}/hotel-details`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hotelId,
        searchId,
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
    undefined,
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
    undefined,
    "Unable to retrieve search session.",
    STANDARD_REQUEST_TIMEOUT_MS,
    "Retrieving the search results took too long."
  );

}