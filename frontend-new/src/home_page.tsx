import HomeImage from "../src/assets/logo.svg";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ParticlesBackground from "./components/particle_background";

export default function HomePage() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");

  const handleChange = () => {
    if (!repoUrl.trim()) {
      setError("Please enter the repository URL");
      return;
    }
    setError("");
    navigate("/map");
  };

  return (
    <div className="min-h-screen bg-[#060C1E] overflow-hidden">
      {" "}
      <div className="fixed inset-0 z-0 w-full h-full min-h-screen">
        <ParticlesBackground />
      </div>
      <div className="relative z-10">
        <div className="flex justify-center">
          <img
            className="mt-[50px] lg:h-[180px] sm:h-[100px]"
            src={HomeImage}
            alt="Home"
          />
        </div>

        <div className="flex gap-2 justify-center">
          <h1 className="md:text-2xl lg:text-6xl text-white">CODE</h1>
          <h1 className="md:text-2xl lg:text-6xl text-[#10B981]">CONVERTOR</h1>
        </div>

        <div className="flex justify-center">
          <h4 className="mt-4 md:text-lg lg:text-xl text-white">
            System-Aware Legacy Code Migration
          </h4>
        </div>

        <div className="flex justify-center">
          <div className="mt-[30px] w-full max-w-xl rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 shadow-[0_0_60px_rgba(16,185,129,0.15)]">
            <label className="block text-sm text-gray-300 mb-2">
              Repository Url
            </label>

            <input
              type="text"
              placeholder="https://github.com/username/repo"
              onChange={(e) => {
                setRepoUrl(e.target.value);
                setError("");
              }}
              className="w-full rounded-lg bg-[#0B1227] border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />

            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

            <button
              className="mt-6 w-full rounded-lg bg-[#10B981] py-3 font-secondary text-black hover:bg-[#0ea472] transition"
              onClick={handleChange}
            >
              Convert Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
