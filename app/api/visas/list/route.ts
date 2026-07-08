import { route } from "@/lib/http";
import { visaList } from "@/features/visas/queries";
import type { VisaKind } from "@/lib/types";

// Reads query params, so it must render on demand (not prerendered).
export const dynamic = "force-dynamic";

// Printable/exportable visa list (caption 12/13): ?kind=Schengen|UK|US
export const { GET } = route({
  GET: (req) => {
    const kind = req.nextUrl.searchParams.get("kind") as VisaKind | null;
    return visaList(kind || undefined);
  },
});
