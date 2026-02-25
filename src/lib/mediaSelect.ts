import type { MediaAsset } from "@/lib/mediaIndex";
import type { MediaSectionConfig } from "@/lib/types";

export interface BeforeAfterPair {
  key: string;
  before: MediaAsset;
  after: MediaAsset;
}

function normalizeFolderPattern(pattern: string): string {
  return pattern.trim().replace(/^\//, "").replace(/\/$/, "");
}

export function folderMatchesPattern(folder: string, pattern: string): boolean {
  const normalizedPattern = normalizeFolderPattern(pattern);

  if (normalizedPattern.endsWith("/*")) {
    const prefix = normalizedPattern.slice(0, -2);
    return folder === prefix || folder.startsWith(`${prefix}/`);
  }

  return folder === normalizedPattern;
}

function deterministicSort(a: MediaAsset, b: MediaAsset): number {
  return (
    a.fileName.localeCompare(b.fileName) ||
    a.folder.localeCompare(b.folder) ||
    a.relativePath.localeCompare(b.relativePath)
  );
}

export function collectSectionAssets(
  mediaIndex: MediaAsset[],
  section: MediaSectionConfig
): MediaAsset[] {
  return mediaIndex
    .filter((asset) => {
      if (!section.includeVideos && asset.type === "video") {
        return false;
      }

      return section.sources.some((pattern) =>
        folderMatchesPattern(asset.folder, pattern)
      );
    })
    .sort(deterministicSort);
}

export function selectSectionAssets(
  mediaIndex: MediaAsset[],
  section: MediaSectionConfig
): MediaAsset[] {
  const pool = collectSectionAssets(mediaIndex, section);
  const pinnedAssets = section.pinned
    .map((pinnedId) => pool.find((asset) => asset.id === pinnedId))
    .filter((asset): asset is MediaAsset => Boolean(asset));

  const maxItems = Math.max(section.maxItems, 0);
  if (maxItems === 0) {
    return [];
  }

  const pinnedIds = new Set(pinnedAssets.map((asset) => asset.id));
  const selected: MediaAsset[] = [...pinnedAssets].slice(0, maxItems);
  const used = new Set(selected.map((asset) => asset.id));

  if (selected.length >= maxItems) {
    return selected;
  }

  const buckets = section.sources.map((sourcePattern) =>
    pool.filter(
      (asset) =>
        !pinnedIds.has(asset.id) && folderMatchesPattern(asset.folder, sourcePattern)
    )
  );

  const positions = buckets.map(() => 0);

  while (selected.length < maxItems) {
    let advanced = false;

    for (let index = 0; index < buckets.length; index += 1) {
      const bucket = buckets[index];
      let cursor = positions[index];

      while (cursor < bucket.length && used.has(bucket[cursor].id)) {
        cursor += 1;
      }

      positions[index] = cursor + 1;
      const candidate = bucket[cursor];

      if (!candidate || used.has(candidate.id)) {
        continue;
      }

      selected.push(candidate);
      used.add(candidate.id);
      advanced = true;

      if (selected.length >= maxItems) {
        break;
      }
    }

    if (!advanced) {
      break;
    }
  }

  return selected;
}

export function getHomeFeaturedCategory(asset: MediaAsset): string {
  if (asset.folder.startsWith("bespoke-cottages-homes/")) {
    return "custom-homes";
  }

  if (asset.folder.startsWith("renovations-additions/")) {
    return "renovations";
  }

  if (asset.folder.startsWith("landscaping-outdoors/")) {
    return "outdoors";
  }

  return "all";
}

function splitBeforeAfter(fileName: string): { key: string; side: "before" | "after" } | null {
  const match = fileName.match(/^(.*)_(before|after)\.[^.]+$/i);
  if (!match) {
    return null;
  }

  return {
    key: match[1].toLowerCase(),
    side: match[2].toLowerCase() as "before" | "after"
  };
}

export function buildBeforeAfterPairs(assets: MediaAsset[]): BeforeAfterPair[] {
  const imageAssets = assets.filter((asset) => asset.type === "image");
  const pairMap = new Map<string, Partial<Record<"before" | "after", MediaAsset>>>();

  for (const asset of imageAssets) {
    const parsed = splitBeforeAfter(asset.fileName);
    if (!parsed) {
      continue;
    }

    if (!pairMap.has(parsed.key)) {
      pairMap.set(parsed.key, {});
    }

    const item = pairMap.get(parsed.key);
    if (item) {
      item[parsed.side] = asset;
    }
  }

  const pairs: BeforeAfterPair[] = [];
  for (const [key, pair] of pairMap.entries()) {
    if (pair.before && pair.after) {
      pairs.push({ key, before: pair.before, after: pair.after });
    }
  }

  return pairs.sort((a, b) => a.key.localeCompare(b.key));
}

export function resolveAlt(asset: MediaAsset, altOverrides: Record<string, string>): string {
  return altOverrides[asset.id]?.trim() || asset.alt;
}
