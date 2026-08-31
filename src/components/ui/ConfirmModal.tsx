import { useEffect } from "react";
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Shuffle,
  LogOut,
  UserX,
  X,
  LoaderCircle,
  HelpCircle,
} from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "emerald" | "primary";
export type ConfirmIconType =
  | "danger"
  | "warning"
  | "trash"
  | "redraw"
  | "shuffle"
  | "logout"
  | "user-x"
  | "question";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ConfirmIconType;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = "Megerősítés",
  cancelText = "Mégse",
  variant = "danger",
  icon = "danger",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !isLoading) {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (icon) {
      case "trash":
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Trash2 className="w-6 h-6" />
          </div>
        );
      case "user-x":
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <UserX className="w-6 h-6" />
          </div>
        );
      case "logout":
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <LogOut className="w-6 h-6" />
          </div>
        );
      case "redraw":
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
            <RefreshCw className="w-6 h-6" />
          </div>
        );
      case "shuffle":
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Shuffle className="w-6 h-6" />
          </div>
        );
      case "warning":
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case "question":
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
            <HelpCircle className="w-6 h-6" />
          </div>
        );
      case "danger":
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case "emerald":
      case "primary":
        return "bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-emerald-200/50";
      case "warning":
        return "bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-amber-200/50";
      case "danger":
      default:
        return "bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white shadow-rose-200/50";
    }
  };

  return (
    <div
      onClick={isLoading ? undefined : onClose}
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overscroll-contain animate-[backdropFadeIn_0.2s_ease-out]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 sm:p-7 border border-slate-100 animate-[modalPopIn_0.25s_cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-[transform,opacity] backface-hidden origin-center overscroll-contain relative flex flex-col gap-5"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          aria-label="Bezárás"
          className="hidden sm:flex absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer disabled:opacity-50"
        >
          <X size={18} />
        </button>

        {/* Header with Icon */}
        <div className="flex items-center gap-4 pr-0 sm:pr-6">
          {renderIcon()}
          <h3 className="text-lg sm:text-xl font-bold text-slate-800">
            {title}
          </h3>
        </div>

        {/* Description */}
        {description && (
          <div className="text-sm text-slate-500 leading-relaxed">
            {description}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse xs:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50 text-center"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-3 px-4 font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-center ${getConfirmButtonClasses()}`}
          >
            {isLoading ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                <span>Folyamatban...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
