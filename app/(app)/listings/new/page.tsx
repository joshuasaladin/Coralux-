import ListingForm from "@/components/ListingForm";
import { PageHeader } from "@/components/ui";
import { requireSection } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  await requireSection("listings", "staff");

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Listing Onboarding"
        title="New listing"
        back={{ href: "/listings", label: "Listing Onboarding" }}
      />
      <ListingForm cancelHref="/listings" />
    </div>
  );
}
