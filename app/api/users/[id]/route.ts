import { route } from "@/lib/http";
import { removeUser } from "@/features/settings/actions";

export const { DELETE } = route({
  DELETE: (_req, { params }) => removeUser(params.id),
});
