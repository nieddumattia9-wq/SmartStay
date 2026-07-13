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
  getHotelDetails,
  getSearchSession,
} from "../../services/api";
import type {
  Hotel,
  HotelDetails,
  SearchSessionResponse,
} from "../../types/hotel";
  
  import {
    rankHotelsWithSmartStayEngine,
  } from "../../utils/smartStayEngine";
  
  const SEARCH_META_STORAGE_PREFIX =
    "smartstay_search_meta_";
  
  const DEFAULT_PREFERENCE_INDEX =
    2;
  
  type SearchMeta = {
    destinationLabel?: string;
    smartPreference?: unknown;
    budget?: string;
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
        getSearchMetaStorageKey(searchId)
      );
  
    if (!rawSearchMeta) {
      return null;
    }
  
    try {
      const parsed =
        JSON.parse(rawSearchMeta) as SearchMeta;
  
      if (
        !parsed ||
        typeof parsed !== "object"
      ) {
        return null;
      }
  
      return parsed;
    } catch {
      return null;
    }
  }
  
  function getSelectedPreferenceIndex(
    searchMeta: SearchMeta | null
  ) {
    const smartPreference =
      searchMeta?.smartPreference;
  
    if (
      !smartPreference ||
      typeof smartPreference !== "object" ||
      !("selectedIndex" in smartPreference)
    ) {
      return DEFAULT_PREFERENCE_INDEX;
    }
  
    const selectedIndex =
      Number(
        smartPreference.selectedIndex
      );
  
    if (!Number.isFinite(selectedIndex)) {
      return DEFAULT_PREFERENCE_INDEX;
    }
  
    return Math.min(
      Math.max(
        Math.round(selectedIndex),
        0
      ),
      sliderOptions.length - 1
    );
  }
  
  function getRecommendationLimit(
    preferenceId: string
  ) {
    if (
      preferenceId === "maximum-comfort" ||
      preferenceId === "comfort"
    ) {
      return 3;
    }
  
    return 4;
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
      return "Prioritizing the lowest smart cost first. Future split-stay options will be evaluated here.";
    }
  
    return "Balancing comfort, savings, location and reliability.";
  }
  
  function getBestHotelPrice(hotel: Hotel) {
    const validOfferPrices =
      hotel.offers
        ?.map((offer) => offer.price)
        .filter((price) => (
          Number.isFinite(price) &&
          price > 0
        )) ?? [];
  
    if (validOfferPrices.length > 0) {
      return Math.min(...validOfferPrices);
    }
  
    if (
      Number.isFinite(hotel.price) &&
      hotel.price > 0
    ) {
      return hotel.price;
    }
  
    return null;
  }
  
  function calculateAverageSearchPrice(
    hotels: Hotel[]
  ) {
    const validPrices = hotels
      .map(getBestHotelPrice)
      .filter((price): price is number => (
        price !== null &&
        Number.isFinite(price) &&
        price > 0
      ));
  
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
    hotel: Hotel,
    averageSearchPrice: number | null
  ) {
    const hotelPrice =
      getBestHotelPrice(hotel);
  
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
  
    const selectedPreferenceIndex =
      useMemo(() => {
        return getSelectedPreferenceIndex(
          searchMeta
        );
      }, [searchMeta]);
  
    const selectedPreference =
      sliderOptions[selectedPreferenceIndex] ??
      sliderOptions[DEFAULT_PREFERENCE_INDEX];
  
    const recommendationLimit =
      getRecommendationLimit(
        selectedPreference.id
      );
  
      const rankedHotels =
      useMemo(() => {
        return rankHotelsWithSmartStayEngine(
          hotels,
          selectedPreference.id
        );
      }, [
        hotels,
        selectedPreference.id,
      ]);
  
    const averageSearchPrice =
      useMemo(() => {
        return calculateAverageSearchPrice(
          hotels
        );
      }, [hotels]);
  
    const recommendedHotels =
      useMemo(() => {
        return rankedHotels.slice(
          0,
          recommendationLimit
        );
      }, [
        rankedHotels,
        recommendationLimit,
      ]);
  
    const remainingHotels =
      useMemo(() => {
        return rankedHotels.slice(
          recommendationLimit
        );
      }, [
        rankedHotels,
        recommendationLimit,
      ]);
  
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
          style={{
            padding: "80px",
            textAlign: "center",
          }}
        >
          Loading hotels...
        </div>
      );
    }
  
    if (error) {
      return (
        <div
          style={{
            padding: "80px",
            textAlign: "center",
            color: "#dc2626",
          }}
        >
          <h1>
            Results not available
          </h1>
  
          <p>
            {error}
          </p>
  
          <button
            type="button"
            style={{
              marginTop: "20px",
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
      );
    }
  
    return (
      <main
        style={{
          maxWidth: "1300px",
          margin: "40px auto",
          padding: "0 24px",
        }}
      >
        <section
          style={{
            marginBottom: "36px",
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              color: "#16a34a",
              fontSize: "0.82rem",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Ranked by SmartStay Engine
          </p>
  
          <h1
            style={{
              fontSize: "2.55rem",
              lineHeight: 1.08,
              margin: "0 0 12px",
              letterSpacing: "-0.04em",
            }}
          >
            Your SmartStay recommendations
          </h1>
  
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
              padding: "9px 13px",
              borderRadius: "999px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <span
              style={{
                width: "9px",
                height: "9px",
                borderRadius: "999px",
                background: selectedPreference.color,
              }}
            />
  
            <span
              style={{
                color: "#0f172a",
                fontSize: "0.88rem",
                fontWeight: 800,
              }}
            >
              {selectedPreference.title} mode
            </span>
          </div>
  
          <p
            style={{
              maxWidth: "760px",
              color: "#64748b",
              fontSize: "1.02rem",
              lineHeight: 1.65,
              margin: "0",
            }}
          >
            We analyzed {hotels.length} available stays and selected the strongest options first.
            {searchMeta?.destinationLabel ? ` Destination: ${searchMeta.destinationLabel}.` : ""}
            {" "}
            {getPreferenceSummary(selectedPreference.id)}
          </p>
  
          {searchMeta?.budget && (
            <p
              style={{
                marginTop: "12px",
                color: "#64748b",
                fontSize: "0.94rem",
              }}
            >
              Budget preference: €{searchMeta.budget}
            </p>
          )}
  
          {status && (
            <p
              style={{
                color: "#94a3b8",
                marginTop: "14px",
                fontSize: "0.92rem",
              }}
            >
              Search status: {status}
            </p>
          )}
        </section>

        {hotels.length === 0 ? (
        <div
          style={{
            padding: "60px",
            textAlign: "center",
            background: "#ffffff",
            borderRadius: "20px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, .08)",
          }}
        >
          <h2>
            No stays found
          </h2>

          <p
            style={{
              color: "#6b7280",
              marginTop: "10px",
            }}
          >
            Try another destination or different dates.
          </p>

          <button
            type="button"
            style={{
              marginTop: "24px",
              border: "none",
              borderRadius: "12px",
              padding: "12px 22px",
              cursor: "pointer",
              background: "#00b96b",
              color: "white",
              fontWeight: 600,
            }}
            onClick={() => navigate("/")}
          >
            Search again
          </button>
        </div>
      ) : (
        <>
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "28px",
            }}
          >
            {recommendedHotels.map((evaluation, index) => (
              <div
                key={evaluation.hotel.id}
              >
                <p
                  style={{
                    margin: "0 0 10px",
                    color: "#059669",
                    fontSize: "0.82rem",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  SmartStay pick #{index + 1}
                </p>

                <HotelCard
                  hotel={evaluation.hotel}
                  smartScore={evaluation.smartScore}
                  riskLevel={evaluation.riskLevel}
                  badges={evaluation.badges}
                  reasons={evaluation.reasons}
                  priceAdvantagePercent={calculatePriceAdvantagePercent(
                    evaluation.hotel,
                    averageSearchPrice
                  )}
                  detailsLoading={
                    hotelDetailsLoading &&
                    activeDetailsHotelId ===
                      evaluation.hotel.id
                  }
                  onViewDetails={
                    handleViewHotelDetails
                  }
                  />
              </div>
            ))}
          </section>

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
                    Want to explore every ranked option?
                  </h2>

                  <p
                    style={{
                      maxWidth: "660px",
                      margin: "10px auto 0",
                      color: "#64748b",
                      lineHeight: 1.6,
                    }}
                  >
                    SmartStay selected the strongest recommendations above for your {selectedPreference.title.toLowerCase()} preference.
                    You can still open the full ranked list if you want to compare all available stays.
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
                    View full SmartStay ranked list
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
                      Full ranked list
                    </p>

                    <h2
                      style={{
                        margin: "0",
                        fontSize: "1.85rem",
                        letterSpacing: "-0.04em",
                      }}
                    >
                      All remaining stays ranked by SmartStay
                    </h2>

                    <p
                      style={{
                        marginTop: "8px",
                        color: "#64748b",
                      }}
                    >
                      These are still ordered by SmartScore, but the strongest recommendations are already shown above.
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
                        badges={evaluation.badges}
                        reasons={evaluation.reasons}
                        priceAdvantagePercent={calculatePriceAdvantagePercent(
                          evaluation.hotel,
                          averageSearchPrice
                        )}
                        detailsLoading={
                          hotelDetailsLoading &&
                          activeDetailsHotelId ===
                            evaluation.hotel.id
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
          onClose={handleCloseHotelDetails}
        />
      )}

    </main>
  );
}

export default Results;