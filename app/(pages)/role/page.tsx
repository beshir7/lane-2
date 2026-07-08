import { SettingsScreen } from "@/features/settings/components/settings-screen";

// Roles & access is the RBAC tab of Settings, exposed as its own nav route.
export default function RbacPage() {
  return <SettingsScreen initialTab="rbac" />;
}
