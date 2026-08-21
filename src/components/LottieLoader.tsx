import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import loaderAnimation from "../assets/animations/loader.lottie";

interface LottieLoaderProps {
  /** Optional Tailwind CSS classes to override dimensions and spacing (defaults to 'w-8 h-8') */
  className?: string;
}

/**
 * LottieLoader Component
 *
 * A reusable, vector-based loading indicator powered by DotLottie.
 * Used application-wide for asynchronous loading states, including:
 * - React Suspense fallback during lazy page-chunk resolution.
 * - Initial data loading states on Dashboard, Profile, and RoomDetails views.
 *
 * @param props.className Custom size/layout classes (e.g. 'w-24 h-24' for page-level loaders).
 */
export default function LottieLoader({
  className = "w-8 h-8",
}: LottieLoaderProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <DotLottieReact src={loaderAnimation} loop autoplay />
    </div>
  );
}
