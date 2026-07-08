import { route } from "@/lib/http";
import { removeDocument } from "@/features/documents/actions";

export const { DELETE } = route({
  DELETE: (_req, { params }) => removeDocument(params.id),
});
