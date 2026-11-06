"use client";

import Link from "next/link";
import { useActionState } from "react";
import SubmitButton from "./SubmitButton";
import { createPropertyAction, updatePropertyAction, type ActionState } from "@/lib/actions";

type Property = Record<string, any>;

/** Grouped so the parts a cleaner will see sit together, and the owner's
 * side is visibly its own thing. */
export default function PropertyForm({
  property,
  cancelHref,
}: {
  property?: Property;
  cancelHref: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    property ? updatePropertyAction : createPropertyAction,
    null,
  );

  const field = (name: string) => (property?.[name] as string | null) ?? "";

  return (
    <form action={action} className="space-y-5">
      {property && <input type="hidden" name="__id" value={property.id} />}

      <section className="panel p-4">
        <h2 className="text-sm font-semibold mb-3">The property</h2>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" className="input" defaultValue={field("name")} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="address">Address</label>
            <input id="address" name="address" className="input" defaultValue={field("address")} />
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" className="select" defaultValue={field("status") || "active"}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm font-semibold mb-1">Getting in</h2>
        <p className="text-xs mb-3" style={{ color: "var(--ink-3)" }}>
          Anyone given the Properties section sees this, cleaners included.
        </p>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <label className="label" htmlFor="door_code">Door code</label>
            <input id="door_code" name="door_code" className="input" defaultValue={field("door_code")} />
          </div>
          <div>
            <label className="label" htmlFor="lockbox_code">Lockbox code</label>
            <input id="lockbox_code" name="lockbox_code" className="input" defaultValue={field("lockbox_code")} />
          </div>
          <div>
            <label className="label" htmlFor="alarm_code">Alarm code</label>
            <input id="alarm_code" name="alarm_code" className="input" defaultValue={field("alarm_code")} />
          </div>
          <div>
            <label className="label" htmlFor="parking">Parking</label>
            <input id="parking" name="parking" className="input" defaultValue={field("parking")} placeholder="Where to leave the car" />
          </div>
          <div>
            <label className="label" htmlFor="wifi_name">Wi-Fi network</label>
            <input id="wifi_name" name="wifi_name" className="input" defaultValue={field("wifi_name")} />
          </div>
          <div>
            <label className="label" htmlFor="wifi_password">Wi-Fi password</label>
            <input id="wifi_password" name="wifi_password" className="input" defaultValue={field("wifi_password")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="access_notes">Access notes</label>
            <textarea
              id="access_notes"
              name="access_notes"
              className="textarea"
              rows={2}
              defaultValue={field("access_notes")}
              placeholder="Gate on the left, key under the second planter…"
            />
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm font-semibold mb-1">Owner</h2>
        <p className="text-xs mb-3" style={{ color: "var(--ink-3)" }}>
          Managers and above only — never shown to staff.
        </p>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <label className="label" htmlFor="owner_name">Owner</label>
            <input id="owner_name" name="owner_name" className="input" defaultValue={field("owner_name")} />
          </div>
          <div>
            <label className="label" htmlFor="owner_email">Email</label>
            <input id="owner_email" name="owner_email" type="email" className="input" defaultValue={field("owner_email")} />
          </div>
          <div>
            <label className="label" htmlFor="owner_phone">Phone</label>
            <input id="owner_phone" name="owner_phone" className="input" defaultValue={field("owner_phone")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="notes">Internal notes</label>
            <textarea id="notes" name="notes" className="textarea" rows={3} defaultValue={field("notes")} />
          </div>
        </div>
      </section>

      {state?.error && <p className="chip chip-bad justify-center py-2">{state.error}</p>}

      <div className="flex items-center gap-2">
        <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
          {property ? "Save changes" : "Create property"}
        </SubmitButton>
        <Link href={cancelHref} className="btn">
          Cancel
        </Link>
      </div>
    </form>
  );
}
