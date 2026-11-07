import { NextResponse } from "next/server";
import { atLeast, currentUser } from "@/lib/auth";
import { syncGuesty } from "@/lib/guesty";

/**
 * Run the sync on demand. Behind the ordinary session, so it needs a
 * signed-in manager — there is no separate shared secret to leak, and the
 * scheduled run does not go through here at all.
 */
export async function POST() {
  const user = await currentUser();
  if (!user || !atLeast(user.role, "manager")) {
    return NextResponse.json({ error: "Managers only." }, { status: 403 });
  }
  const result = await syncGuesty();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
