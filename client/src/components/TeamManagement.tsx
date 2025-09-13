import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Settings
} from "lucide-react";

interface Team {
  id: string;
  name: string;
  description?: string;
  departmentType: string;
  managerId?: string;
  parentTeamId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children?: Team[];
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  teamId?: string;
  managerId?: string;
  mobilePhone?: string;
  profilePhotoUrl?: string;
}

export default function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamFormData, setTeamFormData] = useState({
    name: "",
    description: "",
    departmentType: "operations",
    parentTeamId: ""
  });

  // Fetch teams data
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["/api/teams"],
    retry: false,
  });

  // Fetch team hierarchy
  const { data: teamHierarchy = [], isLoading: hierarchyLoading } = useQuery({
    queryKey: ["/api/teams/hierarchy"],
    retry: false,
  });

  // Fetch all users for assignment
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    retry: false,
  });

  // Fetch team members for current user (if supervisor)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["/api/team/members"],
    retry: false,
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: (teamData: any) => apiRequest("/api/teams", {
      method: "POST",
      body: JSON.stringify(teamData),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/hierarchy"] });
      setIsCreateTeamOpen(false);
      setTeamFormData({ name: "", description: "", departmentType: "operations", parentTeamId: "" });
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
    mutationFn: ({ id, ...updates }: any) => apiRequest(`/api/teams/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/hierarchy"] });
      setIsEditTeamOpen(false);
      setSelectedTeam(null);
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
    mutationFn: (teamId: string) => apiRequest(`/api/teams/${teamId}`, {
      method: "DELETE",
    }),
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
      apiRequest(`/api/users/${userId}/team`, {
        method: "PUT",
        body: JSON.stringify({ teamId }),
      }),
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

  const handleCreateTeam = () => {
    if (!teamFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Team name is required.",
        variant: "destructive",
      });
      return;
    }

    createTeamMutation.mutate(teamFormData);
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setTeamFormData({
      name: team.name,
      description: team.description || "",
      departmentType: team.departmentType,
      parentTeamId: team.parentTeamId || ""
    });
    setIsEditTeamOpen(true);
  };

  const handleUpdateTeam = () => {
    if (!selectedTeam || !teamFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Team name is required.",
        variant: "destructive",
      });
      return;
    }

    updateTeamMutation.mutate({
      id: selectedTeam.id,
      ...teamFormData
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

  const renderTeamHierarchy = (teams: Team[], level = 0) => {
    return teams.map((team) => (
      <div key={team.id} className={`${level > 0 ? 'ml-6 border-l pl-4' : ''} mb-4`}>
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold" data-testid={`text-team-name-${team.id}`}>{team.name}</h3>
              <p className="text-sm text-muted-foreground capitalize">{team.departmentType}</p>
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
        {team.children && team.children.length > 0 && (
          <div className="mt-2">
            {renderTeamHierarchy(team.children, level + 1)}
          </div>
        )}
      </div>
    ));
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
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  value={teamFormData.name}
                  onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                  placeholder="Enter team name"
                  data-testid="input-team-name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={teamFormData.description}
                  onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                  placeholder="Enter team description"
                  data-testid="input-team-description"
                />
              </div>
              <div>
                <Label htmlFor="departmentType">Department Type</Label>
                <Select
                  value={teamFormData.departmentType}
                  onValueChange={(value) => setTeamFormData({ ...teamFormData, departmentType: value })}
                >
                  <SelectTrigger data-testid="select-department-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="parentTeam">Parent Team (Optional)</Label>
                <Select
                  value={teamFormData.parentTeamId}
                  onValueChange={(value) => setTeamFormData({ ...teamFormData, parentTeamId: value })}
                >
                  <SelectTrigger data-testid="select-parent-team">
                    <SelectValue placeholder="Select parent team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Parent Team</SelectItem>
                    {teams.map((team: Team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateTeamOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTeam}
                  disabled={createTeamMutation.isPending}
                  data-testid="button-create-team-submit"
                >
                  {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                </Button>
              </div>
            </div>
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
                            <p className="text-sm text-muted-foreground capitalize">{team.departmentType}</p>
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
              <CardTitle>Team Hierarchy</CardTitle>
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
                          value={user.teamId || ""}
                          onValueChange={(value) => value && handleAssignUserToTeam(user.id, value)}
                        >
                          <SelectTrigger className="w-48" data-testid={`select-user-team-${user.id}`}>
                            <SelectValue placeholder="Assign to team" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No Team</SelectItem>
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
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Team Name</Label>
              <Input
                id="edit-name"
                value={teamFormData.name}
                onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                placeholder="Enter team name"
                data-testid="input-edit-team-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={teamFormData.description}
                onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                placeholder="Enter team description"
                data-testid="input-edit-team-description"
              />
            </div>
            <div>
              <Label htmlFor="edit-departmentType">Department Type</Label>
              <Select
                value={teamFormData.departmentType}
                onValueChange={(value) => setTeamFormData({ ...teamFormData, departmentType: value })}
              >
                <SelectTrigger data-testid="select-edit-department-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="leadership">Leadership</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-parentTeam">Parent Team (Optional)</Label>
              <Select
                value={teamFormData.parentTeamId}
                onValueChange={(value) => setTeamFormData({ ...teamFormData, parentTeamId: value })}
              >
                <SelectTrigger data-testid="select-edit-parent-team">
                  <SelectValue placeholder="Select parent team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Parent Team</SelectItem>
                  {teams.filter((team: Team) => team.id !== selectedTeam?.id).map((team: Team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditTeamOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateTeam}
                disabled={updateTeamMutation.isPending}
                data-testid="button-update-team-submit"
              >
                {updateTeamMutation.isPending ? "Updating..." : "Update Team"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}