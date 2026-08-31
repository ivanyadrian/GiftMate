import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface ErrorToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function ErrorToast({
  message,
  onClose,
  duration = 3000,
}: ErrorToastProps) {
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
      className={`fixed top-20 md:top-6 right-4 md:right-6 z-50 flex flex-col bg-white border border-red-100 shadow-2xl rounded-xl overflow-hidden w-80 max-w-[calc(100vw-2rem)] ${
        isClosing
          ? "animate-[slideOutRight_0.3s_ease-in_forwards]"
          : "animate-[slideInRight_0.3s_ease-out]"
      }`}
      role="alert"
    >
      <div className="flex items-stretch">
        {/* Solid red left accent badge with exclamation mark */}
        <div className="w-12 bg-red-500 flex items-center justify-center shrink-0 text-white text-xl font-bold select-none">
          !
        </div>

        {/* Content body and close action */}
        <div className="flex flex-1 items-start px-4 py-2">
          {/* Text message */}
          <div className="flex-1 pt-0.5">
            <h3 className="text-sm font-semibold text-slate-900 mb-0.5">
              Hiba történt
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsClosing(true)}
            className="shrink-0 ml-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Progress bar visualizing remaining display duration */}
      <div className="h-1 w-full bg-slate-100">
        <div
          className="h-full bg-red-500 animate-[progress_4s_linear_forwards]"
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
}
