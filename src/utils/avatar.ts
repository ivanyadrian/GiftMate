/**
 * Dynamically discovers all avatar files present in the public/avatars folder.
 * Powered by Vite's import.meta.glob — any image (.webp, .png, .jpg, .jpeg, .svg)
 * dropped into public/avatars/ will automatically be detected and included in the list!
 */
export const DEFAULT_AVATARS: string[] = Object.keys(
  import.meta.glob("/public/avatars/*.{webp,png,jpg,jpeg,svg}"),
).map((path) => path.replace(/^\/public/, ""));

/**
 * Normalizes avatar URLs so that legacy paths like "/bird.webp"
 * are automatically mapped to "/avatars/bird.webp".
 */
export const normalizeAvatarUrl = (url?: string | null): string => {
  if (!url) return "";

  // If already pointing to /avatars/ or is external / blob / data URL, return as is
  if (
    url.startsWith("/avatars/") ||
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  // Handle legacy root-level avatar paths (e.g. "/bird.webp" -> "/avatars/bird.webp")
  if (url.startsWith("/")) {
    const candidate = `/avatars/${url.slice(1)}`;
    if (DEFAULT_AVATARS.includes(candidate)) {
      return candidate;
    }
  }

  return url;
};

/**
 * Extracts the Google avatar URL from a Supabase user object if authenticated via Google.
 */
export const getGoogleAvatarUrl = (user?: any): string | null => {
  if (!user) return null;
  const gIdentity = user.identities?.find(
    (id: any) => id.provider === "google",
  );
  return (
    gIdentity?.identity_data?.avatar_url ||
    gIdentity?.identity_data?.picture ||
    (user.app_metadata?.provider === "google" ||
    user.user_metadata?.iss?.includes("google")
      ? user.user_metadata?.avatar_url || user.user_metadata?.picture
      : null) ||
    null
  );
};

/**
 * Safely extracts the bucket-relative storage path for custom user uploads
 * (e.g., 'user_uploads/userId-12345.png') from a full public URL or relative path.
 */
export const extractStoragePath = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const decoded = decodeURIComponent(url);
    const match = decoded.match(/user_uploads\/[^?#\s]+/);
    return match ? match[0] : null;
  } catch {
    const match = url.match(/user_uploads\/[^?#\s]+/);
    return match ? match[0] : null;
  }
};
