import ListingForm from "@/components/ListingForm";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  await requireUser();

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
