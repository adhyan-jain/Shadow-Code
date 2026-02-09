import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../src/assets/logo.png";
import ParticlesBackground from "./components/particle_background";

export default function Comparison() {
  const navigate = useNavigate();
  const [openApp, setOpenApp] = useState(true);
  const [openPages, setOpenPages] = useState(true);
  const [activeFile, setActiveFile] = useState("/app/pages/index.tsx");

  return (
    <div className="min-h-screen bg-[#060C1E] flex relative">
      <div className="w-60 bg-black/30 border-r border-white/10 p-4 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <img src={logo} alt="logo" className="w-8 h-8" />
        </div>

        <div className="text-sm font-mono text-white/70 space-y-2">
          <button
            onClick={() => setOpenApp(!openApp)}
            className="w-full text-left hover:text-white"
          >
            {openApp ? "▾" : "▸"} app
          </button>

          {openApp && (
            <div className="ml-4 space-y-2">
              <button
                onClick={() => setOpenPages(!openPages)}
                className="w-full text-left hover:text-white"
              >
                {openPages ? "▾" : "▸"} pages
              </button>

              {openPages && (
                <div className="ml-4 space-y-1">
                  {["index.tsx", "index.tsx", "index.tsx", "index.tsx"].map(
                    (file, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveFile(`/app/pages/${file}`)}
                        className={`block w-full text-left hover:text-white ${
                          activeFile === `/app/pages/${file}`
                            ? "text-white"
                            : ""
                        }`}
                      >
                        {file}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 relative">
        <ParticlesBackground />

        <div className="relative z-10 flex flex-col flex-1 min-h-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex gap-2 items-baseline">
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">
                  Code
                </h1>
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#10B981]">
                  Comparison
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-white/50 mt-1">
                Source: {activeFile}
              </p>
            </div>

            <button className="bg-white/10 hover:bg-white/20 transition px-4 py-2 rounded-full text-sm text-white">
              Language to Language
            </button>
          </div>

          <div className="mt-6 sm:mt-8 md:mt-10 flex-1 min-h-0 h-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 h-full">
              <div className="flex flex-col w-full min-w-0 h-full">
                <h4 className="text-base sm:text-lg md:text-xl text-white font-medium mb-2 sm:mb-3">
                  Original (Language)
                </h4>

                <div className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md shadow-lg overflow-hidden min-h-0">
                  <pre className="text-[10px] sm:text-[11px] md:text-xs text-white/90 font-mono whitespace-pre overflow-auto max-h-[560px]">
                    {`import { db } from './database';
import { hashPassword, verifyToken } from './utils';

export class AuthService {
  async validateUser(email: string, password: string) {
    const user = await db.users.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }
    const isValid = await verifyToken(password, user.passwordHash);
    return isValid ? user : null;
  }

  async createSession(userId: string) {
    const token = generateToken(userId);
    await db.sessions.create({ userId, token });
    return token;
  }
}`}
                  </pre>
                </div>
              </div>

              <div className="flex flex-col w-full min-w-0 h-full">
                <h4 className="text-base sm:text-lg md:text-xl text-[#10B981] font-medium mb-2 sm:mb-3">
                  Converted (Language)
                </h4>

                <div className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md shadow-lg overflow-hidden min-h-0">
                  <pre className="text-[10px] sm:text-[11px] md:text-xs text-white/90 font-mono whitespace-pre overflow-auto max-h-[560px]">
                    {`from database import db
from utils import hash_password, verify_token

class AuthService:
    async def validate_user(self, email: str, password: str):
        user = await db.users.find_one({"email": email})
        if not user:
            raise ValueError("User not found")
        is_valid = await verify_token(password, user["password_hash"])
        return user if is_valid else None

    async def create_session(self, user_id: str):
        token = generate_token(user_id)
        await db.sessions.create({"user_id": user_id, "token": token})
        return token`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 flex justify-start">
            <button
              onClick={() => navigate("/map")}
              className="bg-[#10B981] px-4 py-2 rounded-lg font-medium hover:bg-[#0d9668]"
            >
              Back to Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
