import {
  Users,
  Calendar,
  Clock,
  Shuffle,
  MapPin,
  UserRoundKey,
  CircleCheck,
  CalendarClock,
  Lock,
} from "lucide-react";

/**
 * Properties for the RoomCard component.
 */
export interface RoomCardProps {
  /** Display name of the room */
  roomName: string;
  /** Event theme identifier ('christmas', 'work', 'school', 'family', or 'general') */
  eventType: string;
  /** Whether an optional budget limit has been configured */
  hasBudget: boolean;
  /** Recommended spending amount or null if unspecified */
  budgetAmount: string | number | null;
  /** Currency code ('HUF', 'EUR', 'USD', etc.) */
  currency: string;
  /** Physical or virtual gift exchange location */
  location: string;
  /** Scheduled gift exchange date (YYYY-MM-DD) */
  eventDate: string;
  /** Scheduled gift exchange time (HH:MM:SS) */
  eventTime: string;
  /** Detailed guidelines, rules, or greeting message */
  description: string;
  /** Draw execution mode: 'manual' or 'auto' */
  drawType: string;
  /** Automatic draw execution date */
  drawDate: string;
  /** Automatic draw execution time */
  drawTime: string;
  /** Total number of registered room participants */
  memberCount: number;
  /** When true, clamps long titles to single line for denser dashboard views */
  simplified?: boolean;
  /** Whether pairs have already been generated */
  isDrawn?: boolean;
  /** Whether the room is a protected public demonstration room */
  isLocked?: boolean;
  /** Optional CTA button configuration rendered at the card bottom */
  actionButton?: {
    text: string;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "primary" | "disabled";
  };
}

/**
 * RoomCard Component
 *
 * Reusable visual card representation of a Secret Santa room:
 * - Theme-specific banner image overlay with fallback gradient styling.
 * - Live member count badge and protected demo room indicator.
 * - Draw progress indicator pill ('Kisorsolva' or 'Sorsolásra vár').
 * - Location, event date/time, and currency-formatted budget badge.
 * - Compact 1-line description bar with ellipsis truncation or 'Leírás - nincs' fallback.
 * - Draw parameters block displaying manual trigger or countdown time.
 * - Primary navigation action button linking to room details.
 */
