import { useNavigate } from "react-router-dom";
import ConvertFilesIcon from "./assets/convertfiles.svg";
import Logo from "./assets/logo.svg";
import ParticlesBackground from "./components/particle_background";

export default function ConversionResult() {
  const navigate = useNavigate();
  const handleNavigation = () => {
    navigate("/comparison");
  };

  return (
    <div className="min-h-screen bg-[#060C1E] px-4 sm:px-6 lg:px-10 py-6 sm:py-8 text-white font-primary">
      <div className="flex items-center gap-3 text-lg font-semibold font-secondary">
        <img src={Logo} alt="" className="h-9 w-9 shrink-0" />
        <span>
          <span className="text-[#10B981]">Shadow</span>Code
        </span>
      </div>

      <div className="fixed inset-0 z-0 w-full h-full min-h-screen pointer-events-none">
        <ParticlesBackground />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-6">
          <h3 className="text-base font-secondary mb-6">
            <span className="text-[#10B981]">Before</span> Conversion
          </h3>

          <div className="space-y-5 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                <span>Safe</span>
              </div>
              <span>20</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                <span>Moderate</span>
              </div>
              <span>12</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                <span>Risky</span>
              </div>
              <span>3</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
                <span>Already converted</span>
              </div>
              <span>5</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-6">
          <h3 className="text-base font-secondary mb-6">
            <span className="text-[#10B981]">After</span> Conversion
          </h3>

          <div className="space-y-5 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                <span>Safe</span>
              </div>
              <span>20</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                <span>Moderate</span>
              </div>
              <span>12</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                <span>Risky</span>
              </div>
              <span>3</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
                <span>Already converted</span>
              </div>
              <span>5</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-[#10B981]/30 bg-gradient-to-r from-[#0B1227] to-[#060C1E] p-6 flex gap-4 relative z-10">
        <img src={ConvertFilesIcon} alt="" className="h-10 w-10 shrink-0" />

        <div>
          <h4 className="font-secondary text-sm mb-1">
            Migration successful!
          </h4>

          <p className="text-sm text-gray-400 leading-relaxed">
            The selected files have been successfully converted and integrated.
            No critical dependencies were affected during the process.
          </p>
        </div>
      </div>

      <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center relative z-10">
        <button
          onClick={() => navigate("/map")}
          className="px-8 py-2.5 rounded-md border border-[#10B981] text-[#10B981] text-sm font-secondary hover:bg-[#10B981]/10 transition"
        >
          View Updated Map
        </button>

        <button
          className="px-8 py-2.5 rounded-md bg-[#10B981] text-black text-sm font-secondary hover:brightness-110 transition"
          onClick={handleNavigation}
        >
          Review Conversion
        </button>
      </div>
    </div>
  );
}
