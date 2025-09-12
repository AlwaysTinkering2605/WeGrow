import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Target, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";

export default function TeamManagement() {
  const { user } = useAuth();

  // Fetch team data based on user role
  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ["/api/team/members"],
    retry: false,
  });

  const { data: teamGoals } = useQuery({
    queryKey: ["/api/team/goals"],
    retry: false,
  });

  if (user?.role !== 'supervisor' && user?.role !== 'leadership') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">Only supervisors and leadership can access team management.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
              <div className="w-8 h-8 bg-muted rounded-lg mb-4"></div>
              <div className="w-16 h-8 bg-muted rounded mb-2"></div>
              <div className="w-24 h-4 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate real team statistics from actual data
  const realTeamMembers = teamMembers || [];
  const realTeamGoals = teamGoals || [];

  const teamStats = {
    totalMembers: realTeamMembers.length,
    avgGoalCompletion: realTeamMembers.length > 0 ? Math.round(
      realTeamMembers.reduce((acc: number, member: any) => {
        const memberGoals = realTeamGoals.filter((goal: any) => goal.userId === member.id);
        const completedGoals = memberGoals.filter((goal: any) => 
          goal.targetValue && goal.currentValue !== null && goal.currentValue >= goal.targetValue
        ).length;
        const completionRate = memberGoals.length > 0 ? (completedGoals / memberGoals.length * 100) : 0;
        return acc + completionRate;
      }, 0) / realTeamMembers.length
    ) : 0,
    overdueCheckIns: 0 // TODO: Calculate from actual check-in data when available
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Management</h1>
        <p className="text-muted-foreground">Monitor and support your team's performance</p>
      </div>

      {/* Team Overview Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600" data-testid="text-team-members">
                  {teamStats.totalMembers}
                </div>
                <div className="text-sm text-muted-foreground">Team Members</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600" data-testid="text-avg-completion">
                  {teamStats.avgGoalCompletion}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Goal Completion</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600" data-testid="text-overdue-checkins">
                  {teamStats.overdueCheckIns}
                </div>
                <div className="text-sm text-muted-foreground">Overdue Check-ins</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {realTeamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Team Members</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any team members assigned to you yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Team members will appear here when they are assigned to report to you.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {realTeamMembers.map((member: any) => {
                const memberGoals = realTeamGoals.filter((goal: any) => goal.userId === member.id);
                const completedGoals = memberGoals.filter((goal: any) => 
                  goal.targetValue && goal.currentValue !== null && goal.currentValue >= goal.targetValue
                ).length;
                const completionPercentage = memberGoals.length > 0 ? Math.round((completedGoals / memberGoals.length) * 100) : 0;

                return (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>
                          {member.firstName && member.lastName 
                            ? `${member.firstName[0]}${member.lastName[0]}` 
                            : member.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {member.firstName && member.lastName 
                            ? `${member.firstName} ${member.lastName}` 
                            : member.email}
                        </div>
                        <div className="text-sm text-muted-foreground capitalize">{member.role}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium">{completedGoals}/{memberGoals.length}</div>
                        <div className="text-muted-foreground">Goals</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>No check-in data</span>
                        </div>
                        <div className="text-muted-foreground">Last Check-in</div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant={completedGoals === memberGoals.length && memberGoals.length > 0 ? "default" : "secondary"}>
                          {completionPercentage}%
                        </Badge>
                        <Button size="sm" variant="outline" data-testid={`button-view-details-${member.id}`}>
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}