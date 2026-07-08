import { route, readJson } from "@/lib/http";
import { listVisas, visasForAthlete } from "@/features/visas/queries";
import { createVisa } from "@/features/visas/actions";

export const { GET, POST } = route({
  GET: (req) => {
    const athleteId = req.nextUrl.searchParams.get("athleteId");
    return athleteId ? visasForAthlete(athleteId) : listVisas();
  },
  POST: async (req) => createVisa(await readJson(req)),
});
