import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertObjectiveResourceSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, DollarSign, Users, Wrench, GraduationCap, Package } from "lucide-react";
import { useState } from "react";

const resourceFormSchema = insertObjectiveResourceSchema.omit({
  objectiveId: true,
  objectiveType: true,
  requestedBy: true,
});

type ResourceForm = z.infer<typeof resourceFormSchema>;

const resourceIcons: Record<string, any> = {
  budget: DollarSign,
  personnel: Users,
  equipment: Wrench,
  training: GraduationCap,
  other: Package,
};

const statusColors: Record<string, string> = {
  requested: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  approved: "bg-blue-500/10 text-blue-700 border-blue-200",
  allocated: "bg-green-500/10 text-green-700 border-green-200",
  consumed: "bg-gray-500/10 text-gray-700 border-gray-200",
};

interface ObjectiveResourcePlannerProps {
  objectiveId: string;
  objectiveType: "company" | "team";
  canManage: boolean;
}

export function ObjectiveResourcePlanner({ objectiveId, objectiveType, canManage }: ObjectiveResourcePlannerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: resources, isLoading } = useQuery({
    queryKey: [`/api/objectives/${objectiveId}/resources?type=${objectiveType}`],
    enabled: !!objectiveId,
  });

  const resourceForm = useForm<ResourceForm>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      resourceType: "budget",
      description: "",
      quantity: undefined,
      estimatedCost: undefined,
      status: "requested",
      approvedBy: undefined,
      approvalNote: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ResourceForm) => {
      await apiRequest("POST", `/api/objectives/${objectiveId}/resources?type=${objectiveType}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/objectives/${objectiveId}/resources?type=${objectiveType}`] });
      setIsDialogOpen(false);
      resourceForm.reset();
      toast({
        title: "Resource added!",
        description: "Resource requirement has been added to the objective.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add resource requirement.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ResourceForm> }) => {
      await apiRequest("PUT", `/api/resources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/objectives/${objectiveId}/resources?type=${objectiveType}`] });
      setEditingResource(null);
      setIsDialogOpen(false);
      resourceForm.reset();
      toast({
        title: "Resource updated!",
        description: "Resource requirement has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update resource requirement.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/resources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/objectives/${objectiveId}/resources?type=${objectiveType}`] });
      toast({
        title: "Resource removed",
        description: "Resource requirement has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove resource requirement.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setEditingResource(null);
    resourceForm.reset({
      resourceType: "budget",
      description: "",
      quantity: undefined,
      estimatedCost: undefined,
      status: "requested",
      approvedBy: undefined,
      approvalNote: "",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (resource: any) => {
    setEditingResource(resource);
    resourceForm.reset({
      resourceType: resource.resourceType,
      description: resource.description,
      quantity: resource.quantity,
      estimatedCost: resource.estimatedCost,
      status: resource.status,
      approvedBy: resource.approvedBy,
      approvalNote: resource.approvalNote || "",
    });
    setIsDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Resource Planning</span>
            <Badge variant="outline">ISO 9001:2015 Clause 6.2</Badge>
          </div>
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={handleCreate} data-testid="button-add-resource">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingResource ? "Edit Resource" : "Add Resource Requirement"}</DialogTitle>
                </DialogHeader>
                <Form {...resourceForm}>
                  <form
                    onSubmit={resourceForm.handleSubmit((data) =>
                      editingResource
                        ? updateMutation.mutate({ id: editingResource.id, data })
                        : createMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={resourceForm.control}
                      name="resourceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resource Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-resource-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="budget">Budget</SelectItem>
                              <SelectItem value="personnel">Personnel</SelectItem>
                              <SelectItem value="equipment">Equipment</SelectItem>
                              <SelectItem value="training">Training</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={resourceForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the resource requirement..."
                              rows={3}
                              {...field}
                              data-testid="textarea-resource-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={resourceForm.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="e.g., 5"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                data-testid="input-resource-quantity"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={resourceForm.control}
                        name="estimatedCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Est. Cost £ (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="e.g., 1500.00"
                                {...field}
                                value={field.value ? (field.value / 100).toFixed(2) : ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null)
                                }
                                data-testid="input-resource-cost"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {editingResource && (
                      <>
                        <FormField
                          control={resourceForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? "requested"}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-resource-status">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="requested">Requested</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="allocated">Allocated</SelectItem>
                                  <SelectItem value="consumed">Consumed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={resourceForm.control}
                          name="approvalNote"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Approval Note (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Add notes about approval decision..."
                                  rows={2}
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="textarea-approval-note"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-submit-resource"
                      >
                        {createMutation.isPending || updateMutation.isPending
                          ? "Saving..."
                          : editingResource
                          ? "Update Resource"
                          : "Add Resource"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-muted rounded-lg p-4 animate-pulse">
                <div className="w-3/4 h-4 bg-muted-foreground/20 rounded mb-2"></div>
                <div className="w-1/2 h-3 bg-muted-foreground/20 rounded"></div>
              </div>
            ))}
          </div>
        ) : (resources as any[])?.length > 0 ? (
          <div className="space-y-3">
            {(resources as any[]).map((resource: any) => {
              const Icon = resourceIcons[resource.resourceType] || Package;
              return (
                <div
                  key={resource.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`resource-${resource.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <Badge variant="outline" className="capitalize" data-testid={`badge-resource-type-${resource.id}`}>
                          {resource.resourceType.replace(/_/g, " ")}
                        </Badge>
                        <Badge className={statusColors[resource.status]} data-testid={`badge-resource-status-${resource.id}`}>
                          {resource.status.charAt(0).toUpperCase() + resource.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm mb-1" data-testid={`text-resource-description-${resource.id}`}>
                        {resource.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {resource.quantity && (
                          <span data-testid={`text-resource-quantity-${resource.id}`}>Qty: {resource.quantity}</span>
                        )}
                        {resource.estimatedCost && (
                          <span data-testid={`text-resource-cost-${resource.id}`}>
                            Est. Cost: {formatCurrency(resource.estimatedCost)}
                          </span>
                        )}
                      </div>
                      {resource.approvalNote && (
                        <p className="text-xs text-muted-foreground mt-2 italic" data-testid={`text-approval-note-${resource.id}`}>
                          Note: {resource.approvalNote}
                        </p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(resource)}
                          data-testid={`button-edit-resource-${resource.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(resource.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-resource-${resource.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No Resources Planned</h3>
            <p className="text-muted-foreground mb-4">
              Add resource requirements to comply with ISO 9001:2015 Clause 6.2.
            </p>
            {canManage && (
              <Button onClick={handleCreate} size="sm" data-testid="button-add-first-resource">
                <Plus className="w-4 h-4 mr-2" />
                Add First Resource
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
