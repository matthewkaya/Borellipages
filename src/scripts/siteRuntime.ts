import { loadRuntimeConfig } from "@/lib/config";
import { MEDIA_INDEX, type MediaAsset } from "@/lib/mediaIndex";
import {
  getHomeFeaturedCategory,
  resolveAlt,
  selectSectionAssets
} from "@/lib/mediaSelect";
import type { MediaSectionKey, ServiceKey, SiteConfig } from "@/lib/types";

function byId<T extends HTMLElement>(id: string): T | null {
  const element = document.getElementById(id);
  return element as T | null;
}

function setText(id: string, value: string): void {
  const element = byId<HTMLElement>(id);
  if (element) {
    element.textContent = value;
  }
}

function renderList(containerId: string, values: string[]): void {
  const container = byId<HTMLElement>(containerId);
  if (!container) {
    return;
  }

  container.innerHTML = "";
  values.forEach((value) => {
    const item = document.createElement("li");
    item.className = "badge";
    item.textContent = value;
    container.appendChild(item);
  });
}

function createMediaNode(
  asset: MediaAsset,
  alt: string,
  eager = false
): HTMLElement {
  const wrapper = document.createElement("article");
  wrapper.className = "media-tile aspect-[4/3]";

  if (asset.type === "image") {
    const image = document.createElement("img");
    image.src = asset.src;
    image.width = asset.width;
    image.height = asset.height;
    image.alt = alt;
    image.loading = eager ? "eager" : "lazy";
    image.decoding = "async";
    wrapper.appendChild(image);
  } else {
    const video = document.createElement("video");
    video.src = asset.src;
    video.controls = true;
    video.preload = eager ? "metadata" : "none";
    video.setAttribute("playsinline", "true");
    video.setAttribute("aria-label", alt);
    wrapper.appendChild(video);
  }

  return wrapper;
}

function renderHeroMedia(asset: MediaAsset | undefined, altOverrides: Record<string, string>) {
  const shell = byId<HTMLElement>("home-hero-media-shell");
  if (!shell || !asset) {
    return;
  }

  shell.innerHTML = "";
  const node = createMediaNode(asset, resolveAlt(asset, altOverrides), true);
  node.className = "h-full w-full";
  const media = node.firstElementChild;
  if (media) {
    media.classList.add("h-full", "w-full", "object-cover");
  }

  shell.appendChild(node);
}

function renderUploadedHeroVideo(config: SiteConfig): boolean {
  const shell = byId<HTMLElement>("home-hero-media-shell");
  const uploadedVideo = config.runtimeAssets?.homeHeroVideo;
  if (!shell || !uploadedVideo?.src) {
    return false;
  }

  shell.innerHTML = "";

  const wrapper = document.createElement("article");
  wrapper.className = "h-full w-full";

  const video = document.createElement("video");
  video.src = uploadedVideo.src;
  video.controls = true;
  video.preload = "metadata";
  video.setAttribute("playsinline", "true");
  video.setAttribute("aria-label", uploadedVideo.fileName || "Homepage hero video");
  video.className = "h-full w-full object-cover";

  wrapper.appendChild(video);
  shell.appendChild(wrapper);
  return true;
}

function renderFeaturedGallery(config: SiteConfig) {
  const container = byId<HTMLElement>("home-featured-grid");
  if (!container) {
    return;
  }

  const section = config.mediaSections.homeFeatured;
  const assets = selectSectionAssets(MEDIA_INDEX, section);

  container.innerHTML = "";

  if (assets.length === 0) {
    const empty = document.createElement("p");
    empty.className = "rounded-xl border border-dashed border-ink/25 bg-white px-4 py-6 text-sm text-slate";
    empty.textContent = "Add project media files to the configured folders to populate featured projects.";
    container.appendChild(empty);
    return;
  }

  assets.forEach((asset, index) => {
    const tile = createMediaNode(asset, resolveAlt(asset, config.altOverrides), index < 2);
    tile.dataset.category = getHomeFeaturedCategory(asset);
    tile.dataset.filterItem = "true";
    tile.classList.add("min-h-[14rem]");
    container.appendChild(tile);
  });

  wireFeaturedFilter();
}

