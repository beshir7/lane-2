import { route, readJson } from "@/lib/http";
import { listEvents } from "@/features/calendar/queries";
import { createEvent } from "@/features/calendar/actions";

export const { GET, POST } = route({
  GET: () => listEvents(),
  POST: async (req) => createEvent(await readJson(req)),
});
