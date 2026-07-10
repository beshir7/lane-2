"use client";

// Entry point for /signin and /signup. On success, navigate into the workspace
// and refresh so the server (middleware) sees the new Supabase session cookie.

import { useRouter } from "next/navigation";
import { AuthRouter } from "./auth-screen";

export function AuthEntry({ view = "login" }: { view?: "login" | "signup" }) {
  const router = useRouter();
  return (
    <AuthRouter
      initialView={view}
      onLogin={() => {
        router.push("/dashboard");
        router.refresh();
      }}
    />
  );
}