function wireFeaturedFilter() {
  const tabsRoot = byId<HTMLElement>("home-featured-tabs");
  const gallery = byId<HTMLElement>("home-featured-grid");
  if (!tabsRoot || !gallery) {
    return;
  }

  const buttons = Array.from(
    tabsRoot.querySelectorAll<HTMLButtonElement>("[data-filter]")
  );

  const applyFilter = (filter: string) => {
    buttons.forEach((button) => {
      const active = button.dataset.filter === filter;
      button.setAttribute("aria-selected", String(active));
      button.classList.toggle("bg-brand");
      button.classList.toggle("text-white", active);
      button.classList.toggle("text-ink", !active);
      button.classList.toggle("border-brand", active);
    });

    const items = Array.from(
      gallery.querySelectorAll<HTMLElement>("[data-filter-item]")
    );

    items.forEach((item) => {
      const category = item.dataset.category ?? "all";
      const visible = filter === "all" || filter === category;
      item.classList.toggle("hidden", !visible);
    });
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      applyFilter(button.dataset.filter ?? "all");
    });
  });

  applyFilter("all");
}

function renderServiceCards(config: SiteConfig) {
  const container = byId<HTMLElement>("home-service-cards");
  if (!container) {
    return;
  }

  container.innerHTML = "";
  config.home.services.forEach((service) => {
    const card = document.createElement("article");
    card.className = "surface-card rounded-2xl p-6";

    const title = document.createElement("h3");
    title.className = "text-xl font-semibold text-ink";
    title.textContent = service.title;

    const body = document.createElement("p");
    body.className = "mt-3 text-sm leading-relaxed text-slate";
    body.textContent = service.blurb;

    const link = document.createElement("a");
    link.className = "mt-5 inline-flex text-sm font-semibold text-brand underline underline-offset-4";
    link.href = service.href;
    link.textContent = "View service details";

    card.append(title, body, link);
    container.appendChild(card);
  });
}

function renderTestimonials(config: SiteConfig) {
  const container = byId<HTMLElement>("home-testimonials");
  if (!container) {
    return;
  }

  container.innerHTML = "";
  config.home.testimonials.forEach((testimonial) => {
    const article = document.createElement("article");
    article.className = "surface-card rounded-2xl p-6";

    const quote = document.createElement("p");
    quote.className = "text-sm leading-relaxed text-ink";
    quote.textContent = `“${testimonial.quote}”`;

    const footer = document.createElement("p");
    footer.className = "mt-4 text-xs font-medium uppercase tracking-wide text-slate";
    footer.textContent = `${testimonial.name} · ${testimonial.role}`;

    article.append(quote, footer);
    container.appendChild(article);
  });
}

function renderProcessSteps(config: SiteConfig) {
  const container = byId<HTMLElement>("home-process-steps");
  if (!container) {
    return;
  }

  container.innerHTML = "";
  config.home.processSteps.forEach((step) => {
    const item = document.createElement("article");
    item.className = "surface-card rounded-xl p-4";

    const title = document.createElement("h3");
    title.className = "text-base font-semibold text-ink";
    title.textContent = step.title;

    const body = document.createElement("p");
    body.className = "mt-2 text-sm text-slate";
    body.textContent = step.description;

    item.append(title, body);
    container.appendChild(item);
  });
}

function renderProcessMedia(config: SiteConfig) {
  const container = byId<HTMLElement>("home-process-media");
  if (!container) {
    return;
  }

  const assets = selectSectionAssets(MEDIA_INDEX, config.mediaSections.homeProcess);
  container.innerHTML = "";

  if (assets.length === 0) {
    const empty = document.createElement("p");
    empty.className = "rounded-xl border border-dashed border-ink/25 bg-white px-4 py-6 text-sm text-slate";
    empty.textContent = "Add process photos or videos to populate this section.";
    container.appendChild(empty);
    return;
  }

  assets.forEach((asset) => {
    const node = createMediaNode(asset, resolveAlt(asset, config.altOverrides));
    node.classList.add("min-h-[12rem]");
    container.appendChild(node);
  });
}

function mapServiceToSection(serviceKey: ServiceKey): MediaSectionKey {
  switch (serviceKey) {
    case "custom-home-builds":
      return "serviceCustomHomeBuilds";
    case "renovations-expansions":
      return "serviceRenovationsExpansions";
    case "sustainable-craftsmanship":
      return "serviceSustainableCraftsmanship";
  }
}

