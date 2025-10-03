import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTeamObjectiveSchema } from "@shared/schema";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Target, 
  Plus, 
  Trash2, 
  Users,
  Building,
  Calendar,
  AlertCircle,
  Edit,
  User2
} from "lucide-react";

// Enhanced form schema with date validation and Phase 2 fields
const teamObjectiveSchema = insertTeamObjectiveSchema.omit({ supervisorId: true }).extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  ownerId: z.string().optional(),
  objectiveType: z.enum(["committed", "aspirational"]).optional(),
  evaluationMethod: z.string().optional(),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  }
);

type TeamObjectiveForm = z.infer<typeof teamObjectiveSchema>;

export default function TeamObjectives() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only allow supervisors and leadership to access this component
  if (user?.role !== 'supervisor' && user?.role !== 'leadership') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">Only supervisors and leadership can access team objectives.</p>
        </div>
      </div>
    );
  }

  const { data: companyObjectives, isLoading: companyObjectivesLoading } = useQuery({
    queryKey: ["/api/objectives"],
    retry: false,
  });

  const { data: teamObjectives, isLoading: teamObjectivesLoading } = useQuery({
    queryKey: ["/api/team-objectives"],
    retry: false,
  });

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["/api/teams"],
    retry: false,
  });

  // Query for users (leadership/supervisor) for owner dropdown
  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Filter users to only leadership and supervisors for owner selection
  const ownerOptions = (users || []).filter(u => u.role === 'leadership' || u.role === 'supervisor');

  // Form setup for creating objectives
  const teamObjectiveForm = useForm<TeamObjectiveForm>({
    resolver: zodResolver(teamObjectiveSchema),
    defaultValues: {
      parentCompanyObjectiveId: "",
      teamId: "",
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      ownerId: "",
      objectiveType: "committed",
      evaluationMethod: "",
    },
  });

  // Form setup for editing objectives
  const editTeamObjectiveForm = useForm<TeamObjectiveForm>({
    resolver: zodResolver(teamObjectiveSchema),
    defaultValues: {
      parentCompanyObjectiveId: "",
      teamId: "",
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      ownerId: "",
      objectiveType: "committed",
      evaluationMethod: "",
    },
  });

  // Create team objective mutation
  const createTeamObjectiveMutation = useMutation({
    mutationFn: async (data: TeamObjectiveForm) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };
      await apiRequest("POST", "/api/team-objectives", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-objectives"] });
      setIsCreateDialogOpen(false);
      teamObjectiveForm.reset();
      toast({
        title: "Team objective created!",
        description: "Team objective has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create team objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update team objective mutation
  const updateTeamObjectiveMutation = useMutation({
    mutationFn: async (data: TeamObjectiveForm) => {
      if (!editingObjective?.id) throw new Error("No objective to update");
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };
      await apiRequest("PUT", `/api/team-objectives/${editingObjective.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-objectives"] });
      setIsEditDialogOpen(false);
      setEditingObjective(null);
      editTeamObjectiveForm.reset();
      toast({
        title: "Team objective updated!",
        description: "Team objective has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update team objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete team objective mutation
  const deleteTeamObjectiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/team-objectives/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-objectives"] });
      toast({
        title: "Team objective deleted",
        description: "Team objective has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete team objective.",
        variant: "destructive",
      });
    },
  });

  // Handle editing an objective
  const handleEditObjective = (objective: any) => {
    setEditingObjective(objective);
    
    editTeamObjectiveForm.reset({
      parentCompanyObjectiveId: objective.parentCompanyObjectiveId || "",
      teamId: objective.teamId || "",
      title: objective.title || "",
      description: objective.description || "",
      startDate: objective.startDate ? new Date(objective.startDate).toISOString().split('T')[0] : "",
      endDate: objective.endDate ? new Date(objective.endDate).toISOString().split('T')[0] : "",
    });
    
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Objectives</h2>
          <p className="text-muted-foreground">Create and manage objectives for your team</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-team-objective">
              <Plus className="w-4 h-4 mr-2" />
              Create Team Objective
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Team Objective</DialogTitle>
            </DialogHeader>
            <Form {...teamObjectiveForm}>
              <form onSubmit={teamObjectiveForm.handleSubmit((data) => createTeamObjectiveMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={teamObjectiveForm.control}
                  name="parentCompanyObjectiveId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Objective</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-company-objective">
                            <SelectValue placeholder="Select company objective to support" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(companyObjectives as any[])?.map((objective: any) => (
                            <SelectItem key={objective.id} value={objective.id}>
                              {objective.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={teamObjectiveForm.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-team">
                            <SelectValue placeholder="Select a team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(teams as any[])?.map((team: any) => (
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
                <FormField
                  control={teamObjectiveForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Objective Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Deliver flawless service and proactive support to North Glasgow clients" {...field} data-testid="input-team-objective-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={teamObjectiveForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe how this team objective supports the company objective..." 
                          rows={3}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-team-objective-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={teamObjectiveForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            data-testid="input-team-objective-start-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={teamObjectiveForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            data-testid="input-team-objective-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Phase 2: Owner Selection */}
                <FormField
                  control={teamObjectiveForm.control}
                  name="ownerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-team-objective-owner">
                            <SelectValue placeholder="Select an owner..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No Owner</SelectItem>
                          {ownerOptions.map((owner) => (
                            <SelectItem key={owner.id} value={owner.id}>
                              {owner.firstName} {owner.lastName} ({owner.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phase 2: Objective Type */}
                <FormField
                  control={teamObjectiveForm.control}
                  name="objectiveType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Objective Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                          data-testid="radio-team-objective-type"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="committed" id="team-committed" />
                            <Label htmlFor="team-committed" className="font-normal cursor-pointer">
                              Committed - Must achieve target
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="aspirational" id="team-aspirational" />
                            <Label htmlFor="team-aspirational" className="font-normal cursor-pointer">
                              Aspirational - Stretch goal
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phase 2: Evaluation Method */}
                <FormField
                  control={teamObjectiveForm.control}
                  name="evaluationMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Evaluation Method (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe how results will be measured..." 
                          rows={3}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-team-objective-evaluation"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTeamObjectiveMutation.isPending} data-testid="button-submit-team-objective">
                    {createTeamObjectiveMutation.isPending ? "Creating..." : "Create Objective"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Team Objective Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Team Objective</DialogTitle>
          </DialogHeader>
          <Form {...editTeamObjectiveForm}>
            <form onSubmit={editTeamObjectiveForm.handleSubmit((data) => updateTeamObjectiveMutation.mutate(data))} className="space-y-4">
              <FormField
                control={editTeamObjectiveForm.control}
                name="parentCompanyObjectiveId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Objective</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-company-objective">
                          <SelectValue placeholder="Select company objective to support" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(companyObjectives as any[])?.map((objective: any) => (
                          <SelectItem key={objective.id} value={objective.id}>
                            {objective.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editTeamObjectiveForm.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-team">
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(teams as any[])?.map((team: any) => (
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
              <FormField
                control={editTeamObjectiveForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Objective Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Deliver flawless service and proactive support to North Glasgow clients" {...field} data-testid="input-edit-team-objective-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editTeamObjectiveForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe how this team objective supports the company objective..." 
                        rows={3}
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-edit-team-objective-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editTeamObjectiveForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          data-testid="input-edit-team-objective-start-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editTeamObjectiveForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          data-testid="input-edit-team-objective-end-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit-team-objective">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTeamObjectiveMutation.isPending} data-testid="button-submit-edit-team-objective">
                  {updateTeamObjectiveMutation.isPending ? "Updating..." : "Update Objective"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Team Objectives List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Your Team Objectives</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamObjectivesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-muted rounded-lg p-4 animate-pulse">
                  <div className="w-3/4 h-4 bg-muted-foreground/20 rounded mb-2"></div>
                  <div className="w-1/2 h-3 bg-muted-foreground/20 rounded"></div>
                </div>
              ))}
            </div>
          ) : (teamObjectives as any[])?.length > 0 ? (
            <div className="space-y-4">
              {(teamObjectives as any[]).map((objective: any) => (
                <div key={objective.id} className="border rounded-lg p-4" data-testid={`team-objective-${objective.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          <Building className="w-3 h-3 mr-1" />
                          {(teams as any[])?.find((t: any) => t.id === objective.teamId)?.name || 'Unknown Team'}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-lg" data-testid={`text-team-objective-title-${objective.id}`}>
                        {objective.title}
                      </h4>
                      {objective.description && (
                        <p className="text-muted-foreground text-sm mt-1" data-testid={`text-team-objective-description-${objective.id}`}>
                          {objective.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center" data-testid={`text-team-objective-start-${objective.id}`}>
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(objective.startDate).toLocaleDateString()}
                        </span>
                        <span>-</span>
                        <span data-testid={`text-team-objective-end-${objective.id}`}>
                          {new Date(objective.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditObjective(objective)}
                        data-testid={`button-edit-team-objective-${objective.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTeamObjectiveMutation.mutate(objective.id)}
                        disabled={deleteTeamObjectiveMutation.isPending}
                        data-testid={`button-delete-team-objective-${objective.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Team Objectives</h3>
              <p className="text-muted-foreground mb-4">Create your first team objective to cascade company goals to your team.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-team-objective">
                <Plus className="w-4 h-4 mr-2" />
                Create First Team Objective
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Objectives Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="w-5 h-5" />
            <span>Company Objectives Reference</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {companyObjectivesLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-muted rounded-lg p-4 animate-pulse">
                  <div className="w-3/4 h-4 bg-muted-foreground/20 rounded mb-2"></div>
                  <div className="w-1/2 h-3 bg-muted-foreground/20 rounded"></div>
                </div>
              ))}
            </div>
          ) : (companyObjectives as any[])?.length > 0 ? (
            <div className="space-y-3">
              {(companyObjectives as any[]).map((objective: any) => (
                <div key={objective.id} className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-r-lg" data-testid={`company-objective-ref-${objective.id}`}>
                  <h5 className="font-medium text-sm" data-testid={`text-company-objective-ref-title-${objective.id}`}>
                    {objective.title}
                  </h5>
                  {objective.description && (
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`text-company-objective-ref-description-${objective.id}`}>
                      {objective.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm">No company objectives available. Contact leadership to create company objectives first.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}