import { route, readJson } from "@/lib/http";
import { getEntry } from "@/features/entries/queries";
import { updateEntry, removeEntry } from "@/features/entries/actions";

export const { GET, PATCH, DELETE } = route({
  GET: (_req, { params }) => getEntry(params.id),
  PATCH: async (req, { params }) => updateEntry(params.id, await readJson(req)),
  DELETE: (_req, { params }) => removeEntry(params.id),
});
