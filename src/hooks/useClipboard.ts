import { useState, useCallback } from "react";

/**
 * useClipboard Hook
 *
 * A reusable custom hook that wraps the browser's Clipboard API (`navigator.clipboard.writeText`).
 * Provides temporary visual feedback state (e.g. displaying a checkmark for 2 seconds),
 * prevents unwanted event bubbling when triggered inside clickable parent cards,
 * and handles precise string matching for multi-item lists (e.g. room code list).
 *
 * @param timeout Duration in milliseconds before the copied status resets back to initial state (default: 2000ms).
 */
export function useClipboard(timeout: number = 2000) {
  // Holds the text that was most recently copied, or null when reset
  const [copiedText, setCopiedText] = useState<string | null>(null);

  /**
   * Copies the specified text to the system clipboard.
   *
   * @param text The string to be copied into clipboard.
   * @param e Optional React SyntheticEvent or native DOM Event. If provided, stops event propagation
   *          so clicking a copy button inside a parent link/card does not trigger parent navigation.
   * @returns Promise resolving to boolean indicating whether the operation succeeded.
   */
  const copy = useCallback(
    async (text: string, e?: React.SyntheticEvent | Event) => {
      // Prevent triggering click handlers on parent elements (e.g., room card navigation)
      if (e && "stopPropagation" in e) {
        e.stopPropagation();
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopiedText(text);

        // Reset copied state after the specified timeout duration.
        // Checking `current === text` ensures that if a user quickly copies another item,
        // an earlier timer does not prematurely clear the newer item's active feedback.
        setTimeout(() => {
          setCopiedText((current) => (current === text ? null : current));
        }, timeout);

        return true;
      } catch (err) {
        console.error("Failed to copy text to clipboard:", err);
        return false;
      }
    },
    [timeout],
  );

  /**
   * Evaluates whether a given text (or any text) is currently copied.
   *
   * @param text Optional string to compare against the active copied text.
   *             - When omitted: returns true if any copy operation is currently active.
   *             - When provided: returns true only if the exact matching text is active.
   */
  const isCopied = useCallback(
    (text?: string) => {
      if (text === undefined) {
        return !!copiedText;
      }
      return copiedText === text;
    },
    [copiedText],
  );

  return {
    copiedText,
    isCopied,
    copy,
  };
}
