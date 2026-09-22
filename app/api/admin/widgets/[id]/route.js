import { NextResponse } from "next/server";
import { deleteWidget } from "@/lib/widgets";
import { kvSet } from "@/lib/store";
import { cacheKey } from "@/lib/refresh";

export const dynamic = "force-dynamic";

// DELETE -> remove the widget config and clear its cached reviews.
export async function DELETE(_request, { params }) {
  const { id } = await params;
  const removed = await deleteWidget(id);
  await kvSet(cacheKey(id), null); // clear cached reviews
  return NextResponse.json({ ok: removed });
}