function renderServiceSection(config: SiteConfig, serviceKey: ServiceKey) {
  const service = config.services[serviceKey];
  setText("service-title", service.name);
  setText("service-short-pitch", service.shortPitch);

  const introList = byId<HTMLElement>("service-intro");
  if (introList) {
    introList.innerHTML = "";
    service.intro.forEach((paragraph) => {
      const p = document.createElement("p");
      p.className = "text-sm leading-relaxed text-slate";
      p.textContent = paragraph;
      introList.appendChild(p);
    });
  }

  const forList = byId<HTMLElement>("service-who-for");
  if (forList) {
    forList.innerHTML = "";
    service.whoFor.forEach((item) => {
      const li = document.createElement("li");
      li.className = "flex gap-2";
      const bullet = document.createElement("span");
      bullet.setAttribute("aria-hidden", "true");
      bullet.textContent = "•";
      const text = document.createElement("span");
      text.textContent = item;
      li.append(bullet, text);
      forList.appendChild(li);
    });
  }

  const notForList = byId<HTMLElement>("service-who-not-for");
  if (notForList) {
    notForList.innerHTML = "";
    service.whoNotFor.forEach((item) => {
      const li = document.createElement("li");
      li.className = "flex gap-2";
      const bullet = document.createElement("span");
      bullet.setAttribute("aria-hidden", "true");
      bullet.textContent = "•";
      const text = document.createElement("span");
      text.textContent = item;
      li.append(bullet, text);
      notForList.appendChild(li);
    });
  }

  const faqContainer = byId<HTMLElement>("service-faq");
  if (faqContainer) {
    faqContainer.innerHTML = "";
    service.faq.forEach((item, index) => {
      const details = document.createElement("details");
      details.className = "surface-card rounded-xl p-4";
      details.open = index === 0;

      const summary = document.createElement("summary");
      summary.className = "cursor-pointer text-sm font-semibold text-ink";
      summary.textContent = item.question;

      const answer = document.createElement("p");
      answer.className = "mt-3 text-sm leading-relaxed text-slate";
      answer.textContent = item.answer;

      details.append(summary, answer);
      faqContainer.appendChild(details);
    });
  }

  const gallery = byId<HTMLElement>("service-gallery");
  if (gallery) {
    gallery.innerHTML = "";
    const section = config.mediaSections[mapServiceToSection(serviceKey)];
    const assets = selectSectionAssets(MEDIA_INDEX, section);

    if (assets.length === 0) {
      const empty = document.createElement("p");
      empty.className = "rounded-xl border border-dashed border-ink/25 bg-white px-4 py-6 text-sm text-slate";
      empty.textContent = "Upload service media to populate this gallery.";
      gallery.appendChild(empty);
    } else {
      assets.forEach((asset) => {
        const node = createMediaNode(asset, resolveAlt(asset, config.altOverrides));
        node.classList.add("min-h-[12rem]");
        gallery.appendChild(node);
      });
    }
  }
}

function showContactSuccess(config: SiteConfig): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("success")) {
    return;
  }

  const banner = byId<HTMLElement>("contact-success");
  if (!banner) {
    return;
  }

  banner.classList.remove("hidden");
  banner.textContent = config.contactPage.successMessage;
}

export async function initHomePage(): Promise<void> {
  const config = await loadRuntimeConfig();

  setText("home-hero-headline", config.home.hero.headline);
  setText("home-hero-subheadline", config.home.hero.subheadline);
  setText("home-hero-primary-cta", config.home.hero.primaryCtaLabel);
  setText("home-hero-secondary-cta", config.home.hero.secondaryCtaLabel);
  renderList("home-trust-signals", config.home.hero.trustSignals);

  renderServiceCards(config);
  renderFeaturedGallery(config);
  renderProcessSteps(config);
  renderProcessMedia(config);
  renderTestimonials(config);

  setText("home-conversion-headline", config.home.conversionBand.headline);
  setText("home-conversion-body", config.home.conversionBand.body);
  setText("home-conversion-cta", config.home.conversionBand.ctaLabel);

  if (!renderUploadedHeroVideo(config)) {
    const heroMedia = selectSectionAssets(MEDIA_INDEX, config.mediaSections.homeHero)[0];
    renderHeroMedia(heroMedia, config.altOverrides);
  }
}

export async function initServicePage(serviceKey: ServiceKey): Promise<void> {
  const config = await loadRuntimeConfig();
  renderServiceSection(config, serviceKey);
}

export async function initContactPage(): Promise<void> {
  const config = await loadRuntimeConfig();
  const phone = config.brand.phone.trim();
  const email = config.brand.email.trim();

  setText("contact-headline", config.contactPage.headline);
  setText("contact-intro", config.contactPage.intro);
  setText("contact-privacy", config.contactPage.privacyNote);
  setText("contact-direct-service-area", config.brand.serviceArea);
  setText("contact-direct-address", config.brand.address);

  const phoneLink = byId<HTMLAnchorElement>("contact-direct-phone");
  if (phoneLink) {
    phoneLink.href = `tel:${phone}`;
    phoneLink.textContent = phone;
  }

  const emailLink = byId<HTMLAnchorElement>("contact-direct-email");
  if (emailLink) {
    emailLink.href = `mailto:${email}`;
    emailLink.textContent = email;
  }

  showContactSuccess(config);
}
