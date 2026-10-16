"use client";

import { createContext, useContext, useState, useCallback } from "react";

export const PORTER_PANEL_MIN_WIDTH = 360;
export const PORTER_PANEL_DEFAULT_WIDTH = 480;

const WIDTH_STORAGE_KEY = "porter-panel-width";

interface PorterPanelContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  width: number;
  setWidth: (width: number) => void;
}

const PorterPanelContext = createContext<PorterPanelContextValue | null>(null);

// The real upper bound is enforced by the flex layout (the page keeps a min width);
// this just keeps stored values sane.
export function clampPorterWidth(width: number): number {
  const viewport = typeof window === "undefined" ? Infinity : window.innerWidth;
  return Math.round(Math.min(Math.max(width, PORTER_PANEL_MIN_WIDTH), Math.max(PORTER_PANEL_MIN_WIDTH, viewport)));
}

function readSavedWidth(): number {
  try {
    const saved = typeof window === "undefined" ? 0 : Number(localStorage.getItem(WIDTH_STORAGE_KEY));
    return saved ? clampPorterWidth(saved) : PORTER_PANEL_DEFAULT_WIDTH;
  } catch {
    // Storage blocked — use default width
    return PORTER_PANEL_DEFAULT_WIDTH;
  }
}

export function PorterPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  // Safe to read storage here: the panel starts closed, so width never affects server HTML
  const [width, setWidthState] = useState(readSavedWidth);

  const setWidth = useCallback((next: number) => {
    const clamped = clampPorterWidth(next);
    setWidthState(clamped);
    try {
      localStorage.setItem(WIDTH_STORAGE_KEY, String(clamped));
    } catch {
      // Storage blocked — width just won't persist
    }
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <PorterPanelContext.Provider value={{ isOpen, open, close, toggle, width, setWidth }}>
      {children}
    </PorterPanelContext.Provider>
  );
}

export function usePorterPanel() {
  const ctx = useContext(PorterPanelContext);
  if (!ctx) throw new Error("usePorterPanel must be used within PorterPanelProvider");
  return ctx;
}
