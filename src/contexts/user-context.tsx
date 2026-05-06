"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";

export interface AppUser {
  id: string;
  portId: string;
  email: string;
  name: string;
  title: string;
  phone: string | null;
  role: string;
  image?: string | null;
}

interface UserContextValue {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  const user: AppUser | null = useMemo(() => {
    if (!session?.user) return null;
    return {
      id: session.user.id,
      portId: session.user.portId,
      email: session.user.email,
      name: session.user.name || "",
      title: session.user.title || "",
      phone: null,
      role: session.user.role,
      image: session.user.image,
    };
  }, [session?.user]);

  const value: UserContextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!session?.user,
      isAdmin: session?.user?.role === "admin",
      logout: () => signOut({ callbackUrl: "/login" }),
    }),
    [user, isLoading, session?.user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useCurrentUser must be used within UserProvider");
  return context;
}
