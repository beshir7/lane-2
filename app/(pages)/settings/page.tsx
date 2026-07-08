import { SettingsScreen } from "@/features/settings/components/settings-screen";

export default function SettingsPage({ searchParams }: { searchParams: { tab?: string } }) {
  return <SettingsScreen initialTab={searchParams.tab} />;
}
