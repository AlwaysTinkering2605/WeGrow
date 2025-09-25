import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, subDays, subMonths, subYears } from "date-fns";
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon, 
  Shield, 
  Award, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  Building,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  RefreshCw,
  Printer,
  Mail,
  Archive,
  Eye,
  Star,
  Globe,
  MapPin,
  Phone,
  Calendar as Cal,
  Bookmark
} from "lucide-react";

interface ComplianceReport {
  id: string;
  reportType: 'audit' | 'executive' | 'operational' | 'certification';
  title: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  overallCompliance: number;
  criticalFindings: number;
  recommendations: number;
  status: 'draft' | 'final' | 'archived';
}

interface AuditTrailEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  user: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface ComplianceMetrics {
  overallCompliance: number;
  competencyCompliance: number;
  trainingCompliance: number;
  certificationCompliance: number;
  totalEmployees: number;
  compliantEmployees: number;
  criticalGaps: number;
  expiringCertifications: number;
  lastAuditDate: string;
  nextAuditDue: string;
  iso9001Compliance: number;
}

interface NonConformanceIssue {
  id: string;
  issueType: 'minor' | 'major' | 'critical';
  title: string;
  description: string;
  identifiedDate: string;
  dueDate: string;
  status: 'open' | 'in_progress' | 'closed';
  assignedTo: string;
  category: string;
  auditReference?: string;
}

interface ExecutiveSummary {
  complianceRating: 'A' | 'B' | 'C' | 'D' | 'F';
  keyAchievements: string[];
  priorityActions: string[];
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  budgetImpact: number;
  nextMilestones: Array<{
    title: string;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export default function ComplianceReportingSuite() {
  const { user } = useAuth();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState("overview");
  const [reportType, setReportType] = useState("audit");
  const [dateRange, setDateRange] = useState({
    start: subMonths(new Date(), 3),
    end: new Date()
  });
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  // Fetch compliance metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/compliance/metrics', dateRange],
    initialData: {
      overallCompliance: 0,
      competencyCompliance: 0,
      trainingCompliance: 0,
      certificationCompliance: 0,
      totalEmployees: 0,
      compliantEmployees: 0,
      criticalGaps: 0,
      expiringCertifications: 0,
      lastAuditDate: '',
      nextAuditDue: '',
      iso9001Compliance: 0,
    } as ComplianceMetrics
  });

  // Fetch audit trail
  const { data: auditTrail = [], isLoading: auditLoading } = useQuery({
    queryKey: ['/api/compliance/audit-trail', dateRange],
  });

  // Fetch non-conformance issues
  const { data: nonConformances = [], isLoading: ncLoading } = useQuery({
    queryKey: ['/api/compliance/non-conformances'],
  });

