import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import type { User } from "@supabase/supabase-js";
import LottieLoader from "../components/LottieLoader";
import {
  LogOut,
  ArrowLeft,
  Mail,
  User as UserIcon,
  Pencil,
  Camera,
  Check,
  X as CloseIcon,
  LoaderCircle,
} from "lucide-react";
import ProfileSetupModal from "../components/ui/ProfileSetupModal";
import { extractStoragePath, getGoogleAvatarUrl } from "../utils/avatar";

/**
 * Profile Component
 *
 * Provides personal user profile management.
 * Features:
 * - View account creation date, username, and email address.
 * - Inline editing for username (with length validation and RPC update).
 * - Inline editing for email address (with confirmation verification link).
 * - Avatar selection and upload via `ProfileSetupModal` in avatar-only mode.
 * - Real-time synchronization of profile updates across browser tabs and components.
 * - Safe account deletion requiring email confirmation, including storage avatar cleanup.
 * - Session logout.
 */
export default function Profile() {
  // --- User & Profile Data States ---
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- Router Hooks ---
  const navigate = useNavigate();
  const location = useLocation();

  // --- Avatar Modal & Image Fallback States ---
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // --- Inline Name Editing States ---
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // --- Inline Email Editing States ---
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // --- Account Deletion Modal States ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Inline Notification Messages ---
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /**
   * Reset avatar image error fallback when the profile avatar URL changes.
   */
  useEffect(() => {
    setAvatarError(false);
  }, [profile?.avatar_url]);

  /**
   * Session verification and initial profile data fetch.
   * Redirects unauthenticated visitors to the login page.
   */
  useEffect(() => {
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

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        navigate("/login");
      }
      setLoading(false);
    };

    checkSession();
  }, [navigate]);

  /**
   * Realtime Synchronization:
   * 1. Subscribes to PostgreSQL changes on the user's `profiles` record.
   * 2. Listens for custom DOM events (`profileUpdated`) triggered by modals across the app.
   */
  useEffect(() => {
    let profileChannel: any = null;

    if (user?.id) {
      profileChannel = supabase
        .channel(`profile_page_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload: any) => {
            if (payload.new) {
              setProfile(payload.new);
              setAvatarError(false);
            }
          },
        )
        .subscribe();
    }

    const handleProfileUpdate = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .limit(1);
        if (data && data.length > 0) {
          setProfile(data[0]);
          setAvatarError(false);
        }
      }
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, [user?.id]);

  /**
   * Detects email change verification return redirect from URL query parameters.
   */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("email_changed") === "success") {
      setSuccessMsg("Az e-mail címed sikeresen megváltozott!");
      // Clean up search query parameter from URL without page reload
      navigate("/profile", { replace: true });
    }
  }, [location, navigate]);

  /**
   * Handles keyboard escape key to dismiss the account deletion modal.
   */
  useEffect(() => {
    if (showDeleteModal) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !isDeleting) {
          setShowDeleteModal(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showDeleteModal, isDeleting]);

  /**
   * Signs the user out from Supabase Auth and redirects to login.
   */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  /**
   * Permanently deletes the user account.
   * Cleans up custom uploaded avatars from Supabase Storage and calls `delete_current_user` RPC.
   */
  const handleDeleteAccount = async () => {
    if (user?.email?.toLowerCase() === "demo@giftmate.app") {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setErrorMsg("A nyilvános demó fiók nem törölhető!");
      return;
    }
    setIsDeleting(true);
    setErrorMsg(null);

    try {
      // Execute atomic server-side user deletion RPC first
      // This validates if deletion is allowed (e.g. raises an exception if user owns a drawn room)
      const { error } = await supabase.rpc("delete_current_user");
      if (error) throw error;

      // Clean up custom avatar file from Storage bucket only after RPC succeeds
      const customAvatarPath = extractStoragePath(profile?.avatar_url);
      if (customAvatarPath) {
        await supabase.storage
          .from("avatars")
          .remove([customAvatarPath])
          .catch(console.error);
      }

      await supabase.auth.signOut();
      navigate("/login");
    } catch (err: any) {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setErrorMsg(err.message || "Hiba történt a fiók törlése során.");
    }
  };

  /**
   * Enters inline username editing mode.
   */
  const startEditingName = () => {
    setEditName(profile.username);
    setIsEditingName(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  /**
   * Enters inline email editing mode.
   */
  const startEditingEmail = () => {
    if (user?.email?.toLowerCase() === "demo@giftmate.app") {
      setErrorMsg("A nyilvános demó fiók e-mail címe nem módosítható!");
      return;
    }
    setEditEmail(user?.email || "");
    setIsEditingEmail(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  /**
   * Saves updated username after length validation.
   * Updates database profile and Supabase Auth metadata.
   */
  const saveName = async () => {
    if (!user) return;
    const newName = editName.trim();
    if (newName.length < 2) {
      setErrorMsg("A névnek legalább 2 karakter hosszúnak kell lennie!");
      return;
    }
    if (newName.length > 20) {
      setErrorMsg("A név maximum 20 karakter hosszú lehet!");
      return;
    }

    if (newName === profile.username) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    setErrorMsg(null);

    try {
      // Update username in profiles table via secure RPC
      const { error: rpcError } = await supabase.rpc(
        "update_profile_username",
        {
          p_new_username: newName,
        },
      );
      if (rpcError) throw rpcError;

      // Update auth user display name metadata
      await supabase.auth.updateUser({
        data: { display_name: newName },
      });

      setProfile({ ...profile, username: newName });
      setIsEditingName(false);
      setSuccessMsg("A neved sikeresen frissítve!");
      window.dispatchEvent(new CustomEvent("profileUpdated"));
    } catch (err: any) {
      setErrorMsg(err.message || "Hiba történt a név módosításakor.");
    } finally {
      setIsSavingName(false);
    }
  };

  /**
   * Initiates email address update.
   * Supabase sends a confirmation email to the new address before applying changes.
   */
  const saveEmail = async () => {
    if (!user) return;
    if (user?.email?.toLowerCase() === "demo@giftmate.app") {
      setErrorMsg("A nyilvános demó fiók e-mail címe nem módosítható!");
      setIsEditingEmail(false);
      return;
    }
    const newEmail = editEmail.trim();
    if (!newEmail || !newEmail.includes("@")) {
      setErrorMsg("Kérlek adj meg egy érvényes e-mail címet!");
      return;
    }

    if (newEmail === user.email) {
      setIsEditingEmail(false);
      return;
    }

    setIsSavingEmail(true);
    setErrorMsg(null);

    try {
      const redirectUrl = `${window.location.origin}/profile?email_changed=success`;
      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: redirectUrl },
      );

      if (error) throw error;

      setIsEditingEmail(false);
      setSuccessMsg(
        "Kaptál egy megerősítő e-mailt az új címedre. A módosítás a linkre kattintás után lép érvénybe.",
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Hiba történt az e-mail cím módosításakor.");
    } finally {
      setIsSavingEmail(false);
    }
  };

  // --- Initial Loading Screen ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] w-full">
        <LottieLoader className="w-24 h-24" />
      </div>
    );
  }

  // Guard against missing user or profile data
  if (!user || !profile) return null;

  // Determine whether the user authenticated using Google OAuth (email editing is disabled for OAuth users)
  const isGoogleUser = user.app_metadata?.providers?.includes("google");
  // Check if current user is the shared public demo account (locks email editing and account deletion)
  const isDemoUser = user.email?.toLowerCase() === "demo@giftmate.app";

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col p-4 sm:p-6 bg-slate-50 text-slate-900 font-sans items-center">
      {/* Back to Dashboard Navigation Link */}
      <div className="w-full max-w-xl mb-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Vissza a Dashboardra
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Top Banner & Circular Avatar Section */}
        <div className="h-32 bg-emerald-500 relative">
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
            <div
              className="relative group cursor-pointer"
              onClick={() => setShowAvatarModal(true)}
              title="Profilkép módosítása"
            >
              <div className="w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-md relative">
                {profile.avatar_url && !avatarError ? (
                  <img
                    key={profile.avatar_url}
                    src={profile.avatar_url}
                    onError={() => setAvatarError(true)}
                    alt="Profile"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-4xl">
                    {profile.username
                      ? profile.username.charAt(0).toUpperCase()
                      : "?"}
                  </div>
                )}
                {/* Desktop Hover Overlay with Pencil Icon */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Pencil className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Floating Camera Badge (Permanently visible on mobile/touch screens) */}
              <div
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-emerald-600 group-hover:bg-emerald-500 text-white border-[3px] border-white shadow-md flex items-center justify-center transition-all duration-200  active:scale-95"
                title="Profilkép módosítása"
              >
                <Camera className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details & Form Controls */}
        <div className="pt-20 pb-8 px-2 xs:px-8 flex flex-col items-center">
          {/* Display Name & Join Date Badge */}
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {profile.username}
          </h1>
          <p className="text-sm text-center font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-6 flex items-center gap-2">
            Csatlakozott -{" "}
            {profile.created_at
              ? new Date(profile.created_at).toLocaleDateString()
              : "N/A"}
          </p>

          {/* Feedback Banners (Error / Success) */}
          {errorMsg && (
            <div className="w-full mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 text-center font-medium animate-in fade-in">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="w-full mb-6 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-600 text-center font-medium animate-in fade-in">
              {successMsg}
            </div>
          )}

          {/* Information Rows */}
          <div className="w-full space-y-4 mb-8">
            {/* Username Row with Inline Editing */}
            <div className="flex items-center gap-3 xs:gap-4 p-3 xs:p-4 rounded-2xl bg-slate-50 border border-slate-100 relative">
              <div className="w-8 h-8 xs:w-10 xs:h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-slate-400 shrink-0">
                <UserIcon className="w-4 h-4 xs:w-5 xs:h-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  Név
                </p>
                {isEditingName ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={20}
                    className="w-full px-2 py-1 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-emerald-400"
                    autoFocus
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {profile.username}
                  </p>
                )}
              </div>

              {/* Name Action Buttons (Edit / Save / Cancel) */}
              <div
                className={`flex items-center gap-2 ${
                  isEditingName ? "self-end mb-0.5" : ""
                }`}
              >
                {isEditingName ? (
                  <>
                    <button
                      onClick={saveName}
                      disabled={isSavingName}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="Mentés"
                    >
                      {isSavingName ? (
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      disabled={isSavingName}
                      className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="Mégse"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startEditingName}
                    className="p-2 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                    title="Szerkesztés"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Email Row with Inline Editing */}
            <div className="flex items-center gap-3 xs:gap-4 p-3 xs:p-4 rounded-2xl bg-slate-50 border border-slate-100 relative">
              <div className="w-8 h-8 xs:w-10 xs:h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-slate-400 shrink-0">
                <Mail className="w-4 h-4 xs:w-5 xs:h-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  E-mail cím
                </p>
                {isEditingEmail ? (
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-emerald-400"
                    autoFocus
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {user.email}
                  </p>
                )}
              </div>

              {/* Email Action Buttons (Disabled for Google OAuth Users) */}
              <div
                className={`flex items-center gap-2 ${
                  isEditingEmail ? "self-end mb-0.5" : ""
                }`}
              >
                {isEditingEmail ? (
                  <>
                    <button
                      onClick={saveEmail}
                      disabled={isSavingEmail}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="Mentés"
                    >
                      {isSavingEmail ? (
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setIsEditingEmail(false)}
                      disabled={isSavingEmail}
                      className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="Mégse"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </>
                ) : isDemoUser ? (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Demó fiók
                  </span>
                ) : (
                  !isGoogleUser && (
                    <button
                      onClick={startEditingEmail}
                      className="p-2 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                      title="Szerkesztés"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Bottom Account Actions: Logout & Permanent Deletion */}
          <div className="w-full flex flex-col gap-3 mt-8">
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm rounded-xl duration-150 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Kijelentkezés
            </button>

            {isDemoUser ? (
              <div className="w-full py-2.5 px-4 bg-slate-100 text-slate-400 font-medium text-xs rounded-xl flex items-center justify-center gap-2 text-center select-none">
                A nyilvános demó fiók védett, nem törölhető.
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowDeleteModal(true);
                  setDeleteEmailInput("");
                }}
                className="w-full py-2.5 px-4 bg-transparent hover:bg-red-50 text-red-600 font-semibold text-sm rounded-xl duration-150 flex items-center justify-center gap-2 border border-transparent hover:border-red-100 cursor-pointer"
              >
                Fiók végleges törlése
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div
          onClick={() => !isDeleting && setShowDeleteModal(false)}
          className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overscroll-contain animate-[backdropFadeIn_0.2s_ease-out]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 sm:p-7 border border-slate-100 animate-[modalPopIn_0.25s_cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-[transform,opacity] backface-hidden origin-center overscroll-contain"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Biztosan törölni szeretnéd a fiókodat?
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Ez a folyamat végleges és visszavonhatatlan. Minden adatod,
              csatlakozásod és szobád azonnal törlődik.
            </p>

            {/* Verification Email Input Requirement */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                A megerősítéshez írd be az e-mail címed:{" "}
                <span className="font-bold text-slate-900">{user.email}</span>
              </label>
              <input
                type="email"
                value={deleteEmailInput}
                onChange={(e) => setDeleteEmailInput(e.target.value)}
                placeholder={user.email}
                className="input-field"
              />
            </div>

            {/* Modal Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm rounded-xl shadow-2xs duration-150 cursor-pointer disabled:opacity-50"
              >
                Mégse
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteEmailInput !== user.email}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-xl shadow-md duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    <span>Törlés...</span>
                  </>
                ) : (
                  "Törlés"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Selection Modal (Reusing ProfileSetupModal in avatarOnlyMode) */}
      {showAvatarModal && user && (
        <ProfileSetupModal
          userId={user.id}
          initialAvatarUrl={avatarError ? null : profile.avatar_url}
          initialDisplayName={profile.username}
          googleAvatarUrl={getGoogleAvatarUrl(user)}
          avatarOnlyMode={true}
          onCancel={() => setShowAvatarModal(false)}
          onComplete={async (newAvatarUrl) => {
            setShowAvatarModal(false);
            setAvatarError(false);
            const updatedProfile = {
              ...profile,
              avatar_url: newAvatarUrl || null,
            };
            setProfile(updatedProfile);
            setSuccessMsg("A profilképed sikeresen frissítve!");
            window.dispatchEvent(
              new CustomEvent("profileUpdated", { detail: updatedProfile }),
            );
          }}
        />
      )}
    </div>
  );
}
