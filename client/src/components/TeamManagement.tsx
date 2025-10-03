import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Building2,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Network,
  UserPlus,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown
} from "lucide-react";
import { 
  insertTeamSchema,
  type User,
  type Department
} from "@shared/schema";
import type { z } from "zod";

// Team type inferred from database schema
type Team = {
  id: string;
  name: string;
  description?: string | null;
  department?: string | null;
  departmentId?: string | null;
  teamLeadId: string;
  parentTeamId?: string | null;
  isActive?: boolean | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  children?: Team[];
};

type InsertTeamData = z.infer<typeof insertTeamSchema>;

export default function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());
  const [isAllCollapsed, setIsAllCollapsed] = useState(false);

  // Fetch all departments
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  // Create team form with proper validation
  const createForm = useForm<InsertTeamData>({
    resolver: zodResolver(insertTeamSchema),
    defaultValues: {
      name: "",
      description: "",
      departmentId: undefined,
      teamLeadId: "",
      parentTeamId: undefined,
      isActive: true,
    },
  });

  // Edit team form with partial validation for updates
  const editForm = useForm<Partial<InsertTeamData>>({
    resolver: zodResolver(insertTeamSchema.partial()),
    defaultValues: {
      name: "",
      description: "",
      departmentId: undefined, 
      teamLeadId: "",
      parentTeamId: undefined,
      isActive: true,
    },
  });

  // Fetch teams data
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["/api/teams"],
    retry: false,
  }) as { data: Team[]; isLoading: boolean };

  // Fetch team hierarchy
  const { data: teamHierarchy = [], isLoading: hierarchyLoading } = useQuery({
    queryKey: ["/api/teams/hierarchy"],
    retry: false,
  }) as { data: Team[]; isLoading: boolean };

  // Fetch all users for assignment
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    retry: false,
  }) as { data: User[]; isLoading: boolean };

  // Fetch team members for current user (if supervisor)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["/api/team/members"],
    retry: false,
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: (teamData: InsertTeamData) => apiRequest("/api/teams", { method: "POST", body: JSON.stringify(teamData) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/hierarchy"] });
      setIsCreateTeamOpen(false);
      createForm.reset();
      toast({
        title: "Team Created",
        description: "Team has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create team.",
        variant: "destructive",
      });
    },
  });

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<InsertTeamData>) => 
      apiRequest(`/api/teams/${id}`, { method: "PUT", body: JSON.stringify(updates) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/hierarchy"] });
      setIsEditTeamOpen(false);
      setSelectedTeam(null);
      editForm.reset();
      toast({
        title: "Team Updated",
        description: "Team has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team.",
        variant: "destructive",
      });
    },
  });

  // Delete team mutation (leadership only)
  const deleteTeamMutation = useMutation({
    mutationFn: (teamId: string) => apiRequest(`/api/teams/${teamId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/hierarchy"] });
      toast({
        title: "Team Deleted",
        description: "Team has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team.",
        variant: "destructive",
      });
    },
  });

  // Assign user to team mutation
  const assignUserMutation = useMutation({
    mutationFn: ({ userId, teamId }: { userId: string; teamId: string }) => 
      apiRequest("PUT", `/api/users/${userId}/team`, { teamId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      toast({
        title: "User Assigned",
        description: "User has been assigned to team successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign user to team.",
        variant: "destructive",
      });
    },
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

  const handleCreateTeam = (data: InsertTeamData) => {
    // Normalize empty strings to undefined for optional fields
    const normalizedData = {
      ...data,
      departmentId: data.departmentId === 'none' || !data.departmentId ? undefined : data.departmentId,
      parentTeamId: data.parentTeamId === "" ? undefined : data.parentTeamId,
      description: data.description === "" ? undefined : data.description,
    };
    createTeamMutation.mutate(normalizedData);
  };

  // Get department name for display
  const getDepartmentName = (departmentId?: string | null) => {
    if (!departmentId) return null;
    const department = departments.find(d => d.id === departmentId);
    return department?.name || null;
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    editForm.reset({
      name: team.name,
      description: team.description || "",
      departmentId: team.departmentId || undefined,
      teamLeadId: team.teamLeadId,
      parentTeamId: team.parentTeamId ?? undefined,
      isActive: team.isActive ?? true,
    });
    setIsEditTeamOpen(true);
  };

  const handleUpdateTeam = (data: Partial<InsertTeamData>) => {
    if (!selectedTeam) {
      toast({
        title: "Error",
        description: "No team selected for update.",
        variant: "destructive",
      });
      return;
    }

    // Normalize empty strings to undefined for optional fields
    const normalizedData = {
      ...data,
      departmentId: data.departmentId === 'none' || !data.departmentId ? undefined : data.departmentId,
      parentTeamId: data.parentTeamId === "" ? undefined : data.parentTeamId,
      description: data.description === "" ? undefined : data.description,
    };

    updateTeamMutation.mutate({
      id: selectedTeam.id,
      ...normalizedData,
    });
  };

  const handleDeleteTeam = (teamId: string) => {
    if (user?.role !== 'leadership') {
      toast({
        title: "Access Denied",
        description: "Only leadership can delete teams.",
        variant: "destructive",
      });
      return;
    }

    if (confirm("Are you sure you want to delete this team? This action cannot be undone.")) {
      deleteTeamMutation.mutate(teamId);
    }
  };

  const handleAssignUserToTeam = (userId: string, teamId: string) => {
    assignUserMutation.mutate({ userId, teamId });
  };

  // Toggle individual team collapse state
  const toggleTeamCollapse = (teamId: string) => {
    setCollapsedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  // Get all team IDs recursively
  const getAllTeamIds = (teams: Team[]): string[] => {
    const ids: string[] = [];
    teams.forEach(team => {
      ids.push(team.id);
      if (team.children && team.children.length > 0) {
        ids.push(...getAllTeamIds(team.children));
      }
    });
    return ids;
  };

  // Toggle collapse all teams
  const toggleCollapseAll = () => {
    if (isAllCollapsed) {
      // Expand all - clear the set
      setCollapsedTeams(new Set());
      setIsAllCollapsed(false);
    } else {
      // Collapse all - add all team IDs to the set
      const allIds = getAllTeamIds(teamHierarchy);
      setCollapsedTeams(new Set(allIds));
      setIsAllCollapsed(true);
    }
  };

  const renderTeamHierarchy = (teams: Team[], level = 0) => {
    return teams.map((team) => {
      const isCollapsed = collapsedTeams.has(team.id);
      const hasChildren = team.children && team.children.length > 0;

      return (
        <div key={team.id} className={`${level > 0 ? 'ml-6 border-l pl-4' : ''} mb-4`}>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
            <div className="flex items-center space-x-3 flex-1">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => toggleTeamCollapse(team.id)}
                  data-testid={`button-toggle-${team.id}`}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              )}
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold" data-testid={`text-team-name-${team.id}`}>
                  {team.name}
                  {hasChildren && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({team.children!.length} {team.children!.length === 1 ? 'sub-team' : 'sub-teams'})
                    </span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground capitalize">{getDepartmentName(team.departmentId) || "No Department"}</p>
                {team.description && (
                  <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEditTeam(team)}
                data-testid={`button-edit-team-${team.id}`}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              {user?.role === 'leadership' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteTeam(team.id)}
                  data-testid={`button-delete-team-${team.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
          {hasChildren && !isCollapsed && (
            <div className="mt-2">
              {renderTeamHierarchy(team.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Create, manage, and organize your teams</p>
        </div>
        <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-team">
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateTeam)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter team name"
                          data-testid="input-team-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Enter team description"
                          data-testid="input-team-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-department">
                            <SelectValue placeholder="Select department (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Department</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="teamLeadId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Lead (Required)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-team-lead">
                            <SelectValue placeholder="Select team lead" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(allUsers as User[]).filter((user: User) => 
                            user.role === 'supervisor' || user.role === 'leadership'
                          ).map((user: User) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}` 
                                : user.email || 'Unknown User'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="parentTeamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Team (Optional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-parent-team">
                            <SelectValue placeholder="Select parent team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Parent Team</SelectItem>
                          {teams.map((team: Team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateTeamOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createTeamMutation.isPending}
                    data-testid="button-create-team-submit"
                  >
                    {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="teams" data-testid="tab-teams">Teams</TabsTrigger>
          <TabsTrigger value="hierarchy" data-testid="tab-hierarchy">Hierarchy</TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Team Overview Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-total-teams">
                      {teams.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Teams</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-members">
                      {allUsers.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Members</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <Network className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400" data-testid="text-hierarchy-levels">
                      {teamHierarchy.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Root Teams</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity or Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  onClick={() => setIsCreateTeamOpen(true)}
                  data-testid="button-quick-create-team"
                >
                  <Plus className="w-6 h-6" />
                  <span>Create New Team</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  onClick={() => setActiveTab("assignments")}
                  data-testid="button-quick-assignments"
                >
                  <UserPlus className="w-6 h-6" />
                  <span>Manage Assignments</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Teams</CardTitle>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-muted rounded-lg"></div>
                        <div>
                          <div className="w-32 h-4 bg-muted rounded mb-2"></div>
                          <div className="w-24 h-3 bg-muted rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Teams Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first team to get started with team management.
                  </p>
                  <Button onClick={() => setIsCreateTeamOpen(true)} data-testid="button-create-first-team">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Team
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {teams.map((team: Team) => (
                    <div key={team.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold" data-testid={`text-team-list-name-${team.id}`}>{team.name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">{getDepartmentName(team.departmentId) || "No Department"}</p>
                            {team.description && (
                              <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" data-testid={`badge-team-status-${team.id}`}>
                            {team.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTeam(team)}
                            data-testid={`button-edit-team-list-${team.id}`}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          {user?.role === 'leadership' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteTeam(team.id)}
                              data-testid={`button-delete-team-list-${team.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Hierarchy</CardTitle>
                {teamHierarchy.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleCollapseAll}
                    data-testid="button-toggle-collapse-all"
                  >
                    {isAllCollapsed ? (
                      <>
                        <ChevronsDownUp className="w-4 h-4 mr-2" />
                        Expand All
                      </>
                    ) : (
                      <>
                        <ChevronsUpDown className="w-4 h-4 mr-2" />
                        Collapse All
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {hierarchyLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-muted rounded-lg"></div>
                        <div>
                          <div className="w-32 h-4 bg-muted rounded mb-2"></div>
                          <div className="w-24 h-3 bg-muted rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : teamHierarchy.length === 0 ? (
                <div className="text-center py-8">
                  <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Team Hierarchy</h3>
                  <p className="text-muted-foreground mb-4">
                    Create teams and establish parent-child relationships to build your organizational structure.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {renderTeamHierarchy(teamHierarchy)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Team Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-muted rounded-full"></div>
                        <div>
                          <div className="w-32 h-4 bg-muted rounded mb-2"></div>
                          <div className="w-24 h-3 bg-muted rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {allUsers.map((user: User) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {user.firstName && user.lastName 
                              ? `${user.firstName[0]}${user.lastName[0]}` 
                              : user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.email}
                          </div>
                          <div className="text-sm text-muted-foreground capitalize">{user.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-sm">
                          Current Team: {user.teamId ? 
                            teams.find((t: Team) => t.id === user.teamId)?.name || "Unknown" : 
                            "None"
                          }
                        </div>
                        <Select
                          value={user.teamId || "none"}
                          onValueChange={(value) => handleAssignUserToTeam(user.id, value === "none" ? "" : value)}
                        >
                          <SelectTrigger className="w-48" data-testid={`select-user-team-${user.id}`}>
                            <SelectValue placeholder="Assign to team" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Team</SelectItem>
                            {teams.map((team: Team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Team Dialog */}
      <Dialog open={isEditTeamOpen} onOpenChange={setIsEditTeamOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateTeam)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter team name"
                        data-testid="input-edit-team-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter team description"
                        data-testid="input-edit-team-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-department">
                          <SelectValue placeholder="Select department (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Department</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="teamLeadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Lead (Required)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-team-lead">
                          <SelectValue placeholder="Select team lead" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allUsers.filter((user: User) => 
                          user.role === 'supervisor' || user.role === 'leadership'
                        ).map((user: User) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="parentTeamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Team (Optional)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-parent-team">
                          <SelectValue placeholder="Select parent team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Parent Team</SelectItem>
                        {teams.filter((team: Team) => team.id !== selectedTeam?.id).map((team: Team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditTeamOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateTeamMutation.isPending}
                  data-testid="button-update-team-submit"
                >
                  {updateTeamMutation.isPending ? "Updating..." : "Update Team"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}