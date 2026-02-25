import type { SiteConfig } from "@/lib/types";

export function buildLocalBusinessSchema(config: SiteConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: config.brand.name,
    description: config.brand.tagline,
    telephone: config.brand.phone,
    email: config.brand.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: config.brand.address,
      addressRegion: "TODO",
      addressCountry: "CA"
    },
    areaServed: config.brand.serviceArea,
    sameAs: [
      config.brand.socials.instagram,
      config.brand.socials.facebook,
      config.brand.socials.linkedin
    ]
  };
}
