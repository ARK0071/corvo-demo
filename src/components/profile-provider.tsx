"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { PortProfile } from "@/data/port-profile";
import { getAllProfiles, DEFAULT_PROFILE_ID, getDefaultProfile } from "@/data/profiles";

interface ProfileContextValue {
  profile: PortProfile;
  profileId: string;
  setProfileId: (id: string) => void;
  allProfiles: Array<{ id: string; profile: PortProfile }>;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: getDefaultProfile(),
  profileId: DEFAULT_PROFILE_ID,
  setProfileId: () => {},
  allProfiles: [],
  isLoading: true,
});

export function useProfile() {
  return useContext(ProfileContext);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profileId, setProfileIdState] = useState(DEFAULT_PROFILE_ID);
  // Start with static profiles as fallback, then load from API
  const [allProfiles, setAllProfiles] = useState<Array<{ id: string; profile: PortProfile }>>(
    () => getAllProfiles()
  );
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profiles from API (includes DB-persisted entities)
  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/profiles");
      if (res.ok) {
        const data = await res.json();
        if (data.profiles?.length) {
          setAllProfiles(data.profiles);
        }
      }
    } catch {
      // Fall back to static profiles
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Restore stored profile ID from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("corvo-profile-id");
    if (stored) {
      setProfileIdState(stored);
    }
  }, []);

  function setProfileId(id: string) {
    const resolved = allProfiles.find((p) => p.id === id);
    if (resolved) {
      setProfileIdState(id);
      localStorage.setItem("corvo-profile-id", id);
    }
  }

  const profile =
    allProfiles.find((p) => p.id === profileId)?.profile ??
    allProfiles[0]?.profile ??
    getDefaultProfile();

  return (
    <ProfileContext.Provider value={{ profile, profileId, setProfileId, allProfiles, isLoading }}>
      {children}
    </ProfileContext.Provider>
  );
}
