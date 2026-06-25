"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { PortProfile } from "@/data/port-profile";
import { DEFAULT_PROFILE_ID } from "@/data/profiles";
import { useTenant } from "@/contexts/tenant-context";

interface ProfileContextValue {
  profile: PortProfile;
  profileId: string;
  setProfileId: (id: string) => void;
  allProfiles: Array<{ id: string; profile: PortProfile }>;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_PROFILE: PortProfile = {
  name: "",
  entityType: "",
  classification: "",
  location: { city: "", state: "", stateCode: "", county: "", region: "" },
  characteristics: { cargoTypes: [] },
  priorities: [],
  capabilities: [],
  needs: [],
  certifications: [],
  environmentalGoals: [],
  communityImpact: [],
};

const ProfileContext = createContext<ProfileContextValue>({
  profile: EMPTY_PROFILE,
  profileId: DEFAULT_PROFILE_ID,
  setProfileId: () => {},
  allProfiles: [],
  isLoading: true,
  error: null,
});

export function useProfile() {
  return useContext(ProfileContext);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const tenant = useTenant();
  const userPortId = session?.user?.portId;
  const userRole = session?.user?.role;
  const isAdmin = userRole === "admin";

  const [profileId, setProfileIdState] = useState(DEFAULT_PROFILE_ID);
  const [allProfiles, setAllProfiles] = useState<Array<{ id: string; profile: PortProfile }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profiles from API (DB-only)
  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/profiles");
      if (res.ok) {
        const data = await res.json();
        setAllProfiles(data.profiles || []);
        setError(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load profiles");
      }
    } catch {
      setError("Failed to connect to server");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Set profile based on user's entity (portId) from session.
  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (userPortId && !isAdmin) {
      setProfileIdState(userPortId);
    } else if (isAdmin) {
      const stored = localStorage.getItem("corvo-profile-id");
      if (stored) {
        setProfileIdState(stored);
      } else if (userPortId) {
        setProfileIdState(userPortId);
      }
    }
  }, [sessionStatus, userPortId, isAdmin]);

  function setProfileId(id: string) {
    if (!isAdmin) return;
    const resolved = allProfiles.find((p) => p.id === id);
    if (resolved) {
      setProfileIdState(id);
      localStorage.setItem("corvo-profile-id", id);
      tenant.setPort(id);
    }
  }

  // Keep tenant port in sync with profileId
  useEffect(() => {
    if (isAdmin && profileId && tenant.portId !== profileId) {
      tenant.setPort(profileId);
    }
  }, [isAdmin, profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  const profile =
    allProfiles.find((p) => p.id === profileId)?.profile ??
    allProfiles[0]?.profile ??
    EMPTY_PROFILE;

  return (
    <ProfileContext.Provider value={{ profile, profileId, setProfileId, allProfiles, isLoading, error }}>
      {children}
    </ProfileContext.Provider>
  );
}
