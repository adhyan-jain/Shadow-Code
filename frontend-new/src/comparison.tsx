import logo from "../src/assets/logo.png";
import { useNavigate } from "react-router-dom";
import ParticlesBackground from "./components/particle_background";
export default function Comparison() {
  const navigate = useNavigate();
  const handleNavigation = () => {
    navigate("/conversion");
  };
  return (
    <div className="min-h-screen bg-[#060C1E] p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col relative">
      <ParticlesBackground />
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src={logo}
              alt="logo"
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 shrink-0"
            />
            <div className="flex gap-1 sm:gap-2 flex-wrap items-baseline">
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">
                Code
              </h1>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#10B981]">
                Comparison
              </h1>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <div className="rounded-md sm:rounded-lg md:rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 backdrop-blur-md shadow-lg inline-block">
              <h4 className="text-white font-semibold tracking-wide text-sm sm:text-base">
                Java to Python
              </h4>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 md:mt-10 flex-1 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
            {/* Original Code - always first */}
            <div className="flex flex-col w-full min-w-0">
              <h4 className="text-base sm:text-lg md:text-xl text-white font-medium mb-2 sm:mb-3">
                Original Code
              </h4>
              <div className="flex-1 rounded-lg sm:rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-3 backdrop-blur-md shadow-lg overflow-hidden min-h-0">
                <pre className="text-[11px] sm:text-xs md:text-sm text-white/90 font-mono whitespace-pre overflow-x-auto overflow-y-auto text-left min-w-0 max-h-[280px] sm:max-h-[320px] md:max-h-[360px] lg:max-h-[400px]">
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

            {/* Converted Code - Python equivalent */}
            <div className="flex flex-col w-full min-w-0">
              <h4 className="text-base sm:text-lg md:text-xl text-white font-medium mb-2 sm:mb-3">
                Converted Code
              </h4>
              <div className="flex-1 rounded-lg sm:rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-3 backdrop-blur-md shadow-lg overflow-hidden min-h-0">
                <pre className="text-[11px] sm:text-xs md:text-sm text-white/90 font-mono whitespace-pre overflow-x-auto overflow-y-auto text-left min-w-0 max-h-[280px] sm:max-h-[320px] md:max-h-[360px] lg:max-h-[400px]">
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
            type="button"
            className="bg-[#10B981] font-medium px-4 py-2 rounded-lg hover:bg-[#0d9668] transition-colors cursor-pointer font-secondary"
            onClick={handleNavigation}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
