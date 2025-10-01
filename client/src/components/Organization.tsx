import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch, Network } from "lucide-react";

type JobRoleOrgChartNode = {
  id: string;
  name: string;
  code: string;
  level: number;
  department: string | null;
  reportsTo: string | null;
  reportsToName: string | null;
  employeeCount: number;
  employees: Array<{
    id: string;
    name: string;
    jobTitle: string | null;
  }>;
};

type ManagerOrgChartNode = {
  id: string;
  name: string;
  email: string | null;
  jobTitle: string | null;
  jobRoleName: string | null;
  managerId: string | null;
  managerName: string | null;
  directReports: Array<{
    id: string;
    name: string;
    jobTitle: string | null;
  }>;
};

export default function Organization() {
  const { data: jobRoleOrgChart, isLoading: isLoadingJobRoles } = useQuery<JobRoleOrgChartNode[]>({
    queryKey: ['/api/org-chart/job-roles']
  });

  const { data: managerOrgChart, isLoading: isLoadingManagers } = useQuery<ManagerOrgChartNode[]>({
    queryKey: ['/api/org-chart/managers']
  });

  const renderJobRoleNode = (node: JobRoleOrgChartNode) => {
    return (
      <div key={node.id} className="mb-4" data-testid={`job-role-node-${node.id}`}>
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg" data-testid={`job-role-name-${node.id}`}>{node.name}</CardTitle>
                <CardDescription data-testid={`job-role-level-${node.id}`}>
                  Level {node.level} {node.department && `• ${node.department}`}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary" data-testid={`job-role-count-${node.id}`}>{node.employeeCount}</div>
                <div className="text-sm text-muted-foreground">employees</div>
              </div>
            </div>
          </CardHeader>
          {node.employees.length > 0 && (
            <CardContent>
              <div className="space-y-1">
                {node.employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="text-sm flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50"
                    data-testid={`employee-${employee.id}`}
                  >
                    <span data-testid={`employee-name-${employee.id}`}>{employee.name}</span>
                    {employee.jobTitle && (
                      <span className="text-muted-foreground text-xs" data-testid={`employee-title-${employee.id}`}>
                        {employee.jobTitle}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
        {node.reportsTo && (
          <div className="text-xs text-muted-foreground ml-4 mt-1" data-testid={`reports-to-${node.id}`}>
            Reports to: {node.reportsToName}
          </div>
        )}
      </div>
    );
  };

  const renderManagerNode = (node: ManagerOrgChartNode) => {
    return (
      <div key={node.id} className="mb-4" data-testid={`manager-node-${node.id}`}>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg" data-testid={`manager-name-${node.id}`}>{node.name}</CardTitle>
                <CardDescription data-testid={`manager-details-${node.id}`}>
                  {node.jobTitle || node.jobRoleName}
                  {node.email && ` • ${node.email}`}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-500" data-testid={`direct-reports-count-${node.id}`}>
                  {node.directReports.length}
                </div>
                <div className="text-sm text-muted-foreground">direct reports</div>
              </div>
            </div>
          </CardHeader>
          {node.directReports.length > 0 && (
            <CardContent>
              <div className="space-y-1">
                {node.directReports.map((report) => (
                  <div
                    key={report.id}
                    className="text-sm flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50"
                    data-testid={`direct-report-${report.id}`}
                  >
                    <span data-testid={`direct-report-name-${report.id}`}>{report.name}</span>
                    {report.jobTitle && (
                      <span className="text-muted-foreground text-xs" data-testid={`direct-report-title-${report.id}`}>
                        {report.jobTitle}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
        {node.managerId && (
          <div className="text-xs text-muted-foreground ml-4 mt-1" data-testid={`manager-reports-to-${node.id}`}>
            Reports to: {node.managerName}
          </div>
        )}
      </div>
    );
  };

  // Group job roles by level for better visualization
  const jobRolesByLevel = jobRoleOrgChart?.reduce((acc, node) => {
    if (!acc[node.level]) acc[node.level] = [];
    acc[node.level].push(node);
    return acc;
  }, {} as Record<number, JobRoleOrgChartNode[]>) || {};

  return (
    <div className="p-6 space-y-6" data-testid="organization-page">
      <div>
        <h1 className="text-3xl font-bold" data-testid="page-title">Organization Structure</h1>
        <p className="text-muted-foreground mt-2" data-testid="page-description">
          View your organization structure from two perspectives: job role hierarchy and actual reporting relationships
        </p>
      </div>

      <Tabs defaultValue="job-roles" className="w-full" data-testid="org-chart-tabs">
        <TabsList className="grid w-full max-w-md grid-cols-2" data-testid="tabs-list">
          <TabsTrigger value="job-roles" className="flex items-center gap-2" data-testid="tab-job-roles">
            <GitBranch className="h-4 w-4" />
            Job Role Hierarchy
          </TabsTrigger>
          <TabsTrigger value="managers" className="flex items-center gap-2" data-testid="tab-managers">
            <Network className="h-4 w-4" />
            Manager Chain
          </TabsTrigger>
        </TabsList>

        <TabsContent value="job-roles" className="mt-6" data-testid="job-roles-content">
          <Card>
            <CardHeader>
              <CardTitle data-testid="job-roles-title">Job Role Hierarchy</CardTitle>
              <CardDescription data-testid="job-roles-description">
                Organizational structure based on job roles and their hierarchical relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingJobRoles ? (
                <div className="space-y-4" data-testid="job-roles-loading">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : !jobRoleOrgChart || jobRoleOrgChart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="job-roles-empty">
                  No job roles found
                </div>
              ) : (
                <div className="space-y-6" data-testid="job-roles-list">
                  {Object.keys(jobRolesByLevel)
                    .sort((a, b) => Number(b) - Number(a)) // Sort descending (highest level first)
                    .map((level) => (
                      <div key={level} data-testid={`level-${level}`}>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3" data-testid={`level-header-${level}`}>
                          Level {level}
                        </h3>
                        <div className="space-y-3">
                          {jobRolesByLevel[Number(level)].map(renderJobRoleNode)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="managers" className="mt-6" data-testid="managers-content">
          <Card>
            <CardHeader>
              <CardTitle data-testid="managers-title">Manager Chain</CardTitle>
              <CardDescription data-testid="managers-description">
                Actual reporting relationships based on assigned managers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingManagers ? (
                <div className="space-y-4" data-testid="managers-loading">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : !managerOrgChart || managerOrgChart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="managers-empty">
                  No managers found
                </div>
              ) : (
                <div className="space-y-3" data-testid="managers-list">
                  {managerOrgChart.map(renderManagerNode)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
