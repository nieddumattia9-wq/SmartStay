import {
    useEffect,
    useMemo,
    useRef,
    useState,
  } from "react";
  
  import { Check } from "lucide-react";
  
  import {
    useNavigate,
    useSearchParams,
  } from "react-router-dom";
  
  import {
    continueHotelSearch,
    getSearchStatus,
    searchHotels,
  } from "../../services/api";
  
  import type {
    SearchHotelsResponse,
  } from "../../types/hotel";
  
  import "./LoadingScreen.css";
  
  const FIRST_STEP =
    "Searching thousands of stays...";
  
  const LAST_STEP =
    "Building your SmartStay...";
  
  const LOADING_POOL = [
    "Comparing prices across platforms...",
    "Checking guest ratings...",
    "Analyzing locations...",
    "Looking for hidden deals...",
    "Optimizing your budget...",
    "Optimizing your travel preferences...",
    "Finding better value...",
    "Reducing unnecessary costs...",
    "Calculating the smartest combination...",
    "Finding the best comfort-to-price ratio...",
    "Analyzing travel convenience...",
    "Checking stay quality...",
    "Looking for highly rated stays...",
    "Comparing amenities...",
    "Finding smarter alternatives...",
  ];
  
  const PENDING_SEARCH_STORAGE_KEY =
    "smartstay_pending_search";
  
  const ACTIVE_SEARCH_ID_STORAGE_KEY =
    "smartstay_active_loading_search_id";
  
  const SEARCH_LOCK_STORAGE_KEY =
    "smartstay_pending_search_lock";
  
  const SEARCH_META_STORAGE_PREFIX =
    "smartstay_search_meta_";
  
  const SEARCH_LOCK_TTL_MS =
    30 * 1000;
  
  const POLLING_DELAY_MS =
    1800;
  
  const MINIMUM_LOADING_TIME_MS =
    3500;
  
  type SearchProgressResponse = {
    success: boolean;
  
    message?: string | null;
  
    searchId?: string | null;
  
    status?: string | null;
  
    searchIncomplete?: boolean;
  
    isContinuing?: boolean;
  
    totalHotels?: number;
  
    nextResultsKey?: string | null;
  
    lastError?: string | null;
  };
  
  type PendingSearchMeta = {
    destinationLabel?: string;
  
    smartPreference?: unknown;
  
    budget?: string;
  };
  
  type PendingSearch = {
    searchPayload: unknown;
  
    searchMeta?: PendingSearchMeta;
  };
  
  function shuffleArray(array: string[]) {
    const copy =
      [...array];
  
    for (let i = copy.length - 1; i > 0; i--) {
      const j =
        Math.floor(
          Math.random() * (i + 1)
        );
  
      [copy[i], copy[j]] =
        [copy[j], copy[i]];
    }
  
    return copy;
  }
  
  function delay(ms: number) {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }
  
  function calculateProgress(
    status: string | null | undefined,
    totalHotels: number
  ) {
    if (status === "Completed") {
      return 92;
    }
  
    if (status === "Failed") {
      return 100;
    }
  
    if (totalHotels <= 0) {
      return 18;
    }
  
    if (totalHotels < 5) {
      return 35;
    }
  
    if (totalHotels < 15) {
      return 55;
    }
  
    if (totalHotels < 30) {
      return 72;
    }
  
    return 88;
  }
  
  function getSafeSearchErrorMessage(
    providerMessage?: string | null
  ) {
    const fallbackMessage =
      "We could not retrieve reliable results for this search. Please try different dates or another destination.";
  
    const normalizedMessage =
      providerMessage
        ?.trim()
        .toLowerCase() ?? "";
  
    const unsafeMessages = [
      "message not defined",
      "undefined",
      "null",
      "internal server error",
      "is not defined",
      "cannot read",
    ];
  
    const isUnsafeMessage =
      !normalizedMessage ||
      unsafeMessages.some((unsafeMessage) =>
        normalizedMessage.includes(unsafeMessage)
      );
  
    if (isUnsafeMessage) {
      return fallbackMessage;
    }
  
    return providerMessage ?? fallbackMessage;
  }
  
  function getSearchMetaStorageKey(
    searchId: string
  ) {
    return `${SEARCH_META_STORAGE_PREFIX}${searchId}`;
  }
  
  function saveSearchMetaForSearchId(
    searchId: string,
    searchMeta?: PendingSearchMeta
  ) {
    if (!searchMeta) {
      return;
    }
  
    try {
      sessionStorage.setItem(
        getSearchMetaStorageKey(searchId),
        JSON.stringify(searchMeta)
      );
    } catch (error) {
      console.warn(
        "Unable to save SmartStay search metadata.",
        error
      );
    }
  }
  
  function readPendingSearch(): PendingSearch | null {
    const rawPendingSearch =
      sessionStorage.getItem(
        PENDING_SEARCH_STORAGE_KEY
      );
  
    if (!rawPendingSearch) {
      return null;
    }
  
    try {
      const parsed =
        JSON.parse(rawPendingSearch) as PendingSearch;
  
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !("searchPayload" in parsed)
      ) {
        return null;
      }
  
      return parsed;
    } catch {
      return null;
    }
  }
  
  function clearPendingSearch() {
    sessionStorage.removeItem(
      PENDING_SEARCH_STORAGE_KEY
    );
  }
  
  function getActiveSearchIdFromStorage() {
    return sessionStorage.getItem(
      ACTIVE_SEARCH_ID_STORAGE_KEY
    );
  }
  
  function setActiveSearchIdInStorage(
    searchId: string
  ) {
    sessionStorage.setItem(
      ACTIVE_SEARCH_ID_STORAGE_KEY,
      searchId
    );
  }
  
  function clearActiveSearchIdFromStorage() {
    sessionStorage.removeItem(
      ACTIVE_SEARCH_ID_STORAGE_KEY
    );
  }

  function setSearchLock() {
    sessionStorage.setItem(
      SEARCH_LOCK_STORAGE_KEY,
      String(Date.now())
    );
  }
  
  function clearSearchLock() {
    sessionStorage.removeItem(
      SEARCH_LOCK_STORAGE_KEY
    );
  }
  
  function hasFreshSearchLock() {
    const rawLock =
      sessionStorage.getItem(
        SEARCH_LOCK_STORAGE_KEY
      );
  
    if (!rawLock) {
      return false;
    }
  
    const lockTimestamp =
      Number(rawLock);
  
    if (!Number.isFinite(lockTimestamp)) {
      clearSearchLock();
  
      return false;
    }
  
    if (
      Date.now() - lockTimestamp >
      SEARCH_LOCK_TTL_MS
    ) {
      clearSearchLock();
  
      return false;
    }
  
    return true;
  }
  
  async function waitForActiveSearchId() {
    const startedAt =
      Date.now();
  
    while (
      Date.now() - startedAt <
      SEARCH_LOCK_TTL_MS
    ) {
      const activeSearchId =
        getActiveSearchIdFromStorage();
  
      if (activeSearchId) {
        return activeSearchId;
      }
  
      await delay(250);
    }
  
    return null;
  }
  
  function LoadingScreen() {
    const navigate =
      useNavigate();
  
    const [searchParams] =
      useSearchParams();
  
    const searchIdFromUrl =
      searchParams.get("searchId");
  
    const isMounted =
      useRef(true);
  
    const hasStartedRef =
      useRef(false);
  
    const loadingSteps = useMemo(() => {
      return [
        FIRST_STEP,
        ...shuffleArray(LOADING_POOL).slice(0, 3),
        LAST_STEP,
      ];
    }, []);
  
    const [progress, setProgress] =
      useState(8);
  
    const [currentStep, setCurrentStep] =
      useState(0);
  
    const [completedSteps, setCompletedSteps] =
      useState<number[]>([]);
  
    const [totalHotels, setTotalHotels] =
      useState(0);
  
    const [error, setError] =
      useState("");
  
    useEffect(() => {
      isMounted.current = true;
  
      return () => {
        isMounted.current = false;
      };
    }, []);
  
    useEffect(() => {
      if (error) {
        return;
      }
  
      const intervalId =
        window.setInterval(() => {
          setProgress((currentProgress) => {
            if (currentProgress >= 92) {
              return currentProgress;
            }
  
            return Math.min(
              currentProgress + 2,
              86
            );
          });
        }, 650);
  
      return () => {
        window.clearInterval(intervalId);
      };
    }, [error]);
  
    useEffect(() => {
      if (error) {
        return;
      }
  
      const progressStep =
        Math.min(
          Math.floor(progress / 22),
          loadingSteps.length - 1
        );
  
      setCurrentStep(progressStep);
  
      setCompletedSteps(() => {
        if (progress >= 100) {
          return loadingSteps.map((_, index) => index);
        }
  
        const completed: number[] = [];
  
        for (let index = 0; index < progressStep; index++) {
          completed.push(index);
        }
  
        return completed;
      });
    }, [
      error,
      loadingSteps,
      progress,
    ]);
  
    useEffect(() => {
      if (hasStartedRef.current) {
        return;
      }
  
      hasStartedRef.current = true;
  
      let ownsSearchLock = false;
  
      async function resolveSearchId() {
        if (searchIdFromUrl) {
          setActiveSearchIdInStorage(
            searchIdFromUrl
          );
  
          return searchIdFromUrl;
        }
  
        const pendingSearch =
          readPendingSearch();
  
        if (!pendingSearch) {
          const activeSearchId =
            getActiveSearchIdFromStorage();
  
          if (activeSearchId) {
            return activeSearchId;
          }
  
          throw new Error(
            "Missing search data. Please start a new search."
          );
        }
  
        if (hasFreshSearchLock()) {
          const lockedSearchId =
            await waitForActiveSearchId();
  
          if (lockedSearchId) {
            return lockedSearchId;
          }
  
          throw new Error(
            "Search is taking too long to start. Please try again."
          );
        }
  
        ownsSearchLock = true;
  
        setSearchLock();
  
        clearActiveSearchIdFromStorage();
  
        if (isMounted.current) {
          setProgress(14);
  
          setCurrentStep(0);
        }
  
        const initialResponse =
          await searchHotels(
            pendingSearch.searchPayload
          ) as SearchHotelsResponse;
  
        if (!initialResponse.success) {
          throw new Error(
            getSafeSearchErrorMessage(
              initialResponse.message
            )
          );
        }
  
        if (!initialResponse.searchId) {
          throw new Error(
            "Search started, but no searchId was returned."
          );
        }
  
        saveSearchMetaForSearchId(
          initialResponse.searchId,
          pendingSearch.searchMeta
        );
  
        setActiveSearchIdInStorage(
          initialResponse.searchId
        );
  
        clearPendingSearch();
  
        clearSearchLock();
  
        ownsSearchLock = false;
  
        if (isMounted.current) {
          setTotalHotels(
            initialResponse.totalHotels ?? 0
          );
  
          setProgress(
            calculateProgress(
              initialResponse.status,
              initialResponse.totalHotels ?? 0
            )
          );
        }
  
        return initialResponse.searchId;
      }

      async function finishAndNavigate(
        finalSearchId: string,
        startedAt: number
      ) {
        const elapsedTime =
          Date.now() - startedAt;
  
        const remainingTime =
          Math.max(
            MINIMUM_LOADING_TIME_MS - elapsedTime,
            0
          );
  
        if (remainingTime > 0) {
          if (isMounted.current) {
            setProgress((currentProgress) =>
              Math.max(
                currentProgress,
                92
              )
            );
  
            setCurrentStep(
              loadingSteps.length - 1
            );
          }
  
          await delay(remainingTime);
        }
  
        if (!isMounted.current) {
          return;
        }
  
        setProgress(100);
  
        setCompletedSteps(
          loadingSteps.map((_, index) => index)
        );
  
        await delay(650);
  
        if (isMounted.current) {
          clearActiveSearchIdFromStorage();
  
          navigate(
            `/results?searchId=${encodeURIComponent(finalSearchId)}`
          );
        }
      }
  
      async function applyProgress(
        response: SearchProgressResponse
      ) {
        const hotelsCount =
          response.totalHotels ?? 0;
  
        setTotalHotels(hotelsCount);
  
        setProgress((currentProgress) =>
          Math.max(
            currentProgress,
            calculateProgress(
              response.status,
              hotelsCount
            )
          )
        );
      }
  
      async function runSearchFlow() {
        const startedAt =
          Date.now();
  
        try {
          const activeSearchId =
            await resolveSearchId();
  
          let finished = false;
  
          while (
            isMounted.current &&
            !finished
          ) {
            const statusResponse =
              await getSearchStatus(
                activeSearchId
              ) as SearchProgressResponse;
  
            if (!isMounted.current) {
              return;
            }
  
            if (!statusResponse.success) {
              throw new Error(
                getSafeSearchErrorMessage(
                  statusResponse.message
                )
              );
            }
  
            await applyProgress(
              statusResponse
            );
  
            if (statusResponse.status === "Completed") {
              finished = true;
  
              await finishAndNavigate(
                activeSearchId,
                startedAt
              );
  
              return;
            }
  
            if (statusResponse.status === "Failed") {
              throw new Error(
                getSafeSearchErrorMessage(
                  statusResponse.lastError
                )
              );
            }
  
            const continueResponse =
              await continueHotelSearch(
                activeSearchId
              ) as SearchProgressResponse;
  
            if (!isMounted.current) {
              return;
            }
  
            if (!continueResponse.success) {
              throw new Error(
                getSafeSearchErrorMessage(
                  continueResponse.message ||
                  continueResponse.lastError
                )
              );
            }
  
            await applyProgress(
              continueResponse
            );
  
            if (continueResponse.status === "Completed") {
              finished = true;
  
              await finishAndNavigate(
                activeSearchId,
                startedAt
              );
  
              return;
            }
  
            await delay(POLLING_DELAY_MS);
          }
        } catch (err) {
          console.error(err);
  
          if (ownsSearchLock) {
            clearSearchLock();
          }
  
          if (isMounted.current) {
            setError(
              err instanceof Error
                ? getSafeSearchErrorMessage(err.message)
                : getSafeSearchErrorMessage(null)
            );
  
            setProgress(100);
          }
        }
      }
  
      runSearchFlow();
    }, [
      loadingSteps,
      navigate,
      searchIdFromUrl,
    ]);
  
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <h1 className="loading-title">
            SmartStay
          </h1>
  
          <p className="loading-subtitle">
            {error
              ? "Something went wrong while searching."
              : "Finding the smartest stay for you..."}
          </p>
  
          <div className="loading-progress">
            <div
              className="loading-progress__bar"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
  
          <p className="loading-percentage">
            {Math.round(progress)}%
          </p>
  
          {!error && (
            <p
              style={{
                marginTop: "10px",
                color: "#6b7280",
                fontSize: "0.95rem",
              }}
            >
              {totalHotels > 0
                ? `${totalHotels} stays found so far`
                : "Starting hotel search..."}
            </p>
          )}
  
          {error && (
            <div
              style={{
                marginTop: "24px",
                color: "#dc2626",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {error}
  
              <br />
  
              <button
                type="button"
                style={{
                  marginTop: "18px",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 22px",
                  cursor: "pointer",
                  background: "#111827",
                  color: "white",
                  fontWeight: 600,
                }}
                onClick={() => navigate("/")}
              >
                Start a new search
              </button>
            </div>
          )}
  
          {!error && (
            <div className="loading-steps">
              {loadingSteps.map((step, index) => {
                const completed =
                  completedSteps.includes(index);
  
                const active =
                  currentStep === index;
  
                if (!completed && !active) {
                  return null;
                }
  
                return (
                  <div
                    key={step}
                    className={`loading-step ${
                      completed
                        ? "loading-step--completed"
                        : "loading-step--active"
                    }`}
                  >
                    {completed ? (
                      <Check
                        size={18}
                        className="loading-check"
                      />
                    ) : (
                      <span className="loading-dot" />
                    )}
  
                    <span>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  export default LoadingScreen;