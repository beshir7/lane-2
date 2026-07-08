import { route } from "@/lib/http";
import { revokeSession } from "@/features/settings/actions";

export const { DELETE } = route({
  DELETE: (_req, { params }) => revokeSession(params.id),
});