  // Fetch executive summary
  const { data: executiveSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/compliance/executive-summary', dateRange],
    initialData: {
      complianceRating: 'B',
      keyAchievements: [],
      priorityActions: [],
      riskAssessment: 'medium',
      budgetImpact: 0,
      nextMilestones: [],
    } as ExecutiveSummary
  });

  // Fetch available reports
  const { data: availableReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['/api/compliance/reports'],
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      const response = await apiRequest('/api/compliance/generate-report', {
        method: 'POST',
        body: JSON.stringify({
          type: reportType,
          period: dateRange,
          department: filterDepartment,
          role: filterRole,
          ...reportData
        })
      });
      return response.json();
    },
    onSuccess: (report) => {
      toast({
        title: "Report Generated",
        description: `${report.title} has been generated successfully.`,
      });
      // Refresh reports list
      // queryClient.invalidateQueries({ queryKey: ['/api/compliance/reports'] });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate report.",
        variant: "destructive",
      });
    },
  });

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current;
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }
  };

  const getComplianceRatingColor = (rating: string) => {
    switch (rating) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-orange-600 bg-orange-100';
      case 'F': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const ComplianceMetricCard = ({ title, value, target, icon: Icon, trend }: {
    title: string;
    value: number;
    target?: number;
    icon: any;
    trend?: 'up' | 'down' | 'stable';
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-2xl font-bold">{value}%</span>
              {trend && (
                <div className="flex items-center">
                  {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                  {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                  {trend === 'stable' && <TrendingUp className="h-4 w-4 text-gray-500" />}
                </div>
              )}
            </div>
            {target && (
              <p className="text-xs text-muted-foreground">Target: {target}%</p>
            )}
          </div>
          <Icon className="h-8 w-8 text-primary" />
        </div>
        {target && (
          <div className="mt-4">
            <Progress value={value} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="compliance-reporting-suite">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Reporting Suite</h1>
          <p className="text-muted-foreground">ISO 9001:2015 compliant reporting and audit management</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handlePrint} data-testid="button-print">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button 
            onClick={() => generateReportMutation.mutate({})}
            disabled={generateReportMutation.isPending}
            data-testid="button-generate-report"
          >
            <FileText className="h-4 w-4 mr-2" />
            {generateReportMutation.isPending ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </div>

      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Configure your compliance report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger data-testid="select-report-type">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audit">Audit Report</SelectItem>
                <SelectItem value="executive">Executive Summary</SelectItem>
                <SelectItem value="operational">Operational Report</SelectItem>
                <SelectItem value="certification">Certification Status</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" data-testid="button-date-range">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.start, "MMM dd")} - {format(dateRange.end, "MMM dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4 space-y-2">
                  <Button variant="outline" size="sm" onClick={() => setDateRange({
                    start: subMonths(new Date(), 1),
                    end: new Date()
                  })}>
                    Last Month
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDateRange({
                    start: subMonths(new Date(), 3),
                    end: new Date()
                  })}>
                    Last Quarter
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDateRange({
                    start: subYears(new Date(), 1),
                    end: new Date()
                  })}>
                    Last Year
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger data-testid="select-department">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="quality">Quality</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger data-testid="select-role">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="operative">Operative</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="leadership">Leadership</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Report Content */}
      <div ref={printRef}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics" data-testid="tab-metrics">Metrics</TabsTrigger>
            <TabsTrigger value="audit-trail" data-testid="tab-audit-trail">Audit Trail</TabsTrigger>
            <TabsTrigger value="non-conformance" data-testid="tab-non-conformance">Non-Conformance</TabsTrigger>
            <TabsTrigger value="executive" data-testid="tab-executive">Executive</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <ComplianceMetricCard
                title="Overall Compliance"
                value={Math.round(metrics?.overallCompliance || 0)}
                target={95}
                icon={Shield}
                trend="up"
              />
              <ComplianceMetricCard
                title="Training Compliance"
                value={Math.round(metrics?.trainingCompliance || 0)}
                target={90}
                icon={Award}
                trend="stable"
              />
              <ComplianceMetricCard
                title="Certification Rate"
                value={Math.round(metrics?.certificationCompliance || 0)}
                target={100}
                icon={CheckCircle}
                trend="up"
              />
              <ComplianceMetricCard
                title="ISO 9001:2015"
                value={Math.round(metrics?.iso9001Compliance || 0)}
                target={100}
                icon={Globe}
                trend="up"
              />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Compliance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Employees</span>
                      <Badge variant="outline">{metrics?.totalEmployees || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Compliant</span>
                      <Badge variant="default">{metrics?.compliantEmployees || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Critical Gaps</span>
                      <Badge variant="destructive">{metrics?.criticalGaps || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Expiring Soon</span>
                      <Badge variant="secondary">{metrics?.expiringCertifications || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Audit Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Last Audit</p>
                      <p className="font-medium">
                        {metrics?.lastAuditDate ? 
                          format(new Date(metrics.lastAuditDate), 'MMM dd, yyyy') : 
                          'No previous audit'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Next Audit Due</p>
                      <p className="font-medium">
                        {metrics?.nextAuditDue ? 
                          format(new Date(metrics.nextAuditDue), 'MMM dd, yyyy') : 
                          'TBD'
                        }
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Cal className="h-4 w-4 mr-2" />
                      Schedule Audit
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {auditTrail.slice(0, 3).map((entry: AuditTrailEntry) => (
                      <div key={entry.id} className="text-sm">
                        <p className="font-medium">{entry.action}</p>
                        <p className="text-muted-foreground">
                          {entry.user.firstName} {entry.user.lastName} • {format(new Date(entry.timestamp), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    ))}
                    <Button variant="link" size="sm" className="w-full p-0">
                      View Full Audit Trail
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Detailed Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Trends</CardTitle>
                  <CardDescription>Monthly compliance rates over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                    <LineChart className="h-16 w-16 text-gray-400" />
                    <span className="ml-2 text-gray-500">Compliance Trend Chart</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Competency Breakdown</CardTitle>
                  <CardDescription>Compliance by competency type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                    <PieChart className="h-16 w-16 text-gray-400" />
                    <span className="ml-2 text-gray-500">Competency Distribution</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Metrics Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Compliance Metrics</CardTitle>
                <CardDescription>Breakdown by department and role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Department</th>
                        <th className="text-left p-2">Role</th>
                        <th className="text-center p-2">Total</th>
                        <th className="text-center p-2">Compliant</th>
                        <th className="text-center p-2">Rate</th>
                        <th className="text-center p-2">Critical</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2">Operations</td>
                        <td className="p-2">Operative</td>
                        <td className="text-center p-2">45</td>
                        <td className="text-center p-2">42</td>
                        <td className="text-center p-2">
                          <Badge variant="default">93%</Badge>
                        </td>
                        <td className="text-center p-2">
                          <Badge variant="destructive">3</Badge>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">Operations</td>
                        <td className="p-2">Supervisor</td>
                        <td className="text-center p-2">8</td>
                        <td className="text-center p-2">8</td>
                        <td className="text-center p-2">
                          <Badge variant="default">100%</Badge>
                        </td>
                        <td className="text-center p-2">
                          <Badge variant="outline">0</Badge>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">Quality</td>
                        <td className="p-2">Specialist</td>
                        <td className="text-center p-2">6</td>
                        <td className="text-center p-2">5</td>
                        <td className="text-center p-2">
                          <Badge variant="secondary">83%</Badge>
                        </td>
                        <td className="text-center p-2">
                          <Badge variant="destructive">1</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit-trail" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>Complete audit log for ISO 9001:2015 compliance verification</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {auditTrail.map((entry: AuditTrailEntry) => (
                      <div key={entry.id} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{entry.action}</span>
                          <Badge variant="outline">
                            {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>User: {entry.user.firstName} {entry.user.lastName} ({entry.user.role})</p>
                          <p>Resource: {entry.resourceType} ID {entry.resourceId}</p>
                          <p>Details: {entry.details}</p>
                          {entry.ipAddress && <p>IP: {entry.ipAddress}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Non-Conformance Tab */}
          <TabsContent value="non-conformance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Non-Conformance Issues</CardTitle>
                <CardDescription>Active non-conformances requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {nonConformances.map((issue: NonConformanceIssue) => (
                    <Card key={issue.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{issue.title}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={
                                issue.issueType === 'critical' ? 'destructive' :
                                issue.issueType === 'major' ? 'secondary' : 'outline'
                              }
                            >
                              {issue.issueType}
                            </Badge>
                            <Badge variant="outline">{issue.status}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{issue.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                          <span>Category: {issue.category}</span>
                          <span>Assigned: {issue.assignedTo}</span>
                          <span>Due: {format(new Date(issue.dueDate), 'MMM dd')}</span>
                          <span>ID: {issue.auditReference || issue.id}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Executive Summary Tab */}
          <TabsContent value="executive" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Executive Summary</CardTitle>
                  <CardDescription>High-level compliance overview for leadership</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">Overall Compliance Rating</span>
                    <Badge className={`text-2xl p-2 ${getComplianceRatingColor(executiveSummary?.complianceRating || 'B')}`}>
                      {executiveSummary?.complianceRating || 'B'}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Key Achievements</h4>
                    <ul className="space-y-1 text-sm">
                      {executiveSummary?.keyAchievements?.map((achievement, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{achievement}</span>
                        </li>
                      )) || [
                        <li key="default" className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>ISO 9001:2015 compliance maintained</span>
                        </li>
                      ]}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Priority Actions Required</h4>
                    <ul className="space-y-1 text-sm">
                      {executiveSummary?.priorityActions?.map((action, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span>{action}</span>
                        </li>
                      )) || [
                        <li key="default" className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span>Address 3 critical competency gaps</span>
                        </li>
                      ]}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <Badge className={`text-lg p-3 ${getRiskColor(executiveSummary?.riskAssessment || 'medium')}`}>
                      {executiveSummary?.riskAssessment?.toUpperCase() || 'MEDIUM'}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">Current Risk Level</p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Budget Impact</h4>
                    <div className="text-2xl font-bold text-primary">
                      ${(executiveSummary?.budgetImpact || 0).toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">Estimated remediation cost</p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Next Milestones</h4>
                    <div className="space-y-2">
                      {executiveSummary?.nextMilestones?.map((milestone, index) => (
                        <div key={index} className="text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{milestone.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {milestone.priority}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            Due: {format(new Date(milestone.dueDate), 'MMM dd')}
                          </p>
                        </div>
                      )) || [
                        <div key="default" className="text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Quarterly Review</span>
                            <Badge variant="outline" className="text-xs">high</Badge>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            Due: {format(new Date(), 'MMM dd')}
                          </p>
                        </div>
                      ]}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Generated Reports Archive */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports Archive</CardTitle>
          <CardDescription>Access previously generated compliance reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {availableReports.map((report: ComplianceReport) => (
              <div key={report.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <h4 className="font-medium">{report.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Generated {format(new Date(report.generatedAt), 'MMM dd, yyyy')} • 
                    Period: {format(new Date(report.period.start), 'MMM dd')} - {format(new Date(report.period.end), 'MMM dd')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{report.reportType}</Badge>
                  <Badge variant={report.status === 'final' ? 'default' : 'secondary'}>
                    {report.status}
                  </Badge>
                  <Button variant="outline" size="sm" data-testid={`button-view-report-${report.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" data-testid={`button-download-report-${report.id}`}>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}