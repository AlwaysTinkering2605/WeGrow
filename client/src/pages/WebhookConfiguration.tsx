import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Settings, Trash2, Power, PowerOff, TestTube, ExternalLink } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { N8nWebhookConfig, InsertN8nWebhookConfig } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Using shared types from schema

const eventTypes = [
  { value: "enrollment", label: "Course Enrollment" },
  { value: "completion", label: "Course Completion" },
  { value: "quiz_passed", label: "Quiz Passed" },
  { value: "quiz_failed", label: "Quiz Failed" },
  { value: "certificate_issued", label: "Certificate Issued" },
  { value: "badge_awarded", label: "Badge Awarded" },
  { value: "training_due", label: "Training Due" },
  { value: "training_overdue", label: "Training Overdue" }
];

const webhookConfigSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  eventType: z.string().min(1, "Event type is required"),
  webhookUrl: z.string().url("Must be a valid URL").min(1, "Webhook URL is required"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  isActive: z.boolean().default(true),
  retryCount: z.number().min(0).max(10).default(3),
  timeoutSeconds: z.number().min(5).max(300).default(30),
  headers: z.string().optional().refine(
    (value) => {
      if (!value || value.trim() === "") return true;
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Headers must be valid JSON" }
  )
});

type WebhookConfigForm = z.infer<typeof webhookConfigSchema>;

