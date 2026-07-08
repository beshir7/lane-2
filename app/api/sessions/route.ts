import { route } from "@/lib/http";
import { listSessions } from "@/features/settings/queries";

export const { GET } = route({
  GET: () => listSessions(),
});
