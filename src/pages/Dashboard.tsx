import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import type { User } from "@supabase/supabase-js";
import ProfileSetupModal from "../components/ui/ProfileSetupModal";
import { getGoogleAvatarUrl } from "../utils/avatar";
import LottieLoader from "../components/LottieLoader";
import ErrorToast from "../components/ui/ErrorToast";
import {
  FolderOpen,
  HousePlus,
  KeyRound,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import RoomCard from "../components/ui/RoomCard";
import { useClipboard } from "../hooks/useClipboard";

/**
 * Dashboard Component
 *
 * Serves as the primary application hub for authenticated users.
 * Key responsibilities:
 * - Displays active rooms in a responsive, scrollable horizontal carousel with navigation arrows.
 * - Provides quick-access room code copying with visual feedback.
 * - Features an OTP-style 6-character room joining input with auto-advance, backspace handling,
 *   arrow-key navigation, and paste support via `join_room_by_code` RPC.
 * - Directs users to the room creation wizard (`/create-room`).
 * - Displays the `ProfileSetupModal` automatically if the user has not completed their initial profile setup.
 * - Subscribes to Supabase Realtime changes on `rooms`, `room_members`, and `draws` tables to keep lists synchronized.
 */
interface MyRoom {
  room_id: string;
  room_name: string;
  room_code: string;
  event_type?: string | null;
  location?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  description?: string | null;
  has_budget?: boolean | null;
  budget_amount?: number | null;
  currency?: string | null;
  draw_type?: string | null;
  draw_date?: string | null;
  draw_time?: string | null;
  member_count: number;
  is_drawn: boolean;
  is_owner: boolean;
}

export default function Dashboard() {
  // --- User & Profile States ---
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- Profile Setup Modal Toggle ---
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // --- Room Joining States ---
  const [roomCode, setRoomCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // --- User Rooms & UI Feedback States ---
  const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Router & Clipboard Utilities ---
  const { isCopied, copy: copyCode } = useClipboard();
  const navigate = useNavigate();

  // --- Element References ---
  // Input element refs for 6-character room code boxes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Carousel scroll container ref and pagination states
  const roomsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  /**
   * Checks whether carousel horizontal scroll arrows should be enabled or disabled
   * based on current scroll position and container dimensions.
   */
  const checkScroll = () => {
    const el = roomsScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const newCanLeft = scrollLeft > 15;
    const newCanRight = scrollLeft + clientWidth < scrollWidth - 15;
    setCanScrollLeft((prev) => (prev !== newCanLeft ? newCanLeft : prev));
    setCanScrollRight((prev) => (prev !== newCanRight ? newCanRight : prev));
  };

  /**
   * Monitors carousel scroll position and window resize events to update arrow visibility.
   */
  useEffect(() => {
    const timer = setTimeout(checkScroll, 100);
    const el = roomsScrollRef.current;
    if (!el) return () => clearTimeout(timer);

    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [myRooms]);

  /**
   * Smoothly scrolls the room carousel container by a fixed offset in the given direction.
   */
  const handleScroll = (direction: "left" | "right") => {
    const el = roomsScrollRef.current;
    if (!el) return;
    const scrollAmount = 380;
    el.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  /**
   * Fetches all rooms where the current user is registered using the secure get_my_rooms RPC.
   * Includes room metadata, member counts (including ghost members), and draw status.
   */
  const fetchMyRooms = async (_userId?: string) => {
    const { data, error } = await supabase.rpc("get_my_rooms");

    if (!error && data) {
      setMyRooms(data);
    }
  };

  /**
   * Navigates user to the room creation wizard page.
   */
  const handleCreateRoom = () => {
    navigate("/create-room");
  };

  /**
   * Handles character entry for the 6-digit room code input boxes.
   * Normalizes input to uppercase alphanumeric, advances focus automatically,
   * and handles multi-character input fallbacks.
   */
  const handleCodeChange = (index: number, value: string) => {
    if (errorMsg) setErrorMsg(null);
    const char = value
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(-1);

    // Fallback if multiple characters were entered at once (e.g. paste without onPaste trigger)
    if (value.length > 1) {
      const pasted = value
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, 6);
      setRoomCode(pasted);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
      return;
    }

    let codeArr = roomCode.padEnd(6, " ").split("");
    codeArr[index] = char || " ";
    const newCode = codeArr.join("").trimEnd();
    setRoomCode(newCode);

    // Automatically advance focus to the next input box
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * Handles keyboard navigation within the room code boxes:
   * - Backspace: Clears character or deletes previous character and moves focus backwards.
   * - ArrowLeft / ArrowRight: Moves focus between adjacent input boxes.
   * - Enter: Submits the room code if 6 characters are entered.
   */
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (errorMsg) setErrorMsg(null);
    if (e.key === "Backspace") {
      let codeArr = roomCode.padEnd(6, " ").split("");

      if (codeArr[index] !== " ") {
        // Clear current slot if occupied
        codeArr[index] = " ";
        setRoomCode(codeArr.join("").trimEnd());
      } else if (index > 0) {
        // Move to and clear previous slot if current is empty
        codeArr[index - 1] = " ";
        setRoomCode(codeArr.join("").trimEnd());
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter") {
      if (roomCode.length === 6 && !joinLoading) {
        handleJoinRoom();
      }
    }
  };

  /**
   * Submits the 6-character room code to join an existing room via RPC.
   * Validates code length, guards against duplicate membership, and handles RPC error responses.
   */
  const handleJoinRoom = async () => {
    setErrorMsg(null);

    if (roomCode.length !== 6) {
      setErrorMsg(
        "A szoba kódjának pontosan 6 karakter hosszúnak kell lennie!",
      );
      return;
    }

    if (!user) return;

    // Client-side guard: check if user is already a member of this room
    const isAlreadyMember = myRooms.some((r) => r.room_code === roomCode);
    if (isAlreadyMember) {
      setErrorMsg("Már csatlakoztál ehhez a szobához!");
      return;
    }

    setJoinLoading(true);
    try {
      const { data: roomId, error: joinError } = await supabase.rpc(
        "join_room_by_code",
        { p_room_code: roomCode },
      );

      if (joinError) {
        console.error("Error joining room:", joinError);
        if (
          joinError.message.includes("sorsolás") ||
          joinError.message.includes("draw")
        ) {
          setErrorMsg(
            "A sorsolás már megtörtént ebben a szobában, ezért nem csatlakozhatsz!",
          );
        } else if (
          joinError.message.includes("not found") ||
          joinError.message.includes("No room") ||
          joinError.message.includes("Nem található")
        ) {
          setErrorMsg("A megadott kódhoz nem tartozik szoba!");
        } else if (joinError.message.includes("already")) {
          setErrorMsg("Már csatlakoztál ehhez a szobához!");
        } else {
          setErrorMsg(joinError.message || "Nem létezik szoba ezzel a kóddal!");
        }
        setJoinLoading(false);
        return;
      }

      navigate(`/room/${roomId}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Váratlan hiba történt a csatlakozás során.");
    } finally {
      setJoinLoading(false);
    }
  };

  /**
   * Fetches user profile record from `profiles` table.
   * Prompts avatar/name setup modal if profile is incomplete.
   */
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .limit(1);
    if (!error && data && data.length > 0) {
      setProfile(data[0]);
      setShowAvatarModal(!data[0].is_profile_complete);
    }
  };

  /**
   * Refreshes user auth and profile data following modal updates.
   * Dispatches `profileUpdated` event across the window for cross-component sync.
   */
  const refreshUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      await fetchProfile(user.id);
    }
    window.dispatchEvent(new CustomEvent("profileUpdated"));
  };

  /**
   * Session Guard & Lifecycle Hook:
   * Verifies authenticated session on mount and listens for auth state changes.
   */
  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
        await fetchMyRooms(session.user.id);
      } else {
        navigate("/login");
      }
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
        fetchMyRooms(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setMyRooms([]);
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  /**
   * Realtime Subscription Hook:
   * Subscribes to PostgreSQL changes on `rooms`, `room_members`, and `draws` tables
   * to automatically re-fetch rooms whenever changes occur.
   */
  useEffect(() => {
    let dashboardChannel: any = null;

    if (user?.id) {
      const uniqueId = Math.random().toString(36).substring(7);
      dashboardChannel = supabase
        .channel(`dashboard_realtime_${user.id}_${uniqueId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rooms" },
          () => {
            fetchMyRooms(user.id);
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "room_members" },
          () => {
            fetchMyRooms(user.id);
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "draws" },
          () => {
            fetchMyRooms(user.id);
          },
        )
        .subscribe();
    }

    return () => {
      if (dashboardChannel) {
        supabase.removeChannel(dashboardChannel);
      }
    };
  }, [user?.id]);

  // Initial loading screen while verifying session and fetching data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] w-full">
        <LottieLoader className="w-24 h-24" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col p-4 sm:p-6 bg-slate-50 text-slate-900 font-sans items-center">
      {/* Floating Error Notification */}
      {errorMsg && (
        <ErrorToast message={errorMsg} onClose={() => setErrorMsg(null)} />
      )}

      {/* Mandatory Initial Profile Setup Modal */}
      {showAvatarModal && user && (
        <ProfileSetupModal
          userId={user.id}
          initialAvatarUrl={
            profile?.avatar_url || user.user_metadata?.avatar_url
          }
          initialDisplayName={
            profile?.username || user.user_metadata?.display_name
          }
          googleAvatarUrl={getGoogleAvatarUrl(user)}
          onComplete={refreshUser}
        />
      )}

      <div className="w-full max-w-5xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Top Section: My Rooms Carousel */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              Saját szobáim{" "}
              <span className="text-slate-400 font-medium text-xl ml-1">
                [{myRooms.length}]
              </span>
            </h2>
          </div>

          {/* Empty State: No Rooms Joined */}
          {myRooms.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
              <p className="text-slate-500 font-medium">
                Még nem vagy tagja egyetlen szobának sem.
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Hozz létre egyet, vagy csatlakozz egy már meglévőhöz!
              </p>
            </div>
          ) : (
            /* Carousel Container */
            <div className="relative group/carousel">
              {/* Left Navigation Arrow (desktop only, rendered when scrollable) */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => handleScroll("left")}
                  aria-label="Scroll left"
                  className="hidden md:flex absolute -left-7 top-1/2 -translate-y-1/2 z-30 w-6 h-20 rounded-full bg-emerald-400/60 hover:bg-slate-100 text-white hover:text-slate-900 border border-slate-200/80 items-center justify-center hover:scale-105 backdrop-blur-xs"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Right Navigation Arrow (desktop only, rendered when scrollable) */}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => handleScroll("right")}
                  aria-label="Scroll right"
                  className="hidden md:flex absolute -right-7 top-1/2 -translate-y-1/2 z-30 w-6 h-20 rounded-full bg-emerald-400/60 hover:bg-slate-100 text-white hover:text-slate-900 border border-slate-200/80 items-center justify-center hover:scale-105 backdrop-blur-xs"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Horizontally Scrollable Room List */}
              <div
                ref={roomsScrollRef}
                className="flex overflow-x-auto gap-6 py-4 scrollbar-thin"
              >
                {myRooms.map((room) => {
                  if (!room) return null;

                  return (
                    <div
                      key={room.room_id}
                      className={`flex flex-col h-full relative group shrink-0 min-w-70 ${
                        myRooms.length === 1
                          ? "w-full max-w-sm sm:max-w-md"
                          : "w-[calc(100vw-5rem)] max-w-xs sm:max-w-none sm:w-95 md:w-105"
                      }`}
                    >
                      {/* Room Code Quick Copy Badge */}
                      <div
                        onClick={(e) => copyCode(room.room_code, e)}
                        className="absolute -top-3 left-4 z-20 text-[10px] font-bold text-white bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-full shadow-sm border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-all select-none group/badge"
                        title="Kattints a kód másolásához"
                      >
                        {isCopied(room.room_code) ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-300">Másolva!</span>
                          </>
                        ) : (
                          <>
                            <span>Kód: {room.room_code}</span>
                            <Copy className="w-3 h-3 text-slate-400 group-hover/badge:text-slate-200 transition-colors" />
                          </>
                        )}
                      </div>

                      {/* Interactive Room Card */}
                      <RoomCard
                        roomName={room.room_name}
                        eventType={room.event_type || "general"}
                        hasBudget={!!room.has_budget}
                        budgetAmount={room.budget_amount ?? null}
                        currency={room.currency || "HUF"}
                        location={room.location || ""}
                        eventDate={room.event_date || ""}
                        eventTime={room.event_time || ""}
                        description={room.description || ""}
                        drawType={room.draw_type || "manual"}
                        drawDate={room.draw_date || ""}
                        drawTime={room.draw_time || ""}
                        memberCount={Number(room.member_count) || 0}
                        isDrawn={!!room.is_drawn}
                        isLocked={room.room_code === "U1J1TN"}
                        simplified={true}
                        actionButton={{
                          text: "Részletek",
                          onClick: () => navigate(`/room/${room.room_id}`),
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section: Action Cards (Create Room & Join Room) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Action Card 1: Create New Room */}
          <div
            onClick={handleCreateRoom}
            className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-4 hover:border-emerald-300 hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center transition-colors">
              <HousePlus className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">
                Új szoba létrehozása
              </h3>
              <p className="text-sm text-slate-500">
                Hozd össze a családot, barátokat vagy kollégákat egy új
                ajándékozáshoz!
              </p>
            </div>
            <button className="mt-2 py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-sm flex items-center gap-2">
              Létrehozás
            </button>
          </div>

          {/* Action Card 2: Join Room with 6-Character Code */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <KeyRound className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">
                Csatlakozás szobához
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Van egy 6 karakteres kódod? Írd be ide a belépéshez!
              </p>

              <div className="flex flex-col items-center gap-6 w-full">
                {/* 6-Character Split Input Boxes */}
                <div className="flex flex-col xs:flex-row gap-3 xs:gap-2 justify-center items-center">
                  {/* First 3 Character Boxes */}
                  <div className="flex gap-1.5 xs:gap-2">
                    {[0, 1, 2].map((index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        maxLength={6}
                        value={
                          roomCode.padEnd(6, " ")[index] === " "
                            ? ""
                            : roomCode.padEnd(6, " ")[index]
                        }
                        onChange={(e) =>
                          handleCodeChange(index, e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData
                            .getData("text")
                            .replace(/[^a-zA-Z0-9]/g, "")
                            .toUpperCase()
                            .slice(0, 6);
                          if (pasted) {
                            setRoomCode(pasted);
                            inputRefs.current[
                              Math.min(pasted.length - 1, 5)
                            ]?.focus();
                          }
                        }}
                        className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all uppercase text-slate-800"
                      />
                    ))}
                  </div>

                  {/* Second 3 Character Boxes */}
                  <div className="flex gap-1.5 sm:gap-2">
                    {[3, 4, 5].map((index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        maxLength={6}
                        value={
                          roomCode.padEnd(6, " ")[index] === " "
                            ? ""
                            : roomCode.padEnd(6, " ")[index]
                        }
                        onChange={(e) =>
                          handleCodeChange(index, e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData
                            .getData("text")
                            .replace(/[^a-zA-Z0-9]/g, "")
                            .toUpperCase()
                            .slice(0, 6);
                          if (pasted) {
                            setRoomCode(pasted);
                            inputRefs.current[
                              Math.min(pasted.length - 1, 5)
                            ]?.focus();
                          }
                        }}
                        className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all uppercase text-slate-800"
                      />
                    ))}
                  </div>
                </div>

                {/* Submit Join Button */}
                <button
                  onClick={handleJoinRoom}
                  disabled={roomCode.length !== 6 || joinLoading}
                  className="w-full max-w-70 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2"
                >
                  {joinLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      <span>Csatlakozás...</span>
                    </span>
                  ) : (
                    <>Csatlakozás</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
