export const MEDIA_FOLDER_TAXONOMY = [
  "bespoke-cottages-homes/exteriors",
  "bespoke-cottages-homes/interiors",
  "bespoke-cottages-homes/living-spaces",
  "bespoke-cottages-homes/high-end-kitchens",
  "renovations-additions/bathrooms",
  "renovations-additions/kitchens",
  "renovations-additions/home-additions",
  "renovations-additions/before-after-pairs",
  "landscaping-outdoors/decks-patios",
  "landscaping-outdoors/driveways",
  "landscaping-outdoors/landscaping",
  "process-craftsmanship/behind-the-scenes",
  "process-craftsmanship/framing",
  "process-craftsmanship/millwork-detail"
] as const;

export type MediaFolder = (typeof MEDIA_FOLDER_TAXONOMY)[number];
