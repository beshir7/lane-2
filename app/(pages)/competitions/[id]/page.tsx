import { CompetitionDetail } from "@/features/competitions/components/competition-detail";

export default function RacePage({ params }: { params: { id: string } }) {
  return <CompetitionDetail competitionId={params.id} />;
}
