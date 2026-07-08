import { route, readJson } from "@/lib/http";
import { listPosts } from "@/features/cms/queries";
import { createPost } from "@/features/cms/actions";

export const { GET, POST } = route({
  GET: () => listPosts(),
  POST: async (req) => createPost(await readJson(req)),
});
