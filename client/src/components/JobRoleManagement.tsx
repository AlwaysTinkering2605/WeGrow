import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Briefcase, Plus, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobRoleSchema, type JobRole, type InsertJobRole } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function JobRoleManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingJobRole, setEditingJobRole] = useState<JobRole | null>(null);
  const [deletingJobRole, setDeletingJobRole] = useState<JobRole | null>(null);

  // Fetch all job roles
  const { data: jobRoles = [], isLoading } = useQuery<JobRole[]>({
    queryKey: ['/api/job-roles'],
  });

  // Create job role mutation
  const createJobRoleMutation = useMutation({
    mutationFn: (data: InsertJobRole) =>
      apiRequest('/api/job-roles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-roles'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({ title: "Success", description: "Job role created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create job role", 
        variant: "destructive" 
      });
    },
  });

  // Update job role mutation
  const updateJobRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertJobRole }) =>
      apiRequest(`/api/job-roles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-roles'] });
      setEditingJobRole(null);
      editForm.reset();
      toast({ title: "Success", description: "Job role updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update job role", 
        variant: "destructive" 
      });
    },
  });

  // Delete job role mutation
  const deleteJobRoleMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/job-roles/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-roles'] });
      setDeletingJobRole(null);
      toast({ title: "Success", description: "Job role deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete job role. It may be assigned to users or have child roles.", 
        variant: "destructive" 
      });
    },
  });

  // Create form
  const createForm = useForm<InsertJobRole>({
    resolver: zodResolver(insertJobRoleSchema),
    defaultValues: {
      name: "",
      code: "",
      level: 1,
      department: "",
      description: "",
      reportsToJobRoleId: undefined,
      isActive: true,
    },
  });

  // Edit form
  const editForm = useForm<InsertJobRole>({
    resolver: zodResolver(insertJobRoleSchema),
    defaultValues: {
      name: "",
      code: "",
      level: 1,
      department: "",
      description: "",
      reportsToJobRoleId: undefined,
      isActive: true,
    },
  });

  // Handle opening edit dialog
  const handleEditJobRole = (jobRole: JobRole) => {
    setEditingJobRole(jobRole);
    editForm.reset({
      name: jobRole.name,
      code: jobRole.code,
      level: jobRole.level,
      department: jobRole.department || "",
      description: jobRole.description || "",
      reportsToJobRoleId: jobRole.reportsToJobRoleId || undefined,
      isActive: jobRole.isActive ?? true,
    });
  };

  // Handle create submit
  const handleCreateSubmit = (data: InsertJobRole) => {
    // Clean up empty strings
    const cleanedData = {
      ...data,
      department: data.department?.trim() || null,
      description: data.description?.trim() || null,
      reportsToJobRoleId: data.reportsToJobRoleId === 'none' ? null : data.reportsToJobRoleId,
    };
    createJobRoleMutation.mutate(cleanedData);
  };

  // Handle edit submit
  const handleEditSubmit = (data: InsertJobRole) => {
    if (!editingJobRole) return;
    const cleanedData = {
      ...data,
      department: data.department?.trim() || null,
      description: data.description?.trim() || null,
      reportsToJobRoleId: data.reportsToJobRoleId === 'none' ? null : data.reportsToJobRoleId,
    };
    updateJobRoleMutation.mutate({ id: editingJobRole.id, data: cleanedData });
  };

  // Get job role name for display
  const getJobRoleName = (jobRoleId?: string | null) => {
    if (!jobRoleId) return "None";
    const role = jobRoles.find(jr => jr.id === jobRoleId);
    return role ? `${role.name} (Level ${role.level})` : "Unknown";
  };

  // Get level badge color
  const getLevelBadgeVariant = (level: number) => {
    if (level >= 4) return "default";
    if (level >= 3) return "secondary";
    return "outline";
  };

  // Filter job roles based on search
  const filteredJobRoles = jobRoles.filter(role => {
    const matchesSearch = 
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (role.department && role.department.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 bg-primary rounded-lg animate-pulse mx-auto"></div>
          <p className="text-muted-foreground">Loading job roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Role Management</h1>
          <p className="text-muted-foreground">
            Create and manage organizational job roles and hierarchy
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Briefcase className="h-6 w-6 text-muted-foreground" />
          <span className="text-2xl font-bold">{jobRoles.length}</span>
        </div>
      </div>

      {/* Search and Create */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search-job-roles"
            placeholder="Search job roles by name, code, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          data-testid="button-create-job-role"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Job Role
        </Button>
      </div>

      {/* Job Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Job Roles</CardTitle>
          <CardDescription>
            All organizational job roles with hierarchy and assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Reports To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {searchTerm ? "No job roles found matching your search" : "No job roles created yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobRoles.map((role) => (
                  <TableRow key={role.id} data-testid={`row-job-role-${role.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${role.id}`}>
                      {role.name}
                    </TableCell>
                    <TableCell data-testid={`text-code-${role.id}`}>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{role.code}</code>
                    </TableCell>
                    <TableCell data-testid={`badge-level-${role.id}`}>
                      <Badge variant={getLevelBadgeVariant(role.level)}>
                        Level {role.level}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-department-${role.id}`}>
                      {role.department || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell data-testid={`text-reports-to-${role.id}`}>
                      {role.reportsToJobRoleId ? (
                        getJobRoleName(role.reportsToJobRoleId)
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell data-testid={`badge-status-${role.id}`}>
                      <Badge variant={role.isActive ? "default" : "secondary"}>
                        {role.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          data-testid={`button-edit-${role.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditJobRole(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          data-testid={`button-delete-${role.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingJobRole(role)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Job Role</DialogTitle>
            <DialogDescription>
              Add a new job role to your organizational structure
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-create-name"
                        placeholder="e.g., Director, Supervisor, Team Leader" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-create-code"
                        placeholder="e.g., director, supervisor, team_leader" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level *</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-create-level">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Level 1 (Entry)</SelectItem>
                          <SelectItem value="2">Level 2</SelectItem>
                          <SelectItem value="3">Level 3</SelectItem>
                          <SelectItem value="4">Level 4</SelectItem>
                          <SelectItem value="5">Level 5 (Director)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input 
                          data-testid="input-create-department"
                          placeholder="e.g., Operations, Quality" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="reportsToJobRoleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reports To</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-create-reports-to">
                          <SelectValue placeholder="Select parent role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (Top Level)</SelectItem>
                        {jobRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name} (Level {role.level})
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        data-testid="input-create-description"
                        placeholder="Brief description of this role's responsibilities..."
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  data-testid="button-cancel-create"
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  data-testid="button-submit-create"
                  type="submit"
                  disabled={createJobRoleMutation.isPending}
                >
                  {createJobRoleMutation.isPending ? "Creating..." : "Create Job Role"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingJobRole} onOpenChange={(open) => !open && setEditingJobRole(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Role</DialogTitle>
            <DialogDescription>
              Update job role details and hierarchy
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-edit-name"
                        placeholder="e.g., Director, Supervisor, Team Leader" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-edit-code"
                        placeholder="e.g., director, supervisor, team_leader" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level *</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-level">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Level 1 (Entry)</SelectItem>
                          <SelectItem value="2">Level 2</SelectItem>
                          <SelectItem value="3">Level 3</SelectItem>
                          <SelectItem value="4">Level 4</SelectItem>
                          <SelectItem value="5">Level 5 (Director)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input 
                          data-testid="input-edit-department"
                          placeholder="e.g., Operations, Quality" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="reportsToJobRoleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reports To</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-reports-to">
                          <SelectValue placeholder="Select parent role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (Top Level)</SelectItem>
                        {jobRoles
                          .filter(role => role.id !== editingJobRole?.id)
                          .map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name} (Level {role.level})
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        data-testid="input-edit-description"
                        placeholder="Brief description of this role's responsibilities..."
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  data-testid="button-cancel-edit"
                  type="button"
                  variant="outline"
                  onClick={() => setEditingJobRole(null)}
                >
                  Cancel
                </Button>
                <Button
                  data-testid="button-submit-edit"
                  type="submit"
                  disabled={updateJobRoleMutation.isPending}
                >
                  {updateJobRoleMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingJobRole} onOpenChange={(open) => !open && setDeletingJobRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingJobRole?.name}</strong>? 
              This action cannot be undone. Users assigned to this role will have their job role cleared,
              and any roles reporting to this one will have their parent reference removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => deletingJobRole && deleteJobRoleMutation.mutate(deletingJobRole.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteJobRoleMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
