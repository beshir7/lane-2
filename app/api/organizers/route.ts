import { route, readJson } from "@/lib/http";
import { listOrganizers } from "@/features/organizers/queries";
import { createOrganizer } from "@/features/organizers/actions";

export const { GET, POST } = route({
  GET: () => listOrganizers(),
  POST: async (req) => createOrganizer(await readJson(req)),
});
