import { notFound } from "next/navigation";
import ListingForm from "@/components/ListingForm";
import { PageHeader } from "@/components/ui";
import { getListing } from "@/lib/listings";
import { requireSection } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSection("listings", "staff");
  const { id } = await params;
  const listing = getListing(id);
  if (!listing) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Listing Onboarding"
        title={`Edit ${listing.name}`}
        back={{ href: `/listings/${id}`, label: "Back to listing" }}
      />
      <ListingForm listing={listing} cancelHref={`/listings/${id}`} />
    </div>
  );
}
