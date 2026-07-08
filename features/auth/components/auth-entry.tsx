"use client";

// Standalone entry point for the /signin and /signup routes. Reuses the
// AuthRouter but, on success, flips the session flag and enters the workspace.

import { useRouter } from "next/navigation";
import { useLane } from "@/components/lane-provider";
import { AuthRouter } from "./auth-screen";

export function AuthEntry({ view = "login" }: { view?: "login" | "signup" }) {
  const router = useRouter();
  const { setAuthenticated } = useLane();
  return (
    <AuthRouter
      initialView={view}
      onLogin={() => {
        setAuthenticated(true);
        router.push("/dashboard");
      }}
    />
  );
}
