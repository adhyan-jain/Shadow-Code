import { Routes, Route } from "react-router-dom";
import HomePage from "./home_page";
import MapPage from "./map_page";
import ConvertFiles from "./convert_file";
import ConversionResult from "./conversion";
import Comparison from "./comparison";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/convertfiles" element={<ConvertFiles />} />
      <Route path="/conversion" element={<ConversionResult />} />
      <Route path="/comparison" element={<Comparison />} />
    </Routes>
  );
}
