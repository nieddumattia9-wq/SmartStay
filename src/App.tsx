import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./App.css";

import Navbar from "./components/Navbar/Navbar";

import Home from "./pages/Home/Home";

import Results from "./pages/Results/Results";

import LoadingScreen from "./components/LoadingScreen/LoadingScreen";
function App() {
  return (
    <BrowserRouter>

      <Navbar />

      <main className="app">

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

        </Routes>

      </main>

    </BrowserRouter>
  );
}

export default App;