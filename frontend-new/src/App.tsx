import { Routes, Route } from "react-router-dom";
import HomePage from "./home_page";
import MapPage from "./map_page";
import Comparison from "./comparison";
import WorkflowPage from "./Workflow";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/comparison" element={<Comparison />} />
      <Route path="/workflow/:nodeId" element={<WorkflowPage />} />
    </Routes>
  );
}
