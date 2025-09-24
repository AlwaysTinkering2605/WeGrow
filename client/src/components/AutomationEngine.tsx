import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Play, Pause, Zap, Clock, Target, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form schemas
const automationRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  triggerEvent: z.enum(["user_created", "user_updated", "role_changed", "team_changed", "scheduled"]),
  conditions: z.record(z.any()).optional(),
  actions: z.record(z.any()).optional(),
  scheduleConfig: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
});

const triggerTestSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  triggerEvent: z.string().min(1, "Trigger event is required"),
});

type AutomationRuleFormData = z.infer<typeof automationRuleSchema>;
type TriggerTestFormData = z.infer<typeof triggerTestSchema>;

export default function AutomationEngine() {
  const { toast } = useToast();
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  // Automation Rules queries
  const { data: automationRules = [], isLoading } = useQuery({
    queryKey: ['/api/automation-rules'],
  });

  const { data: learningPaths = [] } = useQuery({
    queryKey: ['/api/learning-paths'],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  // Forms
  const ruleForm = useForm<AutomationRuleFormData>({
    resolver: zodResolver(automationRuleSchema),
    defaultValues: {
      name: "",
      description: "",
      triggerEvent: "user_created",
      conditions: {},
      actions: {},
      scheduleConfig: {},
      isActive: true,
    },
  });

  const testForm = useForm<TriggerTestFormData>({
    resolver: zodResolver(triggerTestSchema),
    defaultValues: {
      userId: "",
      triggerEvent: "user_created",
    },
  });

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: (data: AutomationRuleFormData) => apiRequest('/api/automation-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation-rules'] });
      toast({ title: "Success", description: "Automation rule created successfully" });
      setIsCreateDialogOpen(false);
      ruleForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AutomationRuleFormData> }) => 
      apiRequest(`/api/automation-rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation-rules'] });
      toast({ title: "Success", description: "Automation rule updated successfully" });
      setIsCreateDialogOpen(false);
      setEditingRule(null);
      ruleForm.reset();
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/automation-rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation-rules'] });
      toast({ title: "Success", description: "Automation rule deleted successfully" });
      setSelectedRule(null);
    },
  });

  const activateRuleMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/automation-rules/${id}/activate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation-rules'] });
      toast({ title: "Success", description: "Automation rule activated successfully" });
    },
  });

  const deactivateRuleMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/automation-rules/${id}/deactivate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation-rules'] });
      toast({ title: "Success", description: "Automation rule deactivated successfully" });
    },
  });

  const executeRuleMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/automation-rules/${id}/execute`, { method: 'POST' }),
    onSuccess: (result) => {
      toast({ 
        title: "Execution Complete", 
        description: `Rule executed: ${result.executed ? 'Success' : 'Failed'} - ${result.enrollments || 0} enrollments created` 
      });
    },
  });

  const testTriggerMutation = useMutation({
    mutationFn: (data: TriggerTestFormData) => apiRequest('/api/automation-rules/execute-for-user', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: (result) => {
      toast({ 
        title: "Test Complete", 
        description: `${result.totalRules} rules evaluated, ${result.executed} executed, ${result.enrollments} enrollments created` 
      });
      setIsTestDialogOpen(false);
      testForm.reset();
    },
  });

  const handleCreateRule = (data: AutomationRuleFormData) => {
    createRuleMutation.mutate(data);
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    ruleForm.reset({
      name: rule.name,
      description: rule.description || "",
      triggerEvent: rule.triggerEvent,
      conditions: rule.conditions || {},
      actions: rule.actions || {},
      scheduleConfig: rule.scheduleConfig || {},
      isActive: rule.isActive,
    });
    setIsCreateDialogOpen(true);
  };

  const handleUpdateRule = (data: AutomationRuleFormData) => {
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data });
    }
  };

  const handleTestTrigger = (data: TriggerTestFormData) => {
    testTriggerMutation.mutate(data);
  };

  const getTriggerEventLabel = (event: string) => {
    switch (event) {
      case "user_created": return "User Created";
      case "user_updated": return "User Updated";
      case "role_changed": return "Role Changed";
      case "team_changed": return "Team Changed";
      case "scheduled": return "Scheduled";
      default: return event;
    }
  };

  const getTriggerEventIcon = (event: string) => {
    switch (event) {
      case "user_created": return <Users className="h-4 w-4" />;
      case "user_updated": return <Edit className="h-4 w-4" />;
      case "role_changed": return <Target className="h-4 w-4" />;
      case "team_changed": return <Users className="h-4 w-4" />;
      case "scheduled": return <Clock className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading automation rules...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Automation Engine</h1>
          <p className="text-muted-foreground">Automate learning path assignments based on user events and conditions</p>
        </div>
        
        <div className="flex space-x-2">
          <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-test-automation">
                <Play className="mr-2 h-4 w-4" />
                Test Automation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Test Automation Rules</DialogTitle>
                <DialogDescription>
                  Test automation rules for a specific user and trigger event.
                </DialogDescription>
              </DialogHeader>
              <Form {...testForm}>
                <form onSubmit={testForm.handleSubmit(handleTestTrigger)} className="space-y-4">
                  <FormField
                    control={testForm.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-test-user">
                              <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user: any) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={testForm.control}
                    name="triggerEvent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trigger Event</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-test-trigger">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user_created">User Created</SelectItem>
                            <SelectItem value="user_updated">User Updated</SelectItem>
                            <SelectItem value="role_changed">Role Changed</SelectItem>
                            <SelectItem value="team_changed">Team Changed</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={testTriggerMutation.isPending} data-testid="button-submit-test">
                      {testTriggerMutation.isPending ? "Testing..." : "Run Test"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-rule">
                <Plus className="mr-2 h-4 w-4" />
                Create Automation Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}</DialogTitle>
                <DialogDescription>
                  Set up automated learning path assignments based on user events and conditions.
                </DialogDescription>
              </DialogHeader>
              <Form {...ruleForm}>
                <form onSubmit={ruleForm.handleSubmit(editingRule ? handleUpdateRule : handleCreateRule)} className="space-y-4">
                  <FormField
                    control={ruleForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rule Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter rule name" data-testid="input-rule-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={ruleForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Describe what this rule does" data-testid="textarea-rule-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={ruleForm.control}
                    name="triggerEvent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trigger Event</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-rule-trigger">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user_created">User Created</SelectItem>
                            <SelectItem value="user_updated">User Updated</SelectItem>
                            <SelectItem value="role_changed">Role Changed</SelectItem>
                            <SelectItem value="team_changed">Team Changed</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          When should this rule be triggered?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingRule(null);
                      ruleForm.reset();
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={editingRule ? updateRuleMutation.isPending : createRuleMutation.isPending}
                      data-testid="button-submit-rule"
                    >
                      {editingRule 
                        ? (updateRuleMutation.isPending ? "Updating..." : "Update Rule")
                        : (createRuleMutation.isPending ? "Creating..." : "Create Rule")
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rules List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-semibold">Automation Rules</h2>
              {automationRules.map((rule: any) => (
                <Card 
                  key={rule.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedRule?.id === rule.id ? 'border-primary' : ''
                  }`}
                  onClick={() => setSelectedRule(rule)}
                  data-testid={`card-rule-${rule.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{rule.name}</CardTitle>
                      <div className="flex space-x-1">
                        {rule.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {getTriggerEventLabel(rule.triggerEvent)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      {getTriggerEventIcon(rule.triggerEvent)}
                      <span>{rule.description || 'No description'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {automationRules.length === 0 && (
                <Card>
                  <CardContent className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <Zap className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No automation rules created yet</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Rule Details */}
            <div className="lg:col-span-2">
              {selectedRule ? (
                <div className="space-y-6">
                  {/* Rule Header */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <span>{selectedRule.name}</span>
                            {selectedRule.isActive ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>{selectedRule.description}</CardDescription>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => executeRuleMutation.mutate(selectedRule.id)}
                            disabled={executeRuleMutation.isPending}
                            data-testid="button-execute-rule"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Execute
                          </Button>
                          
                          {selectedRule.isActive ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deactivateRuleMutation.mutate(selectedRule.id)}
                              disabled={deactivateRuleMutation.isPending}
                              data-testid="button-deactivate-rule"
                            >
                              <Pause className="mr-2 h-4 w-4" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => activateRuleMutation.mutate(selectedRule.id)}
                              disabled={activateRuleMutation.isPending}
                              data-testid="button-activate-rule"
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Activate
                            </Button>
                          )}
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditRule(selectedRule)}
                            data-testid="button-edit-rule"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" data-testid="button-delete-rule">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Automation Rule</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the automation rule. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteRuleMutation.mutate(selectedRule.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Trigger:</span> {getTriggerEventLabel(selectedRule.triggerEvent)}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> {selectedRule.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Rule Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Rule Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Conditions</h4>
                          <div className="p-3 bg-muted rounded-md">
                            <pre className="text-sm">
                              {JSON.stringify(selectedRule.conditions || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Actions</h4>
                          <div className="p-3 bg-muted rounded-md">
                            <pre className="text-sm">
                              {JSON.stringify(selectedRule.actions || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                        
                        {selectedRule.scheduleConfig && Object.keys(selectedRule.scheduleConfig).length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Schedule Configuration</h4>
                            <div className="p-3 bg-muted rounded-md">
                              <pre className="text-sm">
                                {JSON.stringify(selectedRule.scheduleConfig, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Zap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">Select an Automation Rule</h3>
                      <p className="text-muted-foreground">Choose a rule from the list to view and edit its configuration.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation Analytics</CardTitle>
              <CardDescription>Track automation rule performance and impact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{automationRules.filter((r: any) => r.isActive).length}</div>
                  <div className="text-sm text-muted-foreground">Active Rules</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{automationRules.length}</div>
                  <div className="text-sm text-muted-foreground">Total Rules</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">-</div>
                  <div className="text-sm text-muted-foreground">Auto Enrollments (Coming Soon)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}