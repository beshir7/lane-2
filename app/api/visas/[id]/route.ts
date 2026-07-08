import { route, readJson } from "@/lib/http";
import { getVisa } from "@/features/visas/queries";
import { updateVisa, removeVisa } from "@/features/visas/actions";

export const { GET, PATCH, DELETE } = route({
  GET: (_req, { params }) => getVisa(params.id),
  PATCH: async (req, { params }) => updateVisa(params.id, await readJson(req)),
  DELETE: (_req, { params }) => removeVisa(params.id),
});
