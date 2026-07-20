import { normalizeStoredSearchMeta, type StoredSearchMeta } from "../../utils/searchMeta";

import {
  getEffectiveSmartStayPreference,
} from "../../utils/smartStaySearchProfile";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
  
  import {
    useNavigate,
    useSearchParams,
  } from "react-router-dom";
  
import HotelCard from "../../components/HotelCard/HotelCard";
import HotelDetailsPanel from "../../components/HotelDetailsPanel/HotelDetailsPanel";
  
  import {
    sliderOptions,
  } from "../../components/SmartOptimizer/sliderData";
import {
  ApiRequestError,
  createBookingRedirectUrl,
  getHotelDetails,
  getSearchSession,
} from "../../services/api";
import type {
  Hotel,
  HotelDetails,
  SearchSessionResponse,
} from "../../types/hotel";
import type {
  SmartStayFrontendViewV2,
} from "../../engine-v2/frontend/smartStayFrontendAdapterV2";

import {
  selectHotelOffers,
} from "../../utils/hotelOfferSelection";
  
import "./Results.css";

  const SEARCH_META_STORAGE_PREFIX =
    "smartstay_search_meta_";
  
  const DEFAULT_PREFERENCE_INDEX =
    2;
  
  type SearchMeta =
    StoredSearchMeta;

  function getSearchMetaStorageKey(
    searchId: string
  ) {
    return `${SEARCH_META_STORAGE_PREFIX}${searchId}`;
  }
  
  function readSearchMeta(
    searchId: string | null
  ): SearchMeta | null {
    if (!searchId) {
      return null;
    }

    const rawSearchMeta =
      sessionStorage.getItem(
        getSearchMetaStorageKey(
          searchId
        )
      );

    if (!rawSearchMeta) {
      return null;
    }

    try {
      const parsed =
        JSON.parse(
          rawSearchMeta
        ) as unknown;

      return normalizeStoredSearchMeta(
        parsed
      );
    } catch {
      return null;
    }
  }

const RANKING_V2_STORAGE_PREFIX =
  "smartstay_ranking_v2_";

function getRankingV2StorageKey(
  searchId: string
) {
  return `${RANKING_V2_STORAGE_PREFIX}${searchId}`;
}

function readStoredRankingV2(
  searchId:
    string |
    null,
  hotels:
    Hotel[]
) {
  if (!searchId) {
    return [];
  }

  const raw =
    sessionStorage.getItem(
      getRankingV2StorageKey(
        searchId
      )
    );

  if (!raw) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(
        raw
      ) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    const availableHotelIds =
      new Set(
        hotels.map(
          (hotel) =>
            hotel.id
        )
      );

    const ranking =
      parsed.filter(
        (
          value
        ): value is string =>
          typeof value ===
            "string" &&
          availableHotelIds.has(
            value
          )
      );

    return [
      ...new Set(
        ranking
      ),
    ];
  }
  catch {
    return [];
  }
}

