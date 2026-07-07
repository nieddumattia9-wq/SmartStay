import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import "./App.css";

import Navbar from "./components/Navbar/Navbar";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";

import Home from "./pages/Home/Home";
import Results from "./pages/Results/Results";

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