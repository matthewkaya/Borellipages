# Borrelli Crafters Website (Astro + Tailwind)

Modern, static-first, Netlify-ready marketing site for **Borrelli Crafters** with:
- Conversion-first IA: Home -> Service Detail -> Book/Contact
- Runtime Designer panel (`/admin`) for content and media configuration
- Deterministic media auto-discovery from taxonomy folders
- Netlify Forms contact workflow
- Accessibility and performance-focused defaults

## Tech Stack
- Astro (TypeScript)
- Tailwind CSS
- Vanilla JS (small runtime scripts)
- Static output (`dist`) for Netlify

## Quick Start
1. Install dependencies:

```bash
npm install
```

2. Run locally:

```bash
npm run dev
```

3. Build production files:

```bash
npm run build
```

4. Preview production build:

```bash
npm run preview
```

## Netlify Deployment
- Build command: `npm run build`
- Publish directory: `dist`
- Config is already provided in [`netlify.toml`](/Users/m.matthewkaya/Documents/Projects/Borelli/netlify.toml).

## Media Folder Taxonomy (Required)
Upload media to:

`src/assets/media/`

Required folders:

- `bespoke-cottages-homes/`
  - `exteriors/`
  - `interiors/`
  - `living-spaces/`
  - `high-end-kitchens/`
- `renovations-additions/`
  - `bathrooms/`
  - `kitchens/`
  - `home-additions/`
  - `before-after-pairs/`
- `landscaping-outdoors/`
  - `decks-patios/`
  - `driveways/`
  - `landscaping/`
- `process-craftsmanship/`
  - `behind-the-scenes/`
  - `framing/`
  - `millwork-detail/`

Supported formats:
- Images: `jpg`, `jpeg`, `png`, `webp`, `avif`
- Videos: `mp4`, `webm`

## How Media Auto-Discovery Works
- Media is indexed at build time via `import.meta.glob` in [`mediaIndex.ts`](/Users/m.matthewkaya/Documents/Projects/Borelli/src/lib/mediaIndex.ts).
- Selection is deterministic in [`mediaSelect.ts`](/Users/m.matthewkaya/Documents/Projects/Borelli/src/lib/mediaSelect.ts):
  - sort by filename
  - then folder/path
  - pinned overrides appear first
  - capped by each section's `maxItems`

Default section mappings are defined in:
- [`defaultSiteConfig.json`](/Users/m.matthewkaya/Documents/Projects/Borelli/src/config/defaultSiteConfig.json)

## Before/After Pairing
Before/after slider reads files from:
- `src/assets/media/renovations-additions/before-after-pairs/`

Pairing convention:
- `projectname_before.jpg`
- `projectname_after.jpg`

## Runtime Designer Panel
### Routes
- Login: `/admin/login`
- Designer: `/admin`
- Settings: `/admin/settings`

### Default Credentials
- Username: `admin`
- Password: `pass`

### Auth Notes
- Session stored in localStorage.
- Password stored as SHA-256 hash (Web Crypto API), not plaintext.

### What You Can Edit
- Homepage hero text
- Service card titles/blurbs
- Testimonials (3-6)
- Process steps (3-5)
- Service intros, fit matrix bullets, FAQs
- Contact page microcopy
- Media section sources/max/pinned assets/include-videos
- Alt override text for pinned assets

### Export / Import
- Export downloads: `site-config.export.json`
- Import restores from that JSON file

Runtime config priority:
1. localStorage config
2. `/public/site-config.json`

## Default Config and Build Sync
- Source of default config: [`src/config/defaultSiteConfig.json`](/Users/m.matthewkaya/Documents/Projects/Borelli/src/config/defaultSiteConfig.json)
- Build sync script: [`scripts/generate-site-config.mjs`](/Users/m.matthewkaya/Documents/Projects/Borelli/scripts/generate-site-config.mjs)
- Output file: [`public/site-config.json`](/Users/m.matthewkaya/Documents/Projects/Borelli/public/site-config.json)

## Contact Details Placeholder Notes
The Wix site response was script-heavy and did not expose reliable phone/email/address in crawlable HTML.
Placeholders are intentionally set in one file for easy replacement:
- [`src/config/defaultSiteConfig.json`](/Users/m.matthewkaya/Documents/Projects/Borelli/src/config/defaultSiteConfig.json)

Social links were populated from discovered page links.

## Accessibility and UX Highlights
- Semantic structure and heading hierarchy
- Skip link
- Visible focus states
- Keyboard-accessible mobile nav and before/after slider
- Form labels + `aria-describedby` field errors
- High contrast overlays for media-heavy areas

## SEO
- Per-page titles and descriptions
- Open Graph tags
- LocalBusiness JSON-LD
- `robots.txt` and `sitemap.xml`

## Important Files
- App config loader: [`src/lib/config.ts`](/Users/m.matthewkaya/Documents/Projects/Borelli/src/lib/config.ts)
- Media indexer: [`src/lib/mediaIndex.ts`](/Users/m.matthewkaya/Documents/Projects/Borelli/src/lib/mediaIndex.ts)
- Media selector: [`src/lib/mediaSelect.ts`](/Users/m.matthewkaya/Documents/Projects/Borelli/src/lib/mediaSelect.ts)
- Home page: [`src/pages/index.astro`](/Users/m.matthewkaya/Documents/Projects/Borelli/src/pages/index.astro)
- Service template: [`src/pages/services/[slug].astro`](/Users/m.matthewkaya/Documents/Projects/Borelli/src/pages/services/[slug].astro)
- Contact page: [`src/pages/book.astro`](/Users/m.matthewkaya/Documents/Projects/Borelli/src/pages/book.astro)
- Admin designer: [`src/pages/admin/index.astro`](/Users/m.matthewkaya/Documents/Projects/Borelli/src/pages/admin/index.astro)
# Borellipages
