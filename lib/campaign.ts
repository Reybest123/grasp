// The campaign tag (utm_*) a visitor arrived with, held in sessionStorage for
// the tab so the landing page, the signup page and the signup itself are all
// credited to the same ad. Browser-only; every call is safe where storage is
// blocked.

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

const KEY = "grasp.utm";

/**
 * The campaign in this page's address, which replaces any held for the tab, or
 * else the one held from earlier in the tab. Empty when there is neither.
 */
export function currentCampaign(): Record<string, string> {
  const found: Record<string, string> = {};
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) found[key] = value;
    }
    if (Object.keys(found).length > 0) {
      sessionStorage.setItem(KEY, JSON.stringify(found));
      return found;
    }
    const held = JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
    return held && typeof held === "object" ? held : {};
  } catch {
    return found;
  }
}
