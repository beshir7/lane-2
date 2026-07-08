import "server-only";

// CMS posts — server-side reads.

import { db } from "@/services/db";

export const listPosts = () => db.posts;
