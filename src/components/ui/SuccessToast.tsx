import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";

/**
 * Props for the SuccessToast notification component.
 */
interface SuccessToastProps {
  title?: string;
  message: string;
  onClose: () => void;
  duration?: number;
}

/**
 * SuccessToast Component
 *
 * Fixed-position notification banner for presenting positive feedback:
 * - Animated slide-in and slide-out transitions.
 * - Solid emerald accent badge with checkmark icon.
 * - Progress bar visualizing remaining display duration.
 * - Accessible alert role with manual dismiss button.
 */
export default function SuccessToast({
  title = "Sikeres művelet",
  message,
  onClose,
  duration = 3000,
}: SuccessToastProps) {
  const [isClosing, setIsClosing] = useState(false);

  // Automatically trigger closing animation after specified duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  // Wait for the 300ms slide-out animation to complete before removing from DOM
  useEffect(() => {
    if (isClosing) {
      const closeTimer = setTimeout(() => {
        onClose();
      }, 300);
      return () => clearTimeout(closeTimer);
    }
  }, [isClosing, onClose]);

  return (
    <div
      className={`fixed top-20 md:top-6 right-4 md:right-6 z-50 flex flex-col bg-white border border-emerald-100 shadow-2xl rounded-xl overflow-hidden w-80 max-w-[calc(100vw-2rem)] ${
        isClosing
          ? "animate-[slideOutRight_0.3s_ease-in_forwards]"
          : "animate-[slideInRight_0.3s_ease-out]"
      }`}
      role="alert"
    >
      <div className="flex items-stretch">
        {/* Solid emerald left accent badge with checkmark */}
        <div className="w-12 bg-emerald-500 flex items-center justify-center shrink-0 text-white font-bold select-none">
          <Check className="w-6 h-6 stroke-[2.5]" />
        </div>

        {/* Content body and close action */}
        <div className="flex flex-1 items-start px-4 py-2.5">
          {/* Text message */}
          <div className="flex-1 pt-0.5">
            <h3 className="text-sm font-semibold text-slate-900 mb-0.5">
              {title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsClosing(true)}
            className="shrink-0 ml-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
            aria-label="Bezárás"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Progress bar visualizing remaining display duration */}
      <div className="h-1 w-full bg-slate-100">
        <div
          className="h-full bg-emerald-500 animate-[progress_4s_linear_forwards]"
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
}