function writeStoredRankingV2(
  searchId:
    string |
    null,
  hotelIds:
    string[]
) {
  if (!searchId) {
    return;
  }

  sessionStorage.setItem(
    getRankingV2StorageKey(
      searchId
    ),
    JSON.stringify(
      hotelIds
    )
  );
}

  function formatSearchMoney(
    amount: number,
    currency: string
  ) {
    const normalizedCurrency =
      /^[A-Z]{3}$/.test(currency)
        ? currency
        : "EUR";

    try {
      return new Intl.NumberFormat(
        "en-US",
        {
          style: "currency",
          currency:
            normalizedCurrency,
          maximumFractionDigits: 2,
        }
      ).format(amount);
    } catch {
      return (
        normalizedCurrency +
        " " +
        amount.toFixed(2)
      );
    }
  }

  function formatDistanceLimit(
    maxDistanceKm: number | null
  ) {
    if (maxDistanceKm === null) {
      return "Flexible distance";
    }

    return `Within ${maxDistanceKm} km`;
  }

  function getSelectedLocation(
    searchMeta:
      SearchMeta | null
  ) {
    if (
      searchMeta
        ?.destinationLatitude ===
        null ||
      searchMeta
        ?.destinationLatitude ===
        undefined ||
      searchMeta
        ?.destinationLongitude ===
        null ||
      searchMeta
        ?.destinationLongitude ===
        undefined
    ) {
      return null;
    }

    return {
      latitude:
        searchMeta
          .destinationLatitude,

      longitude:
        searchMeta
          .destinationLongitude,

      confidence:
        1,

      label:
        searchMeta
          .destinationLabel ||
        "Selected destination",
    };
  }

  function getSelectedPreferenceIndex(
    searchMeta: SearchMeta | null
  ) {
    const effectivePreference =
      getEffectiveSmartStayPreference(
        searchMeta?.smartStayProfile,
        searchMeta?.smartPreference
      );

    return Math.min(
      Math.max(
        Math.round(
          effectivePreference
            .selectedIndex
        ),
        0
      ),
      sliderOptions.length - 1
    );
  }

  
  function getPreferenceSummary(
    preferenceId: string
  ) {
    if (preferenceId === "maximum-comfort") {
      return "Prioritizing premium comfort, stronger reliability signals and fewer compromises.";
    }
  
    if (preferenceId === "comfort") {
      return "Prioritizing comfort, quality and location while still keeping value in mind.";
    }
  
    if (preferenceId === "savings") {
      return "Prioritizing stronger price advantages while keeping reliability under control.";
    }
  
    if (preferenceId === "maximum-savings") {
      return "Prioritizing the lowest reliable total prices while respecting your budget and distance limits.";
    }
  
    return "Balancing comfort, savings, location and reliability.";
  }
  
  function calculateAverageSearchPrice(
    evaluations:
      SmartStayFrontendViewV2[
        "rankedHotels"
      ]
  ) {
    const validPrices =
      evaluations
        .map(
          (evaluation) =>
            evaluation.totalCost
        )
        .filter(
          (
            price
          ): price is number => (
            price !== null &&
            Number.isFinite(price) &&
            price > 0
          )
        );
  
    if (validPrices.length === 0) {
      return null;
    }
  
    const total = validPrices.reduce(
      (sum, price) => sum + price,
      0
    );
  
    return total / validPrices.length;
  }
  
  function calculatePriceAdvantagePercent(
    totalCost:
      number | null,
    averageSearchPrice:
      number | null
  ) {
    const hotelPrice =
      totalCost;
  
    if (
      hotelPrice === null ||
      averageSearchPrice === null ||
      averageSearchPrice <= 0 ||
      hotelPrice >= averageSearchPrice
    ) {
      return null;
    }
  
    const advantagePercent =
      ((averageSearchPrice - hotelPrice) /
        averageSearchPrice) *
      100;
  
    if (
      !Number.isFinite(advantagePercent) ||
      advantagePercent < 5
    ) {
      return null;
    }
  
    return Math.round(advantagePercent);
  }

  type ResultsLoadFailure = {
    message: string;
    clearStoredMeta: boolean;
  };

  function getResultsLoadFailure(
    error: unknown
  ): ResultsLoadFailure {

    if (
      !(error instanceof ApiRequestError)
    ) {

      return {
        message:
          "Unable to load hotels.",

        clearStoredMeta:
          false,
      };

    }

    if (
      error.code ===
        "SEARCH_SESSION_EXPIRED" ||
      error.status ===
        410
    ) {

      return {
        message:
          "This search has expired. Please start a new search.",

        clearStoredMeta:
          true,
      };

    }

    if (
      error.code ===
        "SEARCH_SESSION_NOT_FOUND" ||
      error.status ===
        404
    ) {

      return {
        message:
          "These search results are no longer available. Please start a new search.",

        clearStoredMeta:
          true,
      };

    }

    if (
      error.code ===
        "SEARCH_ID_REQUIRED" ||
      error.status ===
        400
    ) {

      return {
        message:
          "This search link is not valid. Please start a new search.",

        clearStoredMeta:
          true,
      };

    }

    if (
      error.code ===
        "REQUEST_TIMEOUT" ||
      error.status ===
        408
    ) {

      return {
        message:
          "Retrieving the search results took too long. Please try again.",

        clearStoredMeta:
          false,
      };

    }

    if (
      error.code ===
        "NETWORK_ERROR"
    ) {

      return {
        message:
          "SmartStay could not be reached. Check your connection and try again.",

        clearStoredMeta:
          false,
      };

    }

    return {
      message:
        "Unable to load hotels.",

      clearStoredMeta:
        false,
    };

  }

function getHotelBookingUrl(
  hotel: Hotel | null,
  searchId: string | null
) {
  if (!hotel) {
    return null;
  }

  const redirectableOffer =
    selectHotelOffers(
      hotel
    ).offers.find(
      (candidate) =>
        candidate.offer
          .redirectable ===
        true
    );

  if (!redirectableOffer) {
    return null;
  }

  return createBookingRedirectUrl(
    searchId,
    hotel.id,
    redirectableOffer.offer.id
  );
}

