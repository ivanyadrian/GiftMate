import { Gift, Menu, X, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import type { User } from "@supabase/supabase-js";

// Navigation links configuration used across both desktop and mobile views
const NAV_LINKS = [
  { label: "Hogyan működik?", href: "#" },
  { label: "GY.I.K.", href: "#" },
  { label: "Kapcsolat", href: "#" },
];

/**
 * Navbar Component
 *
 * Sticky top navigation bar providing:
 * - Brand logo linking back to the Dashboard.
 * - Multi-tiered authentication and user profile synchronization (session checks,
 *   Supabase auth state changes, custom `profileUpdated` window events, and Realtime Postgres changes).
 * - Responsive layout supporting desktop links and a slide-out drawer menu with blurred backdrop on mobile devices.
 * - Fault-tolerant avatar rendering with fallback to user initials on image load failure.
 */
export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [avatarError, setAvatarError] = useState(false);
  const navigate = useNavigate();

  // Reset avatar error fallback whenever the user's avatar URL changes
  useEffect(() => {
    setAvatarError(false);
  }, [profile?.avatar_url]);

  // Initial setup on mount: check auth session, listen for auth changes and local profile update events
  useEffect(() => {
    // Helper to fetch user profile details from the database
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .limit(1);
      if (data && data.length > 0) {
        setProfile(data[0]);
        setAvatarError(false);
      }
    };

    // Check active session on initial load
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    };
    checkSession();

    // Listen for authentication changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    // Custom window event listener triggered when profile is updated elsewhere in the app
    const handleProfileUpdate = async (e?: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent?.detail) {
        setProfile(customEvent.detail);
        setAvatarError(false);
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        fetchProfile(session.user.id);
      }
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);

    // Clean up event listeners and auth subscription on unmount
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, []);

  // Set up real-time Postgres changes listener for the logged-in user's profile
  useEffect(() => {
    let profileChannel: any = null;

    if (user?.id) {
      profileChannel = supabase
        .channel(`navbar_profile_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload: any) => {
            // Update profile state in real-time when changes occur in DB
            if (payload.new) {
              setProfile(payload.new);
              setAvatarError(false);
            }
          },
        )
        .subscribe();
    }

    // Clean up the real-time subscription when user ID changes or component unmounts
    return () => {
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
    };
  }, [user?.id]);

  return (
    <nav className="w-full bg-surface flex items-center px-4 py-3 sticky top-0 z-50 justify-between shadow-sm">
      {/* Logo */}
      <div className="flex justify-center items-center">
        <Gift className="w-7 h-7 text-red-500 mr-2" />
        <Link
          to="/dashboard"
          className="text-2xl font-bold text-slate-800 tracking-wide"
        >
          GiftMate
        </Link>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-6">
        {NAV_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-emerald-500 hover:text-emerald-600 font-medium cursor-pointer"
          >
            {link.label}
          </a>
        ))}

        {user && profile && (
          <button
            onClick={() => navigate("/profile")}
            className="ml-2 flex items-center gap-2 bg-slate-50 hover:bg-slate-100 py-1 px-1 pr-4 rounded-full border border-slate-200 group"
          >
            <div className="w-8 h-8 rounded-full border-2 border-white group-hover:border-emerald-300 overflow-hidden transition-all shadow-sm shrink-0">
              {profile.avatar_url && !avatarError ? (
                <img
                  key={profile.avatar_url}
                  src={profile.avatar_url}
                  onError={() => setAvatarError(true)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-xs">
                  {profile.username
                    ? profile.username.charAt(0).toUpperCase()
                    : "?"}
                </div>
              )}
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-600 transition-colors">
              Profil
            </span>
          </button>
        )}
      </div>

      {/* Mobile Actions */}
      <div className="flex md:hidden items-center gap-3">
        {user && profile && (
          <button
            onClick={() => navigate("/profile")}
            className="hidden xs:flex items-center gap-2 bg-slate-50 hover:bg-slate-100 py-1 pl-1 pr-3 rounded-full border border-slate-200 group"
          >
            <div className="w-7 h-7 rounded-full border-2 border-white group-hover:border-emerald-300 overflow-hidden transition-all shadow-sm shrink-0">
              {profile.avatar_url && !avatarError ? (
                <img
                  key={profile.avatar_url}
                  src={profile.avatar_url}
                  onError={() => setAvatarError(true)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-[11px]">
                  {profile.username
                    ? profile.username.charAt(0).toUpperCase()
                    : "?"}
                </div>
              )}
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-600 transition-colors">
              Profil
            </span>
          </button>
        )}
        <button
          className="p-2 text-slate-800 hover:text-emerald-500 transition-colors"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={26} />
        </button>
      </div>

      {/* Dimmed backdrop overlay */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ease-out ${
          isOpen
            ? "opacity-100 backdrop-blur-sm pointer-events-auto"
            : "opacity-0 backdrop-blur-none pointer-events-none"
        } bg-black/40`}
      />

      {/* Slide-out mobile menu panel */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-surface shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"} md:hidden`}
      >
        {/* Drawer header: Close button */}
        <div className="p-4 flex items-center justify-end">
          <button
            className="p-2 text-slate-800 hover:text-red-500 transition-colors bg-slate-100 rounded-full"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile profile button (visible only on extra-small screens) */}
        {user && profile && (
          <div className="px-6 mb-4 xs:hidden">
            <button
              onClick={() => {
                navigate("/profile");
                setIsOpen(false);
              }}
              className="flex items-center justify-between w-full p-1 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-white group-hover:border-emerald-300 overflow-hidden transition-all shadow-sm shrink-0">
                  {profile.avatar_url && !avatarError ? (
                    <img
                      key={profile.avatar_url}
                      src={profile.avatar_url}
                      onError={() => setAvatarError(true)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-sm">
                      {profile.username
                        ? profile.username.charAt(0).toUpperCase()
                        : "?"}
                    </div>
                  )}
                </div>
                <span className="text-base font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">
                  Profil
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
            </button>
          </div>
        )}

        {/* Navigation menu items */}
        <div className="flex flex-col gap-6 mt-2 px-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-lg text-emerald-500 hover:text-emerald-600 font-semibold transition-colors border-b border-slate-200 pb-2 cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
