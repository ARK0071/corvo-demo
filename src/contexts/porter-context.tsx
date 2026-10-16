"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface PorterPanelContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const PorterPanelContext = createContext<PorterPanelContextValue | null>(null);

export function PorterPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <PorterPanelContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </PorterPanelContext.Provider>
  );
}

export function usePorterPanel() {
  const ctx = useContext(PorterPanelContext);
  if (!ctx) throw new Error("usePorterPanel must be used within PorterPanelProvider");
  return ctx;
}
