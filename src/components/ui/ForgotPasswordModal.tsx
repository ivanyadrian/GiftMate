import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { X, LoaderCircle } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import CheckmarkAnimation from "../../assets/animations/checkmark.lottie";

// Component props: control visibility and handle close requests
interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset form when closed; listen for Escape key to close modal when open
  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setError(null);
      setSuccess(false);
      setLoading(false);
    } else {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !loading) {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, loading, onClose]);

  // Don't render anything if modal is not open
  if (!isOpen) return null;

  // Dispatch password reset email via Supabase Auth
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (email.trim().toLowerCase() === "demo@giftmate.app") {
      setError(
        "A nyilvános demó fiók jelszava biztonsági okokból nem állítható vissza!",
      );
      setLoading(false);
      return;
    }

    // Request reset link pointing back to the /update-password route
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div
      onClick={loading ? undefined : onClose}
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overscroll-contain animate-[backdropFadeIn_0.2s_ease-out]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-[modalPopIn_0.25s_cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-[transform,opacity] backface-hidden origin-center overscroll-contain"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">
            Elfelejtett jelszó
          </h2>
          <button
            onClick={onClose}
            className="hidden xs:flex text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 xs:p-6 overflow-y-auto overscroll-contain">
          {success ? (
            <div className="text-center py-4">
              <div className="mx-auto flex items-center justify-center w-24 h-24 mb-2">
                <DotLottieReact
                  src={CheckmarkAnimation}
                  autoplay
                  loop={false}
                  className="w-full h-full"
                />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                E-mail elküldve!
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Ha a megadott e-mail címhez tartozik fiók, elküldtük a
                jelszó-visszaállító linket. Kérlek ellenőrizd a beérkező
                leveleidet (Spam mappát is).
              </p>
              <button onClick={onClose} className="btn-green w-full">
                Vissza a bejelentkezéshez
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-6">
                Kérlek, add meg a regisztrációhoz használt e-mail címedet, és mi
                küldünk egy linket a jelszavad visszaállításához.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label
                    className="block text-xs font-semibold text-slate-700 tracking-wider mb-1.5"
                    htmlFor="reset-email"
                  >
                    E-mail cím
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pelda@email.com"
                    className="input-field"
                  />
                </div>

                <div className="flex flex-col min-[300px]:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm rounded-xl shadow-sm duration-150"
                  >
                    Mégsem
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="flex-1 btn-green"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                        <span>Küldés...</span>
                      </span>
                    ) : (
                      "Link küldése"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
