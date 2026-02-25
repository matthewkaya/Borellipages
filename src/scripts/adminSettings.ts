import { loadRuntimeConfig, saveRuntimeConfig } from "@/lib/config";
import { MEDIA_INDEX } from "@/lib/mediaIndex";
import { folderMatchesPattern } from "@/lib/mediaSelect";
import type { SiteConfig } from "@/lib/types";
import {
  changePassword,
  logout,
  requireAdminAuth
} from "@/scripts/adminAuth";

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function setFeedback(node: HTMLElement | null, message: string, tone: "ok" | "error" = "ok") {
  if (!node) {
    return;
  }

  node.textContent = message;
  node.className =
    tone === "ok"
      ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
      : "rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700";
}

function getHeroVideoId(config: SiteConfig): string {
  const heroPinned = config.mediaSections.homeHero.pinned;
  const videoId = heroPinned.find((id) => {
    const asset = MEDIA_INDEX.find((item) => item.id === id);
    return asset?.type === "video";
  });

  return videoId ?? "";
}

function renderLogoPreview(config: SiteConfig): void {
  const preview = byId<HTMLElement>("logo-preview");
  if (!preview) {
    return;
  }

  preview.innerHTML = "";

  const src = config.brand.logo.src.trim();
  const alt = config.brand.logo.alt.trim() || `${config.brand.name} logo`;

  if (src) {
    const image = document.createElement("img");
    image.src = src;
    image.alt = alt;
    image.className = "h-14 w-auto rounded-md border border-ink/10 bg-white p-2";
    preview.appendChild(image);
    return;
  }

  const fallback = document.createElement("p");
  fallback.className = "text-sm font-semibold text-ink";
  fallback.textContent = config.brand.name;
  preview.appendChild(fallback);
}

function renderLandingVideoPreview(videoId: string): void {
  const preview = byId<HTMLElement>("landing-media-preview");
  if (!preview) {
    return;
  }

  preview.innerHTML = "";

  if (!videoId) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-slate";
    empty.textContent = "No landing-page video selected.";
    preview.appendChild(empty);
    return;
  }

  const asset = MEDIA_INDEX.find((item) => item.id === videoId && item.type === "video");
  if (!asset) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-slate";
    empty.textContent = "Selected video is not available in the media index.";
    preview.appendChild(empty);
    return;
  }

  const video = document.createElement("video");
  video.src = asset.src;
  video.controls = true;
  video.preload = "metadata";
  video.className = "w-full max-w-sm rounded-lg border border-ink/10 bg-black";
  preview.appendChild(video);

  const label = document.createElement("p");
  label.className = "mt-2 truncate text-xs text-slate";
  label.textContent = asset.id;
  preview.appendChild(label);
}

function populateLogoForm(config: SiteConfig): void {
  const logoSrcInput = byId<HTMLInputElement>("logo-src");
  const logoAltInput = byId<HTMLInputElement>("logo-alt");

  if (logoSrcInput) {
    logoSrcInput.value = config.brand.logo.src;
  }

  if (logoAltInput) {
    logoAltInput.value = config.brand.logo.alt;
  }

  renderLogoPreview(config);
}

function populateLandingMediaForm(config: SiteConfig): void {
  const select = byId<HTMLSelectElement>("landing-hero-video");
  const includeVideosToggle = byId<HTMLInputElement>("landing-include-videos");

  if (includeVideosToggle) {
    includeVideosToggle.checked = config.mediaSections.homeHero.includeVideos;
  }

  if (!select) {
    return;
  }

  const videos = MEDIA_INDEX.filter((asset) => asset.type === "video");
  const currentVideoId = getHeroVideoId(config);

  select.innerHTML = "";

  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = "No video selected";
  select.appendChild(noneOption);

  videos.forEach((videoAsset) => {
    const option = document.createElement("option");
    option.value = videoAsset.id;
    option.textContent = videoAsset.id;
    select.appendChild(option);
  });

  select.value = currentVideoId;
  renderLandingVideoPreview(currentVideoId);

  select.addEventListener("change", () => {
    renderLandingVideoPreview(select.value);
  });
}

function bindPasswordForm() {
  const form = byId<HTMLFormElement>("admin-password-form");
  const feedback = byId<HTMLElement>("password-feedback");

  if (!form || !feedback) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const oldPassword =
      form.querySelector<HTMLInputElement>("#old-password")?.value ?? "";
    const newPassword =
      form.querySelector<HTMLInputElement>("#new-password")?.value ?? "";
    const confirmPassword =
      form.querySelector<HTMLInputElement>("#confirm-password")?.value ?? "";

    const result = await changePassword(oldPassword, newPassword, confirmPassword);
    setFeedback(feedback, result.message, result.ok ? "ok" : "error");

    if (result.ok) {
      form.reset();
    }
  });
}

function bindLogoForm(config: SiteConfig): void {
  const form = byId<HTMLFormElement>("admin-logo-form");
  const feedback = byId<HTMLElement>("logo-feedback");

  if (!form || !feedback) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const logoSrc = byId<HTMLInputElement>("logo-src")?.value.trim() ?? "";
    const logoAltInput = byId<HTMLInputElement>("logo-alt")?.value.trim() ?? "";

    config.brand.logo.src = logoSrc;
    config.brand.logo.alt = logoAltInput || `${config.brand.name} logo`;

    saveRuntimeConfig(config);
    renderLogoPreview(config);
    setFeedback(feedback, "Logo settings saved.");
  });
}

function bindLandingMediaForm(config: SiteConfig): void {
  const form = byId<HTMLFormElement>("admin-landing-media-form");
  const feedback = byId<HTMLElement>("landing-media-feedback");
  const select = byId<HTMLSelectElement>("landing-hero-video");
  const includeVideosToggle = byId<HTMLInputElement>("landing-include-videos");

  if (!form || !feedback || !select || !includeVideosToggle) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const selectedVideoId = select.value;
    const selectedVideo = MEDIA_INDEX.find(
      (asset) => asset.id === selectedVideoId && asset.type === "video"
    );

    const heroSection = config.mediaSections.homeHero;
    const pinnedWithoutVideo = heroSection.pinned.filter((id) => {
      const asset = MEDIA_INDEX.find((item) => item.id === id);
      return asset?.type !== "video";
    });

    if (selectedVideo) {
      heroSection.pinned = [selectedVideo.id, ...pinnedWithoutVideo];

      if (
        !heroSection.sources.some((pattern) =>
          folderMatchesPattern(selectedVideo.folder, pattern)
        )
      ) {
        heroSection.sources = [...heroSection.sources, selectedVideo.folder];
      }
    } else {
      heroSection.pinned = pinnedWithoutVideo;
    }

    heroSection.includeVideos = includeVideosToggle.checked || Boolean(selectedVideo);

    saveRuntimeConfig(config);
    renderLandingVideoPreview(selectedVideo?.id ?? "");
    setFeedback(feedback, "Landing-page media settings saved.");
  });
}

export async function initAdminSettings(): Promise<void> {
  requireAdminAuth();

  const config = await loadRuntimeConfig();

  bindPasswordForm();
  populateLogoForm(config);
  populateLandingMediaForm(config);
  bindLogoForm(config);
  bindLandingMediaForm(config);

  const logoutButton = byId<HTMLButtonElement>("admin-logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
      window.location.assign("/");
    });
  }
}
