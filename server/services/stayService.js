const {
  operationalLogger,
} = require(
  "../observability/operationalLogger"
);

const {
    searchDestinationsAcrossProviders,
    searchHotelsAcrossProviders,
    continueHotelSearchForProvider,
    getHotelDetailsFromProvider,
  } = require("../providers/accommodationProviderOrchestrator");

  const {
    inferReviewCountRelation,
  } = require("../utils/reviewCountRelation");

  const {
    isPublicOfferId,
    resolveOfferByPublicId,
  } = require(
    "./bookingOfferIntegrityService"
  );

  const {
    saveSearchSession,
    requireSearchSession,
    tryAcquireSearchContinuation,
    releaseSearchContinuation,
    updateSearchSession,
    appendHotelsToSearchSession,
  } = require("../storage/searchSession");

  const {
    createProviderExecutionStates,
    normalizeProviderExecutionStates,
    getRunnableProviderExecutions,
    beginProviderExecutionAttempt,
    applyProviderExecutionSuccess,
    applyProviderExecutionFailure,
    summarizeProviderExecutions,
    getPrimaryRunnableProviderExecution,
    getMinimumProviderRetryAfterMs,
  } = require(
    "../providers/common/providerContinuationState"
  );

  const {
    normalizeRetryAfterMs,
  } = require(
    "../providers/common/providerRetryPolicy"
  );

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

  function getPublicNextResultsKey() {

    /*
     * Continuation is driven by the
     * SmartStay searchId. Provider cursors
     * remain private even when more than
     * one provider is still running.
     */
    return null;

  }

  function createProviderExecutionStateList(
    providerResult,
    {
      fallbackProviderId = null,
      fallbackContinuation = null,
      fallbackProviderContext = null,
    } = {}
  ) {

    const descriptors =
      Array.isArray(
        providerResult?.providerExecutions
      )
        ? providerResult
            .providerExecutions
        : [];

    if (descriptors.length > 0) {

      return createProviderExecutionStates(
        descriptors
      );

    }

    if (!fallbackProviderId) {

      return [];

    }

    return createProviderExecutionStates([
      {
        providerId:
          fallbackProviderId,

        supportsContinuation:
          Boolean(
            fallbackContinuation
          ),

        continuation:
          fallbackContinuation,

        providerContext:
          fallbackProviderContext,

        outcome:
          providerResult?.outcome ??
          null,

        code:
          providerResult?.failedResponse
            ?.code ??
          null,

        retryable:
          providerResult?.failedResponse
            ?.retryable === true,

        retryAfterMs:
          providerResult?.failedResponse
            ?.retryAfterMs ??
          null,
      },
    ]);

  }

  function normalizeSessionProviderExecutions(
    session
  ) {

    if (
      Array.isArray(
        session?.providerExecutions
      ) &&
      session.providerExecutions.length > 0
    ) {

      return normalizeProviderExecutionStates(
        session.providerExecutions
      );

    }

    if (!session?.providerId) {

      return [];

    }

    return createProviderExecutionStates([
      {
        providerId:
          session.providerId,

        supportsContinuation:
          Boolean(
            normalizeContinuation(
              session.continuation
            )
          ),

        continuation:
          normalizeContinuation(
            session.continuation
          ),

        providerContext:
          session.providerContext ??
          null,

        outcome:
          isCompletedStatus(
            session.status
          )
            ? "success"
            : null,
      },
    ]);

  }

  function hasRunnableProviderExecutions(
    executions
  ) {

    return (
      getRunnableProviderExecutions(
        executions
      ).length > 0
    );

  }

  function getLegacyProviderSnapshot(
    executions,
    session = {}
  ) {

    const runnableExecution =
      getPrimaryRunnableProviderExecution(
        executions
      );

    return {
      providerId:
        runnableExecution?.providerId ??
        session.providerId ??
        null,

      continuation:
        runnableExecution?.continuation ??
        null,

      providerContext:
        runnableExecution?.providerContext ??
        session.providerContext ??
        null,
    };

  }

  function createSearchSessionResponse(
    session,
    {
      success,
      message = null,
      code = null,
      retryable,
      retryAfterMs,
    } = {}
  ) {

    const normalizedSuccess =
      typeof success === "boolean"
        ? success
        : session?.status !== "Failed";

    return {
      success:
        normalizedSuccess,

      message,

      code,

      searchId:
        session?.searchId ??
        null,

      status:
        session?.status ??
        "InProgress",

      searchIncomplete:
        session?.searchIncomplete ??
        false,

      isContinuing:
        session?.isContinuing ??
        false,

      totalHotels:
        session?.hotels?.length ??
        0,

      nextResultsKey:
        null,

      currency:
        session?.currency ??
        null,

      retryable:
        typeof retryable ===
          "boolean"
          ? retryable
          : Boolean(
              session?.retryable
            ),

      retryAfterMs:
        normalizeRetryAfterMs(
          retryAfterMs ??
          session?.retryAfterMs
        ),

      hotels:
        session?.hotels ??
        [],
    };

  }

  function getProviderContinuationFailure(
    providerResult
  ) {

    const attempt =
      Array.isArray(
        providerResult?.attempts
      )
        ? providerResult.attempts[0]
        : (
            Array.isArray(
              providerResult
                ?.failedResponse
                ?.attempts
            )
              ? providerResult
                  .failedResponse
                  .attempts[0]
              : null
          );

    const failedResponse =
      providerResult?.failedResponse ??
      null;

    return {
      outcome:
        attempt?.outcome ??
        providerResult?.outcome ??
        "error",

      code:
        attempt?.code ??
        failedResponse?.code ??
        "PROVIDER_CONTINUATION_FAILED",

      message:
        attempt?.message ??
        failedResponse?.message ??
        "Provider continuation failed.",

      retryable:
        attempt?.retryable === true ||
        failedResponse?.retryable === true,

      retryAfterMs:
        attempt?.retryAfterMs ??
        failedResponse?.retryAfterMs ??
        null,
    };

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

  function getDetailText(
    value,
    fallback = ""
  ) {

    return typeof value ===
      "string" &&
      value.trim()
        ? value.trim()
        : fallback;

  }

  function getDetailNumber(
    value,
    fallback = null
  ) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {

      return fallback;

    }

    const number =
      Number(
        value
      );

    return Number.isFinite(
      number
    )
      ? number
      : fallback;

  }

  function mergeDetailStrings(
    ...collections
  ) {

    return Array.from(
      new Set(
        collections
          .flatMap(
            (collection) =>
              Array.isArray(
                collection
              )
                ? collection
                : []
          )
          .map(
            (item) =>
              getDetailText(
                item
              )
          )
          .filter(
            Boolean
          )
      )
    );

  }

  function createHotelDetailsResponse({
    hotel,
    providerDetails,
    offer = null,
  }) {

    const details =
      providerDetails &&
      typeof providerDetails ===
        "object" &&
      !Array.isArray(
        providerDetails
      )
        ? providerDetails
        : {};

    const sessionImage =
      getDetailText(
        hotel?.image
      );

    const providerReviewCount =
      getDetailNumber(
        details.reviewCount
      );

    const sessionReviewCount =
      getDetailNumber(
        hotel.reviewCount
      );

    const reviewCount =
      providerReviewCount ??
      sessionReviewCount;

    const reviewCountRelation =
      inferReviewCountRelation({
        reviewCount,

        reviewCountRelation:
          providerReviewCount !== null
            ? details.reviewCountRelation
            : hotel.reviewCountRelation,

        sourceProvider:
          hotel.sourceProvider ??
          hotel.provider,

        provider:
          hotel.provider,
      });

    return {
      success:
        true,

      offer,

      hotel: {
        id:
          hotel.id,

        provider:
          getDetailText(
            hotel.provider,
            "Provider"
          ),

        name:
          getDetailText(
            details.name
          ) ||
          getDetailText(
            hotel.name,
            "Accommodation"
          ),

        description:
          getDetailText(
            details.description
          ) ||
          null,

        stars:
          getDetailNumber(
            details.stars
          ) ??
          getDetailNumber(
            hotel.stars,
            0
          ),

        reviewScore:
          getDetailNumber(
            details.reviewScore
          ) ??
          getDetailNumber(
            hotel.reviewScore
          ),

        reviewCount,

        reviewCountRelation,

        address:
          getDetailText(
            details.address
          ) ||
          getDetailText(
            hotel.address
          ),

        city:
          getDetailText(
            details.city
          ) ||
          getDetailText(
            hotel.city
          ),

        country:
          getDetailText(
            details.country
          ) ||
          getDetailText(
            hotel.country
          ),

        latitude:
          getDetailNumber(
            details.latitude
          ) ??
          getDetailNumber(
            hotel.latitude
          ),

        longitude:
          getDetailNumber(
            details.longitude
          ) ??
          getDetailNumber(
            hotel.longitude
          ),

        images:
          mergeDetailStrings(
            details.images,
            sessionImage
              ? [sessionImage]
              : []
          ),

        amenities:
          mergeDetailStrings(
            details.amenities,
            hotel.amenities
          ),

        facilities:
          mergeDetailStrings(
            details.facilities,
            hotel.facilities
          ),

        checkIn:
          getDetailText(
            details.checkIn
          ) ||
          null,

        checkOut:
          getDetailText(
            details.checkOut
          ) ||
          null,
      },
    };

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
      await searchHotelsAcrossProviders({
        searchData,

        title:
          "SEARCH HOTELS - INITIAL",

        fallbackCurrency:
          searchData.currency ?? "USD",
      });

    function saveEmptySearchSession({
      providerId = null,
      providerExecutions = [],
      currency = searchData.currency ?? "USD",
      message = "No stays found for this search.",
      code = 204,
    } = {}) {

      const emptySession =
        saveSearchSession({
          originalSearchData:
            searchData,

          providerId,

          providerExecutions,

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

      operationalLogger.info(
        "search.session.saved",
        {
          searchId:
            emptySession.searchId,

          outcome:
            "no-results",

          totalHotels:
            0,
        }
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

          providerExecutions:
            createProviderExecutionStateList(
              providerResult,
              {
                fallbackProviderId:
                  providerResult.providerId ??
                  null,
              }
            ),

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

    const providerContext =
      providerResult?.providerContext ??
      null;

    const providerExecutions =
      createProviderExecutionStateList(
        providerResult,
        {
          fallbackProviderId:
            providerId,

          fallbackContinuation:
            continuation,

          fallbackProviderContext:
            providerContext,
        }
      );

    const isNoResultsResponse =
      data?.code === 204 ||
      (
        hotels.length === 0 &&
        !continuation
      );

    if (isNoResultsResponse) {

      return saveEmptySearchSession({
        providerId,

        providerExecutions,

        currency,

        message:
          data?.message ??
          "No stays found for this search.",

        code:
          data?.code ?? 204,
      });

    }

    const initialOutcome =
      getContinuationSessionOutcome(
        providerExecutions
      );

    const savedSession =
      saveSearchSession({
        originalSearchData:
          searchData,

        providerId,

        providerExecutions,

        status:
          initialOutcome.status,

        searchIncomplete:
          initialOutcome.searchIncomplete,

        continuation,

        providerContext,

        currency,

        totalHotels:
          hotels.length,

        hotels,

        isContinuing:
          false,

        lastError:
          initialOutcome.message,

        retryable:
          initialOutcome.retryable,

        retryAfterMs:
          initialOutcome.retryAfterMs,
      });

    operationalLogger.info(
      "search.session.saved",
      {
        searchId:
          savedSession.searchId,

        outcome:
          initialOutcome.outcome,

        totalHotels:
          hotels.length,

        searchIncomplete:
          initialOutcome
            .searchIncomplete,
      }
    );

    return createSearchSessionResponse(
      savedSession,
      initialOutcome
    );

  }

  // =========================
  // Continue Hotel Search
  // =========================

  function createContinuingSearchResponse(
    session
  ) {

    return createSearchSessionResponse(
      session,
      {
        success:
          true,
      }
    );

  }

  function getTerminalProviderFailureCode(
    providerExecutions
  ) {

    const terminalExecutions =
      normalizeProviderExecutionStates(
        providerExecutions
      ).filter(
        (execution) =>
          execution.state ===
          "terminal-failure"
      );

    const outcomes =
      terminalExecutions.map(
        (execution) =>
          String(
            execution.lastOutcome ??
            ""
          )
            .trim()
            .toLowerCase()
      );

    const allRateLimited =
      outcomes.length > 0 &&
      outcomes.every(
        (outcome) =>
          outcome ===
            "rate_limited" ||
          outcome ===
            "rate-limited" ||
          outcome ===
            "circuit_open" ||
          outcome ===
            "circuit-open"
      ) &&
      outcomes.some(
        (outcome) =>
          outcome ===
            "rate_limited" ||
          outcome ===
            "rate-limited"
      );

    if (allRateLimited) {

      return {
        code:
          "PROVIDER_RATE_LIMITED",

        message:
          "Accommodation search is temporarily rate limited.",

        retryable:
          true,
      };

    }

    const allTimeouts =
      outcomes.length > 0 &&
      outcomes.every(
        (outcome) =>
          outcome === "timeout"
      );

    if (allTimeouts) {

      return {
        code:
          "PROVIDER_TIMEOUT",

        message:
          "Accommodation providers took too long to respond.",

        retryable:
          true,
      };

    }

    const allUnavailable =
      outcomes.length > 0 &&
      outcomes.every(
        (outcome) =>
          outcome ===
            "unavailable" ||
          outcome ===
            "circuit_open" ||
          outcome ===
            "circuit-open"
      );

    if (allUnavailable) {

      return {
        code:
          "PROVIDER_UNAVAILABLE",

        message:
          "Accommodation search is temporarily unavailable.",

        retryable:
          true,
      };

    }

    return {
      code:
        "PROVIDER_CONTINUATION_FAILED",

      message:
        "One or more providers could not complete the search.",

      retryable:
        false,
    };

  }

  function getContinuationSessionOutcome(
    providerExecutions
  ) {

    const summary =
      summarizeProviderExecutions(
        providerExecutions
      );

    const searchIncomplete =
      summary.runnable > 0 ||
      summary.running > 0 ||
      summary.waitingForRetry > 0;

    const hasTerminalFailure =
      summary.terminalFailures > 0;

    const terminalFailure =
      getTerminalProviderFailureCode(
        providerExecutions
      );

    const terminalRetryDelays =
      normalizeProviderExecutionStates(
        providerExecutions
      )
        .filter(
          (execution) =>
            execution.state ===
              "terminal-failure"
        )
        .map(
          (execution) =>
            normalizeRetryAfterMs(
              execution.retryAfterMs
            )
        )
        .filter(
          (value) =>
            value !== null
        );

    const terminalRetryAfterMs =
      terminalRetryDelays.length > 0
        ? Math.min(
            ...terminalRetryDelays
          )
        : null;

    return {
      summary,

      searchIncomplete,

      status:
        searchIncomplete
          ? "InProgress"
          : (
              hasTerminalFailure
                ? "Failed"
                : "Completed"
            ),

      success:
        !hasTerminalFailure ||
        searchIncomplete,

      code:
        !searchIncomplete &&
        hasTerminalFailure
          ? terminalFailure.code
          : null,

      message:
        !searchIncomplete &&
        hasTerminalFailure
          ? terminalFailure.message
          : null,

      retryable:
        !searchIncomplete &&
        hasTerminalFailure
          ? terminalFailure.retryable
          : false,

      retryAfterMs:
        searchIncomplete
          ? summary.retryAfterMs
          : terminalRetryAfterMs,
    };

  }

  async function continueHotelSearch(searchId) {

    let session =
      requireSearchSession(
        searchId
      );

    let providerExecutions =
      normalizeSessionProviderExecutions(
        session
      );

    if (
      !Array.isArray(
        session.providerExecutions
      )
    ) {

      const legacySnapshot =
        getLegacyProviderSnapshot(
          providerExecutions,
          session
        );

      session =
        updateSearchSession(
          searchId,
          {
            providerExecutions,

            providerId:
              legacySnapshot.providerId,

            continuation:
              legacySnapshot.continuation,

            providerContext:
              legacySnapshot.providerContext,
          }
        );

    }

    if (session.isContinuing) {

      return createContinuingSearchResponse(
        session
      );

    }

    const preLockOutcome =
      getContinuationSessionOutcome(
        providerExecutions
      );

    if (
      !preLockOutcome
        .searchIncomplete
    ) {

      const legacySnapshot =
        getLegacyProviderSnapshot(
          providerExecutions,
          session
        );

      const completedSession =
        updateSearchSession(
          searchId,
          {
            providerExecutions,

            providerId:
              legacySnapshot.providerId,

            continuation:
              null,

            providerContext:
              legacySnapshot.providerContext,

            status:
              preLockOutcome.status,

            searchIncomplete:
              false,

            isContinuing:
              false,

            lastError:
              preLockOutcome.message,

            retryable:
              preLockOutcome.retryable,

            retryAfterMs:
              preLockOutcome.retryAfterMs,
          }
        );

      return createSearchSessionResponse(
        completedSession,
        preLockOutcome
      );

    }

    const runnableBeforeLock =
      getRunnableProviderExecutions(
        providerExecutions
      );

    if (
      runnableBeforeLock.length === 0 &&
      Number.isFinite(
        Number(
          preLockOutcome.retryAfterMs
        )
      ) &&
      Number(
        preLockOutcome.retryAfterMs
      ) > 0
    ) {

      const waitingSession =
        updateSearchSession(
          searchId,
          {
            providerExecutions,

            status:
              "InProgress",

            searchIncomplete:
              true,

            isContinuing:
              false,

            lastError:
              null,

            retryable:
              true,

            retryAfterMs:
              preLockOutcome.retryAfterMs,
          }
        );

      return createSearchSessionResponse(
        waitingSession,
        {
          success:
            true,

          retryable:
            true,

          retryAfterMs:
            preLockOutcome.retryAfterMs,
        }
      );

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

    const lockToken =
      continuationLock.lockToken;

    session =
      continuationLock.session;

    providerExecutions =
      normalizeSessionProviderExecutions(
        session
      );

    try {

      /*
       * Runnable providers are snapshotted once.
       * Each HTTP request advances at most one
       * cursor per provider. A newly returned
       * cursor waits for the next poll.
       */
      const runnableExecutions =
        getRunnableProviderExecutions(
          providerExecutions
        );

      for (
        const runnableExecution of
          runnableExecutions
      ) {

        providerExecutions =
          beginProviderExecutionAttempt(
            providerExecutions,
            runnableExecution.providerId
          );

      }

      const runningSnapshot =
        getLegacyProviderSnapshot(
          providerExecutions,
          session
        );

      session =
        updateSearchSession(
          searchId,
          {
            providerExecutions,

            providerId:
              runningSnapshot.providerId,

            continuation:
              runningSnapshot.continuation,

            providerContext:
              runningSnapshot.providerContext,

            status:
              "InProgress",

            searchIncomplete:
              true,

            isContinuing:
              true,

            lastError:
              null,

            retryable:
              false,

            retryAfterMs:
              null,
          }
        );

      /*
       * Providers advance independently.
       * Promise.all is safe here because
       * each result is applied only after
       * every provider call has settled,
       * under the same session lock.
       */
      const continuationResults =
        await Promise.all(
          runnableExecutions.map(
            async (
              runnableExecution
            ) => {

              const activeExecution =
                providerExecutions.find(
                  (execution) =>
                    execution.providerId ===
                    runnableExecution.providerId
                );

              try {

                const providerResult =
                  await continueHotelSearchForProvider({
                    providerId:
                      activeExecution.providerId,

                    searchData:
                      session.originalSearchData,

                    continuation:
                      activeExecution.continuation,

                    providerContext:
                      activeExecution.providerContext,

                    title:
                      "SEARCH HOTELS - CONTINUE",

                    fallbackCurrency:
                      session.currency ??
                      session.originalSearchData
                        ?.currency ??
                      "USD",
                  });

                return {
                  providerId:
                    activeExecution.providerId,

                  providerResult,

                  error:
                    null,
                };

              } catch (error) {

                return {
                  providerId:
                    activeExecution.providerId,

                  providerResult:
                    null,

                  error,
                };

              }

            }
          )
        );

      for (
        const continuationResult of
          continuationResults
      ) {

        const activeExecution =
          providerExecutions.find(
            (execution) =>
              execution.providerId ===
              continuationResult.providerId
          );

        if (continuationResult.error) {

          const error =
            continuationResult.error;

          providerExecutions =
            applyProviderExecutionFailure(
              providerExecutions,
              activeExecution.providerId,
              {
                outcome:
                  "error",

                code:
                  error?.code ??
                  "PROVIDER_CONTINUATION_EXCEPTION",

                message:
                  error?.message ??
                  "Provider continuation failed.",

                retryable:
                  error?.retryable === true,

                retryAfterMs:
                  error?.retryAfterMs ??
                  null,
              }
            );

        } else {

          const providerResult =
            continuationResult
              .providerResult;

          if (providerResult.failedResponse) {

            const failedResponse =
              providerResult.failedResponse;

            const isTerminalNoResults =
              failedResponse.code === 204 ||
              failedResponse.code === "204" ||
              failedResponse.code ===
                "NO_RESULTS";

            if (isTerminalNoResults) {

              providerExecutions =
                applyProviderExecutionSuccess(
                  providerExecutions,
                  activeExecution.providerId,
                  {
                    continuation:
                      null,

                    providerContext:
                      activeExecution
                        .providerContext,

                    outcome:
                      "no_results",

                    code:
                      failedResponse.code,
                  }
                );

            } else {

              const failure =
                getProviderContinuationFailure(
                  providerResult
                );

              providerExecutions =
                applyProviderExecutionFailure(
                  providerExecutions,
                  activeExecution.providerId,
                  failure
                );

            }

          } else {

            const continuation =
              getProviderContinuation(
                providerResult
              );

            const providerContext =
              providerResult
                ?.providerContext ??
              activeExecution
                .providerContext ??
              null;

            appendHotelsToSearchSession(
              searchId,
              providerResult.hotels
            );

            providerExecutions =
              applyProviderExecutionSuccess(
                providerExecutions,
                activeExecution.providerId,
                {
                  continuation,

                  providerContext,

                  outcome:
                    providerResult.outcome ??
                    "success",

                  code:
                    providerResult.data
                      ?.code ??
                    null,
                }
              );

            session =
              requireSearchSession(
                searchId
              );

            if (
              providerResult.currency
            ) {

              session =
                updateSearchSession(
                  searchId,
                  {
                    currency:
                      providerResult.currency,
                  }
                );

            }

          }

        }

        const providerSnapshot =
          getLegacyProviderSnapshot(
            providerExecutions,
            session
          );

        session =
          updateSearchSession(
            searchId,
            {
              providerExecutions,

              providerId:
                providerSnapshot.providerId,

              continuation:
                providerSnapshot.continuation,

              providerContext:
                providerSnapshot.providerContext,

              isContinuing:
                true,

              retryable:
                false,

              retryAfterMs:
                null,
            }
          );

      }

      const outcome =
        getContinuationSessionOutcome(
          providerExecutions
        );

      const legacySnapshot =
        getLegacyProviderSnapshot(
          providerExecutions,
          session
        );

      const releaseResult =
        releaseSearchContinuation(
          searchId,
          lockToken,
          {
            providerExecutions,

            providerId:
              legacySnapshot.providerId,

            continuation:
              legacySnapshot.continuation,

            providerContext:
              legacySnapshot.providerContext,

            status:
              outcome.status,

            searchIncomplete:
              outcome.searchIncomplete,

            lastError:
              outcome.message,

            retryable:
              outcome.retryable,

            retryAfterMs:
              outcome.retryAfterMs,
          }
        );

      if (!releaseResult.released) {

        const error =
          new Error(
            "Continuation lock ownership was lost before release."
          );

        error.code =
          "SEARCH_CONTINUATION_LOCK_LOST";

        throw error;

      }

      return createSearchSessionResponse(
        releaseResult.session,
        outcome
      );

    } catch (error) {

      releaseSearchContinuation(
        searchId,
        lockToken,
        {
          lastError:
            error.message,
        }
      );

      throw error;

    }

  }

    // =========================
    // Hotel Details
    // =========================

    async function getHotelDetails(
      hotelId,
      searchId,
      offerId = null
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

      const normalizedOfferId =
        typeof offerId ===
          "string"
          ? offerId.trim()
          : "";

      if (
        normalizedOfferId &&
        !isPublicOfferId(
          normalizedOfferId
        )
      ) {
        throw createStayServiceError({
          code:
            "OFFER_ID_INVALID",
          message:
            "offerId is invalid.",
          status:
            400,
        });
      }

      const offer =
        normalizedOfferId
          ? resolveOfferByPublicId(
              hotel.offers,
              normalizedOfferId
            )
          : null;

      if (
        normalizedOfferId &&
        !offer
      ) {
        throw createStayServiceError({
          code:
            "OFFER_NOT_IN_HOTEL",
          message:
            "The requested offer does not belong to this hotel.",
          status:
            404,
        });
      }

      const providerHotelId =
        getProviderHotelId(
          hotel
        );

      const sourceProvider =
        typeof hotel
          ?.sourceProvider ===
          "string"
          ? hotel.sourceProvider.trim()
          : "";

      if (!sourceProvider) {
        throw createStayServiceError({
          code:
            "HOTEL_SOURCE_UNAVAILABLE",
          message:
            "The accommodation source is unavailable for this search result.",
          status:
            409,
        });
      }

      const providerDetails =
        await getHotelDetailsFromProvider({
          sourceProvider,
          hotelId:
            providerHotelId,
          providerContext:
            hotel?.providerContext ??
            null,
        });

      return createHotelDetailsResponse({
        hotel,
        providerDetails,
        offer,
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

        retryable:
          Boolean(
            session.retryable
          ),

        retryAfterMs:
          normalizeRetryAfterMs(
            session.retryAfterMs
          ),

        updatedAt:
          session.updatedAt ?? null,

        expiresAt:
          session.expiresAt ?? null,
      };

    }

    module.exports = {
      searchDestinations,
      searchHotels,
      continueHotelSearch,
      getHotelDetails,
      getSearchStatus,
    };
