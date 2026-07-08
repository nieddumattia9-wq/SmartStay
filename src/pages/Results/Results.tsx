import {
    useEffect,
    useMemo,
    useState,
  } from "react";
  
  import {
    useNavigate,
    useSearchParams,
  } from "react-router-dom";
  
  import HotelCard from "../../components/HotelCard/HotelCard";
  
  import { getSearchSession } from "../../services/api";
  
  import type {
    Hotel,
    SearchSessionResponse,
  } from "../../types/hotel";
  
  import {
    rankHotelsWithSmartStayEngine,
  } from "../../utils/smartStayEngine";
  
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
  
    const rankedHotels =
      useMemo(() => {
  
        return rankHotelsWithSmartStayEngine(
          hotels
        );
  
      }, [hotels]);
  
    useEffect(() => {
  
      async function loadResults() {
  
        try {
  
          if (!searchId) {
  
            setError(
              "Missing searchId. Please start a new search."
            );
  
            return;
  
          }
  
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
  
          setError(
            "Unable to load hotels."
          );
  
        } finally {
  
          setLoading(false);
  
        }
  
      }
  
      loadResults();
  
    }, [searchId]);
  
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
  
        <h1
          style={{
            fontSize: "2.4rem",
            marginBottom: "8px",
          }}
        >
  
          SmartStay Results
  
        </h1>
  
        <p
          style={{
            color: "#6b7280",
            marginBottom: "8px",
          }}
        >
  
          {hotels.length} stays found
  
        </p>
  
        <p
          style={{
            color: "#16a34a",
            marginBottom: status ? "12px" : "40px",
            fontSize: "0.95rem",
            fontWeight: 600,
          }}
        >
  
          Ranked by SmartStay Engine
  
        </p>
  
        {status && (
  
          <p
            style={{
              color: "#9ca3af",
              marginBottom: "40px",
              fontSize: "0.95rem",
            }}
          >
  
            Search status: {status}
  
          </p>
  
        )}
  
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
  
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "28px",
            }}
          >
  
            {rankedHotels.map((evaluation) => (
  
              <HotelCard
                key={evaluation.hotel.id}
                hotel={evaluation.hotel}
                smartScore={evaluation.smartScore}
                riskLevel={evaluation.riskLevel}
                badges={evaluation.badges}
                reasons={evaluation.reasons}
              />
  
            ))}
  
          </div>
  
        )}
  
      </main>
  
    );
  
  }
  
  export default Results;