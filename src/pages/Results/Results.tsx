import {
  formatDestinationLabel,
} from "../../utils/destinationLabel";
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
  } from "react-router";

import HotelCard from "../../components/HotelCard/HotelCard";
import HotelDetailsPanel from "../../components/HotelDetailsPanel/HotelDetailsPanel";

  import {
    sliderOptions,
  } from "../../components/SmartOptimizer/sliderData";
import {
  ApiRequestError,
  getHotelDetails,
  getSearchSession,
} from "../../services/api";
import type {
  Hotel,
  HotelDetails,
  HotelOffer,
  SearchLifecycle,
  SearchSessionResponse,
} from "../../types/hotel";

import {
  getSearchRecoveryDecision,
} from "../../utils/searchRecovery";
import type {
  SmartStayFrontendViewV2,
} from "../../engine-v2/frontend/smartStayFrontendAdapterV2";

import {
  STAYOPTI_V3_SHADOW_MODE,
} from "../../config/runtimeConfig";

import {
  loadFrontendIndependentShadowRuntimeV3,
} from "../../engine-v3/runtime/strictOffShadowLoaderV3";

import {
  diagnoseSmartStayEmptyStateV2,
} from "../../engine-v2/frontend/constraintAwareEmptyStateV2";

import type {
  SmartStayBudgetRecoverySuggestionV2,
  SmartStayDistanceRecoverySuggestionV2,
  SmartStayEmptyStateV2,
} from "../../engine-v2/frontend/constraintAwareEmptyStateV2";


import {
  selectHotelOffers,
} from "../../utils/hotelOfferSelection";

import "./Results.css";

import {
  bucketAnalyticsPosition,
  bucketAnalyticsResults,
  mapAnalyticsRole,
} from "../../analytics/analyticsBuckets";

import {
  setAnalyticsJourneyStage,
  trackAnalyticsEvent,
  trackAnalyticsPageView,
} from "../../analytics/analyticsClient";

