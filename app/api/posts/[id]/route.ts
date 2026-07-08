import { route, readJson } from "@/lib/http";
import { updatePost } from "@/features/cms/actions";

export const { PATCH } = route({
  PATCH: async (req, { params }) => updatePost(params.id, await readJson(req)),
});
