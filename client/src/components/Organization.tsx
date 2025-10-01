import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch, Network } from "lucide-react";
import { TreeView, type TreeNodeData } from "./TreeNode";

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
  directReports: ManagerOrgChartNode[];
  directReportCount: number;
};

type JobRoleHierarchyNode = {
  id: string;
  name: string;
  code: string;
  level: number;
  department: string | null;
  reportsToJobRoleId: string | null;
  children: JobRoleHierarchyNode[];
};

// Transform job role hierarchy to tree node data
const transformJobRoleToTree = (node: JobRoleHierarchyNode, employeeCounts: Map<string, number>): TreeNodeData => {
  const count = employeeCounts.get(node.id) || 0;
  return {
    id: node.id,
    name: node.name,
    subtitle: node.department ? `${node.department} • Level ${node.level}` : `Level ${node.level}`,
    badge: node.code,
    count,
    children: node.children?.map(child => transformJobRoleToTree(child, employeeCounts)) || [],
    metadata: { level: node.level, department: node.department }
  };
};

// Transform manager hierarchy to tree node data
const transformManagerToTree = (node: ManagerOrgChartNode): TreeNodeData => {
  return {
    id: node.id,
    name: node.name,
    subtitle: node.jobRoleName || node.jobTitle || node.email || undefined,
    count: node.directReportCount,
    children: node.directReports?.map(transformManagerToTree) || [],
    metadata: { email: node.email, jobTitle: node.jobTitle }
  };
};

export default function Organization() {
  // Fetch hierarchical job role structure
  const { data: jobRoleHierarchy, isLoading: isLoadingJobRoles } = useQuery<JobRoleHierarchyNode[]>({
    queryKey: ['/api/org-chart/hierarchy/job-roles']
  });

  // Fetch flat job role org chart for employee counts
  const { data: jobRoleOrgChart } = useQuery<JobRoleOrgChartNode[]>({
    queryKey: ['/api/org-chart/job-roles']
  });

  // Fetch hierarchical manager structure
  const { data: managerOrgChart, isLoading: isLoadingManagers } = useQuery<ManagerOrgChartNode[]>({
    queryKey: ['/api/org-chart/managers']
  });

  // Create employee count map from flat org chart data
  const employeeCounts = new Map<string, number>();
  jobRoleOrgChart?.forEach(node => {
    employeeCounts.set(node.id, node.employeeCount);
  });

  // Transform hierarchical data to tree format
  const jobRoleTreeData = jobRoleHierarchy?.map(node => 
    transformJobRoleToTree(node, employeeCounts)
  ) || [];

  const managerTreeData = managerOrgChart?.map(transformManagerToTree) || [];

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
              ) : !jobRoleHierarchy || jobRoleHierarchy.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="job-roles-empty">
                  No job roles found
                </div>
              ) : (
                <div data-testid="job-roles-tree">
                  <TreeView nodes={jobRoleTreeData} defaultExpanded={true} />
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
                <div data-testid="managers-tree">
                  <TreeView nodes={managerTreeData} defaultExpanded={true} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
