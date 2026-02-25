import defaultSiteConfig from "@/config/defaultSiteConfig.json";
import type { SiteConfig } from "@/lib/types";

export const CONFIG_STORAGE_KEY = "bc.site.config.v1";
export const CONFIG_API_ENDPOINT = "/.netlify/functions/site-config";

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

async function fetchPublishedConfig(): Promise<Partial<SiteConfig> | null> {
  try {
    const response = await fetch(CONFIG_API_ENDPOINT, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { config?: Partial<SiteConfig> | null };
    if (!payload || !payload.config) {
      return null;
    }

    return payload.config;
  } catch {
    return null;
  }
}

async function fetchDefaultConfigFile(): Promise<Partial<SiteConfig> | null> {
  try {
    const response = await fetch("/site-config.json", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Partial<SiteConfig>;
  } catch {
    return null;
  }
}

export async function loadRuntimeConfig(): Promise<SiteConfig> {
  if (typeof window === "undefined") {
    return getDefaultConfig();
  }

  const publishedConfig = await fetchPublishedConfig();
  if (publishedConfig) {
    return mergeConfig(publishedConfig);
  }

  const fileConfig = await fetchDefaultConfigFile();
  if (fileConfig) {
    return mergeConfig(fileConfig);
  }

  return getDefaultConfig();
}

export async function saveRuntimeConfig(config: SiteConfig): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const response = await fetch(CONFIG_API_ENDPOINT, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ config })
  });

  if (!response.ok) {
    throw new Error(`Failed to save runtime config (${response.status}).`);
  }
}

export async function clearRuntimeConfig(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const response = await fetch(CONFIG_API_ENDPOINT, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error(`Failed to clear runtime config (${response.status}).`);
  }
}
