import defaultSiteConfig from "@/content/defaultSiteConfig.json";
import type { SiteConfig } from "@/lib/types";

export const CONFIG_STORAGE_KEY = "bc.site.config.v1";

const BASE_CONFIG = defaultSiteConfig as SiteConfig;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: unknown): T {
  if (Array.isArray(base)) {
    return (Array.isArray(override) ? override : base) as T;
  }

  if (!isObject(base)) {
    return (override === undefined ? base : override) as T;
  }

  const output: Record<string, unknown> = { ...base };
  if (!isObject(override)) {
    return output as T;
  }

  for (const [key, value] of Object.entries(override)) {
    const baseValue = output[key];

    if (Array.isArray(value)) {
      output[key] = value;
      continue;
    }

    if (isObject(value) && isObject(baseValue)) {
      output[key] = deepMerge(baseValue, value);
      continue;
    }

    output[key] = value;
  }

  return output as T;
}

export function getDefaultConfig(): SiteConfig {
  return deepClone(BASE_CONFIG);
}

export function mergeConfig(override?: Partial<SiteConfig>): SiteConfig {
  if (!override) {
    return getDefaultConfig();
  }

  return deepMerge(getDefaultConfig(), override);
}

function parseConfig(raw: string | null): Partial<SiteConfig> | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SiteConfig>;
    return parsed;
  } catch {
    return null;
  }
}

export async function loadRuntimeConfig(): Promise<SiteConfig> {
  if (typeof window === "undefined") {
    return getDefaultConfig();
  }

  const storedConfig = parseConfig(window.localStorage.getItem(CONFIG_STORAGE_KEY));
  if (storedConfig) {
    return mergeConfig(storedConfig);
  }

  try {
    const response = await fetch("/site-config.json", { cache: "no-store" });
    if (!response.ok) {
      return getDefaultConfig();
    }

    const fileConfig = (await response.json()) as Partial<SiteConfig>;
    return mergeConfig(fileConfig);
  } catch {
    return getDefaultConfig();
  }
}

export function saveRuntimeConfig(config: SiteConfig): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function clearRuntimeConfig(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CONFIG_STORAGE_KEY);
}
