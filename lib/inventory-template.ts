/**
 * What a villa needs on the shelves before it can take guests — the counterpart
 * to the onboarding checklist, walked room by room.
 *
 * `coralux` marks the items Coralux supplies rather than the owner: linens,
 * towels, toiletries and the like. They are called out on the page so an owner
 * reading the list can see at a glance what is on us and what is on them.
 *
 * Kept free of imports so the boot-time migration can read it too.
 */
export type InventoryItem = { label: string; coralux?: true };
export type InventorySection = { section: string; items: InventoryItem[] };

export const INVENTORY_TEMPLATE: InventorySection[] = [
  {
    section: "Bedrooms (per room)",
    items: [
      { label: "Pillows (4x each bed)" },
      { label: "Decorative pillows (1–4 per bed)" },
      { label: "Blankets and linens (10x sets)", coralux: true },
      { label: "Nightstands (2x)" },
      { label: "Lamps (2x)" },
      { label: "Closets or clothing racks with hangers" },
      { label: "Air conditioning units" },
      { label: "Long mirror" },
      { label: "Smart TV" },
    ],
  },
  {
    section: "Bathrooms",
    items: [
      { label: "Shower with hot water" },
      { label: "Towels (house capacity) x2", coralux: true },
      { label: "Hand towels", coralux: true },
      { label: "Face towels (preferably black)", coralux: true },
      { label: "Shampoo & conditioner (Aruba Aloe)", coralux: true },
      { label: "Body wash (Aruba Aloe)", coralux: true },
      { label: "Hand soap dispenser (1x per bathroom)" },
      { label: "Hairdryer (1x per full bathroom)" },
      { label: "Bath mat (2x per full bathroom)", coralux: true },
      { label: "Trash bin (1x per bathroom)" },
      { label: "Plunger (1x)" },
      { label: "Toilet brush (1x per bathroom)" },
      { label: "Toothbrush holder (1x per full bathroom)" },
    ],
  },
  {
    section: "Kitchen appliances",
    items: [
      { label: "Refrigerator with freezer" },
      { label: "Stove/oven" },
      { label: "Dishwasher" },
      { label: "Microwave" },
      { label: "Toaster" },
      { label: "Blender" },
      { label: "Coffee maker (Coralux machine)" },
      { label: "Kettle" },
    ],
  },
  {
    section: "Kitchen utensils",
    items: [
      { label: "Utensil holder" },
      { label: "Cookware (pots, pans)" },
      { label: "Forks (house capacity)" },
      { label: "Small spoons (house capacity)" },
      { label: "Big spoons (house capacity)" },
      { label: "Table knives (house capacity)" },
      { label: "Steak knives (house capacity)" },
      { label: "Cutting knives" },
      { label: "Small glasses (house capacity)" },
      { label: "Tall glasses (house capacity)" },
      { label: "Plastic cups (house capacity)" },
      { label: "Wine glasses (house capacity)" },
      { label: "Champagne glasses (house capacity)" },
      { label: "Mugs (house capacity)" },
      { label: "Small plates (house capacity)" },
      { label: "Big plates (house capacity)" },
      { label: "Bowls (house capacity)" },
      { label: "Oven sheet" },
      { label: "Oven deep dish" },
      { label: "Wine opener" },
      { label: "Bottle opener" },
      { label: "Chip clips" },
      { label: "Whisk" },
      { label: "Peeler" },
      { label: "Serving spoon" },
      { label: "Spatula" },
      { label: "Tongs" },
      { label: "Lemon squeezer" },
      { label: "Pitcher" },
      { label: "Measuring cups and spoons" },
      { label: "Soap dispenser" },
      { label: "Cutting board" },
      { label: "Drying rack (optional)" },
      { label: "Oven mittens" },
      { label: "Kitchen paper towel holder" },
      { label: "Kitchen towels" },
      { label: "Garbage bin" },
      { label: "To-go containers" },
    ],
  },
  {
    section: "Living & dining area",
    items: [
      { label: "Smart TV" },
      { label: "Wi-Fi router with high-speed internet" },
      { label: "Frame for Wi-Fi information and house rules", coralux: true },
    ],
  },
  {
    section: "Laundry",
    items: [
      { label: "Washing machine" },
      { label: "Dryer" },
      { label: "Drying rack" },
      { label: "Iron" },
      { label: "Ironing board" },
    ],
  },
  {
    section: "Safety & essentials",
    items: [
      { label: "Smoke detectors" },
      { label: "Carbon monoxide detectors" },
      { label: "First aid kit" },
      { label: "Handheld fire extinguisher" },
      { label: "Safe for valuables" },
      { label: "Lockbox or smart lock for check-in (Schlage lock)" },
    ],
  },
  {
    section: "Outdoor area & pool",
    items: [
      { label: "Pool/beach towels (house capacity)", coralux: true },
      { label: "Pool loungers or outdoor chairs" },
      { label: "BBQ grill (gas, blue tank)" },
      { label: "Outdoor shower, if possible" },
    ],
  },
  {
    section: "Beach & island essentials",
    items: [{ label: "Cooler" }, { label: "Beach chairs (house capacity)" }],
  },
  {
    section: "Family-friendly items",
    items: [
      { label: "High chair" },
      { label: "Pack 'n Play/crib" },
      { label: "Mattress for crib" },
      { label: "Mattress cover" },
    ],
  },
  {
    section: "Extras that add value",
    items: [
      { label: "Bluetooth speaker" },
      { label: "Inflatable pool toys or floaties" },
      { label: "Snorkelling gear" },
      { label: "Board games or cards" },
    ],
  },
];

/** Flattened, in the order they should appear against a listing. */
export const INVENTORY_STEPS: { section: string; label: string; coralux: boolean }[] =
  INVENTORY_TEMPLATE.flatMap((group) =>
    group.items.map((item) => ({
      section: group.section,
      label: item.label,
      coralux: item.coralux === true,
    })),
  );
