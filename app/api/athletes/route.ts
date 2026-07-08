import { route, readJson } from "@/lib/http";
import { listAthletes } from "@/features/athletes/queries";
import { createAthlete } from "@/features/athletes/actions";

export const { GET, POST } = route({
  GET: () => listAthletes(),
  POST: async (req) => createAthlete(await readJson(req)),
});
