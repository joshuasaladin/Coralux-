import { NextResponse } from "next/server";
import { atLeast, currentUser } from "@/lib/auth";
import { getFile, readStored } from "@/lib/files";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return new NextResponse("Not signed in", { status: 401 });

  const { id } = await params;
  const file = getFile(id);
  if (!file) return new NextResponse("Not found", { status: 404 });

  if (file.sensitive && !atLeast(user.role, "admin")) {
    return new NextResponse("Not permitted", { status: 403 });
  }

  try {
    const bytes = await readStored(file.storage_key);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.mime_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new NextResponse("File is missing from storage", { status: 410 });
  }
}
