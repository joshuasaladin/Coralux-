"use client";

import Link from "next/link";
import { useActionState } from "react";
import SubmitButton from "./SubmitButton";
import { createListingAction, updateListingAction, type ActionState } from "@/lib/actions";
import { PLATFORM_OPTIONS, STATUS_OPTIONS } from "@/lib/listing-options";

export default function ListingForm({
  listing,
  cancelHref,
}: {
  listing?: Record<string, any> | null;
  cancelHref: string;
}) {
  const isEdit = Boolean(listing?.id);
  const [state, formAction] = useActionState<ActionState, FormData>(
    isEdit ? updateListingAction : createListingAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-5">
      {isEdit && <input type="hidden" name="__id" value={listing!.id} />}

      <section className="panel p-5">
        <h2 className="text-sm font-semibold mb-4">Details</h2>
        <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">
              Listing name <span style={{ color: "var(--bad-fg)" }}>*</span>
            </label>
            <input
              id="name"
              name="name"
              className="input"
              defaultValue={listing?.name ?? ""}
              placeholder="Malmok Cliff Villa"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="address">Address</label>
            <input id="address" name="address" className="input" defaultValue={listing?.address ?? ""} />
          </div>

          <div>
            <label className="label" htmlFor="owner_name">Owner</label>
            <input id="owner_name" name="owner_name" className="input" defaultValue={listing?.owner_name ?? ""} />
          </div>

          <div>
            <label className="label" htmlFor="platforms">Going live on</label>
            <select id="platforms" name="platforms" className="select" defaultValue={listing?.platforms ?? "both"}>
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="target_date">Target launch date</label>
            <input
              id="target_date"
              name="target_date"
              type="date"
              className="input"
              defaultValue={listing?.target_date ?? ""}
            />
          </div>

          <div>
            <label className="label" htmlFor="assignee">Assigned to</label>
            <input
              id="assignee"
              name="assignee"
              className="input"
              defaultValue={listing?.assignee ?? ""}
              placeholder="Who is running this onboarding"
            />
          </div>

          {isEdit && (
            <div>
              <label className="label" htmlFor="status">Status</label>
              <select id="status" name="status" className="select" defaultValue={listing?.status ?? "in_progress"}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
                Normally follows the checklist automatically — set to Paused to stop that.
              </p>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="label" htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" className="textarea" rows={3} defaultValue={listing?.notes ?? ""} />
          </div>
        </div>
      </section>

      {!isEdit && (
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Creating the listing adds the standard onboarding checklist automatically — you can add
          extra steps afterward.
        </p>
      )}

      {state?.error && <p className="chip chip-bad w-full justify-center py-2">{state.error}</p>}

      <div className="flex items-center gap-2">
        <SubmitButton>{isEdit ? "Save changes" : "Create listing"}</SubmitButton>
        <Link href={cancelHref} className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
