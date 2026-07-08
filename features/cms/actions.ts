"use server";

// CMS posts — write operations.

import { db, rid, patchById } from "@/services/db";
import type { Post } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

function normalizePost(input: Partial<Post>): Post {
  return {
    id: input.id || rid("p"),
    title: input.title || "Untitled",
    status: input.status || "draft",
    author: input.author || "Lena Andersen",
    color: input.color || "#5b6ef5",
    date: input.date || today(),
    views: input.views ?? 0,
    category: input.category || "News",
    body: input.body || "",
  };
}

export async function createPost(input: Partial<Post>) {
  const post = normalizePost(input);
  db.posts.unshift(post);
  return post;
}

export async function updatePost(id: string, patch: Partial<Post>) {
  return patchById(db.posts, id, patch, "Post");
}
