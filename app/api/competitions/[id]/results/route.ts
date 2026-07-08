import { route, readJson } from "@/lib/http";
import { listResults } from "@/features/competitions/queries";
import { addResult } from "@/features/competitions/actions";

export const { GET, POST } = route({
  GET: (_req, { params }) => listResults(params.id),
  POST: async (req, { params }) => addResult(params.id, await readJson(req)),
});
