import { getStore } from "@netlify/blobs";

const STORE_NAME = "borrelli-site-config";
const CONFIG_KEY = "site-config";

const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(payload)
});

const store = getStore(STORE_NAME);

export const handler = async (event) => {
  try {
    switch (event.httpMethod) {
      case "GET": {
        const config = await store.get(CONFIG_KEY, { type: "json" });
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

        await store.setJSON(CONFIG_KEY, config);
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
