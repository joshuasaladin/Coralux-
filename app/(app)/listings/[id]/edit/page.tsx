import { notFound } from "next/navigation";
import ListingForm from "@/components/ListingForm";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getListing } from "@/lib/listings";

export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
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
