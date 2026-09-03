import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import ErrorToast from "../components/ui/ErrorToast";
import ForgotPasswordModal from "../components/ui/ForgotPasswordModal";
import ChristmasWindChimes from "../assets/animations/christmas_wind_chimes.lottie";

/**
 * Login Component
 *
 * Handles user authentication via standard email/password credentials or Google OAuth.
 * Key features:
 * - Automatically populates saved credentials if "Remember Me" was previously selected.
 * - Redirects authenticated users directly to the Dashboard.
 * - Houses the modal trigger for forgotten password recovery (`ForgotPasswordModal`).
 * - Displays client-side error notifications using `ErrorToast`.
 */
export default function Login() {
  // --- Form Input States ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- Password Visibility & Persistence ---
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // --- UI Feedback & Loading States ---
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Password Recovery Modal Toggle ---
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const navigate = useNavigate();

  /**
   * Session Guard & Credential Restoration:
   * 1. Restores previously saved email from LocalStorage if "Remember Me" was checked.
   * 2. Checks for an active authenticated session and redirects to Dashboard.
   * 3. Listens for auth state changes (e.g. following OAuth redirect).
   */
  useEffect(() => {
    // 1. Retrieve persisted email from local storage
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    // 2. Redirect if already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });

    // 3. Listen for auth state changes and redirect upon successful login
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/dashboard");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  /**
   * Handles standard email and password sign-in.
   * Updates LocalStorage based on the "Remember Me" toggle and signs in via Supabase Auth.
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Persist or remove email based on user preference
    if (rememberMe) {
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    // Authenticate with Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("invalid login credentials") ||
        error.message.toLowerCase().includes("invalid_grant") ||
        error.message.toLowerCase().includes("invalid_credentials")
      ) {
        setError("Hibás felhasználónév vagy jelszó");
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      navigate("/dashboard");
    }
  };

  /**
   * Initiates Google OAuth authentication flow.
   * Redirects to the application's dashboard upon successful authentication.
   */
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center p-4 sm:p-6 bg-slate-50 text-slate-900 font-sans">
      <div className="bg-white rounded-3xl shadow-lg flex flex-col md:flex-row overflow-hidden max-w-4xl w-full border border-slate-100">
        {/* Left Column (Desktop only): Festive Lottie wind chimes animation */}
        <div className="hidden md:flex flex-1 bg-emerald-50/60 pl-2 relative overflow-hidden">
          <DotLottieReact
            src={ChristmasWindChimes}
            loop
            autoplay
            className="absolute right-0 top-0 w-112.5 h-112.5 max-w-none pointer-events-none scale-120 origin-top-right"
            layout={{
              fit: "contain",
              align: [1, 0],
            }}
          />
        </div>

        {/* Right Column: Login Form & Social Sign-In */}
        <div className="flex-1 p-4 xs:p-8 sm:p-12 flex flex-col justify-center">
          {/* Header & Welcoming Message */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
              Üdvözöl a GiftMate!
            </h1>
            <p className="text-sm text-slate-500">
              Jelentkezz be az ajándékhúzásaid kezeléséhez!
            </p>
          </div>

          {/* Floating Error Notification */}
          {error && (
            <ErrorToast message={error} onClose={() => setError(null)} />
          )}

          {/* Sign-In Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input Field */}
            <div>
              <label
                className="block text-xs font-semibold text-slate-700 tracking-wider mb-1.5"
                htmlFor="email"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="santa@gmail.com"
                className="input-field"
              />
            </div>

            {/* Password Input Field */}
            <div>
              <label
                className="block text-xs font-semibold text-slate-700 tracking-wider mb-1.5"
                htmlFor="password"
              >
                Jelszó
              </label>
              <div className="relative flex items-center">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox & Forgot Password Link */}
            <div className="flex flex-col min-[330px]:flex-row justify-between gap-3 xs:gap-2 text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
                Emlékezz rám
              </label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="font-medium text-red-500 hover:text-red-600 transition-colors self-end"
              >
                Elfelejtetted a jelszavad?
              </button>
            </div>

            {/* Submit Sign-In Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-green w-full mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Bejelentkezés...</span>
                </span>
              ) : (
                "Bejelentkezés"
              )}
            </button>
          </form>

          {/* Visual Divider Between Auth Methods */}
          <div className="relative mt-10 mb-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative px-3 bg-white text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              vagy jelentkezz be
            </span>
          </div>

          {/* Social OAuth Providers (Google) */}
          <div className="flex justify-center items-center">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex items-center justify-center w-full gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FcGoogle className="w-4 h-4" />
              Google
            </button>
          </div>

          {/* Link to Registration Page for New Users */}
          <p className="text-center text-xs text-slate-500 mt-6">
            Nincs fiókod?{" "}
            <Link
              to="/register"
              className="font-semibold text-emerald-600 hover:underline"
            >
              Regisztrálj be itt
            </Link>
          </p>
        </div>
      </div>

      {/* Password Reset Recovery Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
}
