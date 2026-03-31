import { AsyncLocalStorage } from "async_hooks";
import { DEFAULT_PROFILE_ID } from "@/data/profiles";

const storage = new AsyncLocalStorage<string>();

export function runWithProfileId<T>(profileId: string, fn: () => T): T {
  return storage.run(profileId, fn);
}

export function runWithProfileIdAsync<T>(profileId: string, fn: () => Promise<T>): Promise<T> {
  return storage.run(profileId, fn);
}

export function getRequestProfileId(): string {
  return storage.getStore() ?? DEFAULT_PROFILE_ID;
}
