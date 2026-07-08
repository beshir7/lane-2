import { route } from "@/lib/http";
import { listActivity } from "@/features/dashboard/queries";

export const { GET } = route({
  GET: () => listActivity(),
});
