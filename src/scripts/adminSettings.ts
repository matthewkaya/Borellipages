import { getDefaultConfig, loadRuntimeConfig, saveRuntimeConfig } from "@/lib/config";
import type { SiteConfig } from "@/lib/types";
import {
  changePassword,
  logout,
  requireAdminAuth
} from "@/scripts/adminAuth";

const LOGO_MAX_BYTES = 1_000_000;
const HERO_VIDEO_MAX_BYTES = 10 * 1024 * 1024;

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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read file."));
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function normalizeSettingsConfig(config: SiteConfig): boolean {
  const defaults = getDefaultConfig();
  let changed = false;

  if (!config.brand.name.trim()) {
    config.brand.name = defaults.brand.name;
    changed = true;
  }
  if (!config.brand.tagline.trim()) {
    config.brand.tagline = defaults.brand.tagline;
    changed = true;
  }
  if (!config.brand.phone.trim()) {
    config.brand.phone = defaults.brand.phone;
    changed = true;
  }
  if (!config.brand.email.trim()) {
    config.brand.email = defaults.brand.email;
    changed = true;
  }
  if (!config.brand.address.trim()) {
    config.brand.address = defaults.brand.address;
    changed = true;
  }
  if (!config.brand.serviceArea.trim()) {
    config.brand.serviceArea = defaults.brand.serviceArea;
    changed = true;
  }

  if (!config.brand.socials.instagram.trim()) {
    config.brand.socials.instagram = defaults.brand.socials.instagram;
    changed = true;
  }
  if (!config.brand.socials.facebook.trim()) {
    config.brand.socials.facebook = defaults.brand.socials.facebook;
    changed = true;
  }
  if (!config.brand.socials.linkedin.trim()) {
    config.brand.socials.linkedin = defaults.brand.socials.linkedin;
    changed = true;
  }

  const hasLogoObject =
    typeof config.brand.logo === "object" &&
    config.brand.logo !== null &&
    "src" in config.brand.logo &&
    "alt" in config.brand.logo;

  if (!hasLogoObject) {
    config.brand.logo = { ...defaults.brand.logo };
    changed = true;
  }

  if (!config.brand.logo.alt.trim()) {
    config.brand.logo.alt = `${config.brand.name} logo`;
    changed = true;
  }

  if (!config.runtimeAssets || typeof config.runtimeAssets !== "object") {
    config.runtimeAssets = { ...defaults.runtimeAssets };
    changed = true;
  }

  if (!("homeHeroVideo" in config.runtimeAssets)) {
    config.runtimeAssets.homeHeroVideo = defaults.runtimeAssets.homeHeroVideo;
    changed = true;
  }

  return changed;
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

function renderLandingVideoPreview(config: SiteConfig): void {
  const preview = byId<HTMLElement>("landing-media-preview");
  if (!preview) {
    return;
  }

  preview.innerHTML = "";

  const uploaded = config.runtimeAssets.homeHeroVideo;
  if (!uploaded?.src) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-slate";
    empty.textContent = "No uploaded hero video. Homepage will use auto-discovered media.";
    preview.appendChild(empty);
    return;
  }

  const video = document.createElement("video");
  video.src = uploaded.src;
  video.controls = true;
  video.preload = "metadata";
  video.className = "w-full max-w-sm rounded-lg border border-ink/10 bg-black";
  preview.appendChild(video);

  const label = document.createElement("p");
  label.className = "mt-2 truncate text-xs text-slate";
  label.textContent = uploaded.fileName;
  preview.appendChild(label);
}

function populateBusinessForm(config: SiteConfig): void {
  const fieldMap: Array<[string, string]> = [
    ["brand-name", config.brand.name],
    ["brand-tagline", config.brand.tagline],
    ["brand-phone", config.brand.phone],
    ["brand-email", config.brand.email],
    ["brand-address", config.brand.address],
    ["brand-service-area", config.brand.serviceArea],
    ["brand-instagram", config.brand.socials.instagram],
    ["brand-facebook", config.brand.socials.facebook],
    ["brand-linkedin", config.brand.socials.linkedin]
  ];

  fieldMap.forEach(([id, value]) => {
    const input = byId<HTMLInputElement>(id);
    if (input) {
      input.value = value;
    }
  });
}

function populateLogoForm(config: SiteConfig): void {
  const logoAltInput = byId<HTMLInputElement>("logo-alt");
  if (logoAltInput) {
    logoAltInput.value = config.brand.logo.alt;
  }

  renderLogoPreview(config);
}

