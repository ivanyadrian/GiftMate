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
 * are automatically mapped to "/avatars/bird.webp", and upgrades Google
 * avatars to high-resolution (512x512) format.
 */
export const normalizeAvatarUrl = (url?: string | null): string => {
  if (!url) return "";

  // Upgrade Google avatar resolution from low-res =s96-c to high-res =s512-c
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=s\d+(-c)?$/, "=s512-c");
  }

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
 * Extracts the Google avatar URL from a Supabase user object if authenticated via Google,
 * upgrading it to high resolution (512x512) instead of the default 96x96 thumbnail.
 */
export const getGoogleAvatarUrl = (user?: any): string | null => {
  if (!user) return null;
  const gIdentity = user.identities?.find(
    (id: any) => id.provider === "google",
  );
  const rawUrl =
    gIdentity?.identity_data?.avatar_url ||
    gIdentity?.identity_data?.picture ||
    (user.app_metadata?.provider === "google" ||
    user.user_metadata?.iss?.includes("google")
      ? user.user_metadata?.avatar_url || user.user_metadata?.picture
      : null) ||
    null;

  if (!rawUrl) return null;

  if (rawUrl.includes("googleusercontent.com")) {
    return rawUrl.replace(/=s\d+(-c)?$/, "=s512-c");
  }

  return rawUrl;
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

/**
 * Optimizes an uploaded image file on the client side:
 * - Center-crops the image to a perfect 1:1 square.
 * - Resizes to target dimension (default 512x512 px) using high-quality canvas smoothing.
 * - Compresses to WEBP (quality: 0.9) to drastically reduce upload size (often 10MB -> ~80KB)
 *   while eliminating browser downscaling GPU aliasing across all screen sizes.
 */
export const optimizeImageForAvatar = async (
  file: File,
  targetSize = 512,
): Promise<File> => {
  // If SVG or animated GIF, return as is to preserve vector or frame data
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve(file);
            return;
          }

          // Enable high-quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Calculate center square crop (cover)
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(
            img,
            sx,
            sy,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize,
          );

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const cleanBaseName = file.name
                .replace(/\.[^/.]+$/, "")
                .replace(/[^a-zA-Z0-9_-]/g, "_");
              const optimizedFile = new File([blob], `${cleanBaseName}.jpg`, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(optimizedFile);
            },
            "image/jpeg",
            0.9,
          );
        } catch (err) {
          console.error("Canvas image optimization error:", err);
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};
