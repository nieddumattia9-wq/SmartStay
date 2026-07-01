import "./App.css";
import Hero from "./components/Hero/Hero";
import TripOptimizer from "./components/TripOptimizer/TripOptimizer";
import Navbar from "./components/Navbar/Navbar"
function App() {
  return (
    <main className="app">
      <Navbar />
      <Hero />
      <TripOptimizer />
    </main>
  );
}

export default App;