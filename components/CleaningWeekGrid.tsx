"use client";

import { useState, useTransition } from "react";
import Icon from "./Icon";
import { clearCleaningShiftAction, saveCleaningShiftAction } from "@/lib/actions";
import { CLEANING_TIME_SLOTS, shiftKey, type CleaningWeek } from "@/lib/cleaning-shared";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Shift = { listing: string | null; notes: string | null };
type ShiftMap = Record<string, Shift>;

function formatSlot(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const suffix = h! < 12 ? "am" : "pm";
  const h12 = h! % 12 === 0 ? 12 : h! % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function dayNum(iso: string): number {
  return Number(iso.slice(8, 10));
}

export default function CleaningWeekGrid({
  week,
  initialShifts,
}: {
  week: CleaningWeek;
  initialShifts: Record<string, any>[];
}) {
  const [shifts, setShifts] = useState<ShiftMap>(() => {
    const map: ShiftMap = {};
    for (const s of initialShifts) {
      map[shiftKey(week.start, s.day_of_week, s.time_slot)] = { listing: s.listing, notes: s.notes };
    }
    return map;
  });
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="scroll-x">
      <table className="table" style={{ tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: 84 }}>Time</th>
            {week.days.map((iso, i) => (
              <th
                key={iso}
                style={{
                  background: i === 0 ? "var(--info-bg)" : i === 6 ? "var(--good-bg)" : undefined,
                }}
              >
                {DAY_LABELS[i]} <span className="tabular-nums font-normal">{dayNum(iso)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CLEANING_TIME_SLOTS.map((slot) => (
            <tr key={slot}>
              <td className="primary whitespace-nowrap text-xs">{formatSlot(slot)}</td>
              {week.days.map((iso, dayOfWeek) => {
                const key = shiftKey(week.start, dayOfWeek, slot);
                return (
                  <Cell
                    key={key}
                    cellKey={key}
                    weekStart={week.start}
                    dayOfWeek={dayOfWeek}
                    timeSlot={slot}
                    shift={shifts[key]}
                    isEditing={editing === key}
                    onOpen={() => setEditing(key)}
                    onClose={() => setEditing(null)}
                    onSaved={(shift) =>
                      setShifts((prev) => ({ ...prev, [key]: shift }))
                    }
                    onCleared={() =>
                      setShifts((prev) => {
                        const next = { ...prev };
                        delete next[key];
                        return next;
                      })
                    }
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({
  weekStart,
  dayOfWeek,
  timeSlot,
  shift,
  isEditing,
  onOpen,
  onClose,
  onSaved,
  onCleared,
}: {
  cellKey: string;
  weekStart: string;
  dayOfWeek: number;
  timeSlot: string;
  shift: Shift | undefined;
  isEditing: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSaved: (shift: Shift) => void;
  onCleared: () => void;
}) {
  const [listing, setListing] = useState(shift?.listing ?? "");
  const [notes, setNotes] = useState(shift?.notes ?? "");
  const [pending, startTransition] = useTransition();

  if (isEditing) {
    return (
      <td className="align-top p-1.5" style={{ background: "var(--panel-2)" }}>
        <div className="space-y-1">
          <input
            autoFocus
            className="input"
            style={{ padding: ".3rem .5rem", fontSize: ".75rem" }}
            placeholder="Listing"
            value={listing}
            onChange={(e) => setListing(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          <input
            className="input"
            style={{ padding: ".3rem .5rem", fontSize: ".75rem" }}
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pending}
              className="btn btn-primary btn-sm flex-1"
              style={{ padding: ".2rem .4rem", fontSize: ".7rem" }}
              onClick={() =>
                startTransition(async () => {
                  await saveCleaningShiftAction(weekStart, dayOfWeek, timeSlot, listing, notes);
                  const trimmed = listing.trim();
                  const trimmedNotes = notes.trim();
                  if (!trimmed && !trimmedNotes) onCleared();
                  else onSaved({ listing: trimmed || null, notes: trimmedNotes || null });
                  onClose();
                })
              }
            >
              Save
            </button>
            {shift && (
              <button
                type="button"
                disabled={pending}
                className="btn btn-danger btn-sm"
                style={{ padding: ".2rem .4rem", fontSize: ".7rem" }}
                title="Clear this shift"
                onClick={() =>
                  startTransition(async () => {
                    await clearCleaningShiftAction(weekStart, dayOfWeek, timeSlot);
                    onCleared();
                    onClose();
                  })
                }
              >
                <Icon name="trash" className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ padding: ".2rem .4rem", fontSize: ".7rem" }}
              onClick={onClose}
            >
              <Icon name="x" className="w-3 h-3" />
            </button>
          </div>
        </div>
      </td>
    );
  }

  return (
    <td
      onClick={onOpen}
      className="align-top cursor-pointer transition-colors hover:bg-[var(--panel-2)]"
      style={{ minHeight: 40, padding: ".45rem .55rem" }}
      title="Click to edit"
    >
      {shift?.listing && (
        <span className="block text-xs font-semibold" style={{ color: "var(--ink)" }}>
          {shift.listing}
        </span>
      )}
      {shift?.notes && (
        <span className="block text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
          {shift.notes}
        </span>
      )}
      {!shift?.listing && !shift?.notes && <span className="block h-4" />}
    </td>
  );
}