function populateLandingMediaForm(config: SiteConfig): void {
  renderLandingVideoPreview(config);
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

function bindBusinessForm(config: SiteConfig): void {
  const form = byId<HTMLFormElement>("admin-business-form");
  const feedback = byId<HTMLElement>("business-feedback");

  if (!form || !feedback) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    config.brand.name = byId<HTMLInputElement>("brand-name")?.value.trim() || config.brand.name;
    config.brand.tagline = byId<HTMLInputElement>("brand-tagline")?.value.trim() || config.brand.tagline;
    config.brand.phone = byId<HTMLInputElement>("brand-phone")?.value.trim() || config.brand.phone;
    config.brand.email = byId<HTMLInputElement>("brand-email")?.value.trim() || config.brand.email;
    config.brand.address = byId<HTMLInputElement>("brand-address")?.value.trim() || config.brand.address;
    config.brand.serviceArea =
      byId<HTMLInputElement>("brand-service-area")?.value.trim() || config.brand.serviceArea;

    config.brand.socials.instagram =
      byId<HTMLInputElement>("brand-instagram")?.value.trim() || config.brand.socials.instagram;
    config.brand.socials.facebook =
      byId<HTMLInputElement>("brand-facebook")?.value.trim() || config.brand.socials.facebook;
    config.brand.socials.linkedin =
      byId<HTMLInputElement>("brand-linkedin")?.value.trim() || config.brand.socials.linkedin;

    if (!config.brand.logo.alt.trim()) {
      config.brand.logo.alt = `${config.brand.name} logo`;
    }

    saveRuntimeConfig(config);
    setFeedback(feedback, "Business information saved.");
  });
}

function bindLogoForm(config: SiteConfig): void {
  const form = byId<HTMLFormElement>("admin-logo-form");
  const feedback = byId<HTMLElement>("logo-feedback");
  const clearButton = byId<HTMLButtonElement>("logo-clear");

  if (!form || !feedback || !clearButton) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const logoFile = byId<HTMLInputElement>("logo-upload")?.files?.[0];
    const altInput = byId<HTMLInputElement>("logo-alt")?.value.trim() ?? "";

    if (logoFile) {
      if (logoFile.size > LOGO_MAX_BYTES) {
        setFeedback(feedback, "Logo is too large. Keep it under 1MB.", "error");
        return;
      }

      if (!logoFile.type.startsWith("image/")) {
        setFeedback(feedback, "Please upload a valid image file.", "error");
        return;
      }

      try {
        config.brand.logo.src = await readFileAsDataUrl(logoFile);
      } catch {
        setFeedback(feedback, "Could not read logo file.", "error");
        return;
      }
    }

    config.brand.logo.alt = altInput || `${config.brand.name} logo`;
    saveRuntimeConfig(config);
    renderLogoPreview(config);
    setFeedback(feedback, "Logo saved.");
    form.reset();

    const altField = byId<HTMLInputElement>("logo-alt");
    if (altField) {
      altField.value = config.brand.logo.alt;
    }
  });

  clearButton.addEventListener("click", () => {
    config.brand.logo.src = "";
    config.brand.logo.alt = `${config.brand.name} logo`;
    saveRuntimeConfig(config);
    renderLogoPreview(config);
    const altField = byId<HTMLInputElement>("logo-alt");
    if (altField) {
      altField.value = config.brand.logo.alt;
    }
    setFeedback(feedback, "Logo cleared.");
  });
}

function bindLandingMediaForm(config: SiteConfig): void {
  const form = byId<HTMLFormElement>("admin-landing-media-form");
  const feedback = byId<HTMLElement>("landing-media-feedback");
  const clearButton = byId<HTMLButtonElement>("landing-video-clear");

  if (!form || !feedback || !clearButton) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const videoFile = byId<HTMLInputElement>("landing-video-upload")?.files?.[0];
    if (!videoFile) {
      setFeedback(feedback, "Choose a video file first.", "error");
      return;
    }

    if (!["video/mp4", "video/webm"].includes(videoFile.type)) {
      setFeedback(feedback, "Only MP4 and WebM videos are supported.", "error");
      return;
    }

    if (videoFile.size > HERO_VIDEO_MAX_BYTES) {
      setFeedback(feedback, "Video is too large for browser storage. Keep it under 10MB.", "error");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(videoFile);
      config.runtimeAssets.homeHeroVideo = {
        src: dataUrl,
        mimeType: videoFile.type,
        fileName: videoFile.name
      };
      config.mediaSections.homeHero.includeVideos = true;
      saveRuntimeConfig(config);
      renderLandingVideoPreview(config);
      setFeedback(feedback, "Hero video saved.");
      form.reset();
    } catch {
      setFeedback(feedback, "Could not read video file.", "error");
    }
  });

  clearButton.addEventListener("click", () => {
    config.runtimeAssets.homeHeroVideo = null;
    saveRuntimeConfig(config);
    renderLandingVideoPreview(config);
    setFeedback(feedback, "Hero video cleared. Auto-discovered media will be used.");
  });
}

export async function initAdminSettings(): Promise<void> {
  requireAdminAuth();

  const config = await loadRuntimeConfig();
  if (normalizeSettingsConfig(config)) {
    saveRuntimeConfig(config);
  }

  bindPasswordForm();
  populateBusinessForm(config);
  populateLogoForm(config);
  populateLandingMediaForm(config);
  bindBusinessForm(config);
  bindLogoForm(config);
  bindLandingMediaForm(config);

  const logoutButton = byId<HTMLButtonElement>("admin-logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
      window.location.assign("/admin/login/");
    });
  }
}