import type {
  AnalyticsPositionBucket,
  AnalyticsRole,
} from "../../analytics/analyticsTypes";

  const SEARCH_META_STORAGE_PREFIX =
    "smartstay_search_meta_";

  const DEFAULT_PREFERENCE_INDEX =
    2;

  type SearchMeta =
    StoredSearchMeta;

  type HotelAnalyticsContext = {
    role: AnalyticsRole;
    positionBucket:
      AnalyticsPositionBucket;
  };

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
      return `Expand to ${Math.round(maxDistanceKm * 1000)} m`;
    }

    return `Expand to ${maxDistanceKm} km`;
  }

  function formatUnlockedStayCount(
    unlockedHotelCount:
      number
  ) {
    return (
      unlockedHotelCount +
      " " +
      (
        unlockedHotelCount ===
          1
          ? "stay"
          : "stays"
      )
    );
  }

  function getBudgetRecoveryDescription(
    suggestion:
      SmartStayBudgetRecoverySuggestionV2,
    currency:
      string
  ) {
    return (
      "Unlocks " +
      formatUnlockedStayCount(
        suggestion
          .unlockedHotelCount
      ) +
      " with a fully priced offer. That is " +
      formatSearchMoney(
        suggestion
          .additionalBudget,
        currency
      ) +
      " above the current total budget."
    );
  }

  function getDistanceRecoveryDescription(
    suggestion:
      SmartStayDistanceRecoverySuggestionV2
  ) {
    return (
      "Unlocks " +
      formatUnlockedStayCount(
        suggestion
          .unlockedHotelCount
      ) +
      " already found in this search."
    );
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
      return "No stays passed StayOpti verification";
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
      if (
        emptyState
          .recoveryDistanceSuggestions
          .length >
          0
      ) {
        return "Your distance limit is the main constraint. StayOpti calculated the smallest useful expansions from the stays already found.";
      }

      return (
        "StayOpti found " +
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
      if (
        emptyState
          .recoveryBudgetSuggestions
          .length >
          0
      ) {
        return "Your total budget is the main limit. StayOpti found fully priced options and calculated the smallest useful adjustments below.";
      }

      return (
        "StayOpti analyzed " +
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
        "StayOpti found " +
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
      return "Available stays were found, but they were excluded by the selected requirements or StayOpti visibility policies.";
    }

    return "Available stays were found, but StayOpti could not identify a safe visible option with the current search settings.";
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
        formatDestinationLabel(
          searchMeta
            .destinationLabel
        ) ||
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
    retryable: boolean;
  };

  function getResultsLoadFailure(
    error: unknown
  ): ResultsLoadFailure {
    const recovery =
      getSearchRecoveryDecision(
        error,
        "Unable to load hotels."
      );

    return {
      message:
        recovery.message,

      clearStoredMeta:
        recovery
          .clearStoredSearchState,

      retryable:
        recovery.retryable,
    };
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

function getHotelDetailsTriggerId(
  hotelId: string
) {
  return `hotel-details-trigger-${encodeURIComponent(
    hotelId
  )}`;
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

    const [
      resultsCanRetry,
      setResultsCanRetry,
    ] =
      useState(false);

    const [
      resultsRetryAttempt,
      setResultsRetryAttempt,
    ] =
      useState(0);

    const [lifecycle, setLifecycle] =
      useState<SearchLifecycle | null>(null);

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

    const [
      budgetOverrideTotal,
      setBudgetOverrideTotal,
    ] = useState<
      number |
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

    const [hotelDetailsOffer, setHotelDetailsOffer] =
      useState<HotelOffer | null>(null);

    const [hotelDetailsLoading, setHotelDetailsLoading] =
      useState(false);

    const [hotelDetailsError, setHotelDetailsError] =
      useState("");

    const [activeDetailsHotelId, setActiveDetailsHotelId] =
      useState<string | null>(null);

    const [activeDetailsOfferId, setActiveDetailsOfferId] =
      useState<string | null>(null);

    const [
      verifiedOffersByHotelId,
      setVerifiedOffersByHotelId,
    ] = useState<
      Record<string, HotelOffer>
    >({});

    const [
      activeAnalyticsContext,
      setActiveAnalyticsContext,
    ] = useState<
      HotelAnalyticsContext | null
    >(null);

    const detailsRequestIdRef =
      useRef(0);

    const [
      detailsReturnFocusId,
      setDetailsReturnFocusId,
    ] = useState<string | null>(null);

    useEffect(() => {
      setVerifiedOffersByHotelId(
        {}
      );

      setDistanceOverrideKm(
        undefined
      );

      setBudgetOverrideTotal(
        undefined
      );
    }, [searchId]);

    const requestedPreferenceIndex =
      useMemo(() => {
        return getSelectedPreferenceIndex(
          searchMeta
        );
      }, [searchMeta]);

    const requestedPreference =
      sliderOptions[requestedPreferenceIndex] ??
      sliderOptions[DEFAULT_PREFERENCE_INDEX];

    const smartStayProfile =
      searchMeta?.smartStayProfile ??
      null;

    const effectivePreferenceIndex =
      engineView
        ?.preferenceResolution
        ?.effectiveSelectedIndex ??
      requestedPreferenceIndex;

    const effectivePreference =
      sliderOptions[effectivePreferenceIndex] ??
      sliderOptions[DEFAULT_PREFERENCE_INDEX];

    const displayDestinationLabel =
      useMemo(
        () =>
          formatDestinationLabel(
            searchMeta
              ?.destinationLabel
          ),
        [
          searchMeta
            ?.destinationLabel,
        ]
      );

    const originalMaximumDistanceKm =
      searchMeta
        ?.maxDistanceKm ??
      null;

    const originalTotalBudget =
      searchMeta
        ?.totalBudget ??
      null;

    const effectiveMaximumDistanceKm =
      distanceOverrideKm ===
        undefined
        ? originalMaximumDistanceKm
        : distanceOverrideKm;

    const effectiveTotalBudget =
      budgetOverrideTotal ===
        undefined
        ? originalTotalBudget
        : budgetOverrideTotal;

    const distanceRecoveryActive =
      distanceOverrideKm !==
      undefined;

    const budgetRecoveryActive =
      budgetOverrideTotal !==
      undefined;

    const recoveryActive =
      distanceRecoveryActive ||
      budgetRecoveryActive;

    const balanceExplanation =
      engineView
        ?.preferenceResolution
        ?.explanation ||
      smartStayProfile
        ?.explanation ||
      getPreferenceSummary(
        effectivePreference.id
      );

const rankedHotels =
      engineView?.rankedHotels ?? [];


    const recommendationPicks =
      engineView?.recommendationPicks ?? [];

    const recommendationGroups =
      useMemo(() => {
        const roleOrder = [
          "best-choice",
          "cheaper-alternative",
          "comfort-upgrade",
        ] as const;

        return roleOrder.flatMap(
          (role) => {
            const picks =
              recommendationPicks.filter(
                (pick) =>
                  pick.role ===
                  role
              );

            if (
              picks.length ===
              0
            ) {
              return [];
            }

            const firstPick =
              picks[0];

            const hasMultipleStays =
              picks.length >
              1;

            const label =
              role ===
                "best-choice"
                ? "Best choice for you"
                : role ===
                    "cheaper-alternative"
                  ? hasMultipleStays
                    ? firstPick.label ===
                        "Best saving with less flexibility"
                      ? "Best savings with less flexibility"
                      : "Best sensible savings"
                    : firstPick.label
                  : hasMultipleStays
                    ? "Worthwhile upgrades"
                    : firstPick.label;

            const reason =
              hasMultipleStays
                ? role ===
                    "best-choice"
                  ? "These stays offer an equivalent evidence-backed fit for your budget, distance and selected StayOpti balance."
                  : role ===
                      "cheaper-alternative"
                    ? "These stays offer comparable savings while keeping overall trip fit within StayOpti's quality threshold."
                    : "These stays offer a comparable, worthwhile improvement for the extra cost."
                : firstPick.reason;

            return [
              {
                role,
                label,
                reason,
                picks,
              },
            ];
          }
        );
      }, [
        recommendationPicks,
      ]);

    const analyticsContextByHotelId =
      useMemo(() => {
        const roleByHotelId =
          new Map<
            string,
            AnalyticsRole
          >();

        for (
          const pick of
          recommendationPicks
        ) {
          roleByHotelId.set(
            pick.evaluation.hotel.id,
            mapAnalyticsRole(
              pick.role
            )
          );
        }

        return new Map(
          rankedHotels.map(
            (
              evaluation,
              index
            ) => [
              evaluation.hotel.id,
              {
                role:
                  roleByHotelId.get(
                    evaluation.hotel.id
                  ) ??
                  "unassigned",
                positionBucket:
                  bucketAnalyticsPosition(
                    index
                  ),
              } satisfies
                HotelAnalyticsContext,
            ]
          )
        );
      }, [
        rankedHotels,
        recommendationPicks,
      ]);

    const analyticsRolesShown =
      useMemo(() => {
        const roles =
          recommendationPicks
            .map(
              (pick) =>
                mapAnalyticsRole(
                  pick.role
                )
            )
            .filter(
              (role): role is Exclude<
                AnalyticsRole,
                "unassigned"
              > =>
                role !==
                  "unassigned"
            );

        return [
          ...new Set(roles),
        ];
      }, [
        recommendationPicks,
      ]);

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

    const activeDetailsHotel =
      useMemo(() => {
        if (!activeDetailsHotelId) {
          return null;
        }

        return (
          hotels.find(
            (hotel) =>
              hotel.id ===
              activeDetailsHotelId
          ) ??
          null
        );
      }, [
        hotels,
        activeDetailsHotelId,
      ]);

    const budgetPolicy =
      engineView?.budgetPolicy ??
      null;

    const featuredRecommendationCount =
      recommendationPicks.length +
      nearBudgetHotels.length;

    const totalSuitableStayCount =
      featuredRecommendationCount +
      remainingHotels.length;

    const totalBudgetSummaryLabel =
      budgetPolicy &&
      budgetPolicy.totalBudget !==
        null
        ? formatSearchMoney(
            budgetPolicy.totalBudget,
            searchMeta
              ?.currency ??
            "EUR"
          )
        : null;

    useEffect(() => {
      if (!engineView) {
        return;
      }

      setAnalyticsJourneyStage(
        "results"
      );

      trackAnalyticsEvent(
        "results_viewed",
        "results",
        {
          visibleResultsBucket:
            bucketAnalyticsResults(
              rankedHotels.length
            ),
          rolesShown:
            analyticsRolesShown,
        },
        {
          onceKey:
            "results-viewed",
        }
      );
    }, [
      analyticsRolesShown,
      engineView,
      rankedHotels.length,
    ]);

    useEffect(() => {
      async function loadResults() {
        setLoading(
          true
        );

        setError(
          ""
        );

        setResultsCanRetry(
          false
        );

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

          setLifecycle(
            response.session.lifecycle ?? null
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

          setResultsCanRetry(
            failure.retryable
          );

          setError(
            failure.message
          );
        } finally {
          setLoading(false);
        }
      }

      loadResults();
    }, [
      resultsRetryAttempt,
      searchId,
    ]);

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
            recoveryActive
              ? []
              : readStoredRankingV2(
                  searchId,
                  hotels
                );

          const engineRuntime =
            engineModule
              .buildSmartStayFrontendRuntimeV2({
                hotels,

                preferenceId:
                  requestedPreference.id,

                selectedIndex:
                  requestedPreferenceIndex,

                preferenceSource:
                  smartStayProfile
                    ?.preferenceSource ??
                  "default",

                totalBudget:
                  effectiveTotalBudget,

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

                marketRelativeAutomaticBalance:
                  true,

                fallbackBalanceExplanation:
                  smartStayProfile
                    ?.explanation ??
                  null,

                previousRankingHotelIds,

                maximumVisibleResults:
                  hotels.length,
              });

          const view =
            engineRuntime.view;

          if (
            STAYOPTI_V3_SHADOW_MODE ===
              "shadow" &&
            searchId
          ) {
            try {
              const v3ShadowModule =
                await loadFrontendIndependentShadowRuntimeV3(
                  STAYOPTI_V3_SHADOW_MODE
                );

              v3ShadowModule
                ?.runFrontendIndependentShadowRuntimeV3({
                  mode:
                    STAYOPTI_V3_SHADOW_MODE,
                  sourceToken:
                    searchId,
                  runtime:
                    engineRuntime,
                });
            }
            catch (
              shadowFailure
            ) {
              // V3 is non-authoritative. A shadow failure must never change the
              // public V2 result or surface internal error details to the user.
              void shadowFailure;
            }
          }

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

          if (!recoveryActive) {
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
            "StayOpti could not rank these stays with Engine V2. Please start a new search."
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
      requestedPreference.id,
      requestedPreferenceIndex,
      smartStayProfile
        ?.preferenceSource,
      smartStayProfile
        ?.explanation,
      effectiveTotalBudget,
      effectiveMaximumDistanceKm,
      recoveryActive,
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
        setHotelDetailsOffer(null);
        setActiveDetailsHotelId(null);
        setActiveDetailsOfferId(null);
        setActiveAnalyticsContext(null);
        setAnalyticsJourneyStage(
          "results"
        );
      }, []);

    const handleOfferRechecked =
      useCallback(
        (
          hotelId: string,
          confirmedOffer: HotelOffer
        ) => {
          setVerifiedOffersByHotelId(
            (currentOffers) => ({
              ...currentOffers,
              [hotelId]:
                confirmedOffer,
            })
          );
        },
        []
      );

    const handleViewHotelDetails =
      useCallback(
        async (
          hotel: Hotel,
          selectedOffer:
            {
              offerId: string;
            } |
            null
        ) => {
          setDetailsReturnFocusId(
            getHotelDetailsTriggerId(
              hotel.id
            )
          );

          const analyticsContext =
            analyticsContextByHotelId.get(
              hotel.id
            ) ?? {
              role:
                "unassigned",
              positionBucket:
                "11+",
            };

          setActiveAnalyticsContext(
            analyticsContext
          );

          trackAnalyticsEvent(
            "recommendation_selected",
            "results",
            {
              role:
                analyticsContext.role,
              selectionAction:
                "details",
              positionBucket:
                analyticsContext
                  .positionBucket,
            }
          );

          trackAnalyticsEvent(
            "hotel_details_opened",
            "details",
            {
              role:
                analyticsContext.role,
              positionBucket:
                analyticsContext
                  .positionBucket,
            }
          );

          trackAnalyticsPageView(
            "details"
          );

          const requestId =
            detailsRequestIdRef.current + 1;

          detailsRequestIdRef.current =
            requestId;

          const fallbackOfferId =
            selectHotelOffers(
              hotel
            ).primary?.offer.id ??
            null;

          const selectedOfferId =
            selectedOffer?.offerId ??
            fallbackOfferId;

          setDetailsOpen(true);
          setHotelDetails(null);
          setHotelDetailsOffer(null);
          setHotelDetailsError("");
          setHotelDetailsLoading(true);
          setActiveDetailsHotelId(
            hotel.id
          );
          setActiveDetailsOfferId(
            selectedOfferId
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
                searchId,
                selectedOfferId
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

            setHotelDetailsOffer(
              response.offer
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
        [
          analyticsContextByHotelId,
          searchId,
        ]
      );

    const handleExplanationToggle =
      useCallback(
        (
          hotelId: string,
          expanded: boolean
        ) => {
          const analyticsContext =
            analyticsContextByHotelId.get(
              hotelId
            ) ?? {
              role:
                "unassigned",
              positionBucket:
                "11+",
            };

          trackAnalyticsEvent(
            "explanation_toggled",
            "results",
            {
              role:
                analyticsContext.role,
              expanded,
            }
          );

          if (expanded) {
            trackAnalyticsEvent(
              "recommendation_selected",
              "results",
              {
                role:
                  analyticsContext.role,
                selectionAction:
                  "explanation",
                positionBucket:
                  analyticsContext
                    .positionBucket,
              }
            );
          }
        },
        [
          analyticsContextByHotelId,
        ]
      );

    const handleDistanceRecovery =
      useCallback(
        (
          maximumDistanceKm:
            number | null
        ) => {
          trackAnalyticsEvent(
            "results_recovery_applied",
            "results",
            {
              recoveryAction:
                "relax-distance",
            }
          );

          trackAnalyticsEvent(
            "search_preferences_changed",
            "results",
            {
              field: "distance",
              changeKind:
                maximumDistanceKm ===
                  null
                  ? "cleared"
                  : "increased",
            }
          );

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

    const handleBudgetRecovery =
      useCallback(
        (
          suggestedTotalBudget:
            number
        ) => {
          trackAnalyticsEvent(
            "results_recovery_applied",
            "results",
            {
              recoveryAction:
                "raise-budget",
            }
          );

          trackAnalyticsEvent(
            "search_preferences_changed",
            "results",
            {
              field:
                "budget",
              changeKind:
                "increased",
            }
          );

          setBudgetOverrideTotal(
            suggestedTotalBudget
          );

          setShowFullList(
            false
          );
        },
        []
      );

    const handleRestoreBudget =
      useCallback(() => {
        setBudgetOverrideTotal(
          undefined
        );

        setShowFullList(
          false
        );
      }, []);

    const handleResultsRetry =
      useCallback(() => {
        trackAnalyticsEvent(
          "search_retried",
          "results",
          {
            stage: "results",
            recoveryAction:
              "retry",
          }
        );

        setResultsRetryAttempt(
          (currentAttempt) =>
            currentAttempt + 1
        );
      }, []);

    const handleNewSearch =
      useCallback(() => {
        trackAnalyticsEvent(
          "search_retried",
          "results",
          {
            stage: "results",
            recoveryAction:
              "new-search",
          }
        );

        navigate("/");
      }, [navigate]);

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
              effectiveTotalBudget,
          });
        }

        return null;
      }, [
        engineView,
        hotels.length,
        effectiveMaximumDistanceKm,
        effectiveTotalBudget,
      ]);

    if (loading) {
      return (
        <div
          className="results-page results-page--pending"
          aria-busy="true"
        >
          <div
            className="results-state results-state--loading"
            role="status"
            aria-live="polite"
          >
            Loading hotels...
          </div>
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
          className="results-page results-page--pending"
          aria-busy="true"
        >
          <div
            className="results-state results-state--loading"
            role="status"
            aria-live="polite"
          >
            StayOpti Engine V2 is ranking your stays...
          </div>
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

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "12px",
              marginTop: "18px",
            }}
          >
            {error &&
              resultsCanRetry && (
                <button
                  type="button"
                  className="results-state__button results-state__button--dark"
                  onClick={
                    handleResultsRetry
                  }
                >
                  Try again
                </button>
              )}

            <button
              type="button"
              className="results-state__button results-state__button--dark"
              onClick={handleNewSearch}
            >
              Start a new search
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="results-page">
        <section className="results-page__header">
          <p className="results-page__eyebrow">
            Ranked by StayOpti Engine
          </p>

          <h1 className="results-page__title">
            Your StayOpti recommendations
          </h1>

          <p className="results-search-summary">
            StayOpti analyzed {hotels.length} stays
            {displayDestinationLabel
              ? ` for your search in ${displayDestinationLabel}`
              : " for your search"}.
          </p>

          {rankedHotels.length > 0 && (
            <div
              className="results-search-summary__facts"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label={`${totalSuitableStayCount} suitable stays available`}
            >
              {featuredRecommendationCount > 0 && (
                <span>
                  <strong>
                    {featuredRecommendationCount}
                  </strong>{" "}
                  {featuredRecommendationCount ===
                    1
                    ? "recommendation"
                    : "recommendations"}{" "}
                  shown first
                </span>
              )}

              <span>
                {remainingHotels.length >
                0 ? (
                  <>
                    <strong>
                      {remainingHotels.length}
                    </strong>{" "}
                    other suitable{" "}
                    {remainingHotels.length ===
                      1
                      ? "stay"
                      : "stays"}{" "}
                    in the full list
                  </>
                ) : (
                  "No other suitable stays"
                )}
              </span>

              {budgetPolicy &&
                totalBudgetSummaryLabel && (
                <span>
                  {budgetPolicy
                    .withinBudgetVisibleCount >
                  0 ? (
                    <>
                      <strong>
                        {
                          budgetPolicy
                            .withinBudgetVisibleCount
                        }
                      </strong>{" "}
                      within{" "}
                      {totalBudgetSummaryLabel}{" "}
                      total budget
                    </>
                  ) : (
                    <>
                      No verified stay within{" "}
                      {totalBudgetSummaryLabel}
                    </>
                  )}
                </span>
              )}

              {budgetPolicy &&
                budgetPolicy
                  .nearBudgetVisibleCount >
                  0 && (
                  <span>
                    <strong>
                      {
                        budgetPolicy
                          .nearBudgetVisibleCount
                      }
                    </strong>{" "}
                    sensible near-budget{" "}
                    {budgetPolicy
                      .nearBudgetVisibleCount ===
                    1
                      ? "option"
                      : "options"}
                  </span>
                )}
            </div>
          )}

          <div
            className="results-balance-card"
            data-balance-source={
              engineView
                ?.preferenceResolution
                ?.source ??
              "absolute-fallback"
            }
            data-balance-preference={
              effectivePreference.id
            }
          >
            <div className="results-balance-card__header">
              <div className="results-balance-card__title-row">
                <span
                  className="results-balance-card__dot"
                  style={{
                    background:
                      effectivePreference.color,
                  }}
                  aria-hidden="true"
                />

                <strong>
                  {effectivePreference.title} for this trip
                </strong>
              </div>

            </div>

            <p className="results-balance-card__explanation">
              {balanceExplanation}
            </p>

            {searchMeta && (
              <div className="results-balance-card__facts">
                {effectiveTotalBudget !== null && (
                  <span>
                    {formatSearchMoney(
                      effectiveTotalBudget,
                      searchMeta.currency
                    )}{" "}
                    {budgetRecoveryActive
                      ? "adjusted total budget"
                      : "total budget"}
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
                  StayOpti reused the stays already found. No new provider search was sent.
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

          {budgetRecoveryActive &&
            effectiveTotalBudget !==
              null &&
            originalTotalBudget !==
              null && (
              <div
                className="results-recovery-notice"
                role="status"
                data-recovery-source="existing-results"
              >
                <div>
                  <strong>
                    Total budget adjusted to{" "}
                    {formatSearchMoney(
                      effectiveTotalBudget,
                      searchMeta?.currency ||
                      "EUR"
                    )}.
                  </strong>

                  <p>
                    StayOpti reused the stays already found. No new provider search was sent.
                  </p>
                </div>

                <button
                  type="button"
                  className="results-recovery-notice__restore"
                  onClick={
                    handleRestoreBudget
                  }
                >
                  Restore{" "}
                  {formatSearchMoney(
                    originalTotalBudget,
                    searchMeta?.currency ||
                    "EUR"
                  )}{" "}
                  budget
                </button>
              </div>
            )}

          {
            lifecycle?.outcome ===
              "partial-results" && (
              <div
                className="results-lifecycle-notice"
                role="status"
              >
                <strong>
                  Partial results
                </strong>

                <p>
                  StayOpti kept the reliable stays already found even though the provider search could not finish.
                </p>
              </div>
            )
          }

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
              Your criteria were kept
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
                : "Available stays were found, but StayOpti could not identify a safe visible option with the current search settings."}
            </p>

            {emptyState &&
              (
                emptyState
                  .recoveryBudgetSuggestions
                  .length >
                  0 ||
                emptyState
                  .recoveryDistanceSuggestions
                  .length >
                  0
              ) && (
                <section
                  className="results-empty-state__recovery"
                  aria-labelledby="results-recovery-title"
                >
                  <div className="results-empty-state__recovery-heading">
                    <p>
                      Best next step
                    </p>

                    <h3 id="results-recovery-title">
                      See more options without starting over
                    </h3>
                  </div>

                  <div className="results-empty-state__suggestions">
                    {emptyState
                      .recoveryBudgetSuggestions
                      .map(
                        (
                          suggestion
                        ) => (
                          <article
                            key={
                              `budget-${suggestion.totalBudget}`
                            }
                            className="results-empty-state__suggestion"
                            data-recovery-kind="budget"
                          >
                            <div>
                              <strong>
                                Increase the total budget to{" "}
                                {formatSearchMoney(
                                  suggestion
                                    .totalBudget,
                                  searchMeta?.currency ||
                                  "EUR"
                                )}
                              </strong>

                              <p>
                                {getBudgetRecoveryDescription(
                                  suggestion,
                                  searchMeta?.currency ||
                                  "EUR"
                                )}
                              </p>
                            </div>

                            <button
                              type="button"
                              className="results-state__button results-state__button--primary"
                              data-reuses-current-results="true"
                              onClick={() =>
                                handleBudgetRecovery(
                                  suggestion
                                    .totalBudget
                                )
                              }
                            >
                              Use{" "}
                              {formatSearchMoney(
                                suggestion
                                  .totalBudget,
                                searchMeta?.currency ||
                                "EUR"
                              )}{" "}
                              budget
                            </button>
                          </article>
                        )
                      )}

                    {emptyState
                      .recoveryDistanceSuggestions
                      .map(
                        (
                          suggestion
                        ) => (
                          <article
                            key={
                              suggestion
                                .maximumDistanceKm ===
                                null
                                ? "distance-any"
                                : `distance-${suggestion.maximumDistanceKm}`
                            }
                            className="results-empty-state__suggestion"
                            data-recovery-kind="distance"
                          >
                            <div>
                              <strong>
                                {formatDistanceRecoveryAction(
                                  suggestion
                                    .maximumDistanceKm
                                )}
                              </strong>

                              <p>
                                {getDistanceRecoveryDescription(
                                  suggestion
                                )}
                              </p>
                            </div>

                            <button
                              type="button"
                              className="results-state__button results-state__button--primary"
                              data-reuses-current-results="true"
                              onClick={() =>
                                handleDistanceRecovery(
                                  suggestion
                                    .maximumDistanceKm
                                )
                              }
                            >
                              Apply this distance
                            </button>
                          </article>
                        )
                      )}
                  </div>

                  <small>
                    These suggestions reuse the current results. Your original criteria stay saved until you choose.
                  </small>
                </section>
              )}

            <div className="results-empty-state__footer">
              <button
                type="button"
                className="results-state__button results-state__button--dark"
                onClick={handleNewSearch}
              >
                {emptyState
                  ?.reason ===
                  "provider-no-results"
                  ? "Change dates or destination"
                  : "Edit search criteria"}
              </button>
            </div>
          </div>
      ) : (
        <>
          {recommendationGroups.map(
            (group) => {
              const headingId =
                `recommendation-group-${group.role}`;

              return (
                <section
                  key={group.role}
                  className={`results__recommendation-group results__recommendation-group--${group.role}`}
                  data-recommendation-group={
                    group.role
                  }
                  data-recommendation-count={
                    group.picks.length
                  }
                  aria-labelledby={
                    headingId
                  }
                >
                  <div className="results__recommendation-heading">
                    <div className="results__recommendation-heading-main">
                      <p
                        id={headingId}
                        className="results__recommendation-role"
                      >
                        {group.label}
                      </p>

                      {group.picks.length >
                        1 && (
                        <span className="results__recommendation-count">
                          {
                            group.picks
                              .length
                          }{" "}
                          comparable stays
                        </span>
                      )}
                    </div>

                    <p className="results__recommendation-summary">
                      {group.reason}
                    </p>
                  </div>

                  <div className="results__recommendation-list">
                    {group.picks.map(
                      (pick) => {
                        const evaluation =
                          pick.evaluation;

                        return (
                          <div
                            key={`${pick.role}-${evaluation.hotel.id}`}
                            className="results__recommendation-card"
                          >
                            <HotelCard
                              hotel={
                                evaluation.hotel
                              }
                              smartScore={
                                evaluation.smartScore
                              }
                              riskLevel={
                                evaluation.riskLevel
                              }
                              dataConfidenceLevel={
                                evaluation.dataConfidenceLevel
                              }
                              badges={
                                evaluation.badges
                              }
                              strengths={
                                evaluation.strengths
                              }
                              tradeOffs={
                                evaluation.tradeOffs
                              }
                              selectedOffer={
                                evaluation.selectedOffer
                              }
                              displayOfferOverride={
                                verifiedOffersByHotelId[
                                  evaluation
                                    .hotel
                                    .id
                                ] ??
                                null
                              }
                              detailsLoading={
                                hotelDetailsLoading &&
                                activeDetailsHotelId ===
                                  evaluation
                                    .hotel
                                    .id
                              }
                              onExplanationToggle={(
                                expanded
                              ) =>
                                handleExplanationToggle(
                                  evaluation
                                    .hotel
                                    .id,
                                  expanded
                                )
                              }
                              onViewDetails={
                                handleViewHotelDetails
                              }
                            />
                          </div>
                        );
                      }
                    )}
                  </div>
                </section>
              );
            }
          )}

          {nearBudgetHotels.length > 0 && (
            <section
              className="results__recommendation-group results__recommendation-group--near-budget"
              data-recommendation-group="near-budget"
              data-recommendation-count={
                nearBudgetHotels.length
              }
              aria-labelledby="recommendation-group-near-budget"
            >
              <div className="results__recommendation-heading">
                <div className="results__recommendation-heading-main">
                  <p
                    id="recommendation-group-near-budget"
                    className="results__recommendation-role"
                  >
                    {nearBudgetHotels.length ===
                    1
                      ? "Sensible near-budget option"
                      : "Sensible near-budget options"}
                  </p>

                  {nearBudgetHotels.length >
                    1 && (
                    <span className="results__recommendation-count">
                      {
                        nearBudgetHotels.length
                      }{" "}
                      comparable stays
                    </span>
                  )}
                </div>

                <p className="results__recommendation-summary">
                  Verified stays just above your budget that still offer a sensible overall trade-off.
                </p>
              </div>

              <div className="results__recommendation-list">
                {nearBudgetHotels.map(
                  (evaluation) => (
                    <div
                      key={
                        "near-budget-" +
                        evaluation.hotel.id
                      }
                      className="results__recommendation-card"
                    >
                      <HotelCard
                        hotel={
                          evaluation.hotel
                        }
                        smartScore={
                          evaluation.smartScore
                        }
                        riskLevel={
                          evaluation.riskLevel
                        }
                        dataConfidenceLevel={
                          evaluation.dataConfidenceLevel
                        }
                        badges={
                          evaluation.badges
                        }
                        strengths={
                          evaluation.strengths
                        }
                        tradeOffs={
                          evaluation.tradeOffs
                        }
                        selectedOffer={
                          evaluation.selectedOffer
                        }
                        displayOfferOverride={
                          verifiedOffersByHotelId[
                            evaluation.hotel.id
                          ] ??
                          null
                        }
                        detailsLoading={
                          hotelDetailsLoading &&
                          activeDetailsHotelId ===
                            evaluation.hotel.id
                        }
                        onExplanationToggle={(
                          expanded
                        ) =>
                          handleExplanationToggle(
                            evaluation.hotel.id,
                            expanded
                          )
                        }
                        onViewDetails={
                          handleViewHotelDetails
                        }
                      />
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {remainingHotels.length > 0 && (
            <section
              style={{
                marginTop: "44px",
              }}
            >
              {!showFullList && (
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
                    Want to compare other suitable stays?
                  </h2>

                  <p
                    style={{
                      maxWidth: "660px",
                      margin: "10px auto 0",
                      color: "#64748b",
                      lineHeight: 1.6,
                    }}
                  >
                    Your StayOpti recommendations stay above. Open the full list only if you want to compare the other suitable options.
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
                    aria-expanded={showFullList}
                    aria-controls="results-full-list"
                    onClick={() => setShowFullList(true)}
                  >
                    View {remainingHotels.length} other{" "}
                    {remainingHotels.length ===
                      1
                      ? "stay"
                      : "stays"}
                  </button>
                </div>
              )}

              <div
                id="results-full-list"
                hidden={!showFullList}
              >
                <div
                  style={{
                    marginBottom: "24px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px",
                      color: "#047857",
                      fontSize: "0.82rem",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Full list
                  </p>

                  <h2
                    style={{
                      margin: "0",
                      fontSize: "1.85rem",
                      letterSpacing: "-0.04em",
                    }}
                  >
                    Other suitable stays
                  </h2>

                  <p
                    style={{
                      marginTop: "8px",
                      color: "#64748b",
                    }}
                  >
                    These stays also match your current search and are ordered by StayOpti fit.
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
                      displayOfferOverride={
                        verifiedOffersByHotelId[
                          evaluation.hotel.id
                        ] ??
                        null
                      }
                      detailsLoading={
                        hotelDetailsLoading &&
                        activeDetailsHotelId ===
                          evaluation.hotel.id
                      }
                      onExplanationToggle={(
                        expanded
                      ) =>
                        handleExplanationToggle(
                          evaluation.hotel.id,
                          expanded
                        )
                      }
                      onViewDetails={
                        handleViewHotelDetails
                      }
                    />
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
      {detailsOpen && (
        <HotelDetailsPanel
          details={hotelDetails}
          loading={hotelDetailsLoading}
          error={hotelDetailsError}
          offer={hotelDetailsOffer}
          searchId={searchId}
          hotelId={activeDetailsHotelId}
          offerId={
            hotelDetailsOffer?.id ??
            activeDetailsOfferId
          }
          analyticsRole={
            activeAnalyticsContext
              ?.role ??
            "unassigned"
          }
          analyticsPositionBucket={
            activeAnalyticsContext
              ?.positionBucket ??
            "11+"
          }
          distanceFromSelectedPointKm={
            activeDetailsHotel
              ?.distance ??
            null
          }
          onOfferRechecked={
            handleOfferRechecked
          }
          returnFocusId={
            detailsReturnFocusId
          }
          onClose={handleCloseHotelDetails}
        />
      )}

    </div>
  );
}

export default Results;
