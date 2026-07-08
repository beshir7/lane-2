import { AthleteProfile } from "@/features/athletes/components/athlete-profile";

export default function AthletePage({ params }: { params: { id: string } }) {
  return <AthleteProfile athleteId={params.id} />;
}
