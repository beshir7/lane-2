import { route, readJson } from "@/lib/http";
import { getAthlete } from "@/features/athletes/queries";
import { updateAthlete, removeAthlete } from "@/features/athletes/actions";

export const { GET, PATCH, DELETE } = route({
  GET: (_req, { params }) => getAthlete(params.id),
  PATCH: async (req, { params }) => updateAthlete(params.id, await readJson(req)),
  DELETE: (_req, { params }) => removeAthlete(params.id),
});
