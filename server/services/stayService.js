const {
    searchDestinationsAcrossProviders,
    searchHotelsWithPrimaryProvider,
    getHotelDetailsFromProvider,
  } = require("../providers/accommodationProviderOrchestrator");

  const {
    saveSearchSession,
    requireSearchSession,
    tryAcquireSearchContinuation,
    updateSearchSession,
    appendHotelsToSearchSession,
  } = require("../storage/searchSession");

  function isCompletedStatus(status) {

    return status === "Completed";

  }

  function normalizeContinuation(
    continuation
  ) {

    if (
      !continuation ||
      typeof continuation !== "object" ||
      Array.isArray(continuation)
    ) {

      return null;

    }

    const providerId =
      typeof continuation.providerId === "string"
        ? continuation.providerId.trim()
        : "";

    const cursor =
      continuation.cursor;

    const hasUsableCursor =
      cursor !== undefined &&
      cursor !== null &&
      (
        typeof cursor !== "string" ||
        cursor.trim().length > 0
      );

    if (
      !providerId ||
      !hasUsableCursor
    ) {

      return null;

    }

    return {
      providerId,

      cursor,
    };

  }

  function getProviderContinuation(
    providerResult
  ) {

    return normalizeContinuation(
      providerResult?.continuation ??
      providerResult?.data?.continuation ??
      providerResult?.data?.result?.continuation ??
      null
    );

  }

  function getPublicNextResultsKey(
    continuation
  ) {

    return (
      normalizeContinuation(
        continuation
      )?.cursor ??
      null
    );

  }


  function createPublicSearchResponse({
    data,
    searchId = null,
    hotels = [],
    currency = "USD",
    continuation = null,
  }) {

    return {
      success:
        Boolean(data?.success),

      message:
        data?.message ?? null,

      code:
        data?.code ?? null,

      searchId,

      status:
        data?.result?.status ?? null,

      searchIncomplete:
        data?.searchIncomplete ?? false,

      nextResultsKey:
        getPublicNextResultsKey(
          continuation
        ),

      currency,

      totalHotels:
        hotels.length,

      hotels,
    };

  }

  function createStayServiceError({
    code,
    message,
    status,
  }) {

    const error =
      new Error(
        message
      );

    error.code =
      code;

    error.status =
      status;

    return error;

  }

  function findHotelInSession(session, hotelId) {

    if (!session || !Array.isArray(session.hotels)) {

      return null;

    }

    return session.hotels.find((hotel) => (
      hotel.id === hotelId ||
      hotel.sourceHotelId === hotelId
    )) ?? null;

  }

  function requireHotelInSession(
    session,
    hotelId
  ) {

    const normalizedHotelId =
      typeof hotelId ===
        "string"
        ? hotelId.trim()
        : "";

    if (!normalizedHotelId) {

      throw createStayServiceError({
        code:
          "HOTEL_ID_REQUIRED",

        message:
          "hotelId is required.",

        status:
          400,
      });

    }

    const hotel =
      findHotelInSession(
        session,
        normalizedHotelId
      );

    if (!hotel) {

      throw createStayServiceError({
        code:
          "HOTEL_NOT_IN_SEARCH",

        message:
          "The requested hotel does not belong to this search.",

        status:
          404,
      });

    }

    return hotel;

  }

  function getProviderHotelId(
    hotel
  ) {

    const sourceHotelId =
      typeof hotel?.sourceHotelId ===
        "string"
        ? hotel.sourceHotelId.trim()
        : "";

    if (sourceHotelId) {

      return sourceHotelId;

    }

    const canonicalHotelId =
      typeof hotel?.id ===
        "string"
        ? hotel.id.trim()
        : "";

    if (
      canonicalHotelId.includes(
        ":"
      )
    ) {

      return canonicalHotelId
        .split(":")
        .slice(1)
        .join(":");

    }

    if (canonicalHotelId) {

      return canonicalHotelId;

    }

    throw createStayServiceError({
      code:
        "HOTEL_PROVIDER_ID_UNAVAILABLE",

      message:
        "The provider hotel identifier is unavailable.",

      status:
        500,
    });

  }

  // =========================
  // Search Destinations
  // =========================

  async function searchDestinations(query) {

    return searchDestinationsAcrossProviders(
      query
    );

  }

  // =========================
  // Initial Hotel Search
  // =========================

  async function searchHotels(searchData) {

    const providerResult =
      await searchHotelsWithPrimaryProvider({
        searchData,

        title:
          "SEARCH HOTELS - INITIAL",

        fallbackCurrency:
          searchData.currency ?? "USD",
      });

    function saveEmptySearchSession({
      providerId = null,
      currency = searchData.currency ?? "USD",
      message = "No stays found for this search.",
      code = 204,
    } = {}) {

      const emptySession =
        saveSearchSession({
          originalSearchData:
            searchData,

          providerId,

          status:
            "Completed",

          searchIncomplete:
            false,

          continuation:
            null,

          currency,

          totalHotels:
            0,

          hotels:
            [],

          isContinuing:
            false,

          lastError:
            null,
        });

      console.log(
        "💾 Empty search session saved:",
        emptySession.searchId
      );

      return {
        success:
          true,

        message,

        code,

        searchId:
          emptySession.searchId,

        status:
          "Completed",

        searchIncomplete:
          false,

        nextResultsKey:
          null,

        currency,

        totalHotels:
          0,

        hotels:
          [],
      };

    }

    if (providerResult.failedResponse) {

      const failedResponse =
        providerResult.failedResponse;

      const isNoResultsResponse =
        failedResponse.code === 204 ||
        failedResponse.code === "NO_RESULTS";

      if (isNoResultsResponse) {

        return saveEmptySearchSession({
          providerId:
            providerResult.providerId ?? null,

          currency:
            failedResponse.currency ??
            searchData.currency ??
            "USD",

          message:
            failedResponse.message ??
            "No stays found for this search.",

          code:
            failedResponse.code ?? 204,
        });

      }

      return failedResponse;

    }

    const {
      data,
      currency,
      hotels,
      providerId,
    } = providerResult;

    const continuation =
      getProviderContinuation(
        providerResult
      );

    const isNoResultsResponse =
      data?.code === 204 ||
      hotels.length === 0;

    if (isNoResultsResponse) {

      return saveEmptySearchSession({
        providerId,

        currency,

        message:
          data?.message ??
          "No stays found for this search.",

        code:
          data?.code ?? 204,
      });

    }

    const savedSession =
      saveSearchSession({
        originalSearchData:
          searchData,

        providerId,

        status:
          data?.result?.status ??
          (
            continuation
              ? "InProgress"
              : "Completed"
          ),

        searchIncomplete:
          data?.searchIncomplete ??
          Boolean(
            continuation
          ),

        continuation,

        currency,

        totalHotels:
          hotels.length,

        hotels,

        isContinuing:
          false,

        lastError:
          null,
      });

    console.log(
      "💾 Search session saved:",
      savedSession.searchId
    );

    return createPublicSearchResponse({
      data,

      searchId:
        savedSession.searchId,

      hotels,

      currency,

      continuation:
        savedSession.continuation,
    });

  }

  // =========================
  // Continue Hotel Search
  // =========================

  function createContinuingSearchResponse(
    session
  ) {

    return {
      success:
        true,

      searchId:
        session.searchId,

      status:
        session.status ??
        "InProgress",

      searchIncomplete:
        session.searchIncomplete ??
        true,

      isContinuing:
        true,

      totalHotels:
        session.hotels?.length ??
        0,

      nextResultsKey:
        getPublicNextResultsKey(
          session.continuation
        ),

      hotels:
        session.hotels ?? [],
    };

  }

  async function continueHotelSearch(searchId) {
const session =
      requireSearchSession(searchId);
if (session.isContinuing) {

      return createContinuingSearchResponse(
        session
      );

    }

    if (isCompletedStatus(session.status)) {

      return {
        success:
          true,

        searchId:
          session.searchId,

        status:
          "Completed",

        searchIncomplete:
          false,

        isContinuing:
          false,

        totalHotels:
          session.hotels?.length ?? 0,

        nextResultsKey:
          null,

        hotels:
          session.hotels ?? [],
      };

    }

    if (
      !normalizeContinuation(
        session.continuation
      )
    ) {

      const updatedSession =
        updateSearchSession(searchId, {
          status:
            "Completed",

          searchIncomplete:
            false,

          isContinuing:
            false,

          continuation:
            null,
        });

      return {
        success:
          true,

        searchId:
          updatedSession.searchId,

        status:
          updatedSession.status,

        searchIncomplete:
          updatedSession.searchIncomplete,

        isContinuing:
          false,

        totalHotels:
          updatedSession.hotels?.length ?? 0,

        nextResultsKey:
          getPublicNextResultsKey(
            updatedSession.continuation
          ),

        hotels:
          updatedSession.hotels ?? [],
      };

    }
    const continuationLock =
      tryAcquireSearchContinuation(
        searchId
      );

    if (
      !continuationLock.acquired
    ) {

      return createContinuingSearchResponse(
        continuationLock.session
      );

    }

    try {

        const payload = {
          ...session.originalSearchData,

          continuation:
            normalizeContinuation(
              session.continuation
            ),
        };

        const providerResult =
          await searchHotelsWithPrimaryProvider({
            searchData:
              payload,

            title:
              "SEARCH HOTELS - CONTINUE",

            fallbackCurrency:
              session.currency ??
              session.originalSearchData?.currency ??
              "USD",
          });

        if (providerResult.failedResponse) {

          const failedSession =
            updateSearchSession(searchId, {
              status:
                "Failed",

              searchIncomplete:
                false,

              isContinuing:
                false,

              lastError:
                providerResult.failedResponse.message,
            });

          return {
            ...providerResult.failedResponse,

            searchId,

            status:
              failedSession.status,

            totalHotels:
              failedSession.hotels?.length ?? 0,

            hotels:
              failedSession.hotels ?? [],
          };

        }

        const {
          data,
          currency,
          hotels,
          providerId,
        } = providerResult;

        const continuation =
          getProviderContinuation(
            providerResult
          );

        appendHotelsToSearchSession(
          searchId,
          hotels
        );

        const updatedSession =
          updateSearchSession(searchId, {
            providerId:
              providerId ??
              session.providerId ??
              null,

            status:
              data?.result?.status ??
              (
                continuation
                  ? "InProgress"
                  : "Completed"
              ),

            searchIncomplete:
              data?.searchIncomplete ??
              Boolean(
                continuation
              ),

            continuation,

            currency,

            isContinuing:
              false,

            lastError:
              null,
          });

        return {
          success:
            Boolean(data?.success),

          message:
            data?.message ?? null,

          code:
            data?.code ?? null,

          searchId:
            updatedSession.searchId,

          status:
            updatedSession.status,

          searchIncomplete:
            updatedSession.searchIncomplete,

          isContinuing:
            updatedSession.isContinuing,

          totalHotels:
            updatedSession.hotels?.length ?? 0,

        nextResultsKey:
          getPublicNextResultsKey(
            updatedSession.continuation
          ),

          hotels:
            updatedSession.hotels ?? [],
        };

      } catch (error) {

        updateSearchSession(searchId, {
          isContinuing:
            false,

          lastError:
            error.message,
        });

        throw error;

      }

    }

    // =========================
    // Hotel Details
    // =========================

    async function getHotelDetails(
      hotelId,
      searchId
    ) {

      const session =
        requireSearchSession(
          searchId
        );

      const hotel =
        requireHotelInSession(
          session,
          hotelId
        );

      const providerHotelId =
        getProviderHotelId(
          hotel
        );

      const sourceProvider =
        hotel?.sourceProvider ??
        session.providerId ??
        null;

      return getHotelDetailsFromProvider({
        sourceProvider,

        hotelId:
          providerHotelId,

        providerContext:
          hotel?.providerContext ??
          null,
      });

    }

    // =========================
    // Search Status
    // =========================

    async function getSearchStatus(searchId) {

      const session =
        requireSearchSession(searchId);
return {
        success:
          true,

        searchId:
          session.searchId,

        status:
          session.status ?? "InProgress",

        searchIncomplete:
          session.searchIncomplete ?? true,

        isContinuing:
          session.isContinuing ?? false,

        totalHotels:
          session.hotels?.length ?? 0,

        nextResultsKey:
          getPublicNextResultsKey(
            session.continuation
          ),

        lastError:
          session.lastError ?? null,

        updatedAt:
          session.updatedAt ?? null,
      };

    }

    module.exports = {
      searchDestinations,
      searchHotels,
      continueHotelSearch,
      getHotelDetails,
      getSearchStatus,
    };