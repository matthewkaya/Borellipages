import type { APIRoute } from "astro";

const routes = [
  "/",
  "/book",
  "/services",
  "/services/custom-home-builds",
  "/services/renovations-expansions",
  "/services/sustainable-craftsmanship"
];

export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL("https://www.borrellicrafters.com")).toString().replace(/\/$/, "");

  const urls = routes
    .map((path) => {
      const loc = `${origin}${path === "/" ? "" : path}`;
      return `<url><loc>${loc}</loc></url>`;
    })
    .join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
};
