import { useEffect } from "react";

interface ShortcutHandlers {
  onRefresh: () => void;
  onToggleTheme: () => void;
  onToggleFullscreen: () => void;
}

export function useKeyboardShortcuts({ onRefresh, onToggleTheme, onToggleFullscreen }: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        onRefresh();
      }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        onToggleTheme();
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        onToggleFullscreen();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onRefresh, onToggleTheme, onToggleFullscreen]);
}
