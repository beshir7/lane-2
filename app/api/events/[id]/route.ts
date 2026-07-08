import { route, readJson } from "@/lib/http";
import { updateEvent, removeEvent } from "@/features/calendar/actions";

export const { PATCH, DELETE } = route({
  PATCH: async (req, { params }) => updateEvent(params.id, await readJson(req)),
  DELETE: (_req, { params }) => removeEvent(params.id),
});
