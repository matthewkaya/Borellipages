import { getStore } from "@netlify/blobs";

const STORE_NAME = "borrelli-site-config";
const CONFIG_KEY = "site-config.json";

const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(payload)
});

const store = getStore(STORE_NAME);

function parseConfigText(raw) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export const handler = async (event) => {
  try {
    switch (event.httpMethod) {
      case "GET": {
        const raw = await store.get(CONFIG_KEY, { type: "text" });
        const config = parseConfigText(raw);
        return json(200, { config: config ?? null });
      }

      case "PUT": {
        if (!event.body) {
          return json(400, { error: "Missing request body." });
        }

        const payload = JSON.parse(event.body);
        const config = payload?.config ?? payload;

        if (!config || typeof config !== "object") {
          return json(400, { error: "Invalid config payload." });
        }

        await store.set(CONFIG_KEY, JSON.stringify(config, null, 2), {
          metadata: {
            contentType: "application/json",
            updatedAt: new Date().toISOString()
          }
        });
        return json(200, { ok: true });
      }

      case "DELETE": {
        await store.delete(CONFIG_KEY);
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
