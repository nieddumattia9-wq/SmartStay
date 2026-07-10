const {
    searchDestinationsAcrossProviders,
    searchHotelsWithPrimaryProvider,
    getHotelDetailsFromProvider,
  } = require("../providers/accommodationProviderOrchestrator");
  
  const {
    saveSearchSession,
    getSearchSession,
    updateSearchSession,
    appendHotelsToSearchSession,
  } = require("../storage/searchSession");
  
  function isCompletedStatus(status) {
  
    return status === "Completed";
  
  }
  
  function createPublicSearchResponse({
    data,
    searchId = null,
    hotels = [],
    currency = "USD",
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
        data?.result?.nextResultsKey ?? null,
  
      currency,
  
      totalHotels:
        hotels.length,
  
      hotels,
    };
  
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
  
  function getProviderHotelId(hotelId, hotel = null) {
  
    if (hotel?.sourceHotelId) {
  
      return hotel.sourceHotelId;
  
    }
  
    if (
      typeof hotelId === "string" &&
      hotelId.includes(":")
    ) {
  
      return hotelId
        .split(":")
        .slice(1)
        .join(":");
  
    }
  
    return hotelId;
  
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
  
          token:
            null,
  
          correlationId:
            null,
  
          currency,
  
          nextResultsKey:
            null,
  
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
        failedResponse.totalHotels === 0;
  
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
          data?.result?.status ?? "InProgress",
  
        searchIncomplete:
          data?.searchIncomplete ?? true,
  
        token:
          data?.result?.token ?? null,
  
        correlationId:
          data?.result?.correlationId ?? null,
  
        currency,
  
        nextResultsKey:
          data?.result?.nextResultsKey ?? null,
  
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
    });
  
  }
  
  // =========================
  // Continue Hotel Search
  // =========================
  
  async function continueHotelSearch(searchId) {
  
    if (!searchId) {
  
      throw new Error(
        "searchId is required to continue hotel search."
      );
  
    }
  
    const session =
      getSearchSession(searchId);
  
    if (!session) {
  
      throw new Error(
        "No active hotel search session."
      );
  
    }
  
    if (session.isContinuing) {
  
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
          true,
  
        totalHotels:
          session.hotels?.length ?? 0,
  
        nextResultsKey:
          session.nextResultsKey ?? null,
  
        hotels:
          session.hotels ?? [],
      };
  
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
  
    if (!session.nextResultsKey) {
  
      const updatedSession =
        updateSearchSession(searchId, {
          status:
            "Completed",
  
          searchIncomplete:
            false,
  
          isContinuing:
            false,
  
          nextResultsKey:
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
          updatedSession.nextResultsKey,
  
        hotels:
          updatedSession.hotels ?? [],
      };
  
    }

    updateSearchSession(searchId, {
        isContinuing:
          true,
    
        lastError:
          null,
      });
    
      try {
    
        const payload = {
          ...session.originalSearchData,
    
          nextResultsKey:
            session.nextResultsKey,
    
          token:
            session.token,
    
          correlationId:
            session.correlationId,
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
        } = providerResult;
    
        const sessionWithHotels =
          appendHotelsToSearchSession(
            searchId,
            hotels
          );
    
        const updatedSession =
          updateSearchSession(searchId, {
            status:
              data?.result?.status ??
              sessionWithHotels?.status ??
              "InProgress",
    
            searchIncomplete:
              data?.searchIncomplete ??
              !isCompletedStatus(data?.result?.status),
    
            token:
              data?.result?.token ??
              session.token,
    
            correlationId:
              data?.result?.correlationId ??
              session.correlationId,
    
            currency,
    
            nextResultsKey:
              data?.result?.nextResultsKey ?? null,
    
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
            updatedSession.nextResultsKey,
    
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
      searchId = null
    ) {
    
      if (!hotelId) {
    
        throw new Error(
          "hotelId is required to retrieve hotel details."
        );
    
      }
    
      const session =
        getSearchSession(searchId);
    
      if (!session) {
    
        throw new Error(
          "No active hotel search session."
        );
    
      }
    
      const hotel =
        findHotelInSession(
          session,
          hotelId
        );
    
      const providerHotelId =
        getProviderHotelId(
          hotelId,
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
    
        token:
          session.token,
    
        correlationId:
          session.correlationId,
      });
    
    }
    
    // =========================
    // Search Status
    // =========================
    
    async function getSearchStatus(searchId = null) {
    
      const session =
        getSearchSession(searchId);
    
      if (!session) {
    
        return {
          success:
            false,
    
          message:
            "No active search session.",
        };
    
      }
    
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
          session.nextResultsKey ?? null,
    
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