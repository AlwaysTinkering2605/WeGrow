import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Edit,
  Trash2,
  Target,
  TrendingUp,
  FileWarning,
} from "lucide-react";

type CorrectiveAction = {
  id: string;
  linkedKeyResultId: string | null;
  linkedObjectiveId: string | null;
  title: string;
  description: string;
  rootCause: string;
  fiveWhysAnalysis: any;
  proposedAction: string;
  assignedTo: string;
  targetCompletionDate: Date;
  actualCompletionDate: Date | null;
  status: "open" | "in_progress" | "completed" | "verified" | "closed";
  effectiveness: "not_evaluated" | "effective" | "partially_effective" | "ineffective" | null;
  effectivenessNote: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date | null;
};

const correctiveActionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  rootCause: z.string().min(1, "Root cause is required"),
  proposedAction: z.string().min(1, "Proposed action is required"),
  assignedTo: z.string().min(1, "Assignee is required"),
  targetDate: z.string().min(1, "Target date is required"),
  fiveWhysAnalysis: z.string().optional(),
  objectiveId: z.string().optional(),
  nonconformityId: z.string().optional(),
});

type CorrectiveActionForm = z.infer<typeof correctiveActionSchema>;

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  verified: "Verified",
  closed: "Closed",
};

const statusColors: Record<string, string> = {
  open: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  verified: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  closed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const effectivenessLabels: Record<string, string> = {
  not_evaluated: "Not Evaluated",
  effective: "Effective",
  partially_effective: "Partially Effective",
  ineffective: "Ineffective",
};

const effectivenessColors: Record<string, string> = {
  not_evaluated: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  effective: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  partially_effective: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ineffective: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function CorrectiveActionsBoard() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: actions = [], isLoading } = useQuery<CorrectiveAction[]>({
    queryKey: ["/api/corrective-actions"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const createForm = useForm<CorrectiveActionForm>({
    resolver: zodResolver(correctiveActionSchema),
    defaultValues: {
      title: "",
      description: "",
      rootCause: "",
      proposedAction: "",
      assignedTo: "",
      targetDate: "",
      fiveWhysAnalysis: "",
      objectiveId: "",
      nonconformityId: "",
    },
  });

  const editForm = useForm<CorrectiveActionForm>({
    resolver: zodResolver(correctiveActionSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: CorrectiveActionForm) => {
      const fiveWhys = data.fiveWhysAnalysis
        ? data.fiveWhysAnalysis.split("\n").filter((line) => line.trim()).map((why, index) => ({
            why: index + 1,
            question: why.trim(),
          }))
        : [];

      return await apiRequest("/api/corrective-actions", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          rootCause: data.rootCause,
          proposedAction: data.proposedAction,
          assignedTo: data.assignedTo,
          targetDate: data.targetDate,
          fiveWhysAnalysis: fiveWhys,
          linkedObjectiveId: data.objectiveId || null,
          linkedKeyResultId: data.nonconformityId || null,
          status: "open",
          effectiveness: "not_evaluated",
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/corrective-actions"] });
      toast({
        title: "Success",
        description: "Corrective action created successfully",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create corrective action",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest(`/api/corrective-actions/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/corrective-actions"] });
      toast({
        title: "Success",
        description: "Status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CorrectiveActionForm }) => {
      const fiveWhys = data.fiveWhysAnalysis
        ? data.fiveWhysAnalysis.split("\n").filter((line) => line.trim()).map((why, index) => ({
            why: index + 1,
            question: why.trim(),
          }))
        : [];

      return await apiRequest(`/api/corrective-actions/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          rootCause: data.rootCause,
          proposedAction: data.proposedAction,
          assignedTo: data.assignedTo,
          targetDate: data.targetDate,
          fiveWhysAnalysis: fiveWhys,
          objectiveId: data.objectiveId || null,
          nonconformityId: data.nonconformityId || null,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/corrective-actions"] });
      toast({
        title: "Success",
        description: "Corrective action updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update corrective action",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/corrective-actions/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/corrective-actions"] });
      toast({
        title: "Success",
        description: "Corrective action deleted successfully",
      });
      setIsViewDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete corrective action",
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = (data: CorrectiveActionForm) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: CorrectiveActionForm) => {
    if (selectedAction) {
      updateMutation.mutate({ id: selectedAction.id, data });
    }
  };

  const openEditDialog = (action: CorrectiveAction) => {
    setSelectedAction(action);
    const fiveWhysText = Array.isArray(action.fiveWhysAnalysis)
      ? action.fiveWhysAnalysis.map((item: any) => item.question).join("\n")
      : "";
    
    editForm.reset({
      title: action.title,
      description: action.description,
      rootCause: action.rootCause,
      proposedAction: action.proposedAction,
      assignedTo: action.assignedTo,
      targetDate: action.targetCompletionDate ? format(new Date(action.targetCompletionDate), "yyyy-MM-dd") : "",
      fiveWhysAnalysis: fiveWhysText,
      objectiveId: action.linkedObjectiveId || "",
      nonconformityId: action.linkedKeyResultId || "",
    });
    setIsEditDialogOpen(true);
  };

  const statuses = ["open", "in_progress", "completed", "verified", "closed"];

  const groupedActions = statuses.reduce((acc, status) => {
    acc[status] = actions.filter((action) => action.status === status);
    return acc;
  }, {} as Record<string, CorrectiveAction[]>);

  if (isLoading) {
    return <div className="text-center py-8">Loading corrective actions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Corrective Actions
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ISO 9001:2015 Clause 10.2 - Nonconformity and Corrective Action
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-action">
              <Plus className="h-4 w-4 mr-2" />
              Create Action
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Corrective Action</DialogTitle>
              <DialogDescription>
                Document and track corrective actions for nonconformities
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Brief title for the corrective action" data-testid="input-title" />
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
                        <Textarea {...field} placeholder="Detailed description of the issue" rows={3} data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="rootCause"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Root Cause</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Identified root cause of the issue" rows={2} data-testid="input-root-cause" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="fiveWhysAnalysis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>5 Whys Analysis (Optional)</FormLabel>
                      <FormDescription>
                        Enter each "why" question on a new line
                      </FormDescription>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Why did this happen?&#10;Why...?&#10;Why...?" 
                          rows={5}
                          data-testid="input-five-whys"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="proposedAction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposed Action</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Actions to be taken to prevent recurrence" rows={3} data-testid="input-proposed-action" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-assigned-to">
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.firstName} {u.lastName} ({u.email})
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
                    name="targetDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-target-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                    {createMutation.isPending ? "Creating..." : "Create Action"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statuses.map((status) => (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                {statusLabels[status]}
              </h3>
              <Badge className={statusColors[status]} data-testid={`badge-${status}-count`}>
                {groupedActions[status]?.length || 0}
              </Badge>
            </div>
            <div className="space-y-2">
              {groupedActions[status]?.map((action) => (
                <Card
                  key={action.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedAction(action);
                    setIsViewDialogOpen(true);
                  }}
                  data-testid={`card-action-${action.id}`}
                >
                  <CardContent className="p-3 space-y-2">
                    <h4 className="font-medium text-sm line-clamp-2" data-testid={`text-action-title-${action.id}`}>
                      {action.title}
                    </h4>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(action.targetCompletionDate), "MMM dd, yyyy")}
                    </div>
                    {action.effectiveness && action.effectiveness !== "not_evaluated" && (
                      <Badge className={`text-xs ${effectivenessColors[action.effectiveness]}`}>
                        {effectivenessLabels[action.effectiveness]}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAction?.title}</DialogTitle>
            <DialogDescription>Corrective Action Details</DialogDescription>
          </DialogHeader>
          {selectedAction && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={statusColors[selectedAction.status]}>
                  {statusLabels[selectedAction.status]}
                </Badge>
                {selectedAction.effectiveness && selectedAction.effectiveness !== "not_evaluated" && (
                  <Badge className={effectivenessColors[selectedAction.effectiveness]}>
                    {effectivenessLabels[selectedAction.effectiveness]}
                  </Badge>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-1">Description</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedAction.description}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Root Cause</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedAction.rootCause}</p>
              </div>

              {selectedAction.fiveWhysAnalysis && Array.isArray(selectedAction.fiveWhysAnalysis) && selectedAction.fiveWhysAnalysis.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-1">5 Whys Analysis</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    {selectedAction.fiveWhysAnalysis.map((item: any, index: number) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                        {item.question}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-1">Proposed Action</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedAction.proposedAction}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Assigned To</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedAction.assignedTo}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Target Date</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(selectedAction.targetCompletionDate), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>

              {selectedAction.actualCompletionDate && (
                <div>
                  <h4 className="font-semibold mb-1">Completion Date</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(selectedAction.actualCompletionDate), "MMM dd, yyyy")}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Select
                  value={selectedAction.status}
                  onValueChange={(value) =>
                    updateStatusMutation.mutate({ id: selectedAction.id, status: value })
                  }
                >
                  <SelectTrigger className="w-[180px]" data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => openEditDialog(selectedAction)}
                  data-testid="button-edit-action"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(selectedAction.id)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-action"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Corrective Action</DialogTitle>
            <DialogDescription>Update corrective action details</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Brief title for the corrective action" data-testid="input-edit-title" />
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
                      <Textarea {...field} placeholder="Detailed description of the issue" rows={3} data-testid="input-edit-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="rootCause"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Root Cause</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Identified root cause of the issue" rows={2} data-testid="input-edit-root-cause" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="fiveWhysAnalysis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>5 Whys Analysis (Optional)</FormLabel>
                    <FormDescription>Enter each "why" question on a new line</FormDescription>
                    <FormControl>
                      <Textarea {...field} placeholder="Why did this happen?&#10;Why...?&#10;Why...?" rows={5} data-testid="input-edit-five-whys" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="proposedAction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposed Action</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Actions to be taken to prevent recurrence" rows={3} data-testid="input-edit-proposed-action" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-assigned-to">
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.firstName} {u.lastName} ({u.email})
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
                  name="targetDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-edit-target-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  {updateMutation.isPending ? "Updating..." : "Update Action"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
