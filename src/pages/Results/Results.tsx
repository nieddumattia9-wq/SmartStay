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
  diagnoseSmartStayEmptyStateV2,
} from "../../engine-v2/frontend/constraintAwareEmptyStateV2";

import type {
  SmartStayEmptyStateV2,
} from "../../engine-v2/frontend/constraintAwareEmptyStateV2";


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

  function formatDistanceValue(
    maxDistanceKm: number | null
  ) {
    if (maxDistanceKm === null) {
      return "no distance limit";
    }

    if (maxDistanceKm < 1) {
      return `${Math.round(maxDistanceKm * 1000)} m`;
    }

    return `${maxDistanceKm} km`;
  }

  function formatDistanceLimit(
    maxDistanceKm: number | null
  ) {
    if (maxDistanceKm === null) {
      return "Flexible distance";
    }

    return `Within ${formatDistanceValue(maxDistanceKm)}`;
  }

  function formatDistanceRecoveryAction(
    maxDistanceKm: number | null
  ) {
    if (maxDistanceKm === null) {
      return "Remove the distance limit";
    }

    if (maxDistanceKm < 1) {
      return `Show within ${Math.round(maxDistanceKm * 1000)} m`;
    }

    return `Show within ${maxDistanceKm} km`;
  }

  function getEmptyStateTitle(
    emptyState:
      SmartStayEmptyStateV2
  ) {
    if (
      emptyState.reason ===
      "provider-no-results"
    ) {
      return "No stays are available for these dates";
    }

    if (
      emptyState.reason ===
      "distance-constraint"
    ) {
      return (
        "No stays match your " +
        formatDistanceValue(
          emptyState.maximumDistanceKm
        ) +
        " distance limit"
      );
    }

    if (
      emptyState.reason ===
      "budget-constraint"
    ) {
      return "No stays fit the current budget";
    }

    if (
      emptyState.reason ===
      "reliability-gate"
    ) {
      return "No stays passed SmartStay verification";
    }

    if (
      emptyState.reason ===
      "product-policy"
    ) {
      return "No stays satisfy all selected requirements";
    }

    return "No verified stays are currently visible";
  }

  function getEmptyStateDescription(
    emptyState:
      SmartStayEmptyStateV2
  ) {
    const analyzedCount =
      emptyState.providerHotelCount;

    if (
      emptyState.reason ===
      "provider-no-results"
    ) {
      return "The provider did not return an available stay for this destination and date range. Try different dates or adjust the search.";
    }

    if (
      emptyState.reason ===
      "distance-constraint"
    ) {
      return (
        "SmartStay found " +
        analyzedCount +
        " " +
        (
          analyzedCount === 1
            ? "stay"
            : "stays"
        ) +
        ", but " +
        (
          emptyState.distanceExceededCount ===
          analyzedCount
            ? "all were"
            : `${emptyState.distanceExceededCount} were`
        ) +
        " outside the selected area. Your distance limit was kept instead of showing farther options."
      );
    }

    if (
      emptyState.reason ===
      "budget-constraint"
    ) {
      return (
        "SmartStay analyzed " +
        analyzedCount +
        " " +
        (
          analyzedCount === 1
            ? "stay"
            : "stays"
        ) +
        ", but none could be shown as within or sensibly near your total budget."
      );
    }

    if (
      emptyState.reason ===
      "reliability-gate"
    ) {
      return (
        "SmartStay found " +
        analyzedCount +
        " " +
        (
          analyzedCount === 1
            ? "stay"
            : "stays"
        ) +
        ", but the available evidence was not strong enough to recommend any of them safely."
      );
    }

    if (
      emptyState.reason ===
      "product-policy"
    ) {
      return "Available stays were found, but they were excluded by the selected requirements or SmartStay visibility policies.";
    }

    return "Available stays were found, but SmartStay could not identify a safe visible option with the current search settings.";
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

    const [
      distanceOverrideKm,
      setDistanceOverrideKm,
    ] = useState<
      number |
      null |
      undefined
    >(undefined);

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

    const originalMaximumDistanceKm =
      searchMeta
        ?.maxDistanceKm ??
      null;

    const effectiveMaximumDistanceKm =
      distanceOverrideKm ===
        undefined
        ? originalMaximumDistanceKm
        : distanceOverrideKm;

    const distanceRecoveryActive =
      distanceOverrideKm !==
      undefined;

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

    const visibleTaxStatusUnknownCount =
      useMemo(() => {
        return rankedHotels.filter(
          (evaluation) =>
            evaluation
              .selectedOffer
              ?.completeness ===
            "reported-tax-status-unknown"
        ).length;
      }, [
        rankedHotels,
      ]);

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

    const provisionalUnderBudgetVisibleCount =
      budgetPolicy
        ?.provisionalUnderBudgetVisibleCount ??
      0;

    const otherVisibleTaxStatusUnknownCount =
      Math.max(
        visibleTaxStatusUnknownCount -
          provisionalUnderBudgetVisibleCount,
        0
      );

    const budgetVisibilitySummary =
      budgetPolicy &&
      budgetPolicy.totalBudget !==
        null
        ? (
            (
              budgetPolicy
                .withinBudgetVisibleCount >
                0
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
                    " your budget."
                  )
                : "No stay has a fully verified total within your budget."
            ) +
            (
              provisionalUnderBudgetVisibleCount >
                0
                ? (
                    " " +
                    provisionalUnderBudgetVisibleCount +
                    " additional " +
                    (
                      provisionalUnderBudgetVisibleCount ===
                        1
                        ? "stay has a provider-reported amount"
                        : "stays have provider-reported amounts"
                    ) +
                    " below your budget with tax inclusion not confirmed, so the final total may be higher."
                  )
                : ""
            ) +
            (
              budgetPolicy
                .nearBudgetVisibleCount >
                0
                ? (
                    " " +
                    budgetPolicy
                      .nearBudgetVisibleCount +
                    " near-budget " +
                    (
                      budgetPolicy
                        .nearBudgetVisibleCount ===
                        1
                        ? "alternative remains visible."
                        : "alternatives remain visible."
                    )
                  )
                : ""
            ) +
            (
              otherVisibleTaxStatusUnknownCount >
                0
                ? (
                    " " +
                    otherVisibleTaxStatusUnknownCount +
                    " other visible " +
                    (
                      otherVisibleTaxStatusUnknownCount ===
                        1
                        ? "price uses"
                        : "prices use"
                    ) +
                    " a provider-reported amount with tax inclusion not confirmed, so the final total may be higher."
                  )
                : ""
            ) +
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
        setDistanceOverrideKm(
          undefined
        );

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
            distanceRecoveryActive
              ? []
              : readStoredRankingV2(
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
                  effectiveMaximumDistanceKm,

                selectedLocation:
                  getSelectedLocation(
                    searchMeta
                  ),

                nights:
                  searchMeta
                    ?.nightCount ??
                  null,

                adults:
                  searchMeta
                    ?.adults ??
                  null,

                children:
                  searchMeta
                    ?.children ??
                  null,

                rooms:
                  searchMeta
                    ?.rooms ??
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

          if (!distanceRecoveryActive) {
            writeStoredRankingV2(
              searchId,
              view.rankedHotels.map(
                (evaluation) =>
                  evaluation.hotel.id
              )
            );
          }
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
      effectiveMaximumDistanceKm,
      distanceRecoveryActive,
      searchMeta
        ?.destinationLatitude,
      searchMeta
        ?.destinationLongitude,
      searchMeta
        ?.destinationLabel,
      searchMeta
        ?.nightCount,
      searchMeta
        ?.adults,
      searchMeta
        ?.children,
      searchMeta
        ?.rooms,
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

    const handleDistanceRecovery =
      useCallback(
        (
          maximumDistanceKm:
            number | null
        ) => {
          setDistanceOverrideKm(
            maximumDistanceKm
          );

          setShowFullList(
            false
          );
        },
        []
      );

    const handleRestoreDistanceLimit =
      useCallback(() => {
        setDistanceOverrideKm(
          undefined
        );

        setShowFullList(
          false
        );
      }, []);

    const emptyState =
      useMemo(() => {
        if (
          engineView
            ?.emptyState
        ) {
          return engineView
            .emptyState;
        }

        if (
          hotels.length ===
          0
        ) {
          return diagnoseSmartStayEmptyStateV2({
            providerHotelCount:
              0,

            visibleHotelCount:
              0,

            maximumDistanceKm:
              effectiveMaximumDistanceKm,

            totalBudget:
              searchMeta
                ?.totalBudget ??
              null,
          });
        }

        return null;
      }, [
        engineView,
        hotels.length,
        effectiveMaximumDistanceKm,
        searchMeta
          ?.totalBudget,
      ]);

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
            {rankedHotels.length > 0
              ? ` ${budgetVisibilitySummary}`
              : ""}
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

                {searchMeta.adults !== null && (
                  <span>
                    {searchMeta.adults}{" "}
                    {searchMeta.adults === 1
                      ? "adult"
                      : "adults"}
                    {searchMeta.children !== null &&
                    searchMeta.children > 0
                      ? `, ${searchMeta.children} ${
                          searchMeta.children === 1
                            ? "child"
                            : "children"
                        }`
                      : ""}
                  </span>
                )}

                {searchMeta.rooms !== null && (
                  <span>
                    {searchMeta.rooms}{" "}
                    {searchMeta.rooms === 1
                      ? "room"
                      : "rooms"}
                  </span>
                )}

                <span>
                  {formatDistanceLimit(
                    effectiveMaximumDistanceKm
                  )}
                </span>
              </div>
            )}
          </div>

          {distanceRecoveryActive && (
            <div
              className="results-recovery-notice"
              role="status"
              data-recovery-source="existing-results"
            >
              <div>
                <strong>
                  {effectiveMaximumDistanceKm ===
                    null
                    ? "Distance limit removed."
                    : (
                        "Distance adjusted to " +
                        formatDistanceValue(
                          effectiveMaximumDistanceKm
                        ) +
                        "."
                      )}
                </strong>

                <p>
                  SmartStay reused the stays already found. No new provider search was sent.
                </p>
              </div>

              <button
                type="button"
                className="results-recovery-notice__restore"
                onClick={
                  handleRestoreDistanceLimit
                }
              >
                Restore{" "}
                {formatDistanceValue(
                  originalMaximumDistanceKm
                )}{" "}
                limit
              </button>
            </div>
          )}

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
          <div
            className="results-state results-state--empty results-empty-state"
            data-empty-state-reason={
              emptyState
                ?.reason ??
              "unknown"
            }
          >
            <p className="results-empty-state__eyebrow">
              SmartStay respected your search
            </p>

            <h2>
              {emptyState
                ? getEmptyStateTitle(
                    emptyState
                  )
                : "No verified stays are currently visible"}
            </h2>

            <p className="results-empty-state__description">
              {emptyState
                ? getEmptyStateDescription(
                    emptyState
                  )
                : "Available stays were found, but SmartStay could not identify a safe visible option with the current search settings."}
            </p>

            {emptyState
              ?.reason ===
              "distance-constraint" &&
              emptyState
                .recoveryDistanceKmOptions
                .length >
                0 && (
                <div className="results-empty-state__recovery">
                  <p>
                    Adjust the distance using the same provider results:
                  </p>

                  <div className="results-empty-state__actions">
                    {emptyState
                      .recoveryDistanceKmOptions
                      .map(
                        (
                          maximumDistanceKm
                        ) => (
                          <button
                            key={
                              maximumDistanceKm ===
                                null
                                ? "distance-any"
                                : `distance-${maximumDistanceKm}`
                            }
                            type="button"
                            className="results-state__button results-state__button--primary"
                            data-reuses-current-results="true"
                            onClick={() =>
                              handleDistanceRecovery(
                                maximumDistanceKm
                              )
                            }
                          >
                            {formatDistanceRecoveryAction(
                              maximumDistanceKm
                            )}
                          </button>
                        )
                      )}
                  </div>

                  <small>
                    Your original limit is not changed unless you choose one of these options.
                  </small>
                </div>
              )}

            <div className="results-empty-state__footer">
              <button
                type="button"
                className="results-state__button results-state__button--dark"
                onClick={() => navigate("/")}
              >
                Modify the search
              </button>
            </div>
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
                      strengths={evaluation.strengths}
                      tradeOffs={evaluation.tradeOffs}
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
                      strengths={evaluation.strengths}
                      tradeOffs={evaluation.tradeOffs}
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
                    {nearBudgetHotels.length > 0
                      ? "SmartStay already separated the Best Choice and near-budget alternatives above. Open the remaining verified list to compare the other budget-relevant stays."
                      : "SmartStay already separated the Best Choice above. Open the remaining verified list to compare the other budget-relevant stays."}
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
                      {nearBudgetHotels.length > 0
                        ? "Near-budget alternatives are shown above. These remaining options are ordered by SmartScore."
                        : "These remaining verified options are ordered by SmartScore."}
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
                        strengths={evaluation.strengths}
                        tradeOffs={evaluation.tradeOffs}
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