export default function RoomCard({
  roomName,
  eventType,
  hasBudget,
  budgetAmount,
  currency,
  location,
  eventDate,
  eventTime,
  description,
  drawType,
  drawDate,
  drawTime,
  memberCount,
  simplified = false,
  isDrawn = false,
  isLocked = false,
  actionButton,
}: RoomCardProps) {
  /**
   * Resolves the theme banner illustration path matching the room's event type.
   */
  const getBannerImage = () => {
    switch (eventType) {
      case "christmas":
        return "/banners/preview_christmas.png";
      case "work":
        return "/banners/preview_work.png";
      case "school":
        return "/banners/preview_school.png";
      case "family":
        return "/banners/preview_family.png";
      default:
        return "/banners/preview_general.png";
    }
  };

  /**
   * Resolves the theme background gradient classes matching the room's event type.
   */
  const getBannerColor = () => {
    switch (eventType) {
      case "work":
        return "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600";
      case "school":
        return "bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500";
      case "family":
        return "bg-gradient-to-br from-rose-400 via-rose-500 to-pink-600";
      default:
        return "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600";
    }
  };

  /**
   * Truncates time string to HH:MM format.
   */
  const formatTime = (timeStr?: string) =>
    timeStr ? timeStr.slice(0, 5) : "-";

  /**
   * Formats ISO currency strings into readable currency symbols.
   */
  const formatCurrency = (curr?: string) => {
    if (!curr) return "Ft";
    if (curr === "HUF" || curr === "Ft") return "Ft";
    if (curr === "EUR" || curr === "€") return "€";
    if (curr === "USD" || curr === "$") return "$";
    return curr;
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 flex flex-col h-auto hover:shadow-md transition-shadow transform-gpu min-w-70">
      {/* Top Banner Graphic & Gradients */}
      <div
        className={`h-32 sm:h-40 ${getBannerColor()} relative flex items-center justify-center shrink-0 overflow-hidden transform-gpu`}
      >
        <div
          className="absolute inset-0 bg-cover bg-center transform-gpu"
          style={{
            backgroundImage: `url('${getBannerImage()}')`,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        ></div>
        <div className="absolute inset-0 bg-black/15 pointer-events-none"></div>

        {/* Member Count & Protected Demo Badges */}
        <div className="absolute top-4 right-4 flex flex-col items-center gap-2 z-10">
          <div className="bg-white/30 backdrop-blur-md px-3.5 py-1 rounded-full text-white text-[11px] font-bold tracking-wider border border-white/40 shadow-xs flex items-center gap-1.5 select-none">
            <Users className="w-3.5 h-3.5 stroke-3" />
            <span>{memberCount} TAG</span>
          </div>

          {isLocked && (
            <div
              className="bg-amber-500/90 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-bold tracking-wider border border-amber-300/40 shadow-xs flex items-center gap-1 select-none"
              title="Védett bemutató szoba (nem törölhető, a tagok nem távolíthatók el)"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>VÉDETT</span>
            </div>
          )}
        </div>

        {/* Draw Status Indicator Pill */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-0 pointer-events-none">
          {isDrawn ? (
            <div className="bg-emerald-600/90 backdrop-blur-md px-3.5 pt-1.5 pb-2.5 rounded-t-xl text-white text-[10px] font-bold tracking-wider border-t border-x border-emerald-300/40 shadow-xs flex items-center gap-1.5 whitespace-nowrap">
              <CircleCheck className="w-3 h-3 text-emerald-300" />
              <span>Kisorsolva</span>
            </div>
          ) : (
            <div className="bg-slate-900/60 backdrop-blur-md px-3.5 pt-1.5 pb-2.5 rounded-t-xl text-white text-[10px] font-bold tracking-wider border-t border-x border-white/20 shadow-xs flex items-center gap-1.5 whitespace-nowrap">
              <Clock className="w-3 h-3 text-amber-300" />
              <span>Sorsolásra vár</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Body Content */}
      <div className="p-4 sm:p-8 flex-1 flex flex-col bg-white relative z-10">
        {/* Room Title, Location, and Budget Overview */}
        <div className="mb-4">
          <h3
            className={`text-xl font-bold text-slate-800 leading-tight wrap-break-words mb-4 flex items-center gap-2 ${simplified ? "line-clamp-1" : "line-clamp-2"}`}
          >
            <span className="truncate">{roomName || "Szoba neve..."}</span>
          </h3>

          <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-3 xs:gap-4 border-t border-slate-50 pt-4">
            {/* Left: Location & Date/Time */}
            <div className="flex flex-col gap-2 shrink min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Átadás helye / ideje
              </span>

              {/* Row 1: Location */}
              <span
                className={`flex items-center gap-1.5 text-xs ${!location ? "text-slate-400" : "text-slate-700 font-semibold"}`}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />{" "}
                <span className="truncate max-w-40 xs:max-w-45 sm:max-w-55">
                  {location || "-"}
                </span>
              </span>

              {/* Row 2: Date & Time */}
              <div className="flex items-center gap-3 text-xs">
                <span
                  className={`flex items-center gap-1.5 ${!eventDate ? "text-slate-400" : "text-slate-700 font-semibold"}`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  {eventDate ? eventDate.replace(/-/g, ".") : "-"}
                </span>
                <span
                  className={`flex items-center gap-1.5 ${!eventTime ? "text-slate-400" : "text-slate-700 font-semibold"}`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {formatTime(eventTime)}
                </span>
              </div>
            </div>

            {/* Right: Budget Badge */}
            <div
              className={`px-3.5 py-2 xs:px-3 xs:py-2.5 rounded-2xl flex flex-row items-center justify-between xs:flex-col xs:items-end xs:text-right w-full xs:w-auto min-w-fit border transition-colors shrink-0 ${hasBudget ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-200"}`}
            >
              <div
                className={`text-[10px] font-bold uppercase tracking-widest xs:mb-0.5 transition-colors ${hasBudget ? "text-emerald-600" : "text-slate-400"}`}
              >
                Költségkeret
              </div>
              <div
                className={`font-bold whitespace-nowrap truncate transition-colors ${hasBudget ? "text-slate-800" : "text-slate-400"}`}
              >
                {hasBudget
                  ? `${
                      budgetAmount
                        ? Number(budgetAmount)
                            .toString()
                            .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                        : "0"
                    } ${formatCurrency(currency)}`
                  : "Nincs"}
              </div>
            </div>
          </div>
        </div>

        {/* Compact Description Bar with Ellipsis or Empty State */}
        <div className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2 text-xs mb-4">
          {description && description.trim() ? (
            <p
              className="truncate text-slate-600 font-medium"
              title={description}
            >
              {description}
            </p>
          ) : (
            <div className="flex items-center justify-between w-full select-none">
              <span className="font-semibold text-slate-600">Leírás</span>
              <span className="font-medium text-slate-400">nincs</span>
            </div>
          )}
        </div>

        {/* Draw Parameters Information Box */}
        <div
          className={`py-3.5 px-4 rounded-2xl border border-emerald-100/60 flex flex-col gap-3 bg-emerald-50/40 ${
            actionButton ? "mb-8" : "mb-0"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100/80 p-2.5 rounded-xl shrink-0">
              <Shuffle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600/80 mb-0.5">
                Sorsolás
              </span>
              <span className="text-[12px] font-bold text-slate-700 leading-none">
                {drawType === "manual" ? "Manuális" : "Automatikus"}
              </span>
            </div>
          </div>

          {/* Automatic Draw Schedule */}
          {drawType === "auto" && (drawDate || drawTime) && (
            <div className="flex items-center justify-end gap-3 border-t border-emerald-200/50 pt-3 shrink min-w-0 w-full text-right">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600/80 mb-0.5">
                  Időpontja
                </span>
                <div className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-0.5 text-[12px] font-bold text-slate-700 mt-0.5 w-full">
                  {drawDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 opacity-60 shrink-0" />
                      {drawDate.replace(/-/g, ".")}
                    </span>
                  )}
                  {drawTime && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                      {formatTime(drawTime)}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-emerald-100/80 p-2.5 rounded-xl shrink-0">
                <CalendarClock className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          )}

          {/* Manual Draw Indicator */}
          {drawType === "manual" && (
            <div className="flex items-center justify-end gap-3 border-t border-emerald-200/50 pt-3 shrink min-w-0 w-full text-right">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600/80 mb-0.5">
                  Időpontja
                </span>
                <div className="mt-0.5 w-full text-[12px] font-bold text-slate-700 leading-snug">
                  <UserRoundKey className="inline-block w-3.5 h-3.5 opacity-60 mr-1.5 relative -top-px" />
                  <span>Szervező határozza meg</span>
                </div>
              </div>
              <div className="bg-emerald-100/80 p-2.5 rounded-xl shrink-0">
                <CalendarClock className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        {actionButton && (
          <button
            onClick={actionButton.onClick}
            disabled={actionButton.disabled}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide border flex items-center justify-center gap-2 ${
              actionButton.variant === "disabled"
                ? "bg-slate-100/80 text-slate-400 border-slate-200/50 cursor-not-allowed"
                : "bg-white hover:bg-emerald-50 border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 shadow-sm"
            }`}
          >
            {actionButton.text}
          </button>
        )}
      </div>
    </div>
  );
}
