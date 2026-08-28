import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ppit-nanjing.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/console/", "/api/", "/login", "/signup", "/profile/", "/sensus/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
