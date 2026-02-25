export type ServiceKey =
  | "custom-home-builds"
  | "renovations-expansions"
  | "sustainable-craftsmanship";

export type MediaSectionKey =
  | "homeHero"
  | "homeFeatured"
  | "homeProcess"
  | "serviceCustomHomeBuilds"
  | "serviceRenovationsExpansions"
  | "serviceSustainableCraftsmanship"
  | "beforeAfterSlider";

export interface ServiceCard {
  id: string;
  title: string;
  blurb: string;
  href: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

export interface ProcessStep {
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ServiceContent {
  slug: ServiceKey;
  name: string;
  shortPitch: string;
  intro: string[];
  whoFor: string[];
  whoNotFor: string[];
  faq: FaqItem[];
}

export interface MediaSectionConfig {
  label: string;
  sources: string[];
  maxItems: number;
  pinned: string[];
  includeVideos: boolean;
}

export interface BrandConfig {
  name: string;
  logo: {
    src: string;
    alt: string;
  };
  tagline: string;
  phone: string;
  email: string;
  address: string;
  serviceArea: string;
  socials: {
    instagram: string;
    facebook: string;
    linkedin: string;
  };
}

export interface SiteConfig {
  brand: BrandConfig;
  seo: {
    defaultTitle: string;
    defaultDescription: string;
    ogImage: string;
  };
  home: {
    hero: {
      headline: string;
      subheadline: string;
      primaryCtaLabel: string;
      secondaryCtaLabel: string;
      trustSignals: string[];
    };
    services: ServiceCard[];
    testimonials: Testimonial[];
    processSteps: ProcessStep[];
    conversionBand: {
      headline: string;
      body: string;
      ctaLabel: string;
    };
  };
  services: Record<ServiceKey, ServiceContent>;
  contactPage: {
    headline: string;
    intro: string;
    privacyNote: string;
    successMessage: string;
  };
  mediaSections: Record<MediaSectionKey, MediaSectionConfig>;
  runtimeAssets: {
    homeHeroVideo: {
      src?: string;
      storageKey?: string;
      mimeType: string;
      fileName: string;
    } | null;
  };
  altOverrides: Record<string, string>;
}
