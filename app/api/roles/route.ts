import { route } from "@/lib/http";
import { getRolesConfig } from "@/features/settings/queries";

export const { GET } = route({
  GET: () => getRolesConfig(),
});
