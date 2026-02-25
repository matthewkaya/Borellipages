import { getDefaultConfig, loadRuntimeConfig, saveRuntimeConfig } from "@/lib/config";
import type { SiteConfig } from "@/lib/types";
import {
  changePassword,
  logout,
  requireAdminAuth
} from "@/scripts/adminAuth";

const LOGO_MAX_BYTES = 1_000_000;
const HERO_VIDEO_MAX_BYTES = 5_500_000;
const HERO_VIDEO_ASSET_ENDPOINT = "/.netlify/functions/site-assets?asset=home-hero-video";
let businessSaveTimer: number | null = null;

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

async function getResponseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload?.error && payload.error.trim()) {
      return payload.error.trim();
    }
  } catch {
    // Ignore parse errors and use status-based fallback below.
  }

  if (response.status === 413) {
    return "Video payload is too large for server upload. Netlify Functions request size is limited, so use a smaller file.";
  }

  if (response.status >= 500) {
    return "Server error while uploading video.";
  }

  return `Upload failed with status ${response.status}.`;
}

async function persistGlobalConfig(
  config: SiteConfig,
  feedback: HTMLElement | null,
  successMessage: string,
  errorMessage: string
): Promise<boolean> {
  try {
    await saveRuntimeConfig(config);
    setFeedback(feedback, successMessage);
    return true;
  } catch {
    setFeedback(feedback, errorMessage, "error");
    return false;
  }
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

async function resolveUploadedVideoSource(
  uploaded: NonNullable<SiteConfig["runtimeAssets"]["homeHeroVideo"]>
): Promise<string | null> {
  const inlineSrc = uploaded.src?.trim();
  return inlineSrc || null;
}

async function renderLandingVideoPreview(config: SiteConfig): Promise<void> {
  const preview = byId<HTMLElement>("landing-media-preview");
  if (!preview) {
    return;
  }

  preview.innerHTML = "";

  const uploaded = config.runtimeAssets.homeHeroVideo;
  if (!uploaded) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-slate";
    empty.textContent = "No uploaded hero video. Homepage will use auto-discovered media.";
    preview.appendChild(empty);
    return;
  }

  const source = await resolveUploadedVideoSource(uploaded);
  if (!source) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-slate";
    empty.textContent = uploaded.storageKey
      ? "This hero video was saved with an older local-only version. Re-upload to publish globally."
      : "No uploaded hero video. Homepage will use auto-discovered media.";
    preview.appendChild(empty);
    return;
  }

  const video = document.createElement("video");
  video.src = source;
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
  void renderLandingVideoPreview(config);
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

  const applyBusinessFields = () => {
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
  };

  const triggerAutoSave = () => {
    applyBusinessFields();
    if (businessSaveTimer) {
      window.clearTimeout(businessSaveTimer);
    }

    businessSaveTimer = window.setTimeout(() => {
      void persistGlobalConfig(
        config,
        feedback,
        "Business information auto-saved globally.",
        "Could not publish business info. Check connection and try again."
      );
    }, 400);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  const fieldIds = [
    "brand-name",
    "brand-tagline",
    "brand-phone",
    "brand-email",
    "brand-address",
    "brand-service-area",
    "brand-instagram",
    "brand-facebook",
    "brand-linkedin"
  ];

  fieldIds.forEach((id) => {
    const input = byId<HTMLInputElement>(id);
    if (!input) {
      return;
    }
    input.addEventListener("input", triggerAutoSave);
    input.addEventListener("change", triggerAutoSave);
  });
}

