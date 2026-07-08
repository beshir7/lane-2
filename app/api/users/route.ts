import { route, readJson } from "@/lib/http";
import { listUsers } from "@/features/settings/queries";
import { inviteUser } from "@/features/settings/actions";

export const { GET, POST } = route({
  GET: () => listUsers(),
  POST: async (req) => inviteUser(await readJson(req)),
});
