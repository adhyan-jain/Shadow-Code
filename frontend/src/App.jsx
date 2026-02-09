import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Compare from "./pages/Compare";
import Workflow from "./pages/Workflow";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/workflow" element={<Workflow />} />
      </Routes>
    </Router>
  );
}

export default App;
