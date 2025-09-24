import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Shield,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Users,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Award,
  Building,
  Filter,
  RefreshCw,
  Search,
  Eye,
  Printer,
  Mail,
  Archive,
  Target,
  Book,
  Layers,
  Activity,
  PieChart,
  LineChart,
  List,
  CheckSquare,
  AlertCircle,
  Info
} from "lucide-react";

// Types for compliance reporting
interface ComplianceReport {
  id: string;
  reportType: "full_audit" | "competency_matrix" | "training_records" | "gap_analysis";
  generatedAt: string;
  generatedBy: string;
  reportPeriod: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalUsers: number;
    totalCompetencies: number;
    achievedCompetencies: number;
    inProgressCompetencies: number;
    overdueCompetencies: number;
    complianceRate: number;
  };
  auditTrail: AuditTrailRecord[];
  riskAssessment: RiskItem[];
  recommendations: ComplianceRecommendation[];
}

interface AuditTrailRecord {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface RiskItem {
  id: string;
  category: "competency_gap" | "overdue_training" | "missing_evidence" | "expired_certification";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedUsers: number;
  affectedCompetencies: string[];
  mitigationActions: string[];
  dueDate?: string;
}

interface ComplianceRecommendation {
  id: string;
  priority: "high" | "medium" | "low";
  category: "training" | "assessment" | "documentation" | "process";
  title: string;
  description: string;
  expectedOutcome: string;
  estimatedEffort: string;
  deadline?: string;
}

interface ComplianceMetrics {
  overallComplianceRate: number;
  complianceByRole: Array<{
    role: string;
    complianceRate: number;
    totalUsers: number;
    compliantUsers: number;
  }>;
  complianceByCategory: Array<{
    category: string;
    complianceRate: number;
    totalCompetencies: number;
    compliantCompetencies: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    complianceRate: number;
    newlyAchieved: number;
    expired: number;
  }>;
  auditReadiness: {
    score: number;
    lastAudit: string;
    nextAudit: string;
    criticalIssues: number;
    recommendations: number;
  };
}

// ISO 9001:2015 Compliance Dashboard
function ISO9001ComplianceDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("last_quarter");
  const [reportType, setReportType] = useState<string>("full_audit");

  const { data: complianceMetrics, isLoading } = useQuery({
    queryKey: ["/api/compliance-metrics", { period: selectedPeriod }],
    refetchInterval: 300000, // Refresh every 5 minutes
  }) as { data: ComplianceMetrics | undefined; isLoading: boolean };

  const getComplianceColor = (rate: number) => {
    if (rate >= 95) return "text-green-600";
    if (rate >= 85) return "text-yellow-600";
    if (rate >= 70) return "text-orange-600";
    return "text-red-600";
  };

  const getComplianceBadge = (rate: number) => {
    if (rate >= 95) return "default";
    if (rate >= 85) return "secondary";
    if (rate >= 70) return "outline";
    return "destructive";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          ISO 9001:2015 Compliance Dashboard
        </CardTitle>
        <CardDescription>
          Clause 7.2 - Competence: Monitor and report on organizational competency compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period Selection */}
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48" data-testid="select-compliance-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
              <SelectItem value="custom">Custom Period</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" data-testid="button-refresh-compliance">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : complianceMetrics ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className={`text-3xl font-bold ${getComplianceColor(complianceMetrics.overallComplianceRate)}`}>
                  {Math.round(complianceMetrics.overallComplianceRate)}%
                </div>
                <p className="text-sm text-muted-foreground">Overall Compliance</p>
                <Badge variant={getComplianceBadge(complianceMetrics.overallComplianceRate)} className="mt-2">
                  {complianceMetrics.overallComplianceRate >= 95 ? "Excellent" :
                   complianceMetrics.overallComplianceRate >= 85 ? "Good" :
                   complianceMetrics.overallComplianceRate >= 70 ? "Needs Improvement" : "Critical"}
                </Badge>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {complianceMetrics.auditReadiness.score}
                </div>
                <p className="text-sm text-muted-foreground">Audit Readiness Score</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Next audit: {new Date(complianceMetrics.auditReadiness.nextAudit).toLocaleDateString()}
                </p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-red-600">
                  {complianceMetrics.auditReadiness.criticalIssues}
                </div>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
                <Badge variant={complianceMetrics.auditReadiness.criticalIssues === 0 ? "default" : "destructive"} className="mt-2">
                  {complianceMetrics.auditReadiness.criticalIssues === 0 ? "No Issues" : "Action Required"}
                </Badge>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-yellow-600">
                  {complianceMetrics.auditReadiness.recommendations}
                </div>
                <p className="text-sm text-muted-foreground">Recommendations</p>
                <Badge variant="outline" className="mt-2">Improvement Opportunities</Badge>
              </div>
            </div>

