import { useState } from "react";
import {
  Gift,
  Shuffle,
  RefreshCw,
  Trash2,
  Timer,
  AlertCircle,
  Clock,
  Globe,
  Calendar,
  LoaderCircle,
  UserRoundMinus,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import giftAnimation from "../assets/animations/gift.lottie";
import confettiAnimation from "../assets/animations/confetti.lottie";

interface RoomDrawResultProps {
  room: any;
  myDrawnUser: any;
  isRevealed: boolean;
  isOwner: boolean;
  membersCount: number;
  isDrawing: boolean;
  isDeleting: boolean;
  timeLeft: string;
  onReveal: () => void;
  onManualDraw: () => void;
  onRedraw: () => void;
  onDeleteDraw: () => void;
}

/**
 * RoomDrawResult Component
 *
 * Handles the centerpiece draw status, countdown, and reveal experience:
 * - Pre-draw manual mode: Participant readiness check and owner draw trigger.
 * - Pre-draw automated mode: Timezone-accurate countdown, processing grace period, and error banners.
 * - Post-draw unrevealed state: 4-stage choreographed animation with DotLottie gift box and confetti explosion.
 * - Post-draw revealed state: Drawn partner presentation, budget reminders, and owner management controls.
 */
export default function RoomDrawResult({
  room,
  myDrawnUser,
  isRevealed,
  isOwner,
  membersCount,
  isDrawing,
  isDeleting,
  timeLeft,
  onReveal,
  onManualDraw,
  onRedraw,
  onDeleteDraw,
}: RoomDrawResultProps) {
  // Choreographed reveal animation stages: 'idle' | 'focusing' | 'confetti' | 'fading'
  const [revealPhase, setRevealPhase] = useState<
    "idle" | "focusing" | "confetti" | "fading"
  >("idle");

  // Avatar image load fallback state
  const [avatarError, setAvatarError] = useState(false);

  /**
   * Executes the multi-stage reveal sequence before persisting reveal status:
   * 1. Focus (0 - 500ms): Fades helper labels and scales up gift box.
   * 2. Confetti (500 - 2300ms): Triggers fullscreen confetti particle explosion.
   * 3. Fade (2300 - 2700ms): Smoothly fades out unrevealed card container.
   * 4. Reveal (2700ms): Dispatches onReveal callback and transitions to partner view.
   */
  const handleRevealClick = () => {
    // Step 1: Fade text, enlarge gift box (0 - 500ms)
    setRevealPhase("focusing");

    // Step 2: Trigger confetti particle animation (500ms - 2300ms)
    setTimeout(() => {
      setRevealPhase("confetti");
    }, 500);

    // Step 3: Fade out confetti and temporary container (2300ms - 2700ms)
    setTimeout(() => {
      setRevealPhase("fading");
    }, 2300);

    // Step 4: Dispatch reveal callback and return to idle phase (2700ms)
    setTimeout(() => {
      onReveal();
      setRevealPhase("idle");
    }, 2700);
  };

  const formatTime = (timeStr?: string) =>
    timeStr ? timeStr.slice(0, 5) : "-";

  return (
    <div className="relative overflow-hidden bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-8 flex flex-col gap-6">
      {/* Flush Corner Badge in top right corner */}
      <div className="absolute top-0 right-0">
        {myDrawnUser ? (
          <span className="px-3.5 py-1.5 bg-emerald-100/90 text-emerald-800 text-xs font-bold rounded-bl-2xl border-l border-b border-emerald-200/80 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Kisorsolva</span>
          </span>
        ) : timeLeft === "folyamatban" ? (
          <span className="px-3.5 py-1.5 bg-emerald-100/90 text-emerald-800 text-xs font-bold rounded-bl-2xl border-l border-b border-emerald-200/80 flex items-center gap-1.5 shadow-2xs">
            <LoaderCircle className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            <span>Sorsolás alatt...</span>
          </span>
        ) : (
          <span className="px-3.5 py-1.5 bg-amber-100/90 text-amber-800 text-xs font-bold rounded-bl-2xl border-l border-b border-amber-200/80 flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Sorsolásra vár</span>
          </span>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-1 pt-4 xs:pt-0 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">
              Sorsolás állapota
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Titkos ajándékozás és eredmények
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {myDrawnUser ? (
        <div className="flex flex-col gap-6">
          {!isRevealed ? (
            /* Unrevealed / Animating State */
            <div
              className={`relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/15 border-2 border-dashed border-emerald-300/80 p-6 sm:p-8 text-center flex flex-col items-center justify-center min-h-75 sm:min-h-82.5 transition-all duration-400 ease-out ${
                revealPhase === "fading"
                  ? "opacity-0 scale-95"
                  : "opacity-100 scale-100"
              }`}
            >
              {/* Confetti Explosion (Rendered as fullscreen overlay layer without disrupting layout) */}
              {(revealPhase === "confetti" || revealPhase === "fading") && (
                <div
                  className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
                    revealPhase === "fading"
                      ? "opacity-0"
                      : "opacity-100 animate-in zoom-in-90 fade-in duration-300"
                  }`}
                >
                  <div className="w-90 h-90 sm:w-120 sm:h-120 flex items-center justify-center shrink-0">
                    <DotLottieReact
                      src={confettiAnimation}
                      autoplay
                      loop={false}
                      renderConfig={{
                        devicePixelRatio:
                          typeof window !== "undefined"
                            ? Math.max(window.devicePixelRatio || 1, 2)
                            : 2,
                        autoResize: true,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Gift Animation */}
              {revealPhase !== "confetti" && revealPhase !== "fading" && (
                <div
                  className={`flex items-center justify-center transition-all duration-500 ease-out origin-center ${
                    revealPhase === "focusing"
                      ? "w-44 h-44 sm:w-56 sm:h-56 scale-120"
                      : "w-28 h-28 sm:w-36 sm:h-36 scale-100"
                  }`}
                >
                  <DotLottieReact
                    src={giftAnimation}
                    loop
                    autoplay
                    renderConfig={{
                      devicePixelRatio:
                        typeof window !== "undefined"
                          ? Math.max(window.devicePixelRatio || 1, 3)
                          : 3,
                      autoResize: true,
                    }}
                    className="w-full h-full"
                  />
                </div>
              )}

              {/* Fading bottom container (Text description + reveal action button) */}
              <div
                className={`flex flex-col items-center gap-4 transition-all duration-500 ${
                  revealPhase !== "idle"
                    ? "opacity-0 translate-y-4 max-h-0 pointer-events-none overflow-hidden m-0"
                    : "opacity-100 translate-y-0 max-h-40 mt-3"
                }`}
              >
                <div className="max-w-md">
                  <h3 className="text-xl font-bold text-slate-800 mb-1">
                    A sorsolás megtörtént!
                  </h3>
                  <p className="text-sm text-slate-500">
                    Kattints az alábbi gombra a név felfedéséhez!
                  </p>
                </div>

                <button
                  onClick={handleRevealClick}
                  disabled={revealPhase !== "idle"}
                  className="py-3.5 px-8 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base rounded-2xl shadow-lg hover:shadow-emerald-200 flex items-center gap-2.5 transform"
                >
                  <span>Ajándékozott felfedése</span>
                </button>
              </div>
            </div>
          ) : (
            /* Revealed State */
            <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-50 via-teal-50/50 to-white border-2 border-emerald-300 p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-5 shadow-xs animate-in fade-in zoom-in-95 duration-700 ease-out">
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold tracking-wide shadow-sm animate-in fade-in slide-in-from-top-2 duration-500 delay-100 fill-mode-both">
                Neki kell ajándékot venned
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="relative animate-in zoom-in-75 fade-in duration-700 delay-150 fill-mode-both">
                  {myDrawnUser.is_deleted ? (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-200 border-4 border-white shadow-xl ring-4 ring-slate-400 flex items-center justify-center text-slate-500">
                      <UserRoundMinus className="w-12 h-12 sm:w-14 sm:h-14 text-slate-500" />
                    </div>
                  ) : myDrawnUser.avatar_url && !avatarError ? (
                    <img
                      src={myDrawnUser.avatar_url}
                      alt={myDrawnUser.username}
                      onError={() => setAvatarError(true)}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-xl ring-4 ring-emerald-400"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-200 border-4 border-white shadow-xl ring-4 ring-emerald-400 flex items-center justify-center text-emerald-800 font-bold text-3xl">
                      {myDrawnUser.username
                        ? myDrawnUser.username.charAt(0).toUpperCase()
                        : "?"}
                    </div>
                  )}
                </div>

                <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200 fill-mode-both">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
                      {myDrawnUser.username || "Ismeretlen"}
                    </h3>

                    {myDrawnUser.is_deleted && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                        Törölt fiók
                      </span>
                    )}
                  </div>

                  {room.has_budget && (
                    <p className="text-xs font-semibold text-emerald-700 mt-2 bg-emerald-100/70 px-3 py-1 rounded-full inline-block">
                      Költségkeret:{" "}
                      {room.budget_amount
                        ? Number(room.budget_amount)
                            .toString()
                            .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                        : "0"}{" "}
                      {room.currency === "EUR" || room.currency === "€"
                        ? "€"
                        : room.currency === "USD" || room.currency === "$"
                          ? "$"
                          : "Ft"}
                    </p>
                  )}
                </div>
              </div>

              <div className="w-full max-w-fit bg-white/80 backdrop-blur-xs rounded-xl p-3 border border-emerald-100 text-xs text-slate-500 text-center animate-in fade-in duration-700 delay-300 fill-mode-both">
                <strong>Titoktartás:</strong> Tartsd titokban a húzásodat az
                ajándékátadásig a meglepetés kedvéért!
              </div>
            </div>
          )}

          {/* Owner Draw Controls */}
          {isOwner && (
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60 p-4 rounded-2xl">
              <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
                <strong className="text-slate-700">
                  Szervezői beállítások:
                </strong>{" "}
                Újrasorsolhatod vagy törölheted a húzásokat.
              </div>
              <div className="flex flex-col xs:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={onRedraw}
                  disabled={isDrawing || isDeleting}
                  className="w-full xs:flex-1 sm:flex-initial py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {isDrawing ? (
                    <>
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      <span>Újrasorsolás...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Újrasorsolás</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onDeleteDraw}
                  disabled={isDrawing || isDeleting}
                  className="w-full xs:flex-1 sm:flex-initial py-2 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      <span>Törlés...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Törlés</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Not Drawn Yet */
        <div className="flex flex-col gap-6">
          {room.draw_type === "manual" ? (
            <div className="flex flex-col gap-4">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Shuffle className="w-6 h-6" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    Manuális sorsolás
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {isOwner
                      ? "Amint mindenki csatlakozott a szobához, indítsd el a sorsolást az alábbi gombbal. A rendszer minden tagnak véletlenszerű párt sorsol."
                      : "A szoba tulajdonosa fogja elindítani a sorsolást, amint az összes meghívott játékos csatlakozott."}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700">
                      Jelenlegi létszám: <strong>{membersCount} fő</strong>
                    </span>
                    {membersCount < 2 && (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Minimum 2
                        résztvevő kell
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isOwner && (
                <button
                  onClick={onManualDraw}
                  disabled={isDrawing || membersCount < 2}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                >
                  {isDrawing ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      <span>Sorsolás folyamatban...</span>
                    </>
                  ) : (
                    <>
                      <Shuffle className="w-4 h-4" />
                      <span>Sorsolás indítása most</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            /* Auto Draw Countdown */
            (() => {
              const isAutoDateMissing = !room.draw_date || !room.draw_time;
              const isTimeInvalid =
                isAutoDateMissing ||
                (timeLeft && timeLeft.includes("érvénytelen"));
              const isProcessing = timeLeft === "folyamatban";
              const isTimeExpired =
                timeLeft &&
                (timeLeft.includes("lejárt") ||
                  timeLeft.includes("folyamatban van vagy lejárt"));
              const isNotEnoughMembers =
                (isProcessing || isTimeExpired) && membersCount < 2;
              const hasTimeError =
                isTimeInvalid ||
                isNotEnoughMembers ||
                (isTimeExpired && !isProcessing);

              const cardBgStyle = hasTimeError
                ? "bg-linear-to-br from-rose-50/80 to-amber-50/40 border-rose-200/80"
                : isProcessing
                  ? "bg-linear-to-br from-emerald-50/80 to-teal-50/50 border-emerald-200/80"
                  : "bg-linear-to-br from-blue-50 to-indigo-50/50 border-blue-100";

              const iconBgStyle = hasTimeError
                ? "bg-rose-100 text-rose-600"
                : isProcessing
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-blue-100 text-blue-600";

              return (
                <div className="flex flex-col gap-4">
                  <div
                    className={`rounded-2xl p-6 border flex flex-col items-center text-center gap-4 transition-colors ${cardBgStyle}`}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs ${iconBgStyle}`}
                    >
                      {hasTimeError ? (
                        <AlertCircle className="w-7 h-7" />
                      ) : isProcessing ? (
                        <LoaderCircle className="w-7 h-7 animate-spin" />
                      ) : (
                        <Timer className="w-7 h-7" />
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">
                        {isProcessing
                          ? "Sorsolás folyamatban..."
                          : "Automatikus sorsolás beállítva"}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 max-w-md">
                        {isProcessing
                          ? "Elérkezett a megadott időpont! A rendszer éppen sorsolja a párokat, kérlek várj néhány pillanatot..."
                          : "A sorsolás automatikusan lefut a megadott időpontban."}
                      </p>
                    </div>

                    {/* Red Error / Warning Banner */}
                    {hasTimeError && (
                      <div className="w-full max-w-md p-3.5 bg-rose-100/80 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-start gap-2.5 text-left shadow-2xs animate-in fade-in duration-200">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold">
                            {isNotEnoughMembers
                              ? "Nem volt elegendő résztvevő a sorsoláshoz!"
                              : isTimeExpired
                                ? "A sorsolási időpont lejárt!"
                                : "Érvénytelen sorsolási időpont!"}
                          </span>
                          <span className="text-[11px] text-rose-700 font-normal">
                            {isNotEnoughMembers
                              ? "A sorsolási időpont elérkezett, de a szobában jelenleg csak 1 résztvevő van (a sorsoláshoz legalább 2 fő szükséges). Hívj meg további tagokat a szobába, majd a szervező állítson be új sorsolási időpontot a szoba adatainál!"
                              : isTimeExpired
                                ? "A beállított időpont már elmúlt. A sorsoláshoz a szervezőnek új időpontot kell megadnia a szoba adatainál."
                                : isAutoDateMissing
                                  ? "A sorsolás dátuma vagy ideje még hiányzik. Kérlek, add meg a szoba adatainál!"
                                  : "A kiválasztott sorsolási időpont a múltban van! Kérlek, válassz egy jövőbeli időpontot a szoba adatainál."}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Countdown display */}
                    {!hasTimeError && !isProcessing && (
                      <div className="w-full max-w-md rounded-2xl p-4 shadow-xs border transition-colors bg-white border-blue-200/60">
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">
                          Hátralévő idő a sorsolásig
                        </div>
                        <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-blue-600">
                          {timeLeft || "Számítás..."}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
                      {room.draw_date && (
                        <span className="flex gap-1.5 justify-center items-center font-medium bg-white/80 px-3 py-1 rounded-lg border border-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          Dátum:{" "}
                          <strong>{room.draw_date.replace(/-/g, ".")}</strong>
                        </span>
                      )}
                      {room.draw_time && (
                        <span className="flex gap-1.5 justify-center items-center font-medium bg-white/80 px-3 py-1 rounded-lg border border-slate-200">
                          <Clock className="w-3.5 h-3.5 text-slate-500" /> Idő:{" "}
                          <strong>{formatTime(room.draw_time)}</strong>
                        </span>
                      )}
                      {room.timezone && (
                        <span className="flex gap-1.5 justify-center items-center font-medium bg-white/80 px-3 py-1 rounded-lg border border-slate-200">
                          <Globe className="w-3.5 h-3.5 text-slate-500" />
                          Időzóna: <strong>{room.timezone}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
