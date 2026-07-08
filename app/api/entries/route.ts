import { route, readJson } from "@/lib/http";
import { listEntries, entriesForCompetition, entriesForAthlete } from "@/features/entries/queries";
import { createEntry } from "@/features/entries/actions";

export const { GET, POST } = route({
  GET: (req) => {
    const competitionId = req.nextUrl.searchParams.get("competitionId");
    const athleteId = req.nextUrl.searchParams.get("athleteId");
    if (competitionId) return entriesForCompetition(competitionId);
    if (athleteId) return entriesForAthlete(athleteId);
    return listEntries();
  },
  POST: async (req) => createEntry(await readJson(req)),
});
