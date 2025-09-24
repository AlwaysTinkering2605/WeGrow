import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCompanyObjectiveSchema } from "@shared/schema";
import { 
  Target,
  Plus,
  Trash2,
  Edit,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  AlertCircle
} from "lucide-react";

// Enhanced form schema with date validation
const objectiveSchema = insertCompanyObjectiveSchema.omit({ createdBy: true }).extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  }
);

type ObjectiveForm = z.infer<typeof objectiveSchema>;

export default function CompanyObjectives() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<any>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only allow leadership to access this component
  if (user?.role !== 'leadership') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">Only leadership can access company objectives.</p>
        </div>
      </div>
    );
  }

  const { data: objectives, isLoading: objectivesLoading } = useQuery({
    queryKey: ["/api/objectives"],
    retry: false,
  });

  // Form setup for creating objectives
  const objectiveForm = useForm<ObjectiveForm>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: "",
      endDate: "",
    },
  });

  // Form setup for editing objectives
  const editObjectiveForm = useForm<ObjectiveForm>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: "",
      endDate: "",
    },
  });

  // Create objective mutation
  const createObjectiveMutation = useMutation({
    mutationFn: async (data: ObjectiveForm) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };
      await apiRequest("POST", "/api/objectives", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
      setIsCreateDialogOpen(false);
      objectiveForm.reset();
      toast({
        title: "Objective created!",
        description: "Company objective has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update objective mutation
  const updateObjectiveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ObjectiveForm }) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };
      await apiRequest("PUT", `/api/objectives/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
      setIsEditDialogOpen(false);
      setEditingObjective(null);
      editObjectiveForm.reset();
      toast({
        title: "Objective updated!",
        description: "Company objective has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete objective mutation
  const deleteObjectiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/objectives/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
      toast({
        title: "Objective deleted",
        description: "Company objective has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle edit objective
  const handleEditObjective = (objective: any) => {
    setEditingObjective(objective);
    editObjectiveForm.reset({
      title: objective.title,
      description: objective.description || "",
      startDate: new Date(objective.startDate).toISOString().split('T')[0],
      endDate: new Date(objective.endDate).toISOString().split('T')[0],
    });
    setIsEditDialogOpen(true);
  };

  // Filter objectives based on current filters
  const filteredObjectives = useMemo(() => {
    if (!objectives) return [];
    
    return (objectives as any[]).filter((objective: any) => {
      // Search filter
      if (searchFilter && !objective.title.toLowerCase().includes(searchFilter.toLowerCase()) &&
          !(objective.description || "").toLowerCase().includes(searchFilter.toLowerCase())) {
        return false;
      }

      // Status filter (active/inactive based on dates)
      if (statusFilter !== "all") {
        const now = new Date();
        const startDate = new Date(objective.startDate);
        const endDate = new Date(objective.endDate);
        const isActive = now >= startDate && now <= endDate;
        
        if (statusFilter === "active" && !isActive) return false;
        if (statusFilter === "inactive" && isActive) return false;
        if (statusFilter === "upcoming" && startDate <= now) return false;
        if (statusFilter === "completed" && endDate > now) return false;
      }

      // Date filter
      if (dateFilter !== "all") {
        const now = new Date();
        const startDate = new Date(objective.startDate);
        const endDate = new Date(objective.endDate);
        
        if (dateFilter === "this_month") {
          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();
          if (!(startDate.getMonth() === thisMonth && startDate.getFullYear() === thisYear) &&
              !(endDate.getMonth() === thisMonth && endDate.getFullYear() === thisYear)) {
            return false;
          }
        }
        if (dateFilter === "this_quarter") {
          const thisQuarter = Math.floor(now.getMonth() / 3);
          const thisYear = now.getFullYear();
          const objStartQuarter = Math.floor(startDate.getMonth() / 3);
          const objEndQuarter = Math.floor(endDate.getMonth() / 3);
          if (!(objStartQuarter === thisQuarter && startDate.getFullYear() === thisYear) &&
              !(objEndQuarter === thisQuarter && endDate.getFullYear() === thisYear)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [objectives, searchFilter, statusFilter, dateFilter]);

  // Get status of objective
  const getObjectiveStatus = (objective: any) => {
    const now = new Date();
    const startDate = new Date(objective.startDate);
    const endDate = new Date(objective.endDate);
    
    if (now < startDate) return { status: "upcoming", color: "text-blue-600", icon: Calendar };
    if (now > endDate) return { status: "completed", color: "text-green-600", icon: CheckCircle };
    return { status: "active", color: "text-orange-600", icon: Target };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company Objectives</h1>
          <p className="text-muted-foreground">Manage strategic company-wide objectives and goals</p>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filter Objectives</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search objectives..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-objectives"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time Period</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger data-testid="select-date-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" data-testid="button-create-objective">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Objective
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Company Objective</DialogTitle>
                  </DialogHeader>
                  <Form {...objectiveForm}>
                    <form onSubmit={objectiveForm.handleSubmit((data) => createObjectiveMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={objectiveForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Objective Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Become the most reliable cleaning partner in Glasgow" {...field} data-testid="input-objective-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={objectiveForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the objective and its strategic importance..." 
                                rows={3}
                                {...field}
                                value={field.value || ""}
                                data-testid="textarea-objective-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={objectiveForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field}
                                  data-testid="input-objective-start-date"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={objectiveForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field}
                                  data-testid="input-objective-end-date"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createObjectiveMutation.isPending} data-testid="button-submit-objective">
                          {createObjectiveMutation.isPending ? "Creating..." : "Create Objective"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Objective Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Company Objective</DialogTitle>
          </DialogHeader>
          <Form {...editObjectiveForm}>
            <form onSubmit={editObjectiveForm.handleSubmit((data) => {
              if (editingObjective) {
                updateObjectiveMutation.mutate({ id: editingObjective.id, data });
              }
            })} className="space-y-4">
              <FormField
                control={editObjectiveForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objective Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Become the most reliable cleaning partner in Glasgow" {...field} data-testid="input-edit-objective-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editObjectiveForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the objective and its strategic importance..." 
                        rows={3}
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-edit-objective-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={editObjectiveForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          data-testid="input-edit-objective-start-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editObjectiveForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          data-testid="input-edit-objective-end-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingObjective(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateObjectiveMutation.isPending} data-testid="button-update-objective">
                  {updateObjectiveMutation.isPending ? "Updating..." : "Update Objective"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Objectives List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Objectives ({filteredObjectives.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {objectivesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-muted rounded-lg p-4 animate-pulse">
                  <div className="w-3/4 h-4 bg-muted-foreground/20 rounded mb-2"></div>
                  <div className="w-1/2 h-3 bg-muted-foreground/20 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredObjectives.length > 0 ? (
            <div className="space-y-4">
              {filteredObjectives.map((objective: any) => {
                const { status, color, icon: StatusIcon } = getObjectiveStatus(objective);
                
                return (
                  <div key={objective.id} className="border rounded-lg p-4" data-testid={`objective-${objective.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <StatusIcon className={`w-4 h-4 ${color}`} />
                          <span className={`text-xs font-medium uppercase tracking-wide ${color}`}>
                            {status}
                          </span>
                        </div>
                        <h4 className="font-semibold text-lg" data-testid={`text-objective-title-${objective.id}`}>
                          {objective.title}
                        </h4>
                        {objective.description && (
                          <p className="text-muted-foreground text-sm mt-1" data-testid={`text-objective-description-${objective.id}`}>
                            {objective.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <span data-testid={`text-objective-start-${objective.id}`}>
                            Start: {new Date(objective.startDate).toLocaleDateString()}
                          </span>
                          <span data-testid={`text-objective-end-${objective.id}`}>
                            End: {new Date(objective.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditObjective(objective)}
                          data-testid={`button-edit-objective-${objective.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteObjectiveMutation.mutate(objective.id)}
                          disabled={deleteObjectiveMutation.isPending}
                          data-testid={`button-delete-objective-${objective.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">
                {searchFilter || statusFilter !== "all" || dateFilter !== "all" 
                  ? "No objectives match your filters" 
                  : "No Company Objectives"
                }
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchFilter || statusFilter !== "all" || dateFilter !== "all"
                  ? "Try adjusting your filters to see more objectives."
                  : "Create your first company objective to align team goals."
                }
              </p>
              {(!searchFilter && statusFilter === "all" && dateFilter === "all") && (
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-objective">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Objective
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}