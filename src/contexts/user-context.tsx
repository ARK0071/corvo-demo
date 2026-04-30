"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useTenant, useTenantHeaders } from "./tenant-context";

export interface AppUser {
  id: string;
  portId: string;
  email: string;
  name: string;
  title: string;
  phone: string | null;
  role: string;
}

interface UserContextValue {
  currentUser: AppUser | null;
  users: AppUser[];
  setCurrentUser: (userId: string) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

const USER_STORAGE_KEY = "corvo_current_user_id";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const tenant = useTenant();
  const headers = useTenantHeaders();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tenant.isLoading) return;

    (async () => {
      try {
        const res = await fetch("/api/users", {
          headers: { ...headers, "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);

          const stored = localStorage.getItem(USER_STORAGE_KEY);
          const matchingUsers = (data.users || []) as AppUser[];
          if (stored && matchingUsers.some((u: AppUser) => u.id === stored)) {
            setCurrentUserId(stored);
          } else if (matchingUsers.length > 0) {
            setCurrentUserId(matchingUsers[0].id);
          }
        }
      } catch { /* ignore */ }
      setIsLoading(false);
    })();
  }, [tenant.isLoading, tenant.portId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCurrentUser = useCallback((userId: string) => {
    setCurrentUserId(userId);
    localStorage.setItem(USER_STORAGE_KEY, userId);
  }, []);

  const currentUser = useMemo(
    () => users.find(u => u.id === currentUserId) || null,
    [users, currentUserId]
  );

  const value: UserContextValue = { currentUser, users, setCurrentUser, isLoading };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useCurrentUser must be used within UserProvider");
  return context;
}

/**
 * Hook to get headers with user info for API requests
 */
export function useUserHeaders(): Record<string, string> {
  const tenant = useTenant();
  const { currentUser } = useCurrentUser();
  return useMemo(
    () => ({
      "x-corvo-environment": tenant.environment,
      "x-corvo-port-id": tenant.portId,
      "x-corvo-port-slug": tenant.portSlug,
      ...(currentUser ? { "x-corvo-user-id": currentUser.id } : {}),
    }),
    [tenant.environment, tenant.portId, tenant.portSlug, currentUser]
  );
}
