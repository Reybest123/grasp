import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Everything behind a login, plus the one-off pages a link in an email lands
// on, is kept out of search. They would only ever redirect a crawler to /login.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/home",
        "/workspace",
        "/plans",
        "/settings",
        "/onboarding",
        "/dashboard",
        "/subject/",
        "/verify-email",
        "/email-confirmed",
        "/reset-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
