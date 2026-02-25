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
  const match = fileName.match(/^(.*?)[_\-\s](before|after)\.[^.]+$/i);
  if (!match) {
    return null;
  }

  return {
    key: match[1].toLowerCase(),
    side: match[2].toLowerCase() as "before" | "after"
  };
}

function normalizedStem(fileName: string): string {
  return fileName.replace(/\.[^.]+$/i, "");
}

function loosePairKey(fileName: string): string {
  return normalizedStem(fileName)
    .toLowerCase()
    .replace(/\s+\d+$/, "")
    .trim();
}

function buildFallbackPairs(assets: MediaAsset[]): BeforeAfterPair[] {
  const sorted = [...assets].sort(deterministicSort);
  const grouped = new Map<string, MediaAsset[]>();

  for (const asset of sorted) {
    const key = loosePairKey(asset.fileName);
    const list = grouped.get(key) ?? [];
    list.push(asset);
    grouped.set(key, list);
  }

  const pairs: BeforeAfterPair[] = [];
  const used = new Set<string>();

  for (const [groupKey, groupAssets] of grouped.entries()) {
    if (groupAssets.length < 2) {
      continue;
    }

    const bucket = [...groupAssets].sort(deterministicSort);
    for (let index = 0; index + 1 < bucket.length; index += 2) {
      const before = bucket[index];
      const after = bucket[index + 1];
      used.add(before.id);
      used.add(after.id);
      pairs.push({
        key: `${groupKey}-${Math.floor(index / 2) + 1}`,
        before,
        after
      });
    }
  }

  const remaining = sorted.filter((asset) => !used.has(asset.id));
  for (let index = 0; index + 1 < remaining.length; index += 2) {
    const before = remaining[index];
    const after = remaining[index + 1];
    pairs.push({
      key: `fallback-${Math.floor(index / 2) + 1}`,
      before,
      after
    });
  }

  return pairs.sort((a, b) => a.key.localeCompare(b.key));
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

  if (pairs.length > 0) {
    const pairedIds = new Set<string>();
    pairs.forEach((pair) => {
      pairedIds.add(pair.before.id);
      pairedIds.add(pair.after.id);
    });

    const leftovers = imageAssets.filter((asset) => !pairedIds.has(asset.id));
    if (leftovers.length >= 2) {
      return [...pairs, ...buildFallbackPairs(leftovers)].sort((a, b) => a.key.localeCompare(b.key));
    }

    return pairs.sort((a, b) => a.key.localeCompare(b.key));
  }

  return buildFallbackPairs(imageAssets);
}

export function resolveAlt(asset: MediaAsset, altOverrides: Record<string, string>): string {
  return altOverrides[asset.id]?.trim() || asset.alt;
}
