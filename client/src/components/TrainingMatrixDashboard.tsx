import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BarChart3,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Award,
  FileText,
  Download,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  User,
  Building,
  GraduationCap,
  Shield,
  Star,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Minus,
  ChevronRight,
  Eye
} from "lucide-react";

// Types for training matrix data
interface CompetencyStatus {
  id: string;
  userId: string;
  competencyId: string;
  currentLevel: number;
  targetLevel: number;
  status: "not_started" | "in_progress" | "achieved" | "expired";
  lastAssessed: string;
  nextReview: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    teamId?: string;
  };
  competency: {
    id: string;
    title: string;
    category: string;
    level: number;
    skillType: "technical" | "behavioral" | "safety" | "compliance";
    isActive: boolean;
  };
}

interface GapAnalysisItem {
  userId: string;
  competencyId: string;
  competencyTitle: string;
  category: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  priority: "critical" | "important" | "desired";
  daysOverdue?: number;
  user: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface TeamCompetencyOverview {
  teamId: string;
  teamName: string;
  totalCompetencies: number;
  achievedCompetencies: number;
  inProgressCompetencies: number;
  overdueCompetencies: number;
  completionRate: number;
  members: Array<{
    userId: string;
    name: string;
    role: string;
    completionRate: number;
  }>;
}

// Live Competency Status Matrix
function LiveCompetencyMatrix() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { user } = useAuth();

  const { data: competencyStatuses, isLoading } = useQuery({
    queryKey: ["/api/training-matrix", { role: selectedRole, team: selectedTeam, search: searchTerm }],
    refetchInterval: 30000, // Refresh every 30 seconds for live updates
  }) as { data: CompetencyStatus[] | undefined; isLoading: boolean };

  const { data: teams } = useQuery({
    queryKey: ["/api/teams"]
  }) as { data: Array<{ id: string; name: string }> | undefined };

  const filteredStatuses = competencyStatuses?.filter(status => {
    const matchesRole = !selectedRole || status.user.role === selectedRole;
    const matchesTeam = !selectedTeam || status.user.teamId === selectedTeam;
    const matchesSearch = !searchTerm || 
      status.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      status.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      status.competency.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesTeam && matchesSearch;
  });

  const getStatusColor = (status: CompetencyStatus) => {
    if (status.status === "achieved") return "bg-green-500";
    if (status.status === "in_progress") return "bg-yellow-500";
    if (status.status === "expired") return "bg-red-500";
    return "bg-gray-300";
  };

