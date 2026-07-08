import { route } from "@/lib/http";
import { listAudit } from "@/features/settings/queries";

export const { GET } = route({
  GET: () => listAudit(),
});
