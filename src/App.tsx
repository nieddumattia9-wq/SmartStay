import {
  useEffect,
  useRef,
} from "react";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import "./App.css";

import Navbar from "./components/Navbar/Navbar";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";

import Home from "./pages/Home/Home";
import Results from "./pages/Results/Results";

import "./styles/frontendMobile.css";

import {
  flushAnalyticsQueue,
  trackAnalyticsJourneyAbandonment,
  trackAnalyticsPageView,
} from "./analytics/analyticsClient";

import type {
  AnalyticsPage,
} from "./analytics/analyticsTypes";

function RouteAccessibility() {
  const location =
    useLocation();

  useEffect(() => {
    const mainContent =
      document.getElementById(
        "main-content"
      );

    mainContent?.focus({
      preventScroll:
        true,
    });

    window.scrollTo({
      top:
        0,
      left:
        0,
      behavior:
        "auto",
    });
  }, [
    location.pathname,
    location.search,
  ]);

  return null;
}

function getAnalyticsPage(
  pathname: string
): AnalyticsPage {
  if (
    pathname.startsWith(
      "/loading"
    )
  ) {
    return "loading";
  }

  if (
    pathname.startsWith(
      "/results"
    )
  ) {
    return "results";
  }

  return "home";
}

function AnalyticsRouteObserver() {
  const location =
    useLocation();

  const previousPageRef =
    useRef<AnalyticsPage>(
      getAnalyticsPage(
        location.pathname
      )
    );

  useEffect(() => {
    const nextPage =
      getAnalyticsPage(
        location.pathname
      );

    if (
      previousPageRef.current !==
        "home" &&
      nextPage === "home"
    ) {
      trackAnalyticsJourneyAbandonment();
    }

    trackAnalyticsPageView(
      nextPage
    );

    previousPageRef.current =
      nextPage;
  }, [
    location.pathname,
  ]);

  useEffect(() => {
    function handlePageHide() {
      trackAnalyticsJourneyAbandonment();
      void flushAnalyticsQueue({
        keepalive: true,
      });
    }

    window.addEventListener(
      "pagehide",
      handlePageHide
    );

    return () => {
      window.removeEventListener(
        "pagehide",
        handlePageHide
      );
    };
  }, []);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <a
        className="skip-link"
        href="#main-content"
      >
        Skip to main content
      </a>

      <RouteAccessibility />
      <AnalyticsRouteObserver />

      <Navbar />

      <main
        id="main-content"
        className="app"
        tabIndex={-1}
      >
        <Routes>
          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/loading"
            element={<LoadingScreen />}
          />

          <Route
            path="/results"
            element={<Results />}
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;