function bindLogoForm(config: SiteConfig): void {
  const form = byId<HTMLFormElement>("admin-logo-form");
  const feedback = byId<HTMLElement>("logo-feedback");
  const fileInput = byId<HTMLInputElement>("logo-upload");
  const altField = byId<HTMLInputElement>("logo-alt");
  const clearButton = byId<HTMLButtonElement>("logo-clear");

  if (!form || !feedback || !clearButton || !fileInput || !altField) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  const saveLogo = async (logoFile: File | null, altInputRaw: string): Promise<void> => {
    const altInput = altInputRaw.trim();

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
    const ok = await persistGlobalConfig(
      config,
      feedback,
      "Logo auto-saved globally.",
      "Could not publish logo. Check connection and try again."
    );
    if (ok) {
      renderLogoPreview(config);
      altField.value = config.brand.logo.alt;
    }
  };

  fileInput.addEventListener("change", async () => {
    const logoFile = fileInput.files?.[0] ?? null;
    await saveLogo(logoFile, altField.value);
    fileInput.value = "";
  });

  altField.addEventListener("change", async () => {
    await saveLogo(null, altField.value);
  });

  clearButton.addEventListener("click", async () => {
    config.brand.logo.src = "";
    config.brand.logo.alt = `${config.brand.name} logo`;
    const ok = await persistGlobalConfig(
      config,
      feedback,
      "Logo cleared globally.",
      "Could not clear logo globally. Check connection and try again."
    );
    if (ok) {
      renderLogoPreview(config);
      altField.value = config.brand.logo.alt;
    }
  });
}

function bindLandingMediaForm(config: SiteConfig): void {
  const form = byId<HTMLFormElement>("admin-landing-media-form");
  const feedback = byId<HTMLElement>("landing-media-feedback");
  const fileInput = byId<HTMLInputElement>("landing-video-upload");
  const clearButton = byId<HTMLButtonElement>("landing-video-clear");

  if (!form || !feedback || !clearButton || !fileInput) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  const uploadHeroVideo = async (file: File): Promise<string> => {
    const response = await fetch(HERO_VIDEO_ASSET_ENDPOINT, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "X-File-Name": file.name
      },
      body: file
    });

    if (!response.ok) {
      throw new Error(await getResponseErrorMessage(response));
    }

    return `${HERO_VIDEO_ASSET_ENDPOINT}&v=${Date.now()}`;
  };

  const deleteHeroVideo = async (): Promise<void> => {
    const response = await fetch(HERO_VIDEO_ASSET_ENDPOINT, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error(await getResponseErrorMessage(response));
    }
  };

  fileInput.addEventListener("change", async () => {
    const videoFile = fileInput.files?.[0];
    if (!videoFile) {
      return;
    }

    if (!["video/mp4", "video/webm"].includes(videoFile.type)) {
      setFeedback(feedback, "Only MP4 and WebM videos are supported.", "error");
      return;
    }

    if (videoFile.size > HERO_VIDEO_MAX_BYTES) {
      setFeedback(feedback, "Video is too large for Netlify upload. Keep it under 5.5MB.", "error");
      return;
    }

    try {
      const videoUrl = await uploadHeroVideo(videoFile);
      config.runtimeAssets.homeHeroVideo = {
        src: videoUrl,
        mimeType: videoFile.type,
        fileName: videoFile.name
      };
      config.mediaSections.homeHero.includeVideos = true;
      const ok = await persistGlobalConfig(
        config,
        feedback,
        "Hero video uploaded and published globally.",
        "Could not publish hero video. Check connection and try again."
      );
      if (ok) {
        await renderLandingVideoPreview(config);
        fileInput.value = "";
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown upload error.";
      setFeedback(
        feedback,
        `Could not upload hero video to the server. ${detail}`,
        "error"
      );
    }
  });

  clearButton.addEventListener("click", async () => {
    try {
      await deleteHeroVideo();
      config.runtimeAssets.homeHeroVideo = null;
      const ok = await persistGlobalConfig(
        config,
        feedback,
        "Hero video cleared globally. Auto-discovered media will be used.",
        "Could not clear hero video globally. Check connection and try again."
      );
      if (ok) {
        await renderLandingVideoPreview(config);
        fileInput.value = "";
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown delete error.";
      setFeedback(
        feedback,
        `Could not remove hero video from the server. ${detail}`,
        "error"
      );
    }
  });
}

export async function initAdminSettings(): Promise<void> {
  requireAdminAuth();

  const config = await loadRuntimeConfig();
  if (normalizeSettingsConfig(config)) {
    try {
      await saveRuntimeConfig(config);
    } catch {
      // Keep page usable if publish endpoint is temporarily unavailable.
    }
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
