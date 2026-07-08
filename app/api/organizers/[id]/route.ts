import { route, readJson } from "@/lib/http";
import { getOrganizer } from "@/features/organizers/queries";
import { updateOrganizer, removeOrganizer } from "@/features/organizers/actions";

export const { GET, PATCH, DELETE } = route({
  GET: (_req, { params }) => getOrganizer(params.id),
  PATCH: async (req, { params }) => updateOrganizer(params.id, await readJson(req)),
  DELETE: (_req, { params }) => removeOrganizer(params.id),
});
