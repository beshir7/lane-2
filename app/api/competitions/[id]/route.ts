import { route, readJson } from "@/lib/http";
import { getCompetition } from "@/features/competitions/queries";
import { updateCompetition, removeCompetition } from "@/features/competitions/actions";

export const { GET, PATCH, DELETE } = route({
  GET: (_req, { params }) => getCompetition(params.id),
  PATCH: async (req, { params }) => updateCompetition(params.id, await readJson(req)),
  DELETE: (_req, { params }) => removeCompetition(params.id),
});
