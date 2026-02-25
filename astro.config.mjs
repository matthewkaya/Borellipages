import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import { fileURLToPath } from "node:url";

export default defineConfig({
  site: "https://www.borrellicrafters.com",
  trailingSlash: "always",
  integrations: [tailwind()],
  scopedStyleStrategy: "where",
  vite: {
    assetsInclude: ["**/*.[mM][pP]4", "**/*.[wW][eE][bB][mM]"],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url))
      }
    }
  }
});
