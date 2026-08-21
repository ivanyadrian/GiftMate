import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop Component
 *
 * A headless utility component that resets the browser window's scroll position
 * back to the top whenever the route location changes.
 *
 * Problem it solves:
 * In Single Page Applications (SPAs) built with React Router, navigating between
 * routes updates the DOM dynamically without a full browser reload. By default,
 * the browser preserves the current scroll offset, which causes newly navigated
 * pages to appear scrolled down if the previous view was scrolled.
 *
 * Usage:
 * Mount this component once inside the `<BrowserRouter>` tree (e.g., in `App.tsx`).
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Instantly scroll window to top-left corner on route transition
    window.scrollTo(0, 0);
  }, [pathname]);

  // Headless component: does not render any visible DOM elements
  return null;
}


