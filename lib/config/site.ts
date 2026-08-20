/**
 * Centralized site configuration.
 * Change branding/defaults here — never hardcode brand strings elsewhere.
 */
export const siteConfig = {
  name: "PowerCut India",
  shortName: "PowerCut",
  tagline: "Stay Ahead. Stay Powered.",
  description:
    "Real-time and scheduled power cut information across India. Plan better. Stay prepared.",
  defaultCountry: "India",
  defaultCountrySlug: "india",
  defaultTimezone: "Asia/Kolkata",
  contactEmail: "hello@example.com",
  social: {
    twitter: "",
    facebook: "",
  },
  seo: {
    defaultTitleSuffix: " | PowerCut India",
    defaultOgImage: "/og-default.png",
  },
} as const;

export type SiteConfig = typeof siteConfig;
