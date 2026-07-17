import {
  useEffect,
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