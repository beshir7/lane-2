import { route, readJson } from "@/lib/http";
import { listPassports, passportsForAthlete } from "@/features/passports/queries";
import { createPassport } from "@/features/passports/actions";

export const { GET, POST } = route({
  GET: (req) => {
    const athleteId = req.nextUrl.searchParams.get("athleteId");
    return athleteId ? passportsForAthlete(athleteId) : listPassports();
  },
  POST: async (req) => createPassport(await readJson(req)),
});
