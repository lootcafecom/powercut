/**
 * Centralized site configuration.
 * Change branding/defaults here — never hardcode brand strings elsewhere.
 */
export const siteConfig = {
  name: "PowerCut",
  tagline: "Power Cut Today? Check Before It Happens.",
  description:
    "Find scheduled and reported electricity outages in your city and locality.",
  defaultCountry: "India",
  defaultCountrySlug: "india",
  defaultTimezone: "Asia/Kolkata",
  contactEmail: "hello@example.com",
  social: {
    twitter: "",
    facebook: "",
  },
  seo: {
    defaultTitleSuffix: " | PowerCut",
    defaultOgImage: "/og-default.png",
  },
} as const;

export type SiteConfig = typeof siteConfig;