function getHotelDetailsFailureMessage(
  error: unknown
) {
  if (
    !(error instanceof ApiRequestError)
  ) {
    return "Accommodation details are temporarily unavailable.";
  }

  if (
    error.code ===
    "SEARCH_SESSION_EXPIRED"
  ) {
    return "This search has expired. Start a new search to refresh the available stays.";
  }

  if (
    error.code ===
    "SEARCH_SESSION_NOT_FOUND"
  ) {
    return "This search is no longer available. Start a new search.";
  }

  if (
    error.code ===
    "HOTEL_NOT_IN_SEARCH"
  ) {
    return "This accommodation is no longer part of the current search.";
  }

  if (
    error.code ===
      "REQUEST_TIMEOUT" ||
    error.status === 408
  ) {
    return "The accommodation details took too long to load. Please try again.";
  }

  return (
    error.message ||
    "Accommodation details are temporarily unavailable."
  );
}

  function Results() {
    const navigate =
      useNavigate();
  
    const [searchParams] =
      useSearchParams();
  
    const searchId =
      searchParams.get("searchId");
  
    const [hotels, setHotels] =
      useState<Hotel[]>([]);
  
    const [loading, setLoading] =
      useState(true);
  
    const [error, setError] =
      useState("");
  
    const [status, setStatus] =
      useState<string | null>(null);
  
    const [searchMeta, setSearchMeta] =
      useState<SearchMeta | null>(null);
  
    const [engineView, setEngineView] =
      useState<SmartStayFrontendViewV2 | null>(null);

    const [engineError, setEngineError] =
      useState("");

    const engineRequestIdRef =
      useRef(0);

    const [showFullList, setShowFullList] =
      useState(false);

    const [detailsOpen, setDetailsOpen] =
      useState(false);

    const [hotelDetails, setHotelDetails] =
      useState<HotelDetails | null>(null);

    const [hotelDetailsLoading, setHotelDetailsLoading] =
      useState(false);

    const [hotelDetailsError, setHotelDetailsError] =
      useState("");

    const [activeDetailsHotelId, setActiveDetailsHotelId] =
      useState<string | null>(null);

    const detailsRequestIdRef =
      useRef(0);

    const activeDetailsHotel =
      hotels.find(
        (hotel) =>
          hotel.id ===
          activeDetailsHotelId
      ) ??
      null;

    const activeDetailsOfferSelection =
      activeDetailsHotel
        ? selectHotelOffers(
            activeDetailsHotel
          )
        : null;

    const activeDetailsBookingUrl =
      getHotelBookingUrl(
        activeDetailsHotel,
        searchId
      );
  
    const selectedPreferenceIndex =
      useMemo(() => {
        return getSelectedPreferenceIndex(
          searchMeta
        );
      }, [searchMeta]);
  
    const selectedPreference =
      sliderOptions[selectedPreferenceIndex] ??
      sliderOptions[DEFAULT_PREFERENCE_INDEX];

    const smartStayProfile =
      searchMeta?.smartStayProfile ??
      null;

    const balanceSourceLabel =
      smartStayProfile
        ?.preferenceSource === "manual"
        ? "Your choice"
        : smartStayProfile
          ? "Automatic"
          : "Saved preference";

    const balanceSourceClassName =
      smartStayProfile
        ?.preferenceSource === "manual"
        ? "results-balance-card__source--manual"
        : "results-balance-card__source--automatic";

    const balanceExplanation =
      smartStayProfile
        ?.explanation ||
      getPreferenceSummary(
        selectedPreference.id
      );

const rankedHotels =
      engineView?.rankedHotels ?? [];
  
    const averageSearchPrice =
      useMemo(() => {
        return calculateAverageSearchPrice(
          rankedHotels
        );
      }, [
        rankedHotels,
      ]);
  
    const recommendationPicks =
      engineView?.recommendationPicks ?? [];

    const recommendationHotelIds =
      useMemo(() => {
        return new Set(
          recommendationPicks.map(
            (pick) =>
              pick.evaluation.hotel.id
          )
        );
      }, [
        recommendationPicks,
      ]);

    const bestChoiceEvaluation =
      useMemo(() => {
        return (
          recommendationPicks.find(
            (pick) =>
              pick.role ===
              "best-choice"
          )
            ?.evaluation ??
          null
        );
      }, [
        recommendationPicks,
      ]);

    const nearBudgetHotels =
      useMemo(() => {
        return rankedHotels.filter(
          (evaluation) =>
            evaluation
              .budgetVisibility ===
              "near-budget" &&
            !recommendationHotelIds.has(
              evaluation.hotel.id
            )
        );
      }, [
        rankedHotels,
        recommendationHotelIds,
      ]);

    const remainingHotels =
      useMemo(() => {
        return rankedHotels.filter(
          (evaluation) =>
            evaluation
              .budgetVisibility !==
              "near-budget" &&
            !recommendationHotelIds.has(
              evaluation.hotel.id
            )
        );
      }, [
        rankedHotels,
        recommendationHotelIds,
      ]);

    const budgetPolicy =
      engineView?.budgetPolicy ??
      null;

    const hiddenNearBudgetNotUsefulCount =
      budgetPolicy
        ?.hiddenNearBudgetNotUsefulCount ??
      0;

    const hiddenAdditionalBudgetOptionCount =
      budgetPolicy
        ? budgetPolicy
            .hiddenNearBudgetOverflowCount +
          budgetPolicy
            .hiddenFarOverBudgetCount +
          budgetPolicy
            .hiddenBudgetUnverifiedCount
        : 0;

    const excludedVerificationCount =
      engineView
        ?.excludedHotelIds
        .length ??
      0;

    const suppressedDuplicateCount =
      engineView
        ?.suppressedHotelIds
        .length ??
      0;

    const budgetVisibilitySummary =
      budgetPolicy &&
      budgetPolicy.totalBudget !==
        null
        ? (
            budgetPolicy
              .withinBudgetVisibleCount +
            " " +
            (
              budgetPolicy
                .withinBudgetVisibleCount ===
                1
                ? "stay fits"
                : "stays fit"
            ) +
            " your budget" +
            (
              budgetPolicy
                .nearBudgetVisibleCount >
                0
                ? (
                    ", plus " +
                    budgetPolicy
                      .nearBudgetVisibleCount +
                    " near-budget " +
                    (
                      budgetPolicy
                        .nearBudgetVisibleCount ===
                        1
                        ? "alternative"
                        : "alternatives"
                    )
                  )
                : ""
            ) +
            "." +
            (
              hiddenNearBudgetNotUsefulCount >
                0
                ? (
                    " " +
                    hiddenNearBudgetNotUsefulCount +
                    " near-budget " +
                    (
                      hiddenNearBudgetNotUsefulCount ===
                        1
                        ? "option was"
                        : "options were"
                    ) +
                    " hidden because " +
                    (
                      hiddenNearBudgetNotUsefulCount ===
                        1
                        ? "it did"
                        : "they did"
                    ) +
                    " not offer a meaningful improvement."
                  )
                : ""
            ) +
            (
              hiddenAdditionalBudgetOptionCount >
                0
                ? (
                    " " +
                    hiddenAdditionalBudgetOptionCount +
                    " additional options were hidden to keep the results focused."
                  )
                : ""
            ) +
            (
              excludedVerificationCount >
                0
                ? (
                    " " +
                    excludedVerificationCount +
                    " other stays did not pass SmartStay verification."
                  )
                : ""
            ) +
            (
              suppressedDuplicateCount >
                0
                ? (
                    " " +
                    suppressedDuplicateCount +
                    " duplicate " +
                    (
                      suppressedDuplicateCount ===
                        1
                        ? "offer was"
                        : "offers were"
                    ) +
                    " merged."
                  )
                : ""
            )
          )
        : (
            rankedHotels.length +
            " relevant matches remain visible." +
            (
              excludedVerificationCount >
                0
                ? (
                    " " +
                    excludedVerificationCount +
                    " other stays did not pass SmartStay verification."
                  )
                : ""
            )
          );

    useEffect(() => {
      async function loadResults() {
        try {
          if (!searchId) {
            setError(
              "Missing searchId. Please start a new search."
            );
  
            return;
          }
  
          setSearchMeta(
            readSearchMeta(searchId)
          );
  
          const response =
            await getSearchSession(
              searchId
            ) as SearchSessionResponse;
  
          setHotels(
            response.session.hotels ?? []
          );
  
          setStatus(
            response.session.status ?? null
          );
        } catch (err) {
          console.error(err);

          const failure =
            getResultsLoadFailure(
              err
            );

          if (
            failure.clearStoredMeta &&
            searchId
          ) {

            sessionStorage.removeItem(
              getSearchMetaStorageKey(
                searchId
              )
            );

          }

          setError(
            failure.message
          );
        } finally {
          setLoading(false);
        }
      }
  
      loadResults();
    }, [searchId]);

    useEffect(() => {
      if (hotels.length === 0) {
        setEngineView(
          null
        );

        setEngineError(
          ""
        );

        return;
      }

      const requestId =
        engineRequestIdRef.current +
        1;

      engineRequestIdRef.current =
        requestId;

      let cancelled =
        false;

      setEngineView(
        null
      );

      setEngineError(
        ""
      );

      async function rankWithEngineV2() {
        try {
          const engineModule =
            await import(
              "../../engine-v2/frontend/smartStayFrontendAdapterV2"
            );

          const previousRankingHotelIds =
            readStoredRankingV2(
              searchId,
              hotels
            );

          const view =
            engineModule
              .buildSmartStayFrontendViewV2({
                hotels,

                preferenceId:
                  selectedPreference.id,

                selectedIndex:
                  selectedPreferenceIndex,

                preferenceSource:
                  smartStayProfile
                    ?.preferenceSource ??
                  "default",

                totalBudget:
                  searchMeta
                    ?.totalBudget ??
                  null,

                maximumDistanceKm:
                  searchMeta
                    ?.maxDistanceKm ??
                  null,

                selectedLocation:
                  getSelectedLocation(
                    searchMeta
                  ),

                nights:
                  searchMeta
                    ?.nightCount ??
                  null,

                destinationKey:
                  searchMeta
                    ?.destinationLabel ??
                  null,

                currency:
                  searchMeta
                    ?.currency ??
                  null,

                checkIn:
                  searchMeta
                    ?.checkIn ??
                  null,

                checkOut:
                  searchMeta
                    ?.checkOut ??
                  null,

                marketContextMode:
                  "hybrid",

                previousRankingHotelIds,

                maximumVisibleResults:
                  hotels.length,
              });

          if (
            cancelled ||
            engineRequestIdRef
              .current !==
              requestId
          ) {
            return;
          }

          setEngineView(
            view
          );

          writeStoredRankingV2(
            searchId,
            view.rankedHotels.map(
              (evaluation) =>
                evaluation.hotel.id
            )
          );
        }
        catch (engineFailure) {
          console.error(
            engineFailure
          );

          if (
            cancelled ||
            engineRequestIdRef
              .current !==
              requestId
          ) {
            return;
          }

          setEngineError(
            "SmartStay could not rank these stays with Engine V2. Please start a new search."
          );
        }
      }

      void rankWithEngineV2();

      return () => {
        cancelled =
          true;
      };
    }, [
      hotels,
      searchId,
      selectedPreference.id,
      selectedPreferenceIndex,
      smartStayProfile
        ?.preferenceSource,
      searchMeta
        ?.totalBudget,
      searchMeta
        ?.maxDistanceKm,
      searchMeta
        ?.destinationLatitude,
      searchMeta
        ?.destinationLongitude,
      searchMeta
        ?.destinationLabel,
      searchMeta
        ?.nightCount,
    ]);

    const handleCloseHotelDetails =
      useCallback(() => {
        detailsRequestIdRef.current += 1;

        setDetailsOpen(false);
        setHotelDetailsLoading(false);
        setActiveDetailsHotelId(null);
      }, []);

    const handleViewHotelDetails =
      useCallback(
        async (
          hotel: Hotel
        ) => {
          const requestId =
            detailsRequestIdRef.current + 1;

          detailsRequestIdRef.current =
            requestId;

          setDetailsOpen(true);
          setHotelDetails(null);
          setHotelDetailsError("");
          setHotelDetailsLoading(true);
          setActiveDetailsHotelId(
            hotel.id
          );

          if (!searchId) {
            setHotelDetailsError(
              "The current search is missing. Start a new search."
            );

            setHotelDetailsLoading(false);

            return;
          }

          try {
            const response =
              await getHotelDetails(
                hotel.id,
                searchId
              );

            if (
              detailsRequestIdRef.current !==
              requestId
            ) {
              return;
            }

            if (!response.hotel) {
              setHotelDetailsError(
                "No additional information is available for this accommodation."
              );

              return;
            }

            setHotelDetails(
              response.hotel
            );
          } catch (error) {
            console.error(
              error
            );

            if (
              detailsRequestIdRef.current !==
              requestId
            ) {
              return;
            }

            setHotelDetailsError(
              getHotelDetailsFailureMessage(
                error
              )
            );
          } finally {
            if (
              detailsRequestIdRef.current ===
              requestId
            ) {
              setHotelDetailsLoading(false);
            }
          }
        },
        [searchId]
      );

    if (loading) {
      return (
        <div
          className="results-state results-state--loading"
          role="status"
          aria-live="polite"
        >
          Loading hotels...
        </div>
      );
    }

    if (
      hotels.length > 0 &&
      !engineView &&
      !engineError
    ) {
      return (
        <div
          className="results-state results-state--loading"
          role="status"
          aria-live="polite"
        >
          SmartStay Engine V2 is ranking your stays...
        </div>
      );
    }

    if (error || engineError) {
      return (
        <div
          className="results-state results-state--error"
          role="alert"
        >
          <h1>
            Results not available
          </h1>

          <p>
            {error || engineError}
          </p>

          <button
            type="button"
            className="results-state__button results-state__button--dark"
            onClick={() => navigate("/")}
          >
            Start a new search
          </button>
        </div>
      );
    }

    return (
      <main className="results-page">
        <section className="results-page__header">
          <p className="results-page__eyebrow">
            Ranked by SmartStay Engine
          </p>

          <h1 className="results-page__title">
            Your SmartStay recommendations
          </h1>

          <p className="results-search-summary">
            SmartStay analyzed {hotels.length} stays
            {searchMeta?.destinationLabel
              ? ` for your search in ${searchMeta.destinationLabel}`
              : " for your search"}.
            {" "}{budgetVisibilitySummary}
          </p>

          <div className="results-balance-card">
            <div className="results-balance-card__header">
              <div>
                <p className="results-balance-card__eyebrow">
                  Your SmartStay balance
                </p>

                <div className="results-balance-card__title-row">
                  <span
                    className="results-balance-card__dot"
                    style={{
                      background:
                        selectedPreference.color,
                    }}
                    aria-hidden="true"
                  />

                  <strong>
                    {selectedPreference.title}
                  </strong>
                </div>
              </div>

              <span
                className={`results-balance-card__source ${balanceSourceClassName}`}
              >
                {balanceSourceLabel}
              </span>
            </div>

            <p className="results-balance-card__explanation">
              {balanceExplanation}
            </p>

            {searchMeta && (
              <div className="results-balance-card__facts">
                {searchMeta.totalBudget !== null && (
                  <span>
                    {formatSearchMoney(
                      searchMeta.totalBudget,
                      searchMeta.currency
                    )}{" "}
                    total budget
                  </span>
                )}

                {searchMeta.nightCount !== null && (
                  <span>
                    {searchMeta.nightCount}{" "}
                    {searchMeta.nightCount === 1
                      ? "night"
                      : "nights"}
                  </span>
                )}

                <span>
                  {formatDistanceLimit(
                    searchMeta.maxDistanceKm
                  )}
                </span>
              </div>
            )}
          </div>

          {status && (
            <p
              className="results-page__status"
              role="status"
            >
              Search status: {status}
            </p>
          )}
        </section>

        {rankedHotels.length === 0 ? (
          <div className="results-state results-state--empty">
            <h2>
              {hotels.length === 0
                ? "No stays found"
                : "No stays passed the current verification checks"}
            </h2>

            <p>
              {hotels.length === 0
                ? "Try another destination or different dates."
                : "SmartStay found stays, but none could be ranked safely with the current availability and location evidence."}
            </p>

            <button
              type="button"
              className="results-state__button results-state__button--primary"
              onClick={() => navigate("/")}
            >
              Search again
            </button>
          </div>
      ) : (
        <>
          {recommendationPicks.length > 0 && (
            <section
              className="results__recommendations"
              aria-label="SmartStay recommendations"
            >
              {recommendationPicks.map((pick) => {
                const evaluation =
                  pick.evaluation;

                return (
                  <div
                    key={`${pick.role}-${evaluation.hotel.id}`}
                    className={`results__recommendation results__recommendation--${pick.role}`}
                  >
                    <div className="results__recommendation-heading">
                      <p className="results__recommendation-role">
                        {pick.label}
                      </p>

                      <p className="results__recommendation-summary">
                        {pick.reason}
                      </p>
                    </div>

                    <HotelCard
                      showRecommendationLabel
                      hotel={evaluation.hotel}
                      smartScore={evaluation.smartScore}
                      riskLevel={evaluation.riskLevel}
                      dataConfidenceLevel={evaluation.dataConfidenceLevel}
                      badges={evaluation.badges}
                      reasons={evaluation.reasons}
                      priceAdvantagePercent={calculatePriceAdvantagePercent(
                        evaluation.totalCost,
                        averageSearchPrice
                      )}
                      selectedOffer={
                        evaluation.selectedOffer
                      }
                      detailsLoading={
                        hotelDetailsLoading &&
                        activeDetailsHotelId ===
                          evaluation.hotel.id
                      }
                      bookingUrl={
                        getHotelBookingUrl(
                          evaluation.hotel,
                          searchId
                        )
                      }
                      onViewDetails={
                        handleViewHotelDetails
                      }
                    />
                  </div>
                );
              })}
            </section>
          )}

          {nearBudgetHotels.length > 0 && (
            <section
              className="results__recommendations"
              aria-label="Near-budget alternatives"
            >
              {nearBudgetHotels.map((evaluation) => {
                const budgetTotal =
                  budgetPolicy?.totalBudget ??
                  null;

                const overBudgetAmount =
                  budgetTotal !== null &&
                  evaluation.totalCost !==
                    null
                    ? Math.max(
                        evaluation.totalCost -
                          budgetTotal,
                        0
                      )
                    : null;

                const currency =
                  searchMeta?.currency ||
                  evaluation.hotel.currency ||
                  "EUR";

                const candidateDistanceConstraint =
                  evaluation
                    .sourceEvaluation
                    .constraints
                    .find(
                      (constraint) =>
                        constraint.kind ===
                        "distance"
                    );

                const bestChoiceDistanceConstraint =
                  bestChoiceEvaluation
                    ?.sourceEvaluation
                    .constraints
                    .find(
                      (constraint) =>
                        constraint.kind ===
                        "distance"
                    );

                const candidateDistance =
                  typeof candidateDistanceConstraint
                    ?.actualValue ===
                    "number" &&
                  Number.isFinite(
                    candidateDistanceConstraint
                      .actualValue
                  )
                    ? candidateDistanceConstraint
                        .actualValue
                    : null;

                const bestChoiceDistance =
                  typeof bestChoiceDistanceConstraint
                    ?.actualValue ===
                    "number" &&
                  Number.isFinite(
                    bestChoiceDistanceConstraint
                      .actualValue
                  )
                    ? bestChoiceDistanceConstraint
                        .actualValue
                    : null;

                const distanceGain =
                  candidateDistance !==
                    null &&
                  bestChoiceDistance !==
                    null
                    ? (
                        bestChoiceDistance -
                        candidateDistance
                      )
                    : null;

                const smartScoreDifference =
                  bestChoiceEvaluation
                    ? (
                        evaluation.smartScore -
                        bestChoiceEvaluation
                          .smartScore
                      )
                    : null;

                let nearBudgetSummary =
                  overBudgetAmount !==
                    null
                    ? (
                        formatSearchMoney(
                          overBudgetAmount,
                          currency
                        ) +
                        " over your total budget, but still inside SmartStay's near-budget range."
                      )
                    : "A verified option just above your budget.";

                if (
                  overBudgetAmount !==
                    null &&
                  distanceGain !==
                    null &&
                  distanceGain >=
                    0.5
                ) {
                  nearBudgetSummary =
                    formatSearchMoney(
                      overBudgetAmount,
                      currency
                    ) +
                    " over your total budget, but " +
                    distanceGain.toFixed(
                      1
                    ) +
                    " km closer than the Best Choice.";
                }
                else if (
                  overBudgetAmount !==
                    null &&
                  smartScoreDifference !==
                    null &&
                  smartScoreDifference >
                    0
                ) {
                  nearBudgetSummary =
                    formatSearchMoney(
                      overBudgetAmount,
                      currency
                    ) +
                    " over your total budget with a SmartScore " +
                    smartScoreDifference +
                    " points higher than the Best Choice.";
                }
                else if (
                  overBudgetAmount !==
                    null &&
                  smartScoreDifference ===
                    0
                ) {
                  nearBudgetSummary =
                    formatSearchMoney(
                      overBudgetAmount,
                      currency
                    ) +
                    " over your total budget with the same SmartScore as the Best Choice.";
                }

                return (
                  <div
                    key={
                      "near-budget-" +
                      evaluation.hotel.id
                    }
                    className="results__recommendation results__recommendation--near-budget"
                  >
                    <div className="results__recommendation-heading">
                      <p className="results__recommendation-role">
                        Near-budget alternative
                      </p>

                      <p className="results__recommendation-summary">
                        {nearBudgetSummary}
                      </p>
                    </div>

                    <HotelCard
                      hotel={evaluation.hotel}
                      smartScore={evaluation.smartScore}
                      riskLevel={evaluation.riskLevel}
                      dataConfidenceLevel={evaluation.dataConfidenceLevel}
                      badges={evaluation.badges}
                      reasons={evaluation.reasons}
                      priceAdvantagePercent={calculatePriceAdvantagePercent(
                        evaluation.totalCost,
                        averageSearchPrice
                      )}
                      selectedOffer={
                        evaluation.selectedOffer
                      }
                      detailsLoading={
                        hotelDetailsLoading &&
                        activeDetailsHotelId ===
                          evaluation.hotel.id
                      }
                      bookingUrl={
                        getHotelBookingUrl(
                          evaluation.hotel,
                          searchId
                        )
                      }
                      onViewDetails={
                        handleViewHotelDetails
                      }
                    />
                  </div>
                );
              })}
            </section>
          )}

          {remainingHotels.length > 0 && (
            <section
              style={{
                marginTop: "44px",
              }}
            >
              {!showFullList ? (
                <div
                  style={{
                    padding: "30px",
                    borderRadius: "26px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 14px 35px rgba(15, 23, 42, .07)",
                    textAlign: "center",
                  }}
                >
                  <h2
                    style={{
                      margin: "0",
                      fontSize: "1.45rem",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    Want to compare the other verified options?
                  </h2>

                  <p
                    style={{
                      maxWidth: "660px",
                      margin: "10px auto 0",
                      color: "#64748b",
                      lineHeight: 1.6,
                    }}
                  >
                    SmartStay already separated the Best Choice and any near-budget alternatives above.
                    Open the remaining verified list to compare the other budget-relevant stays.
                  </p>

                  <button
                    type="button"
                    style={{
                      marginTop: "22px",
                      border: "none",
                      borderRadius: "15px",
                      padding: "14px 26px",
                      cursor: "pointer",
                      background: "#0f172a",
                      color: "white",
                      fontWeight: 800,
                      boxShadow: "0 12px 25px rgba(15, 23, 42, .18)",
                    }}
                    onClick={() => setShowFullList(true)}
                  >
                    View remaining verified stays
                  </button>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      marginBottom: "24px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px",
                        color: "#16a34a",
                        fontSize: "0.82rem",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Remaining verified list
                    </p>

                    <h2
                      style={{
                        margin: "0",
                        fontSize: "1.85rem",
                        letterSpacing: "-0.04em",
                      }}
                    >
                      Other verified stays
                    </h2>

                    <p
                      style={{
                        marginTop: "8px",
                        color: "#64748b",
                      }}
                    >
                      Near-budget alternatives are already shown above. These remaining options are ordered by SmartScore.
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "28px",
                    }}
                  >
                    {remainingHotels.map((evaluation) => (
                      <HotelCard
                        key={evaluation.hotel.id}
                        hotel={evaluation.hotel}
                        smartScore={evaluation.smartScore}
                        riskLevel={evaluation.riskLevel}
                        dataConfidenceLevel={evaluation.dataConfidenceLevel}
                        badges={evaluation.badges}
                        reasons={evaluation.reasons}
                        priceAdvantagePercent={calculatePriceAdvantagePercent(
                          evaluation.totalCost,
                          averageSearchPrice
                        )}
                        selectedOffer={
                          evaluation.selectedOffer
                        }
                        detailsLoading={
                          hotelDetailsLoading &&
                          activeDetailsHotelId ===
                            evaluation.hotel.id
                        }
                        bookingUrl={
                          getHotelBookingUrl(
                            evaluation.hotel,
                            searchId
                          )
                        }
                        onViewDetails={
                          handleViewHotelDetails
                        }
                        />
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
      {detailsOpen && (
        <HotelDetailsPanel
          details={hotelDetails}
          loading={hotelDetailsLoading}
          error={hotelDetailsError}
          offers={
            activeDetailsOfferSelection
              ?.offers ?? []
          }
          bookingUrl={activeDetailsBookingUrl}
          onClose={handleCloseHotelDetails}
        />
      )}

    </main>
  );
}

export default Results;