import type { MetadataRoute } from "next";

const baseUrl = "https://echover.xyz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/private/",
    },
    sitemap: baseUrl,
  };
}