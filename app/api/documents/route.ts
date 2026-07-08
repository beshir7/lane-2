import { route, readJson } from "@/lib/http";
import { listDocuments } from "@/features/documents/queries";
import { createDocument } from "@/features/documents/actions";

export const { GET, POST } = route({
  GET: () => listDocuments(),
  POST: async (req) => createDocument(await readJson(req)),
});
