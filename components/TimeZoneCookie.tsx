"use client";

// Tells the server which time zone this device is in (lib/currency.ts), so a
// student reached without Cloudflare's country header, on staging or a
// misconfigured proxy, is still shown their own currency. Set once a page has
// loaded, which is long before the plan step: signup and onboarding come first.

import { useEffect } from "react";
import { TIME_ZONE_COOKIE } from "@/lib/currency";

export function TimeZoneCookie() {
  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!zone) return;
      const value = encodeURIComponent(zone);
      if (document.cookie.split("; ").includes(`${TIME_ZONE_COOKIE}=${value}`)) return;
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${TIME_ZONE_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    } catch {
      // No time zone to give; the language header is still there.
    }
  }, []);
  return null;
}
