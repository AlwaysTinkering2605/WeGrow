import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Users, 
  Target, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter, 
  RefreshCw,
  User,
  Building,
  Award,
  TrendingUp,
  TrendingDown,
  Calendar,
  Star,
  Eye,
  Download,
  QrCode,
  Wifi,
  WifiOff,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  ChevronRight,
  MapPin,
  Phone
} from "lucide-react";

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
    role: string;
    teamId?: string;
  };
  competency: {
    id: string;
    title: string;
    category: string;
    skillType: "technical" | "behavioral" | "safety" | "compliance";
  };
}

interface TeamSummary {
  teamId: string;
  teamName: string;
  totalMembers: number;
  overallCompliance: number;
  criticalGaps: number;
  recentUpdates: number;
}

interface MobileComplianceStats {
  overallCompliance: number;
  criticalCompetencies: number;
  expiringCertifications: number;
  teamCompliance: number;
  lastUpdated: string;
}

export default function TrainingMatrixMobile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch compliance data with mobile optimization
  const { data: complianceStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/training-matrix/mobile-stats'],
    refetchInterval: isOffline ? false : 60000, // Reduce frequency on mobile
    initialData: {
      overallCompliance: 0,
      criticalCompetencies: 0,
      expiringCertifications: 0,
      teamCompliance: 0,
      lastUpdated: new Date().toISOString(),
    } as MobileComplianceStats
  });

  // Fetch team summaries
  const { data: teamSummaries = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['/api/training-matrix/team-summaries'],
    refetchInterval: isOffline ? false : 120000,
  });

  // Fetch competency statuses with filters
  const { data: competencyStatuses = [], isLoading: statusesLoading } = useQuery({
    queryKey: ['/api/training-matrix/statuses', { 
      search: searchTerm, 
      role: roleFilter, 
      status: statusFilter 
    }],
    refetchInterval: isOffline ? false : 90000,
  });

  // Fetch user roles for filter
  const { data: roles = [] } = useQuery({
    queryKey: ['/api/users/roles'],
    staleTime: 300000, // Cache for 5 minutes
  });

  // Filter and process data
  const filteredStatuses = competencyStatuses.filter((status: CompetencyStatus) => {
    const matchesSearch = searchTerm === "" || 
      status.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      status.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      status.competency.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || status.user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || status.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Group statuses by user for mobile view
  const userGroups = filteredStatuses.reduce((groups: any, status: CompetencyStatus) => {
    const userId = status.userId;
    if (!groups[userId]) {
      groups[userId] = {
        user: status.user,
        competencies: [],
        overallProgress: 0,
        criticalCount: 0,
      };
    }
    groups[userId].competencies.push(status);
    return groups;
  }, {});

  // Calculate progress for each user group
  Object.keys(userGroups).forEach(userId => {
    const group = userGroups[userId];
    const totalCompetencies = group.competencies.length;
    const achievedCompetencies = group.competencies.filter((c: CompetencyStatus) => c.status === 'achieved').length;
    const criticalCount = group.competencies.filter((c: CompetencyStatus) => 
      c.competency.skillType === 'safety' || c.competency.skillType === 'compliance'
    ).length;
    
    group.overallProgress = totalCompetencies > 0 ? (achievedCompetencies / totalCompetencies) * 100 : 0;
    group.criticalCount = criticalCount;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'expired': return 'text-red-600 bg-red-100';
      case 'not_started': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'achieved': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'expired': return <XCircle className="h-4 w-4" />;
      case 'not_started': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = "blue" }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: "up" | "down" | "stable";
    color?: string;
  }) => (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${color}-100`}>
              <Icon className={`h-5 w-5 text-${color}-600`} />
            </div>
            <div>
              <div className={`text-lg font-bold text-${color}-600`}>{value}</div>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
          </div>
          {trend && (
            <div className="flex items-center space-x-1">
              {trend === 'up' && <ArrowUp className="h-4 w-4 text-green-500" />}
              {trend === 'down' && <ArrowDown className="h-4 w-4 text-red-500" />}
              {trend === 'stable' && <TrendingUp className="h-4 w-4 text-gray-500" />}
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
      {isOffline && (
        <div className="absolute top-2 right-2">
          <WifiOff className="h-3 w-3 text-gray-400" />
        </div>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="training-matrix-mobile">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Training Matrix</h1>
              <p className="text-sm text-gray-500">
                {isOffline ? 'Offline Mode' : 'Live Compliance Dashboard'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {!isOffline && (
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-scan-qr">
                    <QrCode className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Quick Scan</SheetTitle>
                    <SheetDescription>
                      Scan QR codes for instant competency verification
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-6">
                    <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
                      <QrCode className="h-12 w-12 text-gray-400" />
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Point your camera at a QR code to quickly check someone's competency status
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search people or competencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
              data-testid="input-mobile-search"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-mobile-filters"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger data-testid="select-mobile-role">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((role: string) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-mobile-status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="achieved">Achieved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Shield}
            title="Overall Compliance"
            value={`${Math.round(complianceStats?.overallCompliance || 0)}%`}
            trend="up"
            color="green"
          />
          <StatCard
            icon={AlertTriangle}
            title="Critical Gaps"
            value={complianceStats?.criticalCompetencies || 0}
            trend="down"
            color="red"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Clock}
            title="Expiring Soon"
            value={complianceStats?.expiringCertifications || 0}
            subtitle="Next 30 days"
            color="yellow"
          />
          <StatCard
            icon={Users}
            title="Team Average"
            value={`${Math.round(complianceStats?.teamCompliance || 0)}%`}
            color="blue"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4">
        <Tabs defaultValue="individuals" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individuals" data-testid="tab-individuals">People</TabsTrigger>
            <TabsTrigger value="teams" data-testid="tab-teams">Teams</TabsTrigger>
          </TabsList>

          {/* Individuals View */}
          <TabsContent value="individuals" className="space-y-3">
            {Object.keys(userGroups).length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No results found</p>
                </CardContent>
              </Card>
            ) : (
              Object.keys(userGroups).map(userId => {
                const group = userGroups[userId];
                return (
                  <Card key={userId} className="touch-manipulation">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm">
                              {group.user.firstName} {group.user.lastName}
                            </h3>
                            <p className="text-xs text-gray-500 capitalize">{group.user.role}</p>
                          </div>
                        </div>
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-user-details-${userId}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-full sm:max-w-md">
                            <SheetHeader>
                              <SheetTitle>
                                {group.user.firstName} {group.user.lastName}
                              </SheetTitle>
                              <SheetDescription>
                                Competency Status Details
                              </SheetDescription>
                            </SheetHeader>
                            <ScrollArea className="h-[calc(100vh-200px)] mt-6">
                              <div className="space-y-3">
                                {group.competencies.map((comp: CompetencyStatus) => (
                                  <Card key={comp.id}>
                                    <CardContent className="p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-sm">{comp.competency.title}</h4>
                                        <Badge className={`text-xs ${getStatusColor(comp.status)}`}>
                                          {getStatusIcon(comp.status)}
                                        </Badge>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-gray-500">
                                          <span>Current: Level {comp.currentLevel}</span>
                                          <span>Target: Level {comp.targetLevel}</span>
                                        </div>
                                        <Progress 
                                          value={(comp.currentLevel / comp.targetLevel) * 100} 
                                          className="h-1"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500">
                                          <span className="capitalize">{comp.competency.skillType}</span>
                                          <span>Due: {new Date(comp.nextReview).toLocaleDateString()}</span>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </ScrollArea>
                          </SheetContent>
                        </Sheet>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Overall Progress</span>
                          <span className="text-xs font-medium">{Math.round(group.overallProgress)}%</span>
                        </div>
                        <Progress value={group.overallProgress} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{group.competencies.length} competencies</span>
                          {group.criticalCount > 0 && (
                            <span className="text-red-600 font-medium">
                              {group.criticalCount} critical
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Teams View */}
          <TabsContent value="teams" className="space-y-3">
            {teamSummaries.map((team: TeamSummary) => (
              <Card key={team.teamId} className="touch-manipulation">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Building className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{team.teamName}</h3>
                        <p className="text-xs text-gray-500">{team.totalMembers} members</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {Math.round(team.overallCompliance)}%
                      </div>
                      <div className="text-xs text-gray-500">compliance</div>
                    </div>
                  </div>
                  
                  <Progress value={team.overallCompliance} className="h-2 mb-2" />
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-medium text-red-600">{team.criticalGaps}</div>
                      <div className="text-xs text-gray-500">Critical</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-green-600">{team.recentUpdates}</div>
                      <div className="text-xs text-gray-500">Recent</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-blue-600">{team.totalMembers}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-3">
          <Button variant="outline" size="sm" className="flex flex-col items-center py-3" data-testid="button-export">
            <Download className="h-4 w-4 mb-1" />
            <span className="text-xs">Export</span>
          </Button>
          <Button variant="outline" size="sm" className="flex flex-col items-center py-3" data-testid="button-sync">
            <RefreshCw className="h-4 w-4 mb-1" />
            <span className="text-xs">Sync</span>
          </Button>
          <Button variant="default" size="sm" className="flex flex-col items-center py-3" data-testid="button-quick-check">
            <Eye className="h-4 w-4 mb-1" />
            <span className="text-xs">Quick Check</span>
          </Button>
        </div>
      </div>

      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed top-20 left-4 right-4 bg-yellow-100 border border-yellow-200 rounded-lg p-3 z-20">
          <div className="flex items-center space-x-2">
            <WifiOff className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Working offline - Last updated {new Date(complianceStats?.lastUpdated || '').toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}