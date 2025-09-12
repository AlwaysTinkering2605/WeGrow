import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import GoalAlignment from "./GoalAlignment";
import WeeklyCheckIn from "./WeeklyCheckIn";

export default function Goals() {
  const { data: goals, isLoading } = useQuery({
    queryKey: ["/api/goals"],
    retry: false,
  });

  const { data: objectives } = useQuery({
    queryKey: ["/api/objectives"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-6 animate-pulse">
          <div className="w-48 h-6 bg-muted rounded mb-4"></div>
          <div className="space-y-4">
            <div className="w-full h-24 bg-muted rounded"></div>
            <div className="w-full h-24 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const activeGoals = (goals as any[])?.filter((goal: any) => goal.isActive) || [];

  return (
    <div className="space-y-6">
      <GoalAlignment goals={activeGoals} objectives={objectives || []} />
      <WeeklyCheckIn goals={activeGoals} />
    </div>
  );
}
