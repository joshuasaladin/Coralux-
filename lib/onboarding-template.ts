/**
 * The villa onboarding checklist every listing starts with.
 *
 * Kept free of imports so both the app and the boot-time migration can read
 * it. Edit it freely: new listings pick the change up immediately, and
 * existing listings gain any newly added item the next time the app starts,
 * without disturbing what has already been ticked off.
 *
 * Note that a couple of labels repeat across sections on purpose — Wi-Fi and
 * hot water are checked once at inspection and again on the final walk
 * through — so an item is only ever identified by its section AND its label,
 * never by the label alone.
 */
export type OnboardingSection = { section: string; items: string[] };

export const ONBOARDING_TEMPLATE: OnboardingSection[] = [
  {
    section: "Owner & Property Setup",
    items: [
      "Signed property management agreement",
      "Owner contact information",
      "Owner ID/company information",
      "Property ownership documentation",
      "Property full address + Google Maps pin",
      "Emergency contact",
      "Owner bank/payout information",
      "Confirm management commission %",
      "Confirm owner payout structure",
      "Confirm which expenses Coralux can pay/deduct",
    ],
  },
  {
    section: "Property Access",
    items: [
      "Receive all property keys",
      "Test every key",
      "Set up smart lock/keypad",
      "Create guest access code process",
      "Create management/cleaner access code",
      "Organize all keys with names in the key box",
      "Gate/garage remotes collected (if applicable)",
      "Alarm instructions documented (if applicable)",
    ],
  },
  {
    section: "Property Inspection",
    items: [
      "Complete full walkthrough",
      "Photograph current condition",
      "Create inventory of furniture/appliances",
      "Document existing damage",
      "Test all A/C units",
      "Test Wi-Fi",
      "Test TVs/remotes",
      "Test appliances",
      "Test hot water",
      "Check toilets/showers/faucets",
      "Check doors/windows/locks",
      "Check exterior lighting",
      "Check pool equipment",
      "Check BBQ",
      "Identify repairs needed before launch",
    ],
  },
  {
    section: "Safety",
    items: [
      "Smoke detectors installed/tested",
      "Fire extinguisher",
      "First-aid kit",
      "Emergency numbers available",
      "Safe installed/tested, if provided",
    ],
  },
  {
    section: "Property Information",
    items: [
      "Wi-Fi name/password",
      "Maximum occupancy established",
      "Bedroom configuration",
      "Bed sizes documented",
      "Bathroom count",
      "Parking instructions",
      "Pool instructions",
      "BBQ instructions",
      "Washer/dryer instructions",
      "A/C instructions",
      "Trash collection instructions",
      "Check-in instructions",
      "Check-out instructions",
      "House rules",
      "Quiet hours",
      "Smoking policy",
      "Pet policy",
      "Visitor/event policy",
    ],
  },
  {
    section: "Vendors & Operations",
    items: [
      "Assign pool company",
      "Assign gardener",
      "Assign pest control",
      "Determine trash schedule",
      "Establish maintenance approval limit with owner",
    ],
  },
  {
    section: "Villa Setup",
    items: [
      "Deep cleaning completed",
      "Inventory check completed",
      "Professional pest control completed",
      "Landscaping completed",
      "Pool professionally cleaned",
      "All maintenance issues resolved",
      "Furniture positioned/staged",
      "Décor finalized",
      "Remove owner's personal belongings",
      "Create locked owner/storage closet",
      "Label switches/remotes where necessary",
      "House manual created",
      "Concierge information added",
    ],
  },
  {
    section: "Photography & Content",
    items: [
      "Villa professionally staged",
      "Professional photos taken",
      "Neighborhood/location selling points identified",
      "Hero/cover photo selected",
      "Photo order finalized",
    ],
  },
  {
    section: "Listing Setup",
    items: [
      "Add property to Guesty",
      "Connect Airbnb",
      "Configure owner",
      "Configure management commission",
      "Configure cleaning fee",
      "Configure taxes",
      "Configure payouts/accounting",
      "Create automated guest messages",
      "Create booking confirmation message",
      "Check-in message",
      "Check-out reminder",
      "Configure reviews",
      "Test calendar synchronization",
    ],
  },
  {
    section: "Final Pre-Launch Test",
    items: [
      "Team performs a complete walkthrough as if they were guests",
      "Test front-door access",
      "Test Wi-Fi",
      "Test hot water",
      "Test every A/C",
      "Test major appliances",
      "Confirm villa is completely clean",
      "Confirm beds are properly made",
      "Confirm supplies are stocked",
      "Confirm Airbnb information is accurate",
      "Confirm pricing",
      "Confirm Airbnb calendar",
      "Confirm automated messages",
      "Confirm owner payout/accounting setup",
      "Take final condition photos/video",
    ],
  },
  {
    section: "Go Live",
    items: [
      "Publish Airbnb listing",
      "Confirm listing appears correctly",
      "Test booking flow",
      "Verify rates/taxes/fees from guest side",
      "Open calendar",
      "Notify owner that property is LIVE",
      "Closely monitor first reservations",
    ],
  },
];

/** Flattened, in the order they should appear on a listing. */
export const ONBOARDING_STEPS: { section: string; label: string }[] =
  ONBOARDING_TEMPLATE.flatMap((group) =>
    group.items.map((label) => ({ section: group.section, label })),
  );

/** The 12 generic steps listings used before this checklist existed. Any of
 * these still sitting unticked on an old listing is swept away by the
 * migration, so nobody is left with two competing checklists. */
export const RETIRED_DEFAULT_STEPS: string[] = [
  "Property details collected (address, access, WiFi, house rules)",
  "Professional photos taken",
  "Listing title & description written",
  "Amenities list finalized",
  "Pricing & minimum-stay set",
  "House rules & cancellation policy set",
  "Calendar / availability set",
  "Airbnb listing created",
  "Guesty listing created & PMS connected",
  "Channel manager sync verified (Airbnb ⇄ Guesty)",
  "Payout / banking details configured",
  "Listing published & live",
];
