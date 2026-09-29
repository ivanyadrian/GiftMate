import React, { useState, useEffect, forwardRef } from "react";
import { normalizeAvatarUrl } from "../../utils/avatar";

export interface AvatarImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> {
  src?: string | null;
  alt?: string;
  name?: string | null;
  fallbackIcon?: React.ReactNode;
  fallbackClassName?: string;
}

/**
 * AvatarImage Component
 *
 * Universal, secure image component for user avatars across the application:
 * - Always enforces `referrerPolicy="no-referrer"` to prevent Google user content CDN 403 Forbidden errors.
 * - Automatically normalizes URLs and upgrades Google avatars to high-res 512x512 format.
 * - Gracefully handles image load errors with optional fallback initials or fallback icon.
 * - Forward-ref compatible to allow parent components to inspect DOM properties (e.g. image.complete).
 */
export const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  (
    {
      src,
      alt = "Avatar",
      name,
      className = "w-full h-full object-cover",
      fallbackIcon,
      fallbackClassName,
      onError,
      ...rest
    },
    ref,
  ) => {
    const [hasError, setHasError] = useState(false);
    const normalizedSrc = normalizeAvatarUrl(src);

    // Reset error state whenever the source URL changes
    useEffect(() => {
      setHasError(false);
    }, [src]);

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setHasError(true);
      if (onError) {
        onError(e);
      }
    };

    if (!normalizedSrc || hasError) {
      if (fallbackIcon) {
        return <>{fallbackIcon}</>;
      }
      if (name) {
        const initial = name.trim().charAt(0).toUpperCase() || "?";
        return (
          <div
            className={
              fallbackClassName ||
              `flex items-center justify-center bg-emerald-600 text-white font-bold select-none ${className}`
            }
          >
            {initial}
          </div>
        );
      }
      return null;
    }

    return (
      <img
        ref={ref}
        src={normalizedSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={handleError}
        className={className}
        {...rest}
      />
    );
  },
);

AvatarImage.displayName = "AvatarImage";

export default AvatarImage;
