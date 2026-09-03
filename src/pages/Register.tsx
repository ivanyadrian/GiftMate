import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import ErrorToast from "../components/ui/ErrorToast";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import ChristmasWindChimes from "../assets/animations/christmas_wind_chimes.lottie";

/**
 * Register Component
 *
 * Provides new user registration functionality using email/password and Google OAuth.
 * Automatically checks for an existing session on mount and redirects authenticated users
 * directly to the Dashboard. Includes responsive layout with animations and
 * client-side form validation.
 */
export default function Register() {
  // --- Form Input States ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // --- Password Visibility Toggles ---
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- UI Feedback & Loading States ---
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /**
   * Session Guard:
   * Checks if an authenticated session already exists on component mount or is established,
   * redirecting the user to the Dashboard to prevent redundant registration.
   */
  useEffect(() => {
    // 1. Initial check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });

    // 2. Real-time auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/dashboard");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  /**
   * Handles email & password registration.
   * Performs client-side validation to ensure password confirmation matches,
   * then creates the new account using Supabase Auth.
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate password confirmation match
    if (password !== confirmPassword) {
      setError("A jelszavak nem egyeznek!");
      setLoading(false);
      return;
    }

    // Register user via Supabase Auth
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("user already registered") ||
        error.message.toLowerCase().includes("user_already_exists") ||
        error.message.toLowerCase().includes("already been registered")
      ) {
        setError("Ezzel az email címmel már regisztráltak!");
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      navigate("/dashboard");
    }
  };

  /**
   * Initiates Google OAuth authentication flow via Supabase.
   * Redirects the user back to the application's dashboard upon successful authentication.
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
        {/* Left Column (Desktop only): Lottie wind chimes animation */}
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

        {/* Right Column: Registration Form & Social Login */}
        <div className="flex-1 p-4 xs:p-8 sm:p-12 flex flex-col justify-center">
          {/* Header & Welcoming Message */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
              Üdvözöl a GiftMate!
            </h1>
            <p className="text-sm text-slate-500">
              Regisztrálj és szervezd meg az idei ajándékhúzást!
            </p>
          </div>

          {/* Floating Error Notification */}
          {error && (
            <ErrorToast message={error} onClose={() => setError(null)} />
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4">
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

            {/* Confirm Password Input Field */}
            <div>
              <label
                className="block text-xs font-semibold text-slate-700 tracking-wider mb-1.5"
                htmlFor="confirmPassword"
              >
                Jelszó megerősítése
              </label>
              <div className="relative flex items-center">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Registration Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-sm hover:shadow duration-150 mt-2 flex justify-center items-center"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Regisztráció...</span>
                </span>
              ) : (
                "Regisztráció"
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

          {/* Link to Login Page for Existing Users */}
          <p className="text-center text-xs text-slate-500 mt-6">
            Már van fiókod?{" "}
            <Link
              to="/login"
              className="font-semibold text-emerald-600 hover:underline"
            >
              Jelentkezz be itt
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
