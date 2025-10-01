import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Edit, Users, Search, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "operative" | "supervisor" | "leadership";
  jobRole?: string;
  jobRoleId?: string | null;
  managerId?: string | null;
  employeeId?: string;
  teamName?: string;
  jobTitle?: string;
  startDate?: string;
}

interface JobRole {
  id: string;
  name: string;
  code: string;
  level: number;
  department?: string | null;
}

const jobRoleOptions = [
  { value: "cleaner_contract", label: "Cleaner (Contract)" },
  { value: "cleaner_specialised", label: "Cleaner (Specialised)" },
  { value: "team_leader_contract", label: "Team Leader (Contract)" },
  { value: "team_leader_specialised", label: "Team Leader (Specialised)" },
  { value: "mobile_cleaner", label: "Mobile Cleaner" },
  { value: "supervisor", label: "Supervisor" },
  { value: "manager", label: "Manager" },
  { value: "director", label: "Director" },
];

const roleOptions = [
  { value: "operative", label: "Operative" },
  { value: "supervisor", label: "Supervisor" },
  { value: "leadership", label: "Leadership" },
];

export default function UserManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterJobRole, setFilterJobRole] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Fetch job roles
  const { data: jobRoles = [] } = useQuery<JobRole[]>({
    queryKey: ['/api/job-roles'],
  });

  // Get potential managers (supervisors, managers, directors)
  const potentialManagers = users.filter(u => 
    u.role === 'supervisor' || u.role === 'leadership'
  );

  // Update user mutation (administrative fields like role, jobRole, employeeId)
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<User> }) =>
      apiRequest(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      toast({ title: "Success", description: "User updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update user", 
        variant: "destructive" 
      });
    },
  });

  // Update user assignments (jobRoleId, managerId)
  const updateAssignmentsMutation = useMutation({
    mutationFn: ({ userId, jobRoleId, managerId }: { 
      userId: string; 
      jobRoleId?: string | null; 
      managerId?: string | null; 
    }) =>
      apiRequest(`/api/users/${userId}/assignments`, {
        method: 'PATCH',
        body: JSON.stringify({ jobRoleId, managerId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "Success", description: "User assignments updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update assignments", 
        variant: "destructive" 
      });
    },
  });

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.employeeId && user.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesJobRole = filterJobRole === "all" || user.jobRole === filterJobRole;
    
    return matchesSearch && matchesRole && matchesJobRole;
  });

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      // Only update assignments (jobRoleId, managerId)
      // System role, employee ID, job title, etc. are managed elsewhere or deprecated
      await updateAssignmentsMutation.mutateAsync({
        userId: editingUser.id,
        jobRoleId: editingUser.jobRoleId === 'none' ? null : editingUser.jobRoleId,
        managerId: editingUser.managerId === 'none' ? null : editingUser.managerId,
      });

      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  const getJobRoleLabel = (jobRole?: string) => {
    const option = jobRoleOptions.find(opt => opt.value === jobRole);
    return option ? option.label : jobRole || 'Not assigned';
  };

  // Get job role name from normalized job_roles table
  const getJobRoleName = (jobRoleId?: string | null) => {
    if (!jobRoleId) return 'Not assigned';
    const role = jobRoles.find(jr => jr.id === jobRoleId);
    return role ? `${role.name} (Level ${role.level})` : 'Not assigned';
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'leadership': return 'default';
      case 'supervisor': return 'secondary';
      case 'operative': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 bg-primary rounded-lg animate-pulse mx-auto"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user roles, job assignments, and employee information
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {filteredUsers.length} of {users.length} users
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-users"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="role-filter">Filter by Role</Label>
              <Select onValueChange={setFilterRole} value={filterRole}>
                <SelectTrigger data-testid="select-filter-role">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roleOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="job-role-filter">Filter by Job Role</Label>
              <Select onValueChange={setFilterJobRole} value={filterJobRole}>
                <SelectTrigger data-testid="select-filter-job-role">
                  <SelectValue placeholder="All job roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Job Roles</SelectItem>
                  {jobRoleOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setFilterRole("all");
                  setFilterJobRole("all");
                }}
                data-testid="button-clear-filters"
              >
                <Filter className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Click the edit button to modify user roles and job assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Job Role</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {user.employeeId || 'Not assigned'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm" data-testid={`text-job-role-${user.id}`}>
                      {getJobRoleName(user.jobRoleId)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{user.jobTitle || 'Not assigned'}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      data-testid={`button-edit-user-${user.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No users found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User Assignments</DialogTitle>
            <DialogDescription>
              Assign job role and manager for this user
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <p className="text-sm font-medium" data-testid="text-editing-user-name">
                    {editingUser.firstName} {editingUser.lastName}
                  </p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-editing-user-email">
                    {editingUser.email}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-sm">Organizational Assignments</h4>
                
                <div>
                  <Label htmlFor="user-job-role-id">Assigned Job Role</Label>
                  <Select 
                    onValueChange={(value) => setEditingUser({...editingUser, jobRoleId: value})} 
                    value={editingUser.jobRoleId || "none"}
                  >
                    <SelectTrigger data-testid="select-user-job-role-id">
                      <SelectValue placeholder="Select job role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not assigned</SelectItem>
                      {jobRoles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name} (Level {role.level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="user-manager">Assigned Manager</Label>
                  <Select 
                    onValueChange={(value) => setEditingUser({...editingUser, managerId: value})} 
                    value={editingUser.managerId || "none"}
                  >
                    <SelectTrigger data-testid="select-user-manager">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No manager</SelectItem>
                      {potentialManagers
                        .filter(m => m.id !== editingUser.id)
                        .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                        .map(manager => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.firstName} {manager.lastName} ({manager.role})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateUser}
                  disabled={updateUserMutation.isPending}
                  data-testid="button-save-user"
                >
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}