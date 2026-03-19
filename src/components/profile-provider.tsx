"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { PortProfile } from "@/data/port-profile";
import { getProfile, getDefaultProfile, getAllProfiles, DEFAULT_PROFILE_ID } from "@/data/profiles";

interface ProfileContextValue {
  profile: PortProfile;
  profileId: string;
  setProfileId: (id: string) => void;
  allProfiles: Array<{ id: string; profile: PortProfile }>;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: getDefaultProfile(),
  profileId: DEFAULT_PROFILE_ID,
  setProfileId: () => {},
  allProfiles: [],
});

export function useProfile() {
  return useContext(ProfileContext);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profileId, setProfileIdState] = useState(DEFAULT_PROFILE_ID);
  const allProfiles = getAllProfiles();

  useEffect(() => {
    const stored = localStorage.getItem("corvo-profile-id");
    if (stored && getProfile(stored)) {
      setProfileIdState(stored);
    }
  }, []);

  function setProfileId(id: string) {
    const resolved = getProfile(id);
    if (resolved) {
      setProfileIdState(id);
      localStorage.setItem("corvo-profile-id", id);
    }
  }

  const profile = getProfile(profileId) ?? getDefaultProfile();

  return (
    <ProfileContext.Provider value={{ profile, profileId, setProfileId, allProfiles }}>
      {children}
    </ProfileContext.Provider>
  );
}
