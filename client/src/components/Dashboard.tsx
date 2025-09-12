import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  BookOpen, 
  Clock, 
  Star,
  CheckCircle,
  AlertCircle,
  TrendingUp 
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ["/api/goals"],
    retry: false,
  });

  const { data: recognitionStats } = useQuery({
    queryKey: ["/api/recognition-stats"],
    retry: false,
  });

  const { data: developmentPlans } = useQuery({
    queryKey: ["/api/development-plans"],
    retry: false,
  });

  if (goalsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="w-8 h-8 bg-muted rounded-lg mb-2"></div>
              <div className="w-16 h-8 bg-muted rounded mb-1"></div>
              <div className="w-20 h-4 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeGoals = (goals as any[])?.filter((goal: any) => goal.isActive) || [];
  const completedGoals = activeGoals.filter((goal: any) => goal.currentValue >= goal.targetValue);
  const avgProgress = activeGoals.length > 0 
    ? Math.round(activeGoals.reduce((acc: number, goal: any) => acc + (goal.currentValue / goal.targetValue * 100), 0) / activeGoals.length)
    : 0;

  const pendingDevelopmentPlans = (developmentPlans as any[])?.filter((plan: any) => plan.status === 'in_progress') || [];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-green-600" data-testid="text-goal-progress">
              {avgProgress}%
            </div>
            <div className="text-sm text-muted-foreground">Goal Progress</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-courses-due">
              {pendingDevelopmentPlans.length}
            </div>
            <div className="text-sm text-muted-foreground">Development Plans</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-check-in-due">
              2
            </div>
            <div className="text-sm text-muted-foreground">Days to Check-in</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-600" data-testid="text-kudos-received">
              {(recognitionStats as any)?.received || 0}
            </div>
            <div className="text-sm text-muted-foreground">Kudos Received</div>
          </CardContent>
        </Card>
      </div>

      {/* Current Goals Progress */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">My Current Goals</h3>
          <div className="space-y-4">
            {activeGoals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active goals yet</p>
                <p className="text-sm">Set your first goal to get started with tracking your progress</p>
              </div>
            ) : (
              activeGoals.map((goal: any) => {
                const progress = Math.round((goal.currentValue / goal.targetValue) * 100);
                const isCompleted = progress >= 100;
                const isAtRisk = goal.confidenceLevel === 'red';
                const isOnTrack = goal.confidenceLevel === 'green';

                return (
                  <div key={goal.id} className="p-4 bg-muted rounded-lg" data-testid={`goal-${goal.id}`}>
                    <div className="flex-1">
                      <p className="font-medium">{goal.title}</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Target: {new Date(goal.endDate).toLocaleDateString()}
                      </p>
                      <Progress value={progress} className="mb-2" />
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{progress}% Complete</span>
                        <Badge 
                          variant={isCompleted ? "default" : isAtRisk ? "destructive" : isOnTrack ? "default" : "secondary"}
                          className={
                            isCompleted ? "bg-green-100 text-green-800" :
                            isAtRisk ? "bg-red-100 text-red-800" :
                            isOnTrack ? "bg-green-100 text-green-800" :
                            "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {isCompleted ? "Completed" : isAtRisk ? "At Risk" : isOnTrack ? "On Track" : "At Risk"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm">Completed weekly goal check-in</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm">Received kudos for "Excellence"</p>
                <p className="text-xs text-muted-foreground">Yesterday</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm">Started new development plan</p>
                <p className="text-xs text-muted-foreground">2 days ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
