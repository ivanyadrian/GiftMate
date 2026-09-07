import { useState, useEffect, useRef } from "react";
import {
  Users,
  Calendar,
  CheckCircle2,
  EyeOff,
  Check,
  UserRoundCog,
  Trash,
  ChevronUp,
  ChevronDown,
  UserX,
  UserRoundMinus,
} from "lucide-react";


interface RoomMembersProps {
  members: any[];
  roomCode?: string;
  isOwner?: boolean;
  hasDrawn?: boolean;
  onKickMember?: (userId: string, username: string) => Promise<void>;
}

/**
 * RoomMembers Component
 *
 * Renders the interactive participants list for a room with:
 * - Dynamic scroll indicators (smooth gradient fade & quick scroll buttons).
 * - Member management mode (kick participants before draw occurs).
 * - Status tags for organizer, current user ("Te"), and deleted user accounts.
 * - Real-time draw reveal indicators (viewed vs not yet viewed).
 * - Fallback avatar handling for network/broken image resilience.
 */
export default function RoomMembers({
  members,
  isOwner = false,
  hasDrawn = false,
  onKickMember,
}: RoomMembersProps) {
  // Toggle state for participant management mode (kicking participants)
  const [isManaging, setIsManaging] = useState(false);
  // Tracks image load failures to gracefully render initials fallback
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>(
    {},
  );
  const listRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  /**
   * Evaluates scroll height vs viewport height to toggle top/bottom gradient hints.
   */
  const checkScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight + 2;
    setCanScrollUp(hasOverflow && el.scrollTop > 8);
    setCanScrollDown(
      hasOverflow && el.scrollTop + el.clientHeight < el.scrollHeight - 8,
    );
  };

  // Re-check scroll overflow when member count changes or management mode toggles
  useEffect(() => {
    checkScroll();
    const timeout = setTimeout(checkScroll, 100);
    window.addEventListener("resize", checkScroll);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", checkScroll);
    };
  }, [members.length, isManaging]);

  // Automatically exit management mode once the draw has been conducted
  useEffect(() => {
    if (hasDrawn) {
      setIsManaging(false);
    }
  }, [hasDrawn]);

  // Management mode is only permissible for the room owner prior to draw execution,
  // and only if at least one eligible kickable member exists.
  const canManage =
    isOwner &&
    !hasDrawn &&
    members.some((m) => !m.is_owner && !m.is_me && !m.is_deleted);

  return (
    <div className="relative overflow-hidden bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-8 flex flex-col gap-6 h-full">
      {/* Flush Corner Badge in top right corner showing total member count */}
      <div className="absolute top-0 right-0">
        <span className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-bl-2xl border-l border-b border-slate-200 flex items-center shadow-2xs">
          {members.length} fő
        </span>
      </div>

      {/* Header Section */}
      <div className="flex items-center gap-3 pt-4 xs:pt-0 pb-4 border-b border-slate-100 min-w-0 shrink-0">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">
            Résztvevők
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {isManaging
              ? "Kattints a piros ikonra a személy eltávolításához"
              : "A szobához csatlakozott játékosok"}
          </p>
        </div>
      </div>

      {/* Member Management Action Button (Full width at top of list) */}
      {canManage && (
        <button
          type="button"
          onClick={() => setIsManaging(!isManaging)}
          className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 border ${
            isManaging
              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs"
              : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 shadow-2xs"
          }`}
        >
          {isManaging ? (
            <>
              <Check className="w-4 h-4 stroke-3" />
              <span>Kész a kezeléssel</span>
            </>
          ) : (
            <>
              <UserRoundCog className="w-4 h-4" />
              <span>Tagok kezelése</span>
            </>
          )}
        </button>
      )}

      {/* Members List */}
      {members.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm flex-1 flex items-center justify-center">
          Még nincsenek játékosok a szobában.
        </div>
      ) : (
        <div className="relative flex-1 min-h-0">
          {/* Top Gradient Fade + Arrow Indicator */}
          {canScrollUp && (
            <div className="absolute top-0 left-0 right-0 h-12 pointer-events-none bg-linear-to-b from-white via-white/85 to-transparent flex items-start justify-center pt-0.5 z-10 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() =>
                  listRef.current?.scrollBy({ top: -140, behavior: "smooth" })
                }
                className="group pointer-events-auto py-0.5 px-3 bg-white/95 hover:bg-emerald-50 text-emerald-700 rounded-full shadow-xs border border-emerald-200/80 flex items-center gap-1.5"
                title="Görgetés feljebb"
              >
                <ChevronUp className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-y-0.5" />
                <span className="text-[11px] font-semibold tracking-tight">
                  További tagok
                </span>
              </button>
            </div>
          )}

          {/* Scrollable List */}
          <div
            ref={listRef}
            onScroll={checkScroll}
            className="h-full max-h-80 lg:max-h-none overflow-y-auto flex flex-col gap-3 -mr-3 sm:-mr-5 pr-2.5 sm:pr-4 scrollbar-thin"
          >
            {members.map((m, index) => {
              const username = m.profiles?.username || "Névtelen játékos";
              const isDeleted = !!m.is_deleted;
              const avatarUrl = isDeleted
                ? "/deleted_user.webp"
                : m.profiles?.avatar_url;
              const isOwnerMember = m.is_owner;
              const isMe = m.is_me;
              const drawExists = m.draw_exists;
              const hasViewedDraw = m.has_viewed_draw;
              const isKickable =
                isOwner && !hasDrawn && !isOwnerMember && !isMe && !isDeleted;
              const joinedDate = m.joined_at
                ? new Date(m.joined_at).toLocaleDateString("hu-HU", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <div
                  key={index}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col xs:flex-row xs:items-center justify-between gap-2 xs:gap-3 shrink-0 ${
                    isDeleted
                      ? "bg-slate-50/70 border-slate-200 opacity-85"
                      : isMe
                        ? "bg-emerald-50/40 border-emerald-200/80 shadow-2xs"
                        : "bg-white hover:bg-slate-50/80 border-slate-100"
                  }`}
                >
                  {/* Top Row on mobile (< xs), or Left container on desktop (>= xs) */}
                  <div className="flex items-center justify-between xs:justify-start gap-2.5 xs:gap-3.5 min-w-0 flex-1">
                    {/* Avatar + Member Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="relative shrink-0 w-10 h-10 sm:w-11 sm:h-11">
                        {isDeleted ? (
                          <div
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-200 border-2 border-white shadow-xs flex items-center justify-center text-slate-500"
                            title="Törölt felhasználó"
                          >
                            <UserRoundMinus className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
                          </div>
                        ) : avatarUrl && !failedAvatars[avatarUrl] ? (
                          <img
                            key={avatarUrl}
                            src={avatarUrl}
                            alt={username}
                            onError={() =>
                              setFailedAvatars((prev) => ({
                                ...prev,
                                [avatarUrl]: true,
                              }))
                            }
                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-white shadow-xs transition-opacity ${
                              isManaging && isKickable ? "opacity-20" : ""
                            }`}
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-200 border-2 border-white shadow-xs flex items-center justify-center text-slate-600 font-bold text-sm transition-opacity ${
                              isManaging && isKickable ? "opacity-20" : ""
                            }`}
                          >
                            {username.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* Kick Member Button overlaying the avatar during management mode */}
                        {isManaging && isKickable && onKickMember && (
                          <button
                            type="button"
                            onClick={() => onKickMember(m.user_id, username)}
                            title={`${username} eltávolítása a szobából`}
                            aria-label={`${username} eltávolítása`}
                            className="absolute group inset-0 m-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center text-center"
                          >
                            <Trash className="w-4 h-4 ml-px group-hover:scale-120 group-hover:stroke-3 transition-all" />
                          </button>
                        )}
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-slate-800 truncate max-w-28 xs:max-w-32 sm:max-w-40">
                            {username}
                          </span>

                          {isOwnerMember && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                              Szervező
                            </span>
                          )}

                          {isMe && !isDeleted && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                              Te
                            </span>
                          )}
                        </div>

                        {/* Joined Date / Deleted User indicator on >= xs screens */}
                        {isDeleted ? (
                          <div className="hidden xs:flex items-center gap-1 text-[11px] text-rose-500 font-semibold mt-0.5">
                            <UserX className="w-3 h-3 shrink-0" />
                            <span>Törölt felhasználó</span>
                          </div>
                        ) : joinedDate ? (
                          <div className="hidden xs:flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>Csatlakozott: {joinedDate}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Draw status badge on mobile (< xs) on the same top row */}
                    {drawExists && (
                      <div className="shrink-0 flex items-center xs:hidden">
                        {hasViewedDraw ? (
                          <span
                            title="Megnézte a húzott ajándékozottját"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          </span>
                        ) : (
                          <span
                            title="Még nem nézte meg a húzott ajándékozottját"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200"
                          >
                            <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Joined Date / Deleted User on mobile (< xs) in a new row below */}
                  {isDeleted ? (
                    <div className="flex xs:hidden items-center justify-start w-full gap-1.5 text-[10px] text-rose-500 font-semibold pt-1.5 border-t border-slate-100/80">
                      <UserX className="w-3 h-3 shrink-0" />
                      <span>Törölt felhasználó</span>
                    </div>
                  ) : joinedDate ? (
                    <div className="flex xs:hidden items-center justify-start w-full gap-1.5 text-[10px] text-slate-400 pt-1.5 border-t border-slate-100/80">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>Csatlakozott: {joinedDate}</span>
                    </div>
                  ) : null}

                  {/* Draw status badge on desktop (>= xs) */}
                  {drawExists && (
                    <div className="shrink-0 hidden xs:flex items-center">
                      {hasViewedDraw ? (
                        <span
                          title="Megnézte a húzott ajándékozottját"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="hidden sm:inline">Megnézte</span>
                        </span>
                      ) : (
                        <span
                          title="Még nem nézte meg a húzott ajándékozottját"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200"
                        >
                          <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="hidden sm:inline">
                            Nem látta még
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Gradient Fade + Arrow Indicator */}
          {canScrollDown && (
            <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none bg-linear-to-t from-white via-white/85 to-transparent flex items-end justify-center pb-0.5 z-10 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() =>
                  listRef.current?.scrollBy({ top: 140, behavior: "smooth" })
                }
                className="group pointer-events-auto py-0.5 px-3 bg-white/95 hover:bg-emerald-50 text-emerald-700 rounded-full shadow-xs border border-emerald-200/80 flex items-center gap-1.5"
                title="Görgetés lejjebb"
              >
                <span className="text-[11px] font-semibold tracking-tight">
                  További tagok
                </span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-y-0.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
