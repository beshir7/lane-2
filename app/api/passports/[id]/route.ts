import { route, readJson } from "@/lib/http";
import { getPassport } from "@/features/passports/queries";
import { updatePassport, removePassport } from "@/features/passports/actions";

export const { GET, PATCH, DELETE } = route({
  GET: (_req, { params }) => getPassport(params.id),
  PATCH: async (req, { params }) => updatePassport(params.id, await readJson(req)),
  DELETE: (_req, { params }) => removePassport(params.id),
});
