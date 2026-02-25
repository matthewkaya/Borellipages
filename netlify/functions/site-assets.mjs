import { getStore } from "@netlify/blobs";

const STORE_NAME = "borrelli-site-assets";
const ASSET_KEYS = {
  "home-hero-video": "runtime-assets/home-hero-video"
};

const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(payload)
});

const store = getStore(STORE_NAME);

function getHeader(headers, name) {
  if (!headers) {
    return null;
  }

  const needle = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === needle) {
      return value;
    }
  }

  return null;
}

function sanitizeFileName(name) {
  if (!name || typeof name !== "string") {
    return "asset";
  }

  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function resolveAssetKey(event) {
  const assetId = event.queryStringParameters?.asset ?? "";
  if (!(assetId in ASSET_KEYS)) {
    return null;
  }

  return { assetId, key: ASSET_KEYS[assetId] };
}

export const handler = async (event) => {
  try {
    const resolved = resolveAssetKey(event);
    if (!resolved) {
      return json(400, { error: "Invalid or missing asset id." });
    }

    switch (event.httpMethod) {
      case "GET": {
        const entry = await store.getWithMetadata(resolved.key, { type: "arrayBuffer" });
        if (!entry || !entry.data) {
          return json(404, { error: "Asset not found." });
        }

        const metadata =
          entry.metadata && typeof entry.metadata === "object" ? entry.metadata : {};
        const mimeType =
          typeof metadata.mimeType === "string"
            ? metadata.mimeType
            : "application/octet-stream";
        const fileName = sanitizeFileName(
          typeof metadata.fileName === "string" ? metadata.fileName : resolved.assetId
        );

        return {
          statusCode: 200,
          isBase64Encoded: true,
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "no-store",
            "Content-Disposition": `inline; filename="${fileName}"`
          },
          body: Buffer.from(entry.data).toString("base64")
        };
      }

      case "PUT": {
        if (!event.body) {
          return json(400, { error: "Missing request body." });
        }

        const payload = event.isBase64Encoded
          ? Buffer.from(event.body, "base64")
          : Buffer.from(event.body, "binary");

        const mimeType =
          getHeader(event.headers, "content-type") ?? "application/octet-stream";
        const fileName = sanitizeFileName(
          getHeader(event.headers, "x-file-name") ?? resolved.assetId
        );

        await store.set(resolved.key, payload, {
          metadata: {
            mimeType,
            fileName,
            updatedAt: new Date().toISOString()
          }
        });

        return json(200, { ok: true });
      }

      case "DELETE": {
        await store.delete(resolved.key);
        return json(200, { ok: true });
      }

      default:
        return json(405, { error: "Method not allowed." });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(500, { error: message });
  }
};