  const getStatusIcon = (status: CompetencyStatus) => {
    if (status.status === "achieved") return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status.status === "in_progress") return <Clock className="w-4 h-4 text-yellow-600" />;
    if (status.status === "expired") return <XCircle className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const roles = [
    { value: "operative", label: "Cleaning Operative" },
    { value: "supervisor", label: "Area Supervisor" },
    { value: "leadership", label: "Senior Leadership" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Live Competency Matrix
        </CardTitle>
        <CardDescription>
          Real-time view of competency status across your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users or competencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
              data-testid="input-search-matrix"
            />
          </div>

          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-48" data-testid="select-role-filter">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-48" data-testid="select-team-filter">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All teams</SelectItem>
              {teams?.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/training-matrix"] })}
            data-testid="button-refresh-matrix"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Matrix Display */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredStatuses && filteredStatuses.length > 0 ? (
          <div className="space-y-2">
            {filteredStatuses.map((status) => (
              <div key={`${status.userId}-${status.competencyId}`} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status)}
                    <div>
                      <h4 className="font-medium">
                        {status.user.firstName} {status.user.lastName}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {status.user.role.charAt(0).toUpperCase() + status.user.role.slice(1)}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium">{status.competency.title}</h5>
                      <Badge variant={status.competency.skillType === "safety" ? "destructive" : 
                                     status.competency.skillType === "compliance" ? "secondary" :
                                     status.competency.skillType === "behavioral" ? "outline" : "default"}>
                        {status.competency.skillType}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{status.competency.category}</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Current: L{status.currentLevel}</Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="outline">Target: L{status.targetLevel}</Badge>
                    </div>
                    <Progress 
                      value={(status.currentLevel / status.targetLevel) * 100} 
                      className="w-24 mt-2"
                    />
                  </div>

                  <div className="text-right">
                    <Badge variant={status.status === "achieved" ? "default" :
                                   status.status === "in_progress" ? "secondary" :
                                   status.status === "expired" ? "destructive" : "outline"}>
                      {status.status.replace("_", " ")}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last: {new Date(status.lastAssessed).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  data-testid={`view-details-${status.userId}-${status.competencyId}`}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No competency data found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || selectedRole || selectedTeam ? 
                "Try adjusting your filters" : 
                "No competency statuses are available"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Gap Analysis Component
function GapAnalysisView() {
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"gap" | "priority" | "overdue">("gap");

  const { data: gapAnalysis, isLoading } = useQuery({
    queryKey: ["/api/competency-gap-analysis", { priority: priorityFilter }]
  }) as { data: GapAnalysisItem[] | undefined; isLoading: boolean };

  const sortedGaps = gapAnalysis?.slice().sort((a, b) => {
    if (sortBy === "gap") return b.gap - a.gap;
    if (sortBy === "priority") {
      const priorityOrder = { "critical": 3, "important": 2, "desired": 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    if (sortBy === "overdue") return (b.daysOverdue || 0) - (a.daysOverdue || 0);
    return 0;
  });

  const getPriorityColor = (priority: string) => {
    if (priority === "critical") return "bg-red-500";
    if (priority === "important") return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getGapIcon = (gap: number) => {
    if (gap >= 3) return <TrendingDown className="w-4 h-4 text-red-600" />;
    if (gap >= 2) return <TrendingDown className="w-4 h-4 text-yellow-600" />;
    if (gap >= 1) return <Minus className="w-4 h-4 text-yellow-600" />;
    return <TrendingUp className="w-4 h-4 text-green-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Competency Gap Analysis
        </CardTitle>
        <CardDescription>
          Identify skill gaps and training priorities across your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-4">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-48" data-testid="select-priority-filter">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="important">Important</SelectItem>
              <SelectItem value="desired">Desired</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: "gap" | "priority" | "overdue") => setSortBy(value)}>
            <SelectTrigger className="w-48" data-testid="select-sort-by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gap">Sort by gap size</SelectItem>
              <SelectItem value="priority">Sort by priority</SelectItem>
              <SelectItem value="overdue">Sort by overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gap Analysis Results */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : sortedGaps && sortedGaps.length > 0 ? (
          <div className="space-y-3">
            {sortedGaps.map((gap, index) => (
              <div key={`${gap.userId}-${gap.competencyId}`} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      {getGapIcon(gap.gap)}
                      <div>
                        <h4 className="font-medium">
                          {gap.user.firstName} {gap.user.lastName}
                        </h4>
                        <p className="text-sm text-muted-foreground">{gap.user.role}</p>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium">{gap.competencyTitle}</h5>
                        <Badge variant="outline">{gap.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm">Current: L{gap.currentLevel}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">Target: L{gap.targetLevel}</span>
                        <Badge variant={gap.gap >= 3 ? "destructive" : gap.gap >= 2 ? "secondary" : "outline"}>
                          Gap: {gap.gap} levels
                        </Badge>
                      </div>
                    </div>

                    <div className="text-center">
                      <Badge variant={gap.priority === "critical" ? "destructive" :
                                     gap.priority === "important" ? "default" : "secondary"}>
                        {gap.priority}
                      </Badge>
                      {gap.daysOverdue && gap.daysOverdue > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          {gap.daysOverdue} days overdue
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`address-gap-${gap.userId}-${gap.competencyId}`}
                  >
                    Address Gap
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No gaps identified</h3>
            <p className="text-sm text-muted-foreground">
              {priorityFilter ? 
                "No gaps found for the selected priority level" :
                "All competency requirements are being met"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Team Overview Dashboard
function TeamOverviewDashboard() {
  const { data: teamOverviews, isLoading } = useQuery({
    queryKey: ["/api/team-competency-overview"]
  }) as { data: TeamCompetencyOverview[] | undefined; isLoading: boolean };

  const overallStats = teamOverviews?.reduce((acc, team) => ({
    totalTeams: acc.totalTeams + 1,
    avgCompletionRate: acc.avgCompletionRate + team.completionRate,
    totalMembers: acc.totalMembers + team.members.length,
    totalCompetencies: acc.totalCompetencies + team.totalCompetencies
  }), { totalTeams: 0, avgCompletionRate: 0, totalMembers: 0, totalCompetencies: 0 });

  if (overallStats) {
    overallStats.avgCompletionRate = overallStats.avgCompletionRate / overallStats.totalTeams;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          Team Competency Overview
        </CardTitle>
        <CardDescription>
          High-level view of competency progress across all teams
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Statistics */}
        {overallStats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <h3 className="text-2xl font-bold">{overallStats.totalTeams}</h3>
              <p className="text-sm text-muted-foreground">Teams</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <h3 className="text-2xl font-bold">{overallStats.totalMembers}</h3>
              <p className="text-sm text-muted-foreground">Team Members</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <h3 className="text-2xl font-bold">{overallStats.totalCompetencies}</h3>
              <p className="text-sm text-muted-foreground">Total Competencies</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <h3 className="text-2xl font-bold">{Math.round(overallStats.avgCompletionRate)}%</h3>
              <p className="text-sm text-muted-foreground">Avg Completion</p>
            </div>
          </div>
        )}

        {/* Team Details */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : teamOverviews && teamOverviews.length > 0 ? (
          <div className="space-y-4">
            {teamOverviews.map((team) => (
              <div key={team.teamId} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-lg">{team.teamName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {team.members.length} members • {team.totalCompetencies} competencies
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{Math.round(team.completionRate)}%</div>
                    <p className="text-sm text-muted-foreground">Complete</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">{team.achievedCompetencies}</div>
                    <p className="text-xs text-green-600">Achieved</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-lg font-bold text-yellow-600">{team.inProgressCompetencies}</div>
                    <p className="text-xs text-yellow-600">In Progress</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-lg font-bold text-red-600">{team.overdueCompetencies}</div>
                    <p className="text-xs text-red-600">Overdue</p>
                  </div>
                </div>

                <Progress value={team.completionRate} className="mb-4" />

                <div className="grid grid-cols-2 gap-2">
                  {team.members.slice(0, 4).map((member) => (
                    <div key={member.userId} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                      <Badge variant="outline">{Math.round(member.completionRate)}%</Badge>
                    </div>
                  ))}
                  {team.members.length > 4 && (
                    <div className="col-span-2 text-center text-sm text-muted-foreground">
                      +{team.members.length - 4} more members
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No team data available</h3>
            <p className="text-sm text-muted-foreground">Team competency data will appear here once configured</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Training Matrix Dashboard Component
export default function TrainingMatrixDashboard() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<"matrix" | "gaps" | "teams">("matrix");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training Matrix Dashboard</h1>
          <p className="text-muted-foreground">
            Live competency tracking, gap analysis, and team performance overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-export-matrix">
            <Download className="w-4 h-4 mr-2" />
            Export Matrix
          </Button>
          <Button variant="outline" data-testid="button-compliance-report">
            <FileText className="w-4 h-4 mr-2" />
            Compliance Report
          </Button>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "matrix" | "gaps" | "teams")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matrix" data-testid="tab-matrix">Live Matrix</TabsTrigger>
          <TabsTrigger value="gaps" data-testid="tab-gaps">Gap Analysis</TabsTrigger>
          <TabsTrigger value="teams" data-testid="tab-teams">Team Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-6">
          <LiveCompetencyMatrix />
        </TabsContent>

        <TabsContent value="gaps" className="space-y-6">
          <GapAnalysisView />
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <TeamOverviewDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}