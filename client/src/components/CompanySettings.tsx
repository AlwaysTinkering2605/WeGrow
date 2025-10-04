import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCompanyObjectiveSchema, insertQualityPolicySchema } from "@shared/schema";
import { 
  Settings, 
  Users, 
  Target,
  Bell,
  Shield,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  Edit,
  FileCheck,
  CheckCircle2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

// Quality policy form schema
const qualityPolicyFormSchema = insertQualityPolicySchema.omit({ createdBy: true });
type QualityPolicyForm = z.infer<typeof qualityPolicyFormSchema>;

export default function CompanySettings() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: objectives, isLoading: objectivesLoading } = useQuery({
    queryKey: ["/api/objectives"],
    retry: false,
  });

  // Fetch quality policies
  const { data: qualityPolicies, isLoading: policiesLoading } = useQuery({
    queryKey: ["/api/quality-policies"],
    retry: false,
  });

  // Form setup
  const objectiveForm = useForm<ObjectiveForm>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: "",
      endDate: "",
    },
  });

  // Quality policy form setup
  const policyForm = useForm<QualityPolicyForm>({
    resolver: zodResolver(qualityPolicyFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "customer_satisfaction",
      isActive: true,
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
        description: "Failed to delete objective.",
        variant: "destructive",
      });
    },
  });

  // Quality policy mutations
  const createPolicyMutation = useMutation({
    mutationFn: async (data: QualityPolicyForm) => {
      await apiRequest("POST", "/api/quality-policies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-policies"] });
      setIsPolicyDialogOpen(false);
      policyForm.reset();
      toast({
        title: "Policy created!",
        description: "Quality policy has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create quality policy. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<QualityPolicyForm> }) => {
      await apiRequest("PUT", `/api/quality-policies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-policies"] });
      setEditingPolicy(null);
      setIsPolicyDialogOpen(false);
      policyForm.reset();
      toast({
        title: "Policy updated!",
        description: "Quality policy has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update quality policy.",
        variant: "destructive",
      });
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/quality-policies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-policies"] });
      toast({
        title: "Policy deleted",
        description: "Quality policy has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete quality policy.",
        variant: "destructive",
      });
    },
  });

  // Open edit dialog
  const handleEditPolicy = (policy: any) => {
    setEditingPolicy(policy);
    policyForm.reset({
      title: policy.title,
      description: policy.description,
      category: policy.category,
      isActive: policy.isActive,
    });
    setIsPolicyDialogOpen(true);
  };

  // Open create dialog
  const handleCreatePolicy = () => {
    setEditingPolicy(null);
    policyForm.reset({
      title: "",
      description: "",
      category: "customer_satisfaction",
      isActive: true,
    });
    setIsPolicyDialogOpen(true);
  };

  if (user?.role !== 'leadership') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">Only leadership can access company settings and configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Company Settings</h1>
        <p className="text-muted-foreground">Configure company-wide policies and objectives</p>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Company Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company-name">Company Name</Label>
              <Input id="company-name" defaultValue="Apex Cleaning Services" data-testid="input-company-name" />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" defaultValue="Commercial Cleaning" data-testid="input-industry" />
            </div>
          </div>
          
          <div>
            <Label htmlFor="mission">Mission Statement</Label>
            <Textarea 
              id="mission" 
              defaultValue="To provide exceptional commercial cleaning services while fostering employee growth and development."
              data-testid="textarea-mission"
            />
          </div>
          
          <div>
            <Label htmlFor="values">Company Values</Label>
            <Textarea 
              id="values" 
              defaultValue="Excellence, Teamwork, Innovation, Reliability"
              data-testid="textarea-values"
            />
          </div>
        </CardContent>
      </Card>

      {/* Company Objectives */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Company Objectives</span>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-objective">
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
          ) : (objectives as any[])?.length > 0 ? (
            <div className="space-y-4">
              {(objectives as any[]).map((objective: any) => (
                <div key={objective.id} className="border rounded-lg p-4" data-testid={`objective-${objective.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
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
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Company Objectives</h3>
              <p className="text-muted-foreground mb-4">Create your first company objective to align team goals.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-objective">
                <Plus className="w-4 h-4 mr-2" />
                Create First Objective
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Policies - ISO 9001:2015 Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileCheck className="w-5 h-5" />
              <span>Quality Policies</span>
              <Badge variant="outline" className="ml-2">ISO 9001:2015</Badge>
            </div>
            <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleCreatePolicy} data-testid="button-create-policy">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Policy
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingPolicy ? "Edit Quality Policy" : "Create Quality Policy"}</DialogTitle>
                </DialogHeader>
                <Form {...policyForm}>
                  <form 
                    onSubmit={policyForm.handleSubmit((data) => 
                      editingPolicy 
                        ? updatePolicyMutation.mutate({ id: editingPolicy.id, data })
                        : createPolicyMutation.mutate(data)
                    )} 
                    className="space-y-4"
                  >
                    <FormField
                      control={policyForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Customer Satisfaction Commitment" {...field} data-testid="input-policy-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={policyForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the quality policy and its requirements..." 
                              rows={4}
                              {...field}
                              data-testid="textarea-policy-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={policyForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-policy-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="customer_satisfaction">Customer Satisfaction</SelectItem>
                              <SelectItem value="conformity">Product/Service Conformity</SelectItem>
                              <SelectItem value="continual_improvement">Continual Improvement</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={policyForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Active Status</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Set policy as active and enforceable
                            </p>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value ?? true} 
                              onCheckedChange={field.onChange}
                              data-testid="switch-policy-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsPolicyDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createPolicyMutation.isPending || updatePolicyMutation.isPending}
                        data-testid="button-submit-policy"
                      >
                        {createPolicyMutation.isPending || updatePolicyMutation.isPending 
                          ? "Saving..." 
                          : editingPolicy ? "Update Policy" : "Create Policy"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {policiesLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-muted rounded-lg p-4 animate-pulse">
                  <div className="w-3/4 h-4 bg-muted-foreground/20 rounded mb-2"></div>
                  <div className="w-1/2 h-3 bg-muted-foreground/20 rounded"></div>
                </div>
              ))}
            </div>
          ) : (qualityPolicies as any[])?.length > 0 ? (
            <div className="space-y-4">
              {(qualityPolicies as any[]).map((policy: any) => (
                <div key={policy.id} className="border rounded-lg p-4" data-testid={`policy-${policy.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg" data-testid={`text-policy-title-${policy.id}`}>
                          {policy.title}
                        </h4>
                        <Badge variant={policy.isActive ? "default" : "secondary"} data-testid={`badge-policy-status-${policy.id}`}>
                          {policy.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" data-testid={`badge-policy-category-${policy.id}`}>
                          {policy.category.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </Badge>
                      </div>
                      {policy.description && (
                        <p className="text-muted-foreground text-sm" data-testid={`text-policy-description-${policy.id}`}>
                          {policy.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPolicy(policy)}
                        data-testid={`button-edit-policy-${policy.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deletePolicyMutation.mutate(policy.id)}
                        disabled={deletePolicyMutation.isPending}
                        data-testid={`button-delete-policy-${policy.id}`}
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
              <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Quality Policies</h3>
              <p className="text-muted-foreground mb-4">Create quality policies to meet ISO 9001:2015 requirements.</p>
              <Button onClick={handleCreatePolicy} data-testid="button-create-first-policy">
                <Plus className="w-4 h-4 mr-2" />
                Create First Policy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Performance & Goals</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Automatic Goal Reminders</Label>
              <p className="text-sm text-muted-foreground">Send reminders when goals are approaching deadlines</p>
            </div>
            <Switch defaultChecked data-testid="switch-goal-reminders" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Weekly Check-in Reminders</Label>
              <p className="text-sm text-muted-foreground">Remind employees to complete weekly check-ins</p>
            </div>
            <Switch defaultChecked data-testid="switch-checkin-reminders" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Public Recognition Feed</Label>
              <p className="text-sm text-muted-foreground">Allow employees to see public recognition across the company</p>
            </div>
            <Switch defaultChecked data-testid="switch-public-recognition" />
          </div>
        </CardContent>
      </Card>

      {/* Team Management Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Team Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="check-in-frequency">Check-in Frequency</Label>
              <Input id="check-in-frequency" defaultValue="Weekly" data-testid="input-checkin-frequency" />
            </div>
            <div>
              <Label htmlFor="goal-review-cycle">Goal Review Cycle</Label>
              <Input id="goal-review-cycle" defaultValue="Quarterly" data-testid="input-goal-review-cycle" />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Manager Approval Required</Label>
              <p className="text-sm text-muted-foreground">Require manager approval for goal creation and updates</p>
            </div>
            <Switch data-testid="switch-manager-approval" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Cross-Department Recognition</Label>
              <p className="text-sm text-muted-foreground">Allow recognition between different departments</p>
            </div>
            <Switch defaultChecked data-testid="switch-cross-department" />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Send email notifications for important updates</p>
            </div>
            <Switch defaultChecked data-testid="switch-email-notifications" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Real-time Dashboard Updates</Label>
              <p className="text-sm text-muted-foreground">Update dashboards in real-time as data changes</p>
            </div>
            <Switch defaultChecked data-testid="switch-realtime-updates" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Manager Escalation Alerts</Label>
              <p className="text-sm text-muted-foreground">Alert managers when team members need attention</p>
            </div>
            <Switch defaultChecked data-testid="switch-escalation-alerts" />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Security & Privacy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Require 2FA for leadership and supervisor accounts</p>
            </div>
            <Switch data-testid="switch-2fa-required" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Data Export Restrictions</Label>
              <p className="text-sm text-muted-foreground">Restrict data export to authorized users only</p>
            </div>
            <Switch defaultChecked data-testid="switch-export-restrictions" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Anonymous Recognition</Label>
              <p className="text-sm text-muted-foreground">Allow anonymous recognition submissions</p>
            </div>
            <Switch data-testid="switch-anonymous-recognition" />
          </div>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end">
        <Button className="flex items-center space-x-2" data-testid="button-save-settings">
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </Button>
      </div>
    </div>
  );
}