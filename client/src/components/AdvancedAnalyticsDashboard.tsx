import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, subMonths } from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Award,
  Clock,
  AlertCircle,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Star,
  BookOpen,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Zap,
  Brain,
  Trophy
} from "lucide-react";

interface AnalyticsMetrics {
  completion_rate: number;
  engagement_score: number;
  performance_score: number;
  learning_velocity: number;
  competency_progress: number;
  assessment_score: number;
  time_spent: number;
  streak_count: number;
  retention_rate: number;
  skill_mastery: number;
  course_effectiveness: number;
  path_optimization: number;
}

interface PerformanceSnapshot {
  id: string;
  userId: string;
  snapshotDate: string;
  overallScore: number;
  competencyScores: Record<string, number>;
  learningVelocity: number;
  engagementLevel: number;
  streakCount: number;
  completionRate: number;
  assessmentAverage: number;
  skillMastery: Record<string, number>;
}

interface LearningInsight {
  id: string;
  userId?: string;
  teamId?: string;
  insightType: 'recommendation' | 'warning' | 'achievement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  dataPoints: Record<string, any>;
  actionItems: string[];
  isRead: boolean;
  createdAt: string;
}

interface EngagementMetrics {
  totalUsers: number;
  activeUsers: number;
  avgSessionDuration: number;
  completionRate: number;
  dailyActiveUsers: number[];
  engagementTrends: Array<{
    date: string;
    engagement: number;
    completion: number;
    performance: number;
  }>;
}

const chartConfig = {
  engagement: { label: "Engagement", color: "#3b82f6" },
  completion: { label: "Completion", color: "#10b981" },
  performance: { label: "Performance", color: "#f59e0b" },
  users: { label: "Active Users", color: "#8b5cf6" },
  velocity: { label: "Learning Velocity", color: "#ef4444" }
};

