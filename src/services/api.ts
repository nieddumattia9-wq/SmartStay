const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001/api";

async function requestJson<T>(
  url: string,
  options?: RequestInit,
  fallbackErrorMessage = "API request failed."
): Promise<T> {

  const response = await fetch(
    url,
    options
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
    "Unable to search destinations."
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
    "Unable to search hotels."
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
    "Unable to continue hotel search."
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
    "Unable to retrieve hotel details."
  );

}

export async function getSearchStatus(
  searchId?: string | null
) {

  return requestJson(
    `${API_URL}/search-status${createSearchIdQuery(searchId)}`,
    undefined,
    "Unable to retrieve search status."
  );

}

export async function getSearchSession(
  searchId?: string | null
) {

  return requestJson(
    `${API_URL}/search-session${createSearchIdQuery(searchId)}`,
    undefined,
    "Unable to retrieve search session."
  );

}