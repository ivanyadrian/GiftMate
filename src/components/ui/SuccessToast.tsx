import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";

interface SuccessToastProps {
  title?: string;
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function SuccessToast({
  title = "Sikeres művelet",
  message,
  onClose,
  duration = 3000,
}: SuccessToastProps) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

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
        {/* Teli zöld bal oldali sáv fehér pipával */}
        <div className="w-12 bg-emerald-500 flex items-center justify-center shrink-0 text-white font-bold select-none">
          <Check className="w-6 h-6 stroke-[2.5]" />
        </div>

        {/* Tartalom és bezárás gomb */}
        <div className="flex flex-1 items-start px-4 py-2.5">
          {/* Szöveg */}
          <div className="flex-1 pt-0.5">
            <h3 className="text-sm font-semibold text-slate-900 mb-0.5">
              {title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
          </div>

          {/* Bezárás gomb */}
          <button
            onClick={() => setIsClosing(true)}
            className="shrink-0 ml-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
            aria-label="Bezárás"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Zöld töltődő csík az alján */}
      <div className="h-1 w-full bg-slate-100">
        <div
          className="h-full bg-emerald-500 animate-[progress_4s_linear_forwards]"
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
}