export default function WebhookConfiguration() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<N8nWebhookConfig | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: webhookConfigs = [], isLoading, error } = useQuery<N8nWebhookConfig[]>({
    queryKey: ["/api/notifications/webhooks"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const createMutation = useMutation({
    mutationFn: async (data: WebhookConfigForm) => {
      let headers = {};
      if (data.headers && data.headers.trim()) {
        try {
          headers = JSON.parse(data.headers);
        } catch (error) {
          throw new Error("Invalid JSON in headers field");
        }
      }
      const payload = {
        ...data,
        headers: Object.keys(headers).length > 0 ? headers : undefined
      };
      return await apiRequest("/api/notifications/webhooks", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/webhooks"] });
      setIsCreateDialogOpen(false);
      toast({ description: "Webhook configuration created successfully" });
    },
    onError: (error) => {
      toast({ variant: "destructive", description: `Failed to create webhook: ${error.message}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WebhookConfigForm> }) => {
      let headers = {};
      if (data.headers && data.headers.trim()) {
        try {
          headers = JSON.parse(data.headers);
        } catch (error) {
          throw new Error("Invalid JSON in headers field");
        }
      }
      const payload = {
        ...data,
        headers: Object.keys(headers).length > 0 ? headers : undefined
      };
      return await apiRequest(`/api/notifications/webhooks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/webhooks"] });
      setIsEditDialogOpen(false);
      setSelectedConfig(null);
      toast({ description: "Webhook configuration updated successfully" });
    },
    onError: (error) => {
      toast({ variant: "destructive", description: `Failed to update webhook: ${error.message}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/notifications/webhooks/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/webhooks"] });
      toast({ description: "Webhook configuration deleted successfully" });
    },
    onError: (error) => {
      toast({ variant: "destructive", description: `Failed to delete webhook: ${error.message}` });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest(`/api/notifications/webhooks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/webhooks"] });
      toast({ description: "Webhook status updated successfully" });
    },
    onError: (error) => {
      toast({ variant: "destructive", description: `Failed to toggle webhook: ${error.message}` });
    }
  });

  const testMutation = useMutation({
    mutationFn: async (eventType: string) => {
      return await apiRequest(`/api/notifications/webhooks/test/${eventType}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      toast({ description: "Test webhook triggered successfully" });
    },
    onError: (error) => {
      toast({ variant: "destructive", description: `Failed to test webhook: ${error.message}` });
    }
  });

  const form = useForm<WebhookConfigForm>({
    resolver: zodResolver(webhookConfigSchema),
    defaultValues: {
      name: "",
      eventType: "",
      webhookUrl: "",
      description: "",
      isActive: true,
      retryCount: 3,
      timeoutSeconds: 30,
      headers: ""
    }
  });

  const editForm = useForm<WebhookConfigForm>({
    resolver: zodResolver(webhookConfigSchema),
  });

  const onSubmit = (data: WebhookConfigForm) => {
    createMutation.mutate(data);
  };

  const onEdit = (data: WebhookConfigForm) => {
    if (!selectedConfig) return;
    updateMutation.mutate({ id: selectedConfig.id, data });
  };

  const openEditDialog = (config: N8nWebhookConfig) => {
    setSelectedConfig(config);
    editForm.reset({
      name: config.name,
      eventType: config.eventType,
      webhookUrl: config.webhookUrl,
      description: config.description || "",
      isActive: config.isActive ?? true,
      retryCount: config.retryCount ?? 3,
      timeoutSeconds: config.timeoutSeconds ?? 30,
      headers: config.headers ? JSON.stringify(config.headers, null, 2) : ""
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">Webhook Configuration</h1>
            <p className="text-muted-foreground">Manage n8n workflow integrations for automated notifications</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">Webhook Configuration</h1>
            <p className="text-muted-foreground">Manage n8n workflow integrations for automated notifications</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Failed to load webhook configurations. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Webhook Configuration</h1>
          <p className="text-muted-foreground">Manage n8n workflow integrations for automated notifications</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-webhook">
              <Plus className="w-4 h-4 mr-2" />
              Create Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Webhook Configuration</DialogTitle>
              <DialogDescription>
                Connect n8n workflows to Apex LMS events for automated business processes
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList>
                    <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Course Completion Workflow" {...field} data-testid="input-webhook-name" />
                          </FormControl>
                          <FormDescription>A descriptive name for this webhook configuration</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-event-type">
                                <SelectValue placeholder="Select an event type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {eventTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Choose which LMS event will trigger this webhook</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="webhookUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Webhook URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://your-n8n-instance.com/webhook/..." {...field} data-testid="input-webhook-url" />
                          </FormControl>
                          <FormDescription>The n8n webhook URL that will receive the event data</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe what this webhook does..." {...field} data-testid="input-webhook-description" />
                          </FormControl>
                          <FormDescription>Optional description of this webhook's purpose</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active</FormLabel>
                            <FormDescription>Enable this webhook to receive event notifications</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-webhook-active" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  <TabsContent value="advanced" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="retryCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retry Count</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="10" 
                              {...field} 
                              onChange={e => field.onChange(parseInt(e.target.value))}
                              data-testid="input-retry-count"
                            />
                          </FormControl>
                          <FormDescription>Number of times to retry failed webhook calls (0-10)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timeoutSeconds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeout (seconds)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="5" 
                              max="300" 
                              {...field} 
                              onChange={e => field.onChange(parseInt(e.target.value))}
                              data-testid="input-timeout"
                            />
                          </FormControl>
                          <FormDescription>Request timeout in seconds (5-300)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="headers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Headers (JSON)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder='{"Authorization": "Bearer token", "X-Custom": "value"}' 
                              {...field} 
                              data-testid="input-custom-headers"
                            />
                          </FormControl>
                          <FormDescription>Optional custom headers as JSON object</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel-create">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                    {createMutation.isPending ? "Creating..." : "Create Webhook"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {webhookConfigs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-2">
                <Settings className="w-8 h-8 mx-auto text-muted-foreground" />
                <h3 className="font-medium">No webhook configurations</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first webhook to connect Apex LMS with n8n workflows
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          webhookConfigs.map((config: N8nWebhookConfig) => (
            <Card key={config.id} data-testid={`card-webhook-${config.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {config.name}
                      <Badge variant={config.isActive ? "default" : "secondary"} data-testid={`badge-status-${config.id}`}>
                        {config.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Event: {eventTypes.find(t => t.value === config.eventType)?.label || config.eventType}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({ id: config.id, isActive: !config.isActive })}
                      disabled={toggleActiveMutation.isPending}
                      data-testid={`button-toggle-${config.id}`}
                    >
                      {config.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      {config.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testMutation.mutate(config.eventType)}
                      disabled={testMutation.isPending}
                      data-testid={`button-test-${config.id}`}
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(config)}
                      data-testid={`button-edit-${config.id}`}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid={`button-delete-${config.id}`}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Webhook Configuration</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{config.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid={`button-cancel-delete-${config.id}`}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(config.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid={`button-confirm-delete-${config.id}`}
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
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Webhook URL:</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm flex-1 break-all" data-testid={`text-url-${config.id}`}>
                        {config.webhookUrl}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(config.webhookUrl, '_blank')}
                        data-testid={`button-open-url-${config.id}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {config.description && (
                    <div>
                      <p className="text-sm font-medium">Description:</p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-description-${config.id}`}>{config.description}</p>
                    </div>
                  )}
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Retry: {config.retryCount}x</span>
                    <span>Timeout: {config.timeoutSeconds}s</span>
                    {config.lastTriggeredAt && (
                      <span>Last triggered: {new Date(config.lastTriggeredAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Webhook Configuration</DialogTitle>
            <DialogDescription>
              Update the webhook configuration settings
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList>
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Course Completion Workflow" {...field} data-testid="input-edit-webhook-name" />
                        </FormControl>
                        <FormDescription>A descriptive name for this webhook configuration</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="eventType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-event-type">
                              <SelectValue placeholder="Select an event type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {eventTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Choose which LMS event will trigger this webhook</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="webhookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://your-n8n-instance.com/webhook/..." {...field} data-testid="input-edit-webhook-url" />
                        </FormControl>
                        <FormDescription>The n8n webhook URL that will receive the event data</FormDescription>
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
                          <Textarea placeholder="Describe what this webhook does..." {...field} data-testid="input-edit-webhook-description" />
                        </FormControl>
                        <FormDescription>Optional description of this webhook's purpose</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>Enable this webhook to receive event notifications</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-edit-webhook-active" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                <TabsContent value="advanced" className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="retryCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retry Count</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="10" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value))}
                            data-testid="input-edit-retry-count"
                          />
                        </FormControl>
                        <FormDescription>Number of times to retry failed webhook calls (0-10)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="timeoutSeconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timeout (seconds)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="5" 
                            max="300" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value))}
                            data-testid="input-edit-timeout"
                          />
                        </FormControl>
                        <FormDescription>Request timeout in seconds (5-300)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="headers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Headers (JSON)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder='{"Authorization": "Bearer token", "X-Custom": "value"}' 
                            {...field} 
                            data-testid="input-edit-custom-headers"
                          />
                        </FormControl>
                        <FormDescription>Optional custom headers as JSON object</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  {updateMutation.isPending ? "Updating..." : "Update Webhook"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}