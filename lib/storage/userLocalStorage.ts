import type { HealthProfile } from "@/types/user";

export interface RecentActivityItem {
  id: string;
  type: "diagnosis" | "lyra" | "hospital" | "profile";
  title: string;
  severity?: string;
  created_at: string;
}

const PROFILE_PREFIX = "pulse_profile_";
const ACTIVITY_PREFIX = "pulse_activity_";
const MAX_RECENT = 20;

function profileKey(userId: string) {
  return `${PROFILE_PREFIX}${userId}`;
}

function activityKey(userId: string) {
  return `${ACTIVITY_PREFIX}${userId}`;
}

export function getLocalProfile(userId: string): HealthProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(profileKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as HealthProfile;
  } catch {
    return null;
  }
}

export function saveLocalProfile(userId: string, profile: HealthProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(profileKey(userId), JSON.stringify(profile));
}

export function getLocalRecentActivity(userId: string): RecentActivityItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(activityKey(userId));
    if (!raw) return [];
    const items = JSON.parse(raw) as RecentActivityItem[];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function setLocalRecentActivity(
  userId: string,
  items: RecentActivityItem[]
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    activityKey(userId),
    JSON.stringify(items.slice(0, MAX_RECENT))
  );
}

export function addLocalRecentActivity(
  userId: string,
  item: RecentActivityItem
): void {
  const existing = getLocalRecentActivity(userId);
  const filtered = existing.filter((a) => a.id !== item.id);
  setLocalRecentActivity(userId, [item, ...filtered]);
}

export function mergeProfile(
  local: HealthProfile | null,
  remote: HealthProfile | null
): HealthProfile | null {
  if (!local && !remote) return null;
  return { ...remote, ...local };
}
