import type { ImageMetadata } from "astro";
import { cleanFilenameToText } from "@/lib/text";

export type MediaType = "image" | "video";

export interface MediaAsset {
  id: string;
  relativePath: string;
  folder: string;
  rootCategory: string;
  fileName: string;
  extension: string;
  type: MediaType;
  src: string;
  width: number;
  height: number;
  alt: string;
}

const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/media/**/*.{jpg,jpeg,png,webp,avif}",
  { eager: true }
);

const videoModules = import.meta.glob<{ default: string }>(
  "/src/assets/media/**/*.{mp4,webm}",
  { eager: true }
);

function toRelativePath(path: string): string {
  return path
    .replace(/^\/src\/assets\/media\//, "")
    .replace(/^src\/assets\/media\//, "");
}

function parsePath(path: string): {
  relativePath: string;
  folder: string;
  fileName: string;
  extension: string;
  rootCategory: string;
} {
  const relativePath = toRelativePath(path);
  const segments = relativePath.split("/");
  const fileName = segments.at(-1) ?? "";
  const folder = segments.slice(0, -1).join("/");
  const extension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
    : "";

  return {
    relativePath,
    folder,
    fileName,
    extension,
    rootCategory: segments[0] ?? ""
  };
}

function compareAssetDeterministically(a: MediaAsset, b: MediaAsset): number {
  return (
    a.fileName.localeCompare(b.fileName) ||
    a.folder.localeCompare(b.folder) ||
    a.relativePath.localeCompare(b.relativePath)
  );
}

function buildIndex(): MediaAsset[] {
  const assets: MediaAsset[] = [];

  for (const [path, module] of Object.entries(imageModules)) {
    const image = module.default;
    const parsed = parsePath(path);

    assets.push({
      id: parsed.relativePath,
      relativePath: parsed.relativePath,
      folder: parsed.folder,
      rootCategory: parsed.rootCategory,
      fileName: parsed.fileName,
      extension: parsed.extension,
      type: "image",
      src: image.src,
      width: image.width,
      height: image.height,
      alt: cleanFilenameToText(parsed.fileName)
    });
  }

  for (const [path, module] of Object.entries(videoModules)) {
    const parsed = parsePath(path);

    assets.push({
      id: parsed.relativePath,
      relativePath: parsed.relativePath,
      folder: parsed.folder,
      rootCategory: parsed.rootCategory,
      fileName: parsed.fileName,
      extension: parsed.extension,
      type: "video",
      src: module.default,
      width: 1280,
      height: 720,
      alt: cleanFilenameToText(parsed.fileName)
    });
  }

  return assets.sort(compareAssetDeterministically);
}

export const MEDIA_INDEX = buildIndex();

export function getMediaByFolder(folder: string): MediaAsset[] {
  return MEDIA_INDEX.filter((asset) => asset.folder === folder);
}

export function getMediaByFolderPrefix(prefix: string): MediaAsset[] {
  const normalized = prefix.replace(/\/$/, "");
  return MEDIA_INDEX.filter(
    (asset) =>
      asset.folder === normalized || asset.folder.startsWith(`${normalized}/`)
  );
}
