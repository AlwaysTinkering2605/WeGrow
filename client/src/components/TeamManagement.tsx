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

  const mockTeamMembers = [
    { id: '1', name: 'Sarah Johnson', role: 'operative', goalsCompleted: 3, totalGoals: 4, lastCheckIn: '2 days ago' },
    { id: '2', name: 'Mike Chen', role: 'operative', goalsCompleted: 2, totalGoals: 3, lastCheckIn: '1 day ago' },
    { id: '3', name: 'Emily Davis', role: 'operative', goalsCompleted: 4, totalGoals: 5, lastCheckIn: '3 hours ago' },
  ];

  const teamStats = {
    totalMembers: mockTeamMembers.length,
    avgGoalCompletion: Math.round(mockTeamMembers.reduce((acc, member) => 
      acc + (member.goalsCompleted / member.totalGoals * 100), 0) / mockTeamMembers.length),
    overdueCheckIns: mockTeamMembers.filter(member => 
      member.lastCheckIn.includes('days ago') || member.lastCheckIn.includes('week')).length
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
          <div className="space-y-4">
            {mockTeamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback>
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground capitalize">{member.role}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium">{member.goalsCompleted}/{member.totalGoals}</div>
                    <div className="text-muted-foreground">Goals</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{member.lastCheckIn}</span>
                    </div>
                    <div className="text-muted-foreground">Last Check-in</div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={member.goalsCompleted === member.totalGoals ? "default" : "secondary"}>
                      {Math.round(member.goalsCompleted / member.totalGoals * 100)}%
                    </Badge>
                    <Button size="sm" variant="outline" data-testid={`button-view-details-${member.id}`}>
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}