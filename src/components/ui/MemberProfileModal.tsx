import { useEffect, useState } from "react";
import { LoaderCircle, UserRoundMinus, UserStar, X } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { supabase } from "../../supabaseClient";
import { normalizeAvatarUrl } from "../../utils/avatar";
import AvatarImage from "./AvatarImage";

/**
 * Properties for the MemberProfileModal component.
 */
export interface MemberProfileModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Dismiss callback to close the modal */
  onClose: () => void;
  /** Selected room participant data */
  member: {
    user_id: string;
    is_me?: boolean;
    is_owner?: boolean;
    is_deleted?: boolean;
    joined_at?: string;
    profiles?: {
      username?: string;
      avatar_url?: string | null;
    };
  } | null;
}

/**
 * MemberProfileModal Component
 *
 * Pop-up inspection modal displaying an enlarged view of a room participant:
 * - High-resolution avatar display with drag protection and initial-letter fallback.
 * - Realtime Postgres subscription ensuring instant UI updates if the user modifies their photo or name.
 * - Participant username and role badges (Organizer, Current User, or Deleted Ghost).
 * - Asynchronously loaded account registration timestamp from the Supabase `profiles` table.
 * - Keyboard navigation (Escape key dismissal) and backdrop click handling.
 */
export default function MemberProfileModal({
  isOpen,
  onClose,
  member,
}: MemberProfileModalProps) {
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [isLoadingDate, setIsLoadingDate] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Live profile details state (updated in real-time)
  const [username, setUsername] = useState<string>(
    () => member?.profiles?.username || "Névtelen játékos",
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(() =>
    normalizeAvatarUrl(member?.profiles?.avatar_url),
  );

  // Synchronize state whenever the selected member prop changes
  useEffect(() => {
    setUsername(member?.profiles?.username || "Névtelen játékos");
    const freshUrl = normalizeAvatarUrl(member?.profiles?.avatar_url);
    setAvatarUrl((prev) => {
      if (prev !== freshUrl) {
        setAvatarError(false);
        setIsImageLoading(true);
        return freshUrl;
      }
      return prev;
    });
  }, [
    member?.user_id,
    member?.profiles?.username,
    member?.profiles?.avatar_url,
  ]);

  // Safety watchdog: ensure spinner never hangs indefinitely if image event is swallowed
  useEffect(() => {
    if (!avatarUrl || !isImageLoading) return;
    const timer = setTimeout(() => {
      setIsImageLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [avatarUrl, isImageLoading]);

  // Real-time synchronization: subscribe to database changes on this member's profile
  useEffect(() => {
    if (!isOpen || !member?.user_id || member.is_deleted) return;

    // Listen for live PostgreSQL changes on the specific user's profiles record
    const channel = supabase
      .channel(`member_modal_profile_${member.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${member.user_id}`,
        },
        (payload: any) => {
          if (payload.new) {
            if (payload.new.username) {
              setUsername(payload.new.username);
            }
            const freshUrl = normalizeAvatarUrl(payload.new.avatar_url);
            setAvatarUrl((prev) => {
              if (prev !== freshUrl) {
                setAvatarError(false);
                setIsImageLoading(true);
                return freshUrl;
              }
              return prev;
            });
          }
        },
      )
      .subscribe();

    // Listen for local profile update events if inspecting the current logged-in user
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (member.is_me && customEvent?.detail) {
        if (customEvent.detail.username) {
          setUsername(customEvent.detail.username);
        }
        if (customEvent.detail.avatar_url !== undefined) {
          const freshUrl = normalizeAvatarUrl(customEvent.detail.avatar_url);
          setAvatarUrl((prev) => {
            if (prev !== freshUrl) {
              setAvatarError(false);
              setIsImageLoading(true);
              return freshUrl;
            }
            return prev;
          });
        }
      }
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, [isOpen, member?.user_id, member?.is_deleted, member?.is_me]);

  // Fetch member's account registration date from the profiles table
  useEffect(() => {
    if (!isOpen || !member?.user_id) {
      setCreatedAt(null);
      setIsLoadingDate(false);
      return;
    }

    // Ghost/deleted accounts do not have active profile records
    if (member.is_deleted) {
      setCreatedAt(null);
      setIsLoadingDate(false);
      return;
    }

    let isMounted = true;
    setIsLoadingDate(true);

    const fetchRegistrationDate = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("created_at")
          .eq("id", member.user_id)
          .maybeSingle();

        if (isMounted) {
          if (!error && data?.created_at) {
            setCreatedAt(data.created_at);
          } else {
            setCreatedAt(null);
          }
          setIsLoadingDate(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error(
            "Error fetching member profile registration date:",
            err,
          );
          setCreatedAt(null);
          setIsLoadingDate(false);
        }
      }
    };

    fetchRegistrationDate();

    return () => {
      isMounted = false;
    };
  }, [isOpen, member?.user_id, member?.is_deleted]);

  // Listen for Escape key to close modal
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !member) return null;

  const isDeleted = Boolean(member.is_deleted);
  const isOwner = Boolean(member.is_owner);
  const isMe = Boolean(member.is_me);
  const isGoogleAvatar = Boolean(
    !isDeleted &&
    avatarUrl &&
    (avatarUrl.includes("googleusercontent.com") ||
      avatarUrl.includes("google.com")),
  );

  return (
    <div
      key={member.user_id}
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overscroll-contain animate-[backdropFadeIn_0.2s_ease-out]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 sm:p-7 border border-slate-100 animate-[modalPopIn_0.25s_cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-[transform,opacity] backface-hidden origin-center overscroll-contain relative flex flex-col items-center gap-5"
      >
        {/* Absolute Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Bezárás"
          className="absolute top-4 right-4 hidden sm:flex p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Large Profile Picture Frame with optional Google provider badge */}
        <div className="relative shrink-0 select-none">
          <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-3xl overflow-hidden shadow-md shadow-emerald-500/30 border-4 border-white bg-slate-100 flex items-center justify-center">
            {isDeleted ? (
              <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-1.5">
                <UserRoundMinus className="w-12 h-12" />
              </div>
            ) : avatarUrl && !avatarError ? (
              <>
                {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
                    <LoaderCircle className="w-8 h-8 text-emerald-600 animate-spin" />
                  </div>
                )}
                <AvatarImage
                  key={avatarUrl || "avatar"}
                  ref={(img: HTMLImageElement | null) => {
                    // If image is already fully loaded from cache, immediately clear loading state
                    if (img?.complete && img?.naturalWidth > 0) {
                      setIsImageLoading(false);
                    }
                  }}
                  src={avatarUrl}
                  alt={username}
                  draggable={false}
                  onLoad={() => setIsImageLoading(false)}
                  onError={() => {
                    setAvatarError(true);
                    setIsImageLoading(false);
                  }}
                  className={`w-full h-full object-cover pointer-events-none select-none transition-opacity duration-200 ${
                    isImageLoading ? "opacity-0" : "opacity-100"
                  }`}
                />
                {/* Transparent protective shield over image */}
                <div
                  className="absolute inset-0 z-20 bg-transparent"
                  aria-hidden="true"
                />
              </>
            ) : (
              <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-800 font-black text-4xl sm:text-5xl select-none">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Floating Google Logo Badge in bottom-right corner */}
          {isGoogleAvatar && (
            <div
              title="Google-fiók profilképe"
              className="absolute bottom-2 right-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-slate-700 border-[3px] border-white shadow-md flex items-center justify-center pointer-events-none z-30"
            >
              <FcGoogle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 -my-2 flex-wrap">
          {isOwner && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
              <UserStar className="w-3.5 h-3.5 inline-block mr-1 -mt-px" />
              Szervező
            </span>
          )}

          {isMe && !isDeleted && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
              Te
            </span>
          )}

          {isDeleted && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
              Törölt felhasználó
            </span>
          )}
        </div>

        {/* Username, Join Date Badge, and Status Badges */}
        <div className="flex flex-col items-center gap-2 w-full text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight truncate max-w-full px-2">
            {username}
          </h2>

          {/* Join Date Badge (Identical to Profile.tsx) */}
          <p className="text-sm text-center font-medium text-slate-600 bg-slate-50 px-3 py-1 rounded-full flex items-center gap-2">
            Regisztrált -{" "}
            {isLoadingDate ? (
              <span className="italic opacity-70">Betöltés...</span>
            ) : isDeleted ? (
              "N/A"
            ) : createdAt ? (
              new Date(createdAt).toLocaleDateString()
            ) : (
              "N/A"
            )}
          </p>
        </div>

        {/* Modal Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer text-center"
        >
          Bezárás
        </button>
      </div>
    </div>
  );
}
