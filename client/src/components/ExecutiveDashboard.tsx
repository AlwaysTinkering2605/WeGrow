import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  FileText,
  Plus,
} from "lucide-react";
import { format } from "date-fns";

interface ExecutiveDashboardData {
  summary: {
    totalObjectives: number;
    completedObjectives: number;
    inProgressObjectives: number;
    atRiskCount: number;
    objectiveCompletionRate: number;
    totalKeyResults: number;
    completedKeyResults: number;
    keyResultCompletionRate: number;
    overallAvgProgress: number;
    overallAvgConfidence: number;
  };
  atRiskObjectives: Array<{
    id: string;
    title: string;
    status: string;
    strategicTheme: string | null;
    riskLevel: string | null;
    targetDate: Date | null;
  }>;
  themeMetrics: Record<string, {
    total: number;
    completed: number;
    inProgress: number;
    atRisk: number;
  }>;
  objectives: Array<{
    id: string;
    title: string;
    status: string;
    strategicTheme: string | null;
    riskLevel: string | null;
    targetDate: Date | null;
    keyResultCount: number;
    avgProgress: number;
    avgConfidence: number;
  }>;
}

const strategicThemeLabels: Record<string, string> = {
  quality_excellence: "Quality Excellence",
  operational_excellence: "Operational Excellence",
  customer_satisfaction: "Customer Satisfaction",
  innovation_growth: "Innovation & Growth",
  financial_performance: "Financial Performance",
  not_specified: "Not Specified",
};

const strategicThemeColors: Record<string, string> = {
  quality_excellence: "bg-blue-500",
  operational_excellence: "bg-green-500",
  customer_satisfaction: "bg-purple-500",
  innovation_growth: "bg-orange-500",
  financial_performance: "bg-yellow-500",
  not_specified: "bg-gray-500",
};

const riskLevelLabels: Record<string, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
  critical: "Critical Risk",
};

const riskLevelColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function ExecutiveDashboard() {
  const [activeTab, setActiveTab] = useState<string>("overview");

  const { data: dashboardData, isLoading } = useQuery<ExecutiveDashboardData>({
    queryKey: ["/api/executive-dashboard"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Executive Dashboard</h2>
            <p className="text-muted-foreground">ISO 9001:2015 Clause 9.3 Management Review</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No dashboard data available</p>
      </div>
    );
  }

  const { summary, atRiskObjectives, themeMetrics, objectives } = dashboardData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="title-executive-dashboard">Executive Dashboard</h2>
          <p className="text-muted-foreground">ISO 9001:2015 Clause 9.3 Management Review</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export-report">
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button data-testid="button-create-management-review">
            <Plus className="w-4 h-4 mr-2" />
            Create Management Review
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-objective-completion">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objective Completion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-objective-completion-rate">
              {summary.objectiveCompletionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.completedObjectives} of {summary.totalObjectives} objectives
            </p>
            <Progress value={summary.objectiveCompletionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="card-key-result-completion">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Key Result Completion</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-key-result-completion-rate">
              {summary.keyResultCompletionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.completedKeyResults} of {summary.totalKeyResults} key results
            </p>
            <Progress value={summary.keyResultCompletionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="card-overall-progress">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-overall-avg-progress">
              {summary.overallAvgProgress.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all objectives
            </p>
            <Progress value={summary.overallAvgProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="card-overall-confidence">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Confidence</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-overall-avg-confidence">
              {summary.overallAvgConfidence}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average confidence score
            </p>
            <Progress value={summary.overallAvgConfidence} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-in-progress">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-in-progress-count">
              {summary.inProgressObjectives}
            </div>
            <p className="text-sm text-muted-foreground">Active objectives</p>
          </CardContent>
        </Card>

        <Card data-testid="card-at-risk">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500" data-testid="text-at-risk-count">
              {summary.atRiskCount}
            </div>
            <p className="text-sm text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card data-testid="card-completed">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500" data-testid="text-completed-count">
              {summary.completedObjectives}
            </div>
            <p className="text-sm text-muted-foreground">Successfully achieved</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="themes" data-testid="tab-themes">By Theme</TabsTrigger>
          <TabsTrigger value="at-risk" data-testid="tab-at-risk">At Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Objectives</CardTitle>
              <CardDescription>Complete list of company objectives with progress metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {objectives.map((obj) => (
                  <div
                    key={obj.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`objective-${obj.id}`}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium" data-testid={`objective-title-${obj.id}`}>{obj.title}</h4>
                        <Badge variant="outline" className="text-xs" data-testid={`badge-status-${obj.id}`}>
                          {obj.status === "completed" ? "Completed" : obj.status === "in_progress" ? "In Progress" : "Not Started"}
                        </Badge>
                        {obj.strategicTheme && (
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-theme-${obj.id}`}>
                            {strategicThemeLabels[obj.strategicTheme] || obj.strategicTheme}
                          </Badge>
                        )}
                        {obj.riskLevel && (
                          <Badge className={`text-xs ${riskLevelColors[obj.riskLevel]}`} data-testid={`badge-risk-${obj.id}`}>
                            {riskLevelLabels[obj.riskLevel] || obj.riskLevel}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Progress: </span>
                          <span className="font-medium" data-testid={`text-progress-${obj.id}`}>{obj.avgProgress.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Confidence: </span>
                          <span className="font-medium" data-testid={`text-confidence-${obj.id}`}>{obj.avgConfidence}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Key Results: </span>
                          <span className="font-medium" data-testid={`text-kr-count-${obj.id}`}>{obj.keyResultCount}</span>
                        </div>
                      </div>
                      {obj.targetDate && (
                        <p className="text-xs text-muted-foreground" data-testid={`text-target-date-${obj.id}`}>
                          Target: {format(new Date(obj.targetDate), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="themes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(themeMetrics).map(([theme, metrics]) => (
              <Card key={theme} data-testid={`theme-card-${theme}`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${strategicThemeColors[theme] || "bg-gray-500"}`} />
                    <CardTitle className="text-base">
                      {strategicThemeLabels[theme] || theme}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium">{metrics.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="font-medium text-green-600">{metrics.completed}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">In Progress:</span>
                      <span className="font-medium text-blue-600">{metrics.inProgress}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">At Risk:</span>
                      <span className="font-medium text-orange-600">{metrics.atRisk}</span>
                    </div>
                    <Progress
                      value={metrics.total > 0 ? (metrics.completed / metrics.total) * 100 : 0}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="at-risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                At-Risk Objectives
              </CardTitle>
              <CardDescription>
                Objectives with low progress or confidence requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {atRiskObjectives.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No objectives currently at risk</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {atRiskObjectives.map((obj) => (
                    <div
                      key={obj.id}
                      className="flex items-center justify-between p-4 border border-orange-200 dark:border-orange-900 rounded-lg bg-orange-50 dark:bg-orange-950"
                      data-testid={`at-risk-objective-${obj.id}`}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" data-testid={`icon-alert-${obj.id}`} />
                          <h4 className="font-medium" data-testid={`at-risk-title-${obj.id}`}>{obj.title}</h4>
                          {obj.riskLevel && (
                            <Badge className={`text-xs ${riskLevelColors[obj.riskLevel]}`} data-testid={`at-risk-badge-risk-${obj.id}`}>
                              {riskLevelLabels[obj.riskLevel] || obj.riskLevel}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {obj.strategicTheme && (
                            <Badge variant="secondary" className="text-xs" data-testid={`at-risk-badge-theme-${obj.id}`}>
                              {strategicThemeLabels[obj.strategicTheme] || obj.strategicTheme}
                            </Badge>
                          )}
                          {obj.targetDate && (
                            <span className="text-muted-foreground" data-testid={`at-risk-due-date-${obj.id}`}>
                              Due: {format(new Date(obj.targetDate), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" data-testid={`button-view-${obj.id}`}>
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
