import "server-only";

// =========================================================================
// API plumbing for App Router route handlers. `route()` turns a map of
// method -> business logic into a set of GET/POST/PATCH/DELETE exports with
// uniform JSON serialization and error handling. Typed errors thrown from
// anywhere in the feature layer surface as the matching HTTP status.
// =========================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound = (what = "Resource"): never => {
  throw new HttpError(404, `${what} not found`);
};

export const badRequest = (message = "Invalid request"): never => {
  throw new HttpError(400, message);
};

export type RouteContext = { params: Record<string, string> };
type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type Handler = (req: NextRequest, ctx: RouteContext) => unknown | Promise<unknown>;

/** Parse a JSON body, tolerating an empty/invalid payload. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJson<T = any>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

function respond(data: unknown, status: number) {
  return NextResponse.json(data as Record<string, unknown>, { status });
}

/**
 * Build App Router method exports from a handler map:
 *   export const { GET, POST } = route({ GET: () => ..., POST: async (req) => ... });
 * POST responds 201; everything else 200. HttpError -> its status; else 500.
 */
export function route(handlers: Partial<Record<Method, Handler>>) {
  const wrap = (method: Method, fn: Handler) => async (req: NextRequest, ctx: RouteContext) => {
    try {
      const data = await fn(req, ctx);
      return respond(data, method === "POST" ? 201 : 200);
    } catch (err) {
      if (err instanceof HttpError) return respond({ error: err.message }, err.status);
      console.error("[api] unhandled error", err);
      return respond({ error: "Internal server error" }, 500);
    }
  };

  const out: Partial<Record<Method, ReturnType<typeof wrap>>> = {};
  (Object.keys(handlers) as Method[]).forEach((m) => {
    const fn = handlers[m];
    if (fn) out[m] = wrap(m, fn);
  });
  return out;
}
