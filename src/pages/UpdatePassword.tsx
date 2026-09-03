import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Eye, EyeOff, LoaderCircle, Lock } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import CheckmarkAnimation from "../assets/animations/checkmark.lottie";
import ErrorToast from "../components/ui/ErrorToast";

/**
 * UpdatePassword Component
 *
 * Handles password reset when users land on the app via an email recovery link.
 * Verifies the incoming session or recovery token on mount, validates the new password,
 * updates credentials through Supabase Auth, and signs the user out so they can
 * cleanly log in with their new credentials.
 */
export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [invalidToken, setInvalidToken] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      // 1. Check if the URL contains error parameters from Supabase (e.g., expired token)
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const searchParams = new URLSearchParams(window.location.search);
      const urlError =
        hashParams.get("error_description") ||
        searchParams.get("error_description") ||
        hashParams.get("error");

      if (urlError) {
        if (isMounted) {
          setError(
            "A jelszó-visszaállító link érvénytelen vagy már lejárt. Kérj új linket a bejelentkezési oldalon.",
          );
          setInvalidToken(true);
          setVerifying(false);
        }
        return;
      }

      // 2. Check if recovery parameters are present in the URL (hash or query)
      const hasRecoveryToken =
        window.location.hash.includes("type=recovery") ||
        window.location.hash.includes("access_token") ||
        window.location.search.includes("code=");

      // 3. Check for an already established active session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        if (!session && !hasRecoveryToken) {
          // No active session and no recovery tokens present; redirect to login
          navigate("/login", { replace: true });
        } else {
          setVerifying(false);
        }
      }
    };

    checkSession();

    // 4. Subscribe to auth state change events to gracefully handle asynchronous token exchange
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        if (event === "PASSWORD_RECOVERY" || session) {
          setVerifying(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  /**
   * Validates password rules and submits the updated password to Supabase Auth.
   */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate that both entered passwords match
    if (password !== confirmPassword) {
      setError("A jelszavak nem egyeznek.");
      setLoading(false);
      return;
    }

    // Enforce minimum password length constraint
    if (password.length < 6) {
      setError("A jelszónak legalább 6 karakternek kell lennie.");
      setLoading(false);
      return;
    }

    // Update password for the currently authenticated recovery user
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);

      // Sign out the user because Supabase automatically establishes a temporary session
      // via the recovery link. By design, we want the user to explicitly log in with their new credentials.
      await supabase.auth.signOut();
    }
  };

  // Initial loading screen while verifying session/token
  if (verifying) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex justify-center items-center p-4 sm:p-6 bg-slate-50">
        <LoaderCircle className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center p-4 sm:p-6 bg-slate-50 text-slate-900 font-sans">
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-md border border-slate-100 p-8 sm:p-10">
        {/* Header section (hidden once the password update succeeds or if token is invalid) */}
        {!success && !invalidToken && (
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-center">
              Új jelszó megadása
            </h1>
            <p className="text-sm text-slate-500 text-center mt-2">
              Kérlek, válassz egy új, biztonságos jelszót a fiókodhoz.
            </p>
          </div>
        )}

        {/* Floating error notification */}
        {error && !success && (
          <ErrorToast message={error} onClose={() => setError(null)} />
        )}

        {/* View 1: Invalid or expired token error card */}
        {invalidToken ? (
          <div className="text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <Lock className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Érvénytelen vagy lejárt link
            </h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              A jelszó-visszaállító hivatkozás érvénytelen vagy a megadott időn
              belül nem került felhasználásra. Kérlek, igényelj új
              jelszó-visszaállítást.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="btn-green w-full"
            >
              Vissza a bejelentkezéshez
            </button>
          </div>
        ) : success ? (
          /* View 2: Success View with animated Lottie checkmark and redirect */
          <div className="text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto flex items-center justify-center w-24 h-24 mb-2">
              <DotLottieReact
                src={CheckmarkAnimation}
                autoplay
                loop={false}
                className="w-full h-full"
              />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Sikeres jelszócsere!
            </h3>
            <p className="text-sm text-slate-500 mb-8">
              A jelszavadat sikeresen frissítettük. Most már bejelentkezhetsz az
              új jelszavaddal.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="btn-green w-full"
            >
              Ugrás a bejelentkezéshez
            </button>
          </div>
        ) : (
          /* View 3: Password Update Form */
          <form onSubmit={handleUpdate} className="space-y-4">
            {/* New Password Input Field */}
            <div>
              <label
                className="block text-xs font-semibold text-slate-700 tracking-wider mb-1.5"
                htmlFor="password"
              >
                Új jelszó
              </label>
              <div className="relative flex items-center">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Új jelszavad"
                  className="input-field"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label="Jelszó láthatósága"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password Input Field */}
            <div>
              <label
                className="block text-xs font-semibold text-slate-700 tracking-wider mb-1.5"
                htmlFor="confirmPassword"
              >
                Új jelszó megerősítése
              </label>
              <div className="relative flex items-center">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Új jelszavad megerősítése"
                  className="input-field"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label="Jelszó láthatósága"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-green w-full mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Mentés...</span>
                </span>
              ) : (
                "Jelszó mentése"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
