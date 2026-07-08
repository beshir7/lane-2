import { route, readJson } from "@/lib/http";
import { listCompetitions } from "@/features/competitions/queries";
import { createCompetition } from "@/features/competitions/actions";

export const { GET, POST } = route({
  GET: () => listCompetitions(),
  POST: async (req) => createCompetition(await readJson(req)),
});