export default function AdvancedAnalyticsDashboard() {
  const { user } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState("30");
  const [selectedDimension, setSelectedDimension] = useState("user");
  const [selectedMetricType, setSelectedMetricType] = useState("engagement_score");

  // Check access permissions
  if (user?.role !== 'supervisor' && user?.role !== 'leadership') {
    return (
      <div className="flex items-center justify-center h-64" data-testid="access-denied">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">Only supervisors and leadership can access advanced analytics.</p>
        </div>
      </div>
    );
  }

  // Analytics API queries with the new endpoints
  const { data: analyticsMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/analytics/metrics', { 
      metricType: selectedMetricType,
      dimension: selectedDimension,
      aggregationLevel: 'daily',
      startDate: new Date(Date.now() - parseInt(selectedTimeRange) * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      limit: '50'
    }],
    retry: false,
  });

  const { data: engagementMetrics, isLoading: engagementLoading } = useQuery({
    queryKey: ['/api/analytics/engagement', {
      startDate: new Date(Date.now() - parseInt(selectedTimeRange) * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    }],
    retry: false,
  });

  const { data: performanceMetrics, isLoading: performanceLoading } = useQuery({
    queryKey: ['/api/analytics/performance-metrics', {
      startDate: new Date(Date.now() - parseInt(selectedTimeRange) * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    }],
    retry: false,
  });

  const { data: learningInsights, isLoading: insightsLoading } = useQuery({
    queryKey: [`/api/analytics/insights/${user.id}`, { unreadOnly: 'false' }],
    retry: false,
  });

  if (metricsLoading || engagementLoading || performanceLoading) {
    return <AnalyticsSkeleton />;
  }

  // Transform data for visualization
  const metrics = analyticsMetrics || [];
  const engagement = engagementMetrics || {
    totalUsers: 0,
    activeUsers: 0,
    avgSessionDuration: 0,
    completionRate: 0,
    dailyActiveUsers: [],
    engagementTrends: []
  };
  const performance = performanceMetrics || [];
  const insights = learningInsights || [];

  // Sample data for demonstration - replace with real metrics
  const timeSeriesData = Array.from({ length: parseInt(selectedTimeRange) }, (_, i) => {
    const date = subDays(new Date(), parseInt(selectedTimeRange) - i - 1);
    return {
      date: format(date, 'MMM dd'),
      engagement: Math.floor(Math.random() * 20 + 75),
      completion: Math.floor(Math.random() * 15 + 80),
      performance: Math.floor(Math.random() * 12 + 82),
      users: Math.floor(Math.random() * 50 + 150),
    };
  });

  const competencyDistribution = [
    { name: 'Technical', value: 35, color: '#3b82f6' },
    { name: 'Safety', value: 28, color: '#10b981' },
    { name: 'Behavioral', value: 22, color: '#f59e0b' },
    { name: 'Compliance', value: 15, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="dashboard-title">Advanced Analytics</h1>
          <p className="text-muted-foreground">Performance metrics, engagement tracking, and learning insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange} data-testid="time-range-select">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" data-testid="refresh-button">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" data-testid="export-button">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card data-testid="kpi-engagement">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-sm">Engagement Score</h3>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold">87%</p>
              <div className="flex items-center text-sm text-green-600">
                <ArrowUp className="h-3 w-3 mr-1" />
                +5.2% from last period
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="kpi-completion">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold text-sm">Completion Rate</h3>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold">92%</p>
              <div className="flex items-center text-sm text-green-600">
                <ArrowUp className="h-3 w-3 mr-1" />
                +2.8% from last period
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="kpi-performance">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-sm">Avg Performance</h3>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold">84%</p>
              <div className="flex items-center text-sm text-green-600">
                <ArrowUp className="h-3 w-3 mr-1" />
                +3.1% from last period
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="kpi-velocity">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold text-sm">Learning Velocity</h3>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold">76%</p>
              <div className="flex items-center text-sm text-red-600">
                <ArrowDown className="h-3 w-3 mr-1" />
                -1.4% from last period
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Content */}
      <Tabs defaultValue="trends" className="w-full" data-testid="analytics-tabs">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends" data-testid="tab-trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="engagement" data-testid="tab-engagement">Engagement</TabsTrigger>
          <TabsTrigger value="competencies" data-testid="tab-competencies">Competencies</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Performance Trends Tab */}
        <TabsContent value="trends" className="space-y-6" data-testid="trends-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Over Time</CardTitle>
                <CardDescription>Engagement, completion, and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip />
                    <ChartLegend />
                    <Line 
                      type="monotone" 
                      dataKey="engagement" 
                      stroke={chartConfig.engagement.color}
                      strokeWidth={2}
                      name="Engagement %"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completion" 
                      stroke={chartConfig.completion.color}
                      strokeWidth={2}
                      name="Completion %"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="performance" 
                      stroke={chartConfig.performance.color}
                      strokeWidth={2}
                      name="Performance %"
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Users Trend</CardTitle>
                <CardDescription>Daily active users over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <AreaChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke={chartConfig.users.color}
                      fill={chartConfig.users.color}
                      fillOpacity={0.3}
                      name="Active Users"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6" data-testid="engagement-content">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
                <CardDescription>User interaction and participation levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Session Duration</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={75} className="w-20" />
                      <span className="text-sm">24 min avg</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Course Completion</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={92} className="w-20" />
                      <span className="text-sm">92%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Quiz Performance</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={88} className="w-20" />
                      <span className="text-sm">88%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Peer Interactions</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={64} className="w-20" />
                      <span className="text-sm">64%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">87%</p>
                  <p className="text-sm text-muted-foreground">Overall Engagement</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Active Users</span>
                    <span className="text-sm font-semibold">248/275</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Daily Sessions</span>
                    <span className="text-sm font-semibold">1,847</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Session Time</span>
                    <span className="text-sm font-semibold">24m</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Competencies Tab */}
        <TabsContent value="competencies" className="space-y-6" data-testid="competencies-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Competency Distribution</CardTitle>
                <CardDescription>Breakdown by competency type</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <PieChart>
                    <Pie
                      data={competencyDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {competencyDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Competency Progress</CardTitle>
                <CardDescription>Progress across different skill areas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Technical Skills</span>
                    <span className="text-sm">89%</span>
                  </div>
                  <Progress value={89} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Safety Protocols</span>
                    <span className="text-sm">94%</span>
                  </div>
                  <Progress value={94} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Behavioral Competencies</span>
                    <span className="text-sm">76%</span>
                  </div>
                  <Progress value={76} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Compliance Training</span>
                    <span className="text-sm">98%</span>
                  </div>
                  <Progress value={98} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-6" data-testid="insights-content">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>AI-Generated Insights</CardTitle>
                <CardDescription>Machine learning recommendations and predictions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {insightsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : (
                  <>
                    <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-orange-800">Performance Alert</h4>
                          <p className="text-sm text-orange-700">
                            Learning velocity has decreased by 12% in the Technical Skills category. 
                            Consider reviewing course difficulty levels.
                          </p>
                          <Badge variant="outline" className="mt-2 text-xs">High Priority</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex items-start space-x-3">
                        <BookOpen className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-800">Learning Recommendation</h4>
                          <p className="text-sm text-blue-700">
                            Users completing Safety Protocols show 34% higher engagement in subsequent modules. 
                            Consider promoting this pathway.
                          </p>
                          <Badge variant="outline" className="mt-2 text-xs">Medium Priority</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                      <div className="flex items-start space-x-3">
                        <Star className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800">Achievement Milestone</h4>
                          <p className="text-sm text-green-700">
                            Team completion rate has exceeded 90% for the first time this quarter. 
                            Recognition program impact is highly positive.
                          </p>
                          <Badge variant="outline" className="mt-2 text-xs">Celebration</Badge>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Predictive Analytics</CardTitle>
                <CardDescription>Forecasted trends</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Completion Rate Forecast</h4>
                  <div className="text-2xl font-bold text-green-600">↗ 94%</div>
                  <p className="text-xs text-muted-foreground">Next 30 days</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">At-Risk Learners</h4>
                  <div className="text-2xl font-bold text-orange-600">12</div>
                  <p className="text-xs text-muted-foreground">Need intervention</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Engagement Trend</h4>
                  <div className="text-2xl font-bold text-blue-600">↗ +8%</div>
                  <p className="text-xs text-muted-foreground">Projected growth</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}