            {/* Compliance by Role */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Compliance by Role
                </h3>
                <div className="space-y-3">
                  {complianceMetrics.complianceByRole.map((role) => (
                    <div key={role.role} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">
                          {role.role.charAt(0).toUpperCase() + role.role.slice(1)}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {role.compliantUsers}/{role.totalUsers} users compliant
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getComplianceColor(role.complianceRate)}`}>
                          {Math.round(role.complianceRate)}%
                        </div>
                        <Progress value={role.complianceRate} className="w-20 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Compliance by Category
                </h3>
                <div className="space-y-3">
                  {complianceMetrics.complianceByCategory.map((category) => (
                    <div key={category.category} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{category.category}</h4>
                        <p className="text-sm text-muted-foreground">
                          {category.compliantCompetencies}/{category.totalCompetencies} competencies
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getComplianceColor(category.complianceRate)}`}>
                          {Math.round(category.complianceRate)}%
                        </div>
                        <Progress value={category.complianceRate} className="w-20 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Monthly Trends */}
            <div>
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Compliance Trends
              </h3>
              <div className="grid grid-cols-6 gap-2">
                {complianceMetrics.monthlyTrends.map((trend) => (
                  <div key={trend.month} className="text-center p-3 border rounded-lg">
                    <div className="text-sm font-medium">{trend.month}</div>
                    <div className={`text-lg font-bold ${getComplianceColor(trend.complianceRate)}`}>
                      {Math.round(trend.complianceRate)}%
                    </div>
                    <div className="text-xs text-green-600">+{trend.newlyAchieved}</div>
                    <div className="text-xs text-red-600">-{trend.expired}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No compliance data available</h3>
            <p className="text-sm text-muted-foreground">Compliance metrics will appear here once data is collected</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Audit Trail Viewer
function AuditTrailViewer() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("last_30_days");

  const { data: auditTrail, isLoading } = useQuery({
    queryKey: ["/api/audit-trail", { 
      search: searchTerm, 
      action: actionFilter, 
      user: userFilter, 
      range: dateRange 
    }],
  }) as { data: AuditTrailRecord[] | undefined; isLoading: boolean };

  const exportAuditTrailMutation = useMutation({
    mutationFn: (format: "csv" | "pdf" | "json") => apiRequest("/api/audit-trail/export", {
      method: "POST",
      body: { format, filters: { search: searchTerm, action: actionFilter, user: userFilter, range: dateRange } }
    }),
    onSuccess: (data: any) => {
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }
  });

  const getActionIcon = (action: string) => {
    if (action.includes("create")) return <Plus className="w-4 h-4 text-green-600" />;
    if (action.includes("update")) return <Edit className="w-4 h-4 text-blue-600" />;
    if (action.includes("delete")) return <Trash2 className="w-4 h-4 text-red-600" />;
    if (action.includes("verify")) return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Immutable Audit Trail
        </CardTitle>
        <CardDescription>
          Complete audit trail of all competency-related actions for ISO 9001:2015 compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters and Controls */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
              data-testid="input-search-audit"
            />
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48" data-testid="select-action-filter">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              <SelectItem value="competency_create">Competency Created</SelectItem>
              <SelectItem value="competency_update">Competency Updated</SelectItem>
              <SelectItem value="evidence_submit">Evidence Submitted</SelectItem>
              <SelectItem value="evidence_verify">Evidence Verified</SelectItem>
              <SelectItem value="status_change">Status Changed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48" data-testid="select-date-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7_days">Last 7 days</SelectItem>
              <SelectItem value="last_30_days">Last 30 days</SelectItem>
              <SelectItem value="last_90_days">Last 90 days</SelectItem>
              <SelectItem value="last_year">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            onClick={() => exportAuditTrailMutation.mutate("csv")}
            data-testid="button-export-audit-trail"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Audit Trail Records */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : auditTrail && auditTrail.length > 0 ? (
          <div className="space-y-2">
            {auditTrail.map((record) => (
              <div key={record.id} className="p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      {getActionIcon(record.action)}
                      <div>
                        <h4 className="font-medium text-sm">{record.action}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {record.user.firstName} {record.user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.user.role} • {record.user.email}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm">{record.entity}</p>
                      <p className="text-xs text-muted-foreground">ID: {record.entityId}</p>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" data-testid={`view-audit-${record.id}`}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>

                {/* Show changes if available */}
                {(record.oldValue || record.newValue) && (
                  <div className="mt-3 pt-3 border-t text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      {record.oldValue && (
                        <div>
                          <span className="font-medium text-red-600">Before:</span>
                          <pre className="bg-red-50 p-2 rounded mt-1 text-xs overflow-auto">
                            {JSON.stringify(record.oldValue, null, 2)}
                          </pre>
                        </div>
                      )}
                      {record.newValue && (
                        <div>
                          <span className="font-medium text-green-600">After:</span>
                          <pre className="bg-green-50 p-2 rounded mt-1 text-xs overflow-auto">
                            {JSON.stringify(record.newValue, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No audit records found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || actionFilter || userFilter ? 
                "Try adjusting your filters" : 
                "Audit trail records will appear here as actions are performed"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compliance Report Generator
function ComplianceReportGenerator() {
  const [reportConfig, setReportConfig] = useState({
    type: "full_audit",
    period: "last_quarter",
    includeAuditTrail: true,
    includeRiskAssessment: true,
    includeRecommendations: true,
    format: "pdf"
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateReportMutation = useMutation({
    mutationFn: (config: typeof reportConfig) => apiRequest("/api/compliance-report/generate", {
      method: "POST",
      body: config
    }),
    onSuccess: (data: any) => {
      toast({ title: "Compliance report generated successfully" });
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-report-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
    },
    onError: (error: any) => {
      toast({ title: "Failed to generate report", description: error.message, variant: "destructive" });
    }
  });

  const handleGenerateReport = () => {
    setIsGenerating(true);
    generateReportMutation.mutate(reportConfig);
    setIsGenerating(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="w-5 h-5" />
          ISO 9001:2015 Compliance Reports
        </CardTitle>
        <CardDescription>
          Generate comprehensive compliance reports for audit and certification purposes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportConfig.type} onValueChange={(value) => 
                setReportConfig({ ...reportConfig, type: value })
              }>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_audit">Full Audit Report</SelectItem>
                  <SelectItem value="competency_matrix">Competency Matrix</SelectItem>
                  <SelectItem value="training_records">Training Records</SelectItem>
                  <SelectItem value="gap_analysis">Gap Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Reporting Period</label>
              <Select value={reportConfig.period} onValueChange={(value) => 
                setReportConfig({ ...reportConfig, period: value })
              }>
                <SelectTrigger data-testid="select-report-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_quarter">Last Quarter</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Period</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Output Format</label>
              <Select value={reportConfig.format} onValueChange={(value) => 
                setReportConfig({ ...reportConfig, format: value })
              }>
                <SelectTrigger data-testid="select-report-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Report</SelectItem>
                  <SelectItem value="excel">Excel Workbook</SelectItem>
                  <SelectItem value="csv">CSV Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-3 block">Report Sections</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeAuditTrail}
                    onChange={(e) => setReportConfig({ 
                      ...reportConfig, 
                      includeAuditTrail: e.target.checked 
                    })}
                    data-testid="checkbox-include-audit-trail"
                  />
                  <span className="text-sm">Include Audit Trail</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeRiskAssessment}
                    onChange={(e) => setReportConfig({ 
                      ...reportConfig, 
                      includeRiskAssessment: e.target.checked 
                    })}
                    data-testid="checkbox-include-risk-assessment"
                  />
                  <span className="text-sm">Include Risk Assessment</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeRecommendations}
                    onChange={(e) => setReportConfig({ 
                      ...reportConfig, 
                      includeRecommendations: e.target.checked 
                    })}
                    data-testid="checkbox-include-recommendations"
                  />
                  <span className="text-sm">Include Recommendations</span>
                </label>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                ISO 9001:2015 Clause 7.2
              </h4>
              <p className="text-sm text-blue-800">
                This report satisfies ISO 9001:2015 Clause 7.2 requirements for competence documentation, 
                including determination of competence, training provision, and effectiveness evaluation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={handleGenerateReport}
            disabled={isGenerating || generateReportMutation.isPending}
            size="lg"
            data-testid="button-generate-report"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGenerating || generateReportMutation.isPending ? "Generating Report..." : "Generate Compliance Report"}
          </Button>
        </div>

        {/* Report Preview Templates */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t">
          <div className="text-center p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
            <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h4 className="font-medium">Full Audit Report</h4>
            <p className="text-xs text-muted-foreground">Complete ISO compliance documentation</p>
          </div>
          <div className="text-center p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
            <BarChart3 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium">Competency Matrix</h4>
            <p className="text-xs text-muted-foreground">Visual competency status overview</p>
          </div>
          <div className="text-center p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
            <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <h4 className="font-medium">Gap Analysis</h4>
            <p className="text-xs text-muted-foreground">Competency gaps and risk assessment</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Compliance Reporting Component
export default function ComplianceReporting() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ISO 9001:2015 Compliance Reporting</h1>
          <p className="text-muted-foreground">
            Comprehensive compliance monitoring and audit trail documentation for Clause 7.2 - Competence
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          ISO 9001:2015 Compliant
        </Badge>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" data-testid="tab-compliance-dashboard">Compliance Dashboard</TabsTrigger>
          <TabsTrigger value="audit-trail" data-testid="tab-audit-trail">Audit Trail</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">Generate Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <ISO9001ComplianceDashboard />
        </TabsContent>

        <TabsContent value="audit-trail" className="space-y-6">
          <AuditTrailViewer />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ComplianceReportGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
}