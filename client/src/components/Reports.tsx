import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target,
  Download,
  Calendar,
  AlertCircle
} from "lucide-react";

export default function Reports() {
  const { user } = useAuth();

  if (user?.role !== 'leadership') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">Only leadership can access company reports and analytics.</p>
        </div>
      </div>
    );
  }

  // Mock data for reports
  const companyMetrics = {
    totalEmployees: 45,
    avgGoalCompletion: 78,
    totalGoalsCompleted: 156,
    totalGoalsActive: 89,
    avgDevelopmentProgress: 65,
    recognitionsSent: 342
  };

  const departmentData = [
    { name: 'Operations', employees: 20, goalCompletion: 82, developmentProgress: 70 },
    { name: 'Facilities', employees: 15, goalCompletion: 75, developmentProgress: 60 },
    { name: 'Management', employees: 10, goalCompletion: 85, developmentProgress: 80 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Company Reports</h1>
          <p className="text-muted-foreground">Analytics and insights across the organization</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" data-testid="button-export-report">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" data-testid="button-schedule-report">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Report
          </Button>
        </div>
      </div>

      {/* Company Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-xl font-bold text-blue-600" data-testid="text-total-employees">
                  {companyMetrics.totalEmployees}
                </div>
                <div className="text-xs text-muted-foreground">Employees</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-xl font-bold text-green-600" data-testid="text-avg-goal-completion">
                  {companyMetrics.avgGoalCompletion}%
                </div>
                <div className="text-xs text-muted-foreground">Goal Completion</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-xl font-bold text-purple-600" data-testid="text-goals-completed">
                  {companyMetrics.totalGoalsCompleted}
                </div>
                <div className="text-xs text-muted-foreground">Goals Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-xl font-bold text-orange-600" data-testid="text-active-goals">
                  {companyMetrics.totalGoalsActive}
                </div>
                <div className="text-xs text-muted-foreground">Active Goals</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="text-xl font-bold text-indigo-600" data-testid="text-development-progress">
                  {companyMetrics.avgDevelopmentProgress}%
                </div>
                <div className="text-xs text-muted-foreground">Development</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-pink-600" />
              <div>
                <div className="text-xl font-bold text-pink-600" data-testid="text-recognitions-sent">
                  {companyMetrics.recognitionsSent}
                </div>
                <div className="text-xs text-muted-foreground">Recognitions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Department Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {departmentData.map((dept) => (
              <div key={dept.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{dept.name}</h3>
                    <p className="text-sm text-muted-foreground">{dept.employees} employees</p>
                  </div>
                  <Badge variant="outline">{dept.employees} people</Badge>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Goal Completion</span>
                      <span className="text-sm text-muted-foreground">{dept.goalCompletion}%</span>
                    </div>
                    <Progress value={dept.goalCompletion} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Development Progress</span>
                      <span className="text-sm text-muted-foreground">{dept.developmentProgress}%</span>
                    </div>
                    <Progress value={dept.developmentProgress} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col" data-testid="button-monthly-report">
              <BarChart3 className="w-6 h-6 mb-2" />
              Monthly Report
            </Button>
            <Button variant="outline" className="h-20 flex-col" data-testid="button-goal-analytics">
              <Target className="w-6 h-6 mb-2" />
              Goal Analytics
            </Button>
            <Button variant="outline" className="h-20 flex-col" data-testid="button-team-performance">
              <Users className="w-6 h-6 mb-2" />
              Team Performance
            </Button>
            <Button variant="outline" className="h-20 flex-col" data-testid="button-development-metrics">
              <TrendingUp className="w-6 h-6 mb-2" />
              Development Metrics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}