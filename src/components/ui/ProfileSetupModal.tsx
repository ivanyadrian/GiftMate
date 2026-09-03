import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  LoaderCircle,
  Camera,
  ArrowRight,
  Check,
  SquareUserRound,
  X,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import {
  DEFAULT_AVATARS,
  normalizeAvatarUrl,
  extractStoragePath,
  getGoogleAvatarUrl,
} from "../../utils/avatar";

interface ProfileSetupModalProps {
  userId: string;
  initialAvatarUrl?: string | null; // Existing avatar URL if editing
  initialDisplayName?: string | null; // Existing display name if editing
  googleAvatarUrl?: string | null; // Pre-resolved Google avatar URL for instant 0ms render
  onComplete: (avatarUrl?: string | null) => void;
  onCancel?: () => void;
  avatarOnlyMode?: boolean;
}

export default function ProfileSetupModal({
  userId,
  initialAvatarUrl,
  initialDisplayName,
  googleAvatarUrl: initialGoogleAvatarUrl,
  onComplete,
  onCancel,
  avatarOnlyMode = false,
}: ProfileSetupModalProps) {
  // Current wizard step: 1 = choose avatar, 2 = enter display name
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Avatar selection state
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState<string | null>(
    () => initialGoogleAvatarUrl || null,
  );

  // List of available avatars, initialized synchronously for instant 0ms render
  const [avatarsList, setAvatarsList] = useState<string[]>(() => {
    const list: string[] = [];
    if (initialGoogleAvatarUrl) {
      list.push(initialGoogleAvatarUrl);
    }
    if (initialAvatarUrl) {
      const normalized = normalizeAvatarUrl(initialAvatarUrl);
      if (
        normalized &&
        normalized !== "default" &&
        !list.includes(normalized) &&
        !DEFAULT_AVATARS.includes(normalized)
      ) {
        list.push(normalized);
      }
    }
    DEFAULT_AVATARS.forEach((url) => {
      if (!list.includes(url)) {
        list.push(url);
      }
    });
    return list;
  });

  // Currently selected avatar key/url: can be a predefined url, "custom_upload", or "default" (initials)
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(() => {
    if (
      avatarOnlyMode &&
      (!initialAvatarUrl || initialAvatarUrl === "default")
    ) {
      return "default";
    }
    return normalizeAvatarUrl(initialAvatarUrl) || null;
  });
  // Binary file object selected by the user from their device
  const [file, setFile] = useState<File | null>(null);
  // Ephemeral blob URL for instant client-side preview of selected local image
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(initialDisplayName || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback: If googleAvatarUrl was not passed in props, fetch asynchronously
  useEffect(() => {
    if (initialGoogleAvatarUrl) {
      setGoogleAvatarUrl(initialGoogleAvatarUrl);
      return;
    }

    const fetchGoogleAvatar = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const gAvatar = getGoogleAvatarUrl(user);
          if (gAvatar) {
            setGoogleAvatarUrl(gAvatar);
          }
        }
      } catch (err) {
        console.error("Error fetching Google avatar:", err);
      }
    };

    fetchGoogleAvatar();
  }, [initialGoogleAvatarUrl]);

  // Synchronize avatar list including Google avatar and predefined avatars
  useEffect(() => {
    const list: string[] = [];
    if (googleAvatarUrl) {
      list.push(googleAvatarUrl);
    }
    if (initialAvatarUrl) {
      const normalized = normalizeAvatarUrl(initialAvatarUrl);
      if (
        normalized &&
        normalized !== "default" &&
        !list.includes(normalized) &&
        !DEFAULT_AVATARS.includes(normalized)
      ) {
        list.push(normalized);
      }
    }
    DEFAULT_AVATARS.forEach((url) => {
      if (!list.includes(url)) {
        list.push(url);
      }
    });
    setAvatarsList(list);
  }, [googleAvatarUrl, initialAvatarUrl]);

  // Synchronize initial avatar prop into selected state
  useEffect(() => {
    if (
      avatarOnlyMode &&
      (!initialAvatarUrl || initialAvatarUrl === "default")
    ) {
      setSelectedAvatar("default");
    } else if (initialAvatarUrl) {
      const normalized = normalizeAvatarUrl(initialAvatarUrl);
      setSelectedAvatar(normalized);
    }
  }, [initialAvatarUrl, avatarOnlyMode]);

  // Memory management: release browser-allocated blob URL when preview changes or modal unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Keyboard accessibility: dismiss modal on Escape key press if cancellation is permitted
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading && onCancel) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, onCancel]);

  // Advance from step 1 (avatar selection) to step 2 (display name input)
  const handleNextStep = () => {
    if (!selectedAvatar) {
      setError("Kérlek válassz egy képet, vagy tölts fel egy sajátot!");
      return;
    }
    setError(null);
    setStep(2);
  };

  // Full profile save handler (Step 1 avatar + Step 2 display name)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side length validation for display name
    if (displayName.trim().length < 2) {
      setError("A nevednek legalább 2 karakter hosszúnak kell lennie!");
      return;
    }

    if (displayName.trim().length > 20) {
      setError("A neved maximum 20 karakter hosszú lehet!");
      return;
    }

    setLoading(true);
    setError(null);
    let finalAvatarUrl: string | null =
      selectedAvatar === "default" ? null : selectedAvatar;

    try {
      if (selectedAvatar === "custom_upload" && file) {
        // Upload custom image to Supabase Storage
        const fileExt = file.name.split(".").pop();
        const fileName = `user_uploads/${userId}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Retrieve public URL for uploaded asset
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(fileName);

        finalAvatarUrl = publicUrl;
      }

      // 1. Update username in profiles table via secure RPC (validates room name collisions)
      const { error: rpcError } = await supabase.rpc(
        "update_profile_username",
        {
          p_new_username: displayName.trim(),
        },
      );
      if (rpcError) throw rpcError;

      // 2. Update user metadata in Supabase Auth
      const { error: updateAuthError } = await supabase.auth.updateUser({
        data: {
          avatar_url: finalAvatarUrl,
          display_name: displayName.trim(),
        },
      });

      if (updateAuthError) throw updateAuthError;

      // 3. Update profiles table so avatar and completion reflect immediately
      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({
          avatar_url: finalAvatarUrl,
          is_profile_complete: true,
        })
        .eq("id", userId);

      if (updateProfileError) {
        console.error("Failed to update profiles table:", updateProfileError);
      }

      // Delete previously uploaded custom image from Storage if replaced
      const oldPath = extractStoragePath(initialAvatarUrl);
      const newPath = extractStoragePath(finalAvatarUrl);
      if (oldPath && oldPath !== newPath) {
        await supabase.storage
          .from("avatars")
          .remove([oldPath])
          .catch(console.error);
      }

      // Dispatch global event for immediate Navbar synchronization
      window.dispatchEvent(new CustomEvent("profileUpdated"));
      onComplete(finalAvatarUrl);
    } catch (err: any) {
      setError(err.message || "Hiba történt a profil mentésekor.");
    } finally {
      setLoading(false);
    }
  };

  // Simplified save handler for avatar-only mode (invoked from Profile settings page)
  const handleSaveAvatarOnly = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedAvatar) {
      setError("Kérlek válassz egy képet, vagy tölts fel egy sajátot!");
      return;
    }

    setLoading(true);
    setError(null);
    let finalAvatarUrl: string | null =
      selectedAvatar === "default" ? null : selectedAvatar;

    try {
      // Handle custom file upload if selected
      if (selectedAvatar === "custom_upload" && file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `user_uploads/${userId}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(fileName);

        finalAvatarUrl = publicUrl;
      }

      // 1. Update avatar metadata in Supabase Auth
      const { error: updateAuthError } = await supabase.auth.updateUser({
        data: { avatar_url: finalAvatarUrl },
      });

      if (updateAuthError) throw updateAuthError;

      // 2. Update avatar_url in public.profiles table
      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({ avatar_url: finalAvatarUrl, is_profile_complete: true })
        .eq("id", userId);

      if (updateProfileError) {
        console.error("Failed to update profiles table:", updateProfileError);
      }

      // Delete previously uploaded custom image from Storage if replaced
      const oldPath = extractStoragePath(initialAvatarUrl);
      const newPath = extractStoragePath(finalAvatarUrl);

      if (oldPath && oldPath !== newPath) {
        await supabase.storage
          .from("avatars")
          .remove([oldPath])
          .catch(console.error);
      }

      // Dispatch event to synchronize Navbar profile picture immediately
      window.dispatchEvent(new CustomEvent("profileUpdated"));
      onComplete(finalAvatarUrl);
    } catch (err: any) {
      setError(err.message || "Hiba történt a kép mentésekor.");
    } finally {
      setLoading(false);
    }
  };

  // Handle local image file selection from file input dialog
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Clean up previous blob URL to prevent memory leaks
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // Generate instant client-side preview URL
      const newPreviewUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(newPreviewUrl);
      setSelectedAvatar("custom_upload");
      setError(null);

      // Reset file input so selecting the same file again still fires onChange
      e.target.value = "";
    }
  };

  // Select one of the predefined avatar templates without discarding uploaded preview
  const selectPredefinedAvatar = (url: string) => {
    setSelectedAvatar(url);
    setError(null);
  };

  return (
    // Dimmed backdrop with click-outside to cancel (disabled while saving)
    <div
      onClick={loading ? undefined : onCancel}
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overscroll-contain animate-[backdropFadeIn_0.2s_ease-out]"
    >
      {/* Modal Dialog Card (stops click bubbling to backdrop) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-xl w-full max-w-lg sm:max-w-xl max-h-[calc(90dvh-2rem)] flex flex-col overflow-hidden animate-[modalPopIn_0.25s_cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-[transform,opacity] backface-hidden origin-center overscroll-contain"
      >
        {/* Step Indicator Progress Bar (hidden in single-step avatar-only mode) */}
        {!avatarOnlyMode && (
          <div className="flex w-full h-1 bg-slate-100 shrink-0">
            <div className="w-1/2 h-full bg-emerald-500 transition-all duration-300"></div>
            <div
              className={`w-1/2 h-full transition-all duration-300 ${step === 2 ? "bg-emerald-500" : "bg-transparent"}`}
            ></div>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-5 pb-0 sm:p-6 sm:pb-0 shrink-0 relative">
          {avatarOnlyMode && onCancel && (
            <button
              onClick={onCancel}
              aria-label="Close"
              className="absolute hidden xs:flex top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {avatarOnlyMode
              ? "Válassz új profilképet"
              : "Üdvözlünk a GiftMate-ben!"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {avatarOnlyMode
              ? "Kattints egy képre vagy tölts fel egy sajátot!"
              : "Kérlek állítsd be a profilodat, mielőtt továbbmennénk."}
          </p>

          {/* Error Message Box */}
          {error && (
            <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-100 text-xs sm:text-sm text-red-600 text-center font-medium">
              {error}
            </div>
          )}
        </div>

        {/* STEP 1: Avatar Selection Grid & Upload Dropzone */}
        {step === 1 && (
          <div className="flex flex-col flex-1 min-h-0 p-5 sm:p-6 pt-3 sm:pt-3 animate-in slide-in-from-left-4 fade-in duration-300">
            <h3 className="text-sm sm:text-base font-semibold text-slate-800 mb-2.5 flex items-center gap-2 shrink-0">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              Válassz profilképet
            </h3>

            {/* Dynamically fills all remaining vertical space on any screen */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-2 pl-2 pr-3 -mx-2 scrollbar-thin">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {/* Initial-based default avatar (only available in avatar-only editing mode) */}
                {avatarOnlyMode && (
                  <div
                    onClick={() => {
                      setSelectedAvatar("default");
                      setError(null);
                    }}
                    className={`relative aspect-square rounded-2xl cursor-pointer overflow-hidden border-2 transition-all duration-200 hover:scale-105 bg-emerald-100 flex items-center justify-center ${
                      selectedAvatar === "default"
                        ? "border-emerald-500 shadow-md ring-4 ring-emerald-500/20"
                        : "border-slate-100 hover:border-emerald-200"
                    }`}
                    title="Default initial-based profile picture"
                  >
                    <span className="text-3xl sm:text-4xl font-bold text-emerald-800">
                      {(initialDisplayName || displayName || "A")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                    {selectedAvatar === "default" && (
                      <div className="absolute inset-0 bg-emerald-900/10 flex items-center justify-center">
                        <div className="bg-emerald-500/85 text-white rounded-full p-1 shadow-sm">
                          <Check className="w-7 h-7 opacity-85" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom File Upload Preview Tile */}
                {previewUrl && (
                  <div
                    onClick={() => setSelectedAvatar("custom_upload")}
                    className={`relative aspect-square rounded-2xl cursor-pointer overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                      selectedAvatar === "custom_upload"
                        ? "border-emerald-500 shadow-md ring-4 ring-emerald-500/20"
                        : "border-slate-100 hover:border-emerald-200"
                    }`}
                  >
                    <img
                      src={previewUrl}
                      alt="Custom upload"
                      className="w-full h-full object-cover"
                    />
                    {selectedAvatar === "custom_upload" && (
                      <div className="absolute inset-0 bg-emerald-900/10 flex items-center justify-center">
                        <div className="bg-emerald-500/85 text-white rounded-full p-1 shadow-sm">
                          <Check className="w-7 h-7 opacity-85" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Predefined Avatars List */}
                {avatarsList.map((url) => (
                  <div
                    key={url}
                    onClick={() => selectPredefinedAvatar(url)}
                    className={`relative aspect-square rounded-2xl cursor-pointer overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                      selectedAvatar === url
                        ? "border-emerald-500 shadow-md ring-4 ring-emerald-500/20"
                        : "border-slate-100 hover:border-emerald-200"
                    }`}
                    title={
                      url === googleAvatarUrl
                        ? "Google fiók profilképe"
                        : undefined
                    }
                  >
                    <img
                      src={url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                    {url === googleAvatarUrl && (
                      <div
                        className="absolute bottom-1 right-1 bg-white/95 rounded-full p-1 shadow-sm border border-slate-200 z-10"
                        title="Google profilkép"
                      >
                        <FcGoogle className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {selectedAvatar === url && (
                      <div className="absolute inset-0 bg-emerald-900/10 flex items-center justify-center z-10">
                        <div className="bg-emerald-500/85 text-white rounded-full p-1 shadow-sm">
                          <Check className="w-7 h-7 opacity-85" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom section: Always pinned and visible on screen */}
            <div className="shrink-0 pt-3">
              {/* Divider between library and file upload */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-slate-100"></div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Vagy
                </span>
                <div className="flex-1 h-px bg-slate-100"></div>
              </div>

              {/* Custom Image File Upload Dropzone */}
              <div className="mb-4">
                <label className="flex items-center justify-center gap-3 w-full py-2.5 sm:py-3 px-4 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-emerald-300 transition-colors">
                  <Camera className="w-5 h-5 text-slate-400 shrink-0" />
                  <p className="text-xs sm:text-sm text-slate-600">
                    <span className="font-semibold text-emerald-600">
                      Kattints ide
                    </span>{" "}
                    saját kép feltöltéséhez
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {/* Step 1 Action Buttons */}
              <div className="flex gap-3">
                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="flex-1 py-2.5 sm:py-3 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm rounded-xl shadow-sm duration-150"
                  >
                    Mégse
                  </button>
                )}
                <button
                  onClick={
                    avatarOnlyMode ? handleSaveAvatarOnly : handleNextStep
                  }
                  disabled={loading}
                  className="flex-2 w-full py-2.5 sm:py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-sm hover:shadow duration-150 flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      <span>
                        {avatarOnlyMode ? "Mentés..." : "Betöltés..."}
                      </span>
                    </>
                  ) : avatarOnlyMode ? (
                    <>Mentés</>
                  ) : (
                    <>
                      Tovább <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Display Name Form */}
        {step === 2 && (
          <div className="p-5 sm:p-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <SquareUserRound className="w-5 h-5 text-emerald-600" />
              Adj meg egy nevet
            </h3>
            <form onSubmit={handleSave}>
              <div className="mb-6">
                <input
                  id="displayName"
                  type="text"
                  required
                  maxLength={20}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Megjelenített név (pl. Dávid)"
                  className="input-field"
                />
                <p className="text-xs text-slate-500 mt-2">
                  A többiek ezen a néven látnak majd. Később is módosíthatod.
                </p>
              </div>

              {/* Step 2 Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 sm:py-3 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm rounded-xl shadow-sm duration-150"
                >
                  Vissza
                </button>
                <button
                  type="submit"
                  disabled={loading || displayName.trim().length < 2}
                  className="flex-2 py-2.5 sm:py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-sm hover:shadow duration-150 flex justify-center items-center"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      <span>Mentés...</span>
                    </span>
                  ) : (
                    "Profil mentése"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
