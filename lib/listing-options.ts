/** Client-safe listing constants — no node-only imports here. */
import type { Tone } from "./entities";

export const PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: "airbnb", label: "Airbnb" },
  { value: "guesty", label: "Guesty" },
  { value: "both", label: "Airbnb & Guesty" },
];

export const STATUS_OPTIONS: { value: string; label: string; tone: Tone }[] = [
  { value: "in_progress", label: "In progress", tone: "warn" },
  { value: "active", label: "Active", tone: "good" },
  { value: "paused", label: "Paused", tone: "muted" },
];

export function statusTone(status: string): Tone {
  return STATUS_OPTIONS.find((s) => s.value === status)?.tone ?? "neutral";
}

export function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

export function platformLabel(value: string): string {
  return PLATFORM_OPTIONS.find((p) => p.value === value)?.label ?? value;
}
