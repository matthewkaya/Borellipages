import {
  getDefaultConfig,
  loadRuntimeConfig,
  mergeConfig,
  saveRuntimeConfig
} from "@/lib/config";
import { MEDIA_FOLDER_TAXONOMY } from "@/lib/mediaFolders";
import { MEDIA_INDEX } from "@/lib/mediaIndex";
import { collectSectionAssets, folderMatchesPattern } from "@/lib/mediaSelect";
import type {
  MediaSectionKey,
  ServiceKey,
  SiteConfig,
  Testimonial,
  ProcessStep,
  FaqItem
} from "@/lib/types";
import { logout, requireAdminAuth } from "@/scripts/adminAuth";

const SERVICE_KEYS: ServiceKey[] = [
  "custom-home-builds",
  "renovations-expansions",
  "sustainable-craftsmanship"
];

let config: SiteConfig;
let statusNode: HTMLElement | null = null;

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function setStatus(message: string, tone: "ok" | "error" = "ok") {
  if (!statusNode) {
    return;
  }

  statusNode.textContent = message;
  statusNode.className =
    tone === "ok"
      ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
      : "rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700";
}

function lines(input: string): string[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parsePipeRows(input: string, expectedParts: number): string[][] {
  return lines(input).map((row) => {
    const parts = row.split("||").map((item) => item.trim());
    const normalized = Array.from({ length: expectedParts }, (_, index) => parts[index] ?? "");
    return normalized;
  });
}

function ensureValue(inputId: string): string {
  return byId<HTMLInputElement | HTMLTextAreaElement>(inputId)?.value.trim() ?? "";
}

function sourceSelectionForSection(sectionKey: MediaSectionKey): string[] {
  const fieldset = byId<HTMLElement>(`media-sources-${sectionKey}`);
  if (!fieldset) {
    return [];
  }

  return Array.from(fieldset.querySelectorAll<HTMLInputElement>("input[type='checkbox']:checked")).map(
    (checkbox) => checkbox.value
  );
}

function isSourceSelected(sectionSources: string[], folder: string): boolean {
  return sectionSources.some((source) => folderMatchesPattern(folder, source));
}

function populateContentForm() {
  const hero = config.home.hero;

  const heroHeadline = byId<HTMLInputElement>("home-hero-headline");
  const heroSubheadline = byId<HTMLTextAreaElement>("home-hero-subheadline");
  const conversionHeadline = byId<HTMLInputElement>("home-conversion-headline");
  const conversionBody = byId<HTMLTextAreaElement>("home-conversion-body");
  const conversionCta = byId<HTMLInputElement>("home-conversion-cta");

  if (heroHeadline) heroHeadline.value = hero.headline;
  if (heroSubheadline) heroSubheadline.value = hero.subheadline;
  if (conversionHeadline) conversionHeadline.value = config.home.conversionBand.headline;
  if (conversionBody) conversionBody.value = config.home.conversionBand.body;
  if (conversionCta) conversionCta.value = config.home.conversionBand.ctaLabel;

  config.home.services.forEach((service, index) => {
    const titleInput = byId<HTMLInputElement>(`service-card-${index}-title`);
    const blurbInput = byId<HTMLTextAreaElement>(`service-card-${index}-blurb`);
    if (titleInput) titleInput.value = service.title;
    if (blurbInput) blurbInput.value = service.blurb;
  });

  const testimonialBox = byId<HTMLTextAreaElement>("home-testimonials");
  if (testimonialBox) {
    testimonialBox.value = config.home.testimonials
      .map((item) => `${item.quote} || ${item.name} || ${item.role}`)
      .join("\n");
  }

  const processBox = byId<HTMLTextAreaElement>("home-process-steps");
  if (processBox) {
    processBox.value = config.home.processSteps
      .map((item) => `${item.title} || ${item.description}`)
      .join("\n");
  }

  SERVICE_KEYS.forEach((key) => {
    const service = config.services[key];

    const intro = byId<HTMLTextAreaElement>(`service-${key}-intro`);
    const whoFor = byId<HTMLTextAreaElement>(`service-${key}-who-for`);
    const whoNotFor = byId<HTMLTextAreaElement>(`service-${key}-who-not-for`);
    const faq = byId<HTMLTextAreaElement>(`service-${key}-faq`);

    if (intro) intro.value = service.intro.join("\n");
    if (whoFor) whoFor.value = service.whoFor.join("\n");
    if (whoNotFor) whoNotFor.value = service.whoNotFor.join("\n");
    if (faq) {
      faq.value = service.faq
        .map((item) => `${item.question} || ${item.answer}`)
        .join("\n");
    }
  });

  const contactHeadline = byId<HTMLInputElement>("contact-headline");
  const contactIntro = byId<HTMLTextAreaElement>("contact-intro");
  const privacyNote = byId<HTMLTextAreaElement>("contact-privacy-note");

  if (contactHeadline) contactHeadline.value = config.contactPage.headline;
  if (contactIntro) contactIntro.value = config.contactPage.intro;
  if (privacyNote) privacyNote.value = config.contactPage.privacyNote;
}

function applyContentForm(): boolean {
  const testimonialsRows = parsePipeRows(ensureValue("home-testimonials"), 3);
  if (testimonialsRows.length < 3 || testimonialsRows.length > 6) {
    setStatus("Testimonials must contain between 3 and 6 items.", "error");
    return false;
  }

  const testimonials: Testimonial[] = testimonialsRows.map(([quote, name, role]) => ({
    quote,
    name,
    role
  }));

  const processRows = parsePipeRows(ensureValue("home-process-steps"), 2);
  if (processRows.length < 3 || processRows.length > 5) {
    setStatus("Process steps must contain between 3 and 5 items.", "error");
    return false;
  }

  const processSteps: ProcessStep[] = processRows.map(([title, description]) => ({
    title,
    description
  }));

  config.home.hero.headline = ensureValue("home-hero-headline");
  config.home.hero.subheadline = ensureValue("home-hero-subheadline");
  config.home.conversionBand.headline = ensureValue("home-conversion-headline");
  config.home.conversionBand.body = ensureValue("home-conversion-body");
  config.home.conversionBand.ctaLabel = ensureValue("home-conversion-cta");

  config.home.services = config.home.services.map((service, index) => ({
    ...service,
    title: ensureValue(`service-card-${index}-title`),
    blurb: ensureValue(`service-card-${index}-blurb`)
  }));

  config.home.testimonials = testimonials;
  config.home.processSteps = processSteps;

  SERVICE_KEYS.forEach((key) => {
    const intro = lines(ensureValue(`service-${key}-intro`));
    const whoFor = lines(ensureValue(`service-${key}-who-for`));
    const whoNotFor = lines(ensureValue(`service-${key}-who-not-for`));
    const faqRows = parsePipeRows(ensureValue(`service-${key}-faq`), 2);
    const faq: FaqItem[] = faqRows.map(([question, answer]) => ({ question, answer }));

    config.services[key].intro = intro;
    config.services[key].whoFor = whoFor;
    config.services[key].whoNotFor = whoNotFor;
    config.services[key].faq = faq;
  });

  config.contactPage.headline = ensureValue("contact-headline");
  config.contactPage.intro = ensureValue("contact-intro");
  config.contactPage.privacyNote = ensureValue("contact-privacy-note");

  return true;
}

function renderPinnedOptions(sectionKey: MediaSectionKey, container: HTMLElement) {
  const section = config.mediaSections[sectionKey];
  const candidates = collectSectionAssets(MEDIA_INDEX, {
    ...section,
    maxItems: 9999
  });

  container.innerHTML = "";

  if (candidates.length === 0) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-slate";
    empty.textContent = "No media found for selected source folders.";
    container.appendChild(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "grid gap-3 md:grid-cols-2";

  candidates.forEach((asset) => {
    const card = document.createElement("label");
    card.className = "surface-card flex gap-3 rounded-xl p-3";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.value = asset.id;
    toggle.checked = section.pinned.includes(asset.id);
    toggle.className = "mt-1";

    toggle.addEventListener("change", () => {
      if (toggle.checked) {
        if (!section.pinned.includes(asset.id)) {
          section.pinned.push(asset.id);
        }
      } else {
        section.pinned = section.pinned.filter((id) => id !== asset.id);
      }

      renderMediaManager();
    });

    const body = document.createElement("div");
    body.className = "min-w-0 flex-1";

    const preview = document.createElement("div");
    preview.className = "mb-2 h-20 overflow-hidden rounded-lg border border-ink/10 bg-slate-50";

    if (asset.type === "image") {
      const image = document.createElement("img");
      image.src = asset.src;
      image.alt = asset.alt;
      image.width = 160;
      image.height = 90;
      image.loading = "lazy";
      image.className = "h-full w-full object-cover";
      preview.appendChild(image);
    } else {
      preview.className += " grid place-items-center";
      const text = document.createElement("span");
      text.className = "px-2 text-xs font-medium text-slate";
      text.textContent = `Video: ${asset.fileName}`;
      preview.appendChild(text);
    }

    const title = document.createElement("p");
    title.className = "truncate text-xs font-semibold text-ink";
    title.textContent = asset.id;

    body.append(preview, title);

    if (section.pinned.includes(asset.id)) {
      const altLabel = document.createElement("label");
      altLabel.className = "mt-2 block text-[11px] font-medium text-slate";
      altLabel.textContent = "Pinned alt override";

      const altInput = document.createElement("input");
      altInput.type = "text";
      altInput.className = "field mt-1 text-xs";
      altInput.value = config.altOverrides[asset.id] ?? "";
      altInput.placeholder = asset.alt;

      altInput.addEventListener("input", () => {
        const value = altInput.value.trim();
        if (!value) {
          delete config.altOverrides[asset.id];
          return;
        }

        config.altOverrides[asset.id] = value;
      });

      body.append(altLabel, altInput);
    }

    card.append(toggle, body);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function renderMediaManager() {
  const root = byId<HTMLElement>("media-manager");
  if (!root) {
    return;
  }

  root.innerHTML = "";

  const keys = Object.keys(config.mediaSections) as MediaSectionKey[];

  keys.forEach((sectionKey) => {
    const section = config.mediaSections[sectionKey];

    const card = document.createElement("article");
    card.className = "surface-card rounded-2xl p-5";

    const heading = document.createElement("h3");
    heading.className = "text-lg font-semibold text-ink";
    heading.textContent = section.label;

    const helper = document.createElement("p");
    helper.className = "mt-1 text-xs text-slate";
    helper.textContent = "Pinned files appear first. Remaining items follow deterministic filename sorting.";

    const row = document.createElement("div");
    row.className = "mt-4 grid gap-4 md:grid-cols-2";

    const sourcePanel = document.createElement("fieldset");
    sourcePanel.id = `media-sources-${sectionKey}`;
    sourcePanel.className = "rounded-xl border border-ink/10 bg-white p-3";

    const sourceLegend = document.createElement("legend");
    sourceLegend.className = "px-1 text-xs font-semibold text-ink";
    sourceLegend.textContent = "Source folders";
    sourcePanel.appendChild(sourceLegend);

    const sourcesGrid = document.createElement("div");
    sourcesGrid.className = "mt-2 grid gap-2";

    MEDIA_FOLDER_TAXONOMY.forEach((folder) => {
      const option = document.createElement("label");
      option.className = "flex items-start gap-2 text-xs text-slate";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = folder;
      input.checked = isSourceSelected(section.sources, folder);

      input.addEventListener("change", () => {
        section.sources = sourceSelectionForSection(sectionKey);
        section.pinned = section.pinned.filter((id) => {
          const asset = MEDIA_INDEX.find((item) => item.id === id);
          if (!asset) {
            return false;
          }

          return section.sources.some((source) => folderMatchesPattern(asset.folder, source));
        });

        renderMediaManager();
      });

      const text = document.createElement("span");
      text.textContent = folder;

      option.append(input, text);
      sourcesGrid.appendChild(option);
    });

    sourcePanel.appendChild(sourcesGrid);

    const settingsPanel = document.createElement("div");
    settingsPanel.className = "space-y-3 rounded-xl border border-ink/10 bg-white p-3";

    const maxLabel = document.createElement("label");
    maxLabel.className = "block text-xs font-semibold text-ink";
    maxLabel.textContent = "Max items";

    const maxInput = document.createElement("input");
    maxInput.type = "number";
    maxInput.min = "0";
    maxInput.className = "field mt-1";
    maxInput.value = String(section.maxItems);
    maxInput.addEventListener("input", () => {
      section.maxItems = Number(maxInput.value || 0);
    });

    const videoWrap = document.createElement("label");
    videoWrap.className = "flex items-center gap-2 text-xs text-slate";
    const videoToggle = document.createElement("input");
    videoToggle.type = "checkbox";
    videoToggle.checked = section.includeVideos;
    videoToggle.addEventListener("change", () => {
      section.includeVideos = videoToggle.checked;
      section.pinned = section.pinned.filter((id) => {
        const asset = MEDIA_INDEX.find((item) => item.id === id);
        if (!asset) {
          return false;
        }
        if (!section.includeVideos && asset.type === "video") {
          return false;
        }
        return true;
      });
      renderMediaManager();
    });

    const videoText = document.createElement("span");
    videoText.textContent = "Include videos";
    videoWrap.append(videoToggle, videoText);

    maxLabel.appendChild(maxInput);
    settingsPanel.append(maxLabel, videoWrap);

    row.append(sourcePanel, settingsPanel);

    const pinnedContainer = document.createElement("div");
    pinnedContainer.className = "mt-4";

    const pinnedTitle = document.createElement("p");
    pinnedTitle.className = "text-xs font-semibold uppercase tracking-wide text-slate";
    pinnedTitle.textContent = "Pinned Assets and Alt Overrides";

    const pinnedBody = document.createElement("div");
    pinnedBody.className = "mt-2";

    pinnedContainer.append(pinnedTitle, pinnedBody);
    renderPinnedOptions(sectionKey, pinnedBody);

    card.append(heading, helper, row, pinnedContainer);
    root.appendChild(card);
  });
}

function bindActions() {
  const saveButton = byId<HTMLButtonElement>("admin-save");
  const resetButton = byId<HTMLButtonElement>("admin-reset");
  const exportButton = byId<HTMLButtonElement>("admin-export");
  const importInput = byId<HTMLInputElement>("admin-import");
  const logoutButton = byId<HTMLButtonElement>("admin-logout");

  saveButton?.addEventListener("click", () => {
    if (!applyContentForm()) {
      return;
    }

    saveRuntimeConfig(config);
    setStatus("Configuration saved to localStorage.");
  });

  resetButton?.addEventListener("click", () => {
    config = getDefaultConfig();
    populateContentForm();
    renderMediaManager();
    setStatus("Designer reset to default shipped configuration.");
  });

  exportButton?.addEventListener("click", () => {
    if (!applyContentForm()) {
      return;
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "site-config.export.json";
    link.click();
    URL.revokeObjectURL(url);

    setStatus("Configuration exported as site-config.export.json.");
  });

  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<SiteConfig>;
      config = mergeConfig(parsed);
      populateContentForm();
      renderMediaManager();
      saveRuntimeConfig(config);
      setStatus("Configuration imported and saved.");
      importInput.value = "";
    } catch {
      setStatus("Failed to import configuration JSON.", "error");
    }
  });

  logoutButton?.addEventListener("click", () => {
    logout();
    window.location.assign("/admin/login");
  });
}

export async function initAdminDesigner() {
  requireAdminAuth();

  statusNode = byId<HTMLElement>("admin-status");
  config = await loadRuntimeConfig();

  populateContentForm();
  renderMediaManager();
  bindActions();
}
