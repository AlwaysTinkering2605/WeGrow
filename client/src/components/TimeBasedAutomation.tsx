import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Clock,
  Calendar,
  Repeat,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Settings,
  Users,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  CalendarClock,
  Timer,
  RotateCcw,
  Target,
  TrendingUp,
  Activity,
  Archive,
  Bell
} from "lucide-react";

// Schema for relative due date configuration
const relativeDueDateSchema = z.object({
  pathId: z.string().min(1, "Learning path is required"),
  relativeDueDays: z.coerce.number().min(1, "Must be at least 1 day").max(365, "Maximum 365 days"),
  enableGracePeriod: z.boolean().default(false),
  gracePeriodDays: z.coerce.number().min(0).max(30).optional(),
  enableReminders: z.boolean().default(true),
  reminderDaysBefore: z.array(z.coerce.number().min(1)).default([7, 3, 1]),
  autoExtensionDays: z.coerce.number().min(0).max(90).default(0),
});

// Schema for recurring assignments
const recurringAssignmentSchema = z.object({
  name: z.string().min(1, "Assignment name is required"),
  pathId: z.string().min(1, "Learning path is required"),
  targetAudience: z.enum(["all_users", "by_role", "by_team", "specific_users"]),
  targetRoles: z.array(z.string()).optional(),
  targetTeams: z.array(z.string()).optional(),
  targetUsers: z.array(z.string()).optional(),
  recurrenceType: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly", "custom"]),
  recurrenceInterval: z.coerce.number().min(1).default(1),
  recurrenceWeekdays: z.array(z.number().min(0).max(6)).optional(), // Sunday = 0
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid start date"),
  endDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), "Invalid end date"),
  relativeDueDays: z.coerce.number().min(1).max(365).default(30),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
});

type RelativeDueDateFormType = z.infer<typeof relativeDueDateSchema>;
type RecurringAssignmentFormType = z.infer<typeof recurringAssignmentSchema>;

// Types for data
interface RelativeDueDateConfig {
  id: string;
  pathId: string;
  pathTitle: string;
  relativeDueDays: number;
  enableGracePeriod: boolean;
  gracePeriodDays?: number;
  enableReminders: boolean;
  reminderDaysBefore: number[];
  autoExtensionDays: number;
  activeEnrollments: number;
  upcomingDueDates: number;
  overdueCount: number;
}

interface RecurringAssignment {
  id: string;
  name: string;
  pathId: string;
  pathTitle: string;
  targetAudience: string;
  targetDetails: string;
  recurrenceType: string;
  recurrenceInterval: number;
  startDate: string;
  endDate?: string;
  relativeDueDays: number;
  isActive: boolean;
  nextRun: string;
  totalExecutions: number;
  successfulExecutions: number;
  lastRun?: string;
  description?: string;
}

interface TimeBasedStats {
  totalActivePaths: number;
  totalRecurringAssignments: number;
  upcomingDueDates: number;
  overdueAssignments: number;
  monthlyCompletions: number;
  averageCompletionTime: number;
  complianceRate: number;
  automationEfficiency: number;
}

// Relative Due Date Configuration Component
function RelativeDueDateManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RelativeDueDateConfig | null>(null);
  const { toast } = useToast();

  const form = useForm<RelativeDueDateFormType>({
    resolver: zodResolver(relativeDueDateSchema),
    defaultValues: {
      relativeDueDays: 30,
      enableGracePeriod: false,
      gracePeriodDays: 7,
      enableReminders: true,
      reminderDaysBefore: [7, 3, 1],
      autoExtensionDays: 0,
    }
  });

  // Fetch relative due date configurations
  const { data: configs, isLoading } = useQuery({
    queryKey: ["/api/learning-paths/relative-due-dates"]
  }) as { data: RelativeDueDateConfig[] | undefined; isLoading: boolean };

  // Fetch available learning paths
  const { data: learningPaths } = useQuery({
    queryKey: ["/api/learning-paths", { published: true }]
  }) as { data: Array<{ id: string; title: string }> | undefined };

  // Create/update configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: RelativeDueDateFormType }) => 
      id ? 
      apiRequest(`/api/learning-paths/${data.pathId}/relative-due-date`, {
        method: "PUT",
        body: JSON.stringify(data)
      }) :
      apiRequest(`/api/learning-paths/${data.pathId}/relative-due-date`, {
        method: "POST", 
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning-paths/relative-due-dates"] });
      toast({ title: "Success", description: "Due date configuration saved successfully" });
      setIsCreateDialogOpen(false);
      setEditingConfig(null);
      form.reset();
    }
  });

  const handleSave = (data: RelativeDueDateFormType) => {
    saveConfigMutation.mutate({ id: editingConfig?.id, data });
  };

  const handleEdit = (config: RelativeDueDateConfig) => {
    setEditingConfig(config);
    form.reset({
      pathId: config.pathId,
      relativeDueDays: config.relativeDueDays,
      enableGracePeriod: config.enableGracePeriod,
      gracePeriodDays: config.gracePeriodDays,
      enableReminders: config.enableReminders,
      reminderDaysBefore: config.reminderDaysBefore,
      autoExtensionDays: config.autoExtensionDays,
    });
    setIsCreateDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5" />
            Relative Due Date Configuration
          </CardTitle>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-due-date-config">
            <Plus className="w-4 h-4 mr-2" />
            Configure Path
          </Button>
        </div>
        <CardDescription>
          Set automatic due dates relative to enrollment dates with reminders and extensions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : configs && configs.length > 0 ? (
          <div className="space-y-4">
            {configs.map((config) => (
              <Card key={config.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{config.pathTitle}</h4>
                      <Badge variant="outline">
                        Due in {config.relativeDueDays} days
                      </Badge>
                      {config.enableGracePeriod && (
                        <Badge variant="secondary">
                          +{config.gracePeriodDays} grace days
                        </Badge>
                      )}
                      {config.enableReminders && (
                        <Badge variant="outline" className="text-xs">
                          <Bell className="w-3 h-3 mr-1" />
                          Reminders
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {config.activeEnrollments} active enrollments
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="w-4 h-4" />
                        {config.upcomingDueDates} due soon
                      </span>
                      {config.overdueCount > 0 && (
                        <span className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          {config.overdueCount} overdue
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(config)}
                      data-testid={`edit-config-${config.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarClock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No due date configurations</h3>
            <p className="text-sm text-muted-foreground">
              Configure relative due dates for your learning paths
            </p>
          </div>
        )}

        {/* Create/Edit Configuration Dialog */}
        <Dialog open={isCreateDialogOpen || !!editingConfig} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingConfig(null);
            form.reset();
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? "Edit Due Date Configuration" : "Configure Relative Due Date"}
              </DialogTitle>
              <DialogDescription>
                Set automatic due dates based on enrollment date
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="pathId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Learning Path</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!editingConfig}>
                        <FormControl>
                          <SelectTrigger data-testid="select-learning-path">
                            <SelectValue placeholder="Select a learning path" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {learningPaths?.map((path) => (
                            <SelectItem key={path.id} value={path.id}>
                              {path.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="relativeDueDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Days After Enrollment</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" max="365" data-testid="input-due-days" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="autoExtensionDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auto Extension Days</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" max="90" data-testid="input-extension-days" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="enableGracePeriod"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            data-testid="checkbox-enable-grace-period"
                          />
                        </FormControl>
                        <FormLabel className="text-sm">Enable grace period</FormLabel>
                      </FormItem>
                    )}
                  />

                  {form.watch("enableGracePeriod") && (
                    <FormField
                      control={form.control}
                      name="gracePeriodDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grace Period Days</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" max="30" data-testid="input-grace-period-days" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="enableReminders"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          data-testid="checkbox-enable-reminders"
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Enable reminder notifications</FormLabel>
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Reminders will be sent 7, 3, and 1 days before due date
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setEditingConfig(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={saveConfigMutation.isPending}
                      data-testid="button-save-config"
                    >
                      {editingConfig ? "Update Configuration" : "Save Configuration"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Recurring Assignments Manager Component
function RecurringAssignmentsManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<RecurringAssignment | null>(null);
  const { toast } = useToast();

  const form = useForm<RecurringAssignmentFormType>({
    resolver: zodResolver(recurringAssignmentSchema),
    defaultValues: {
      targetAudience: "all_users",
      recurrenceType: "monthly",
      recurrenceInterval: 1,
      relativeDueDays: 30,
      isActive: true,
    }
  });

  // Fetch recurring assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["/api/learning-paths/recurring-assignments"]
  }) as { data: RecurringAssignment[] | undefined; isLoading: boolean };

  // Fetch learning paths for assignment
  const { data: learningPaths } = useQuery({
    queryKey: ["/api/learning-paths", { published: true }]
  }) as { data: Array<{ id: string; title: string }> | undefined };

  // Save assignment mutation
  const saveAssignmentMutation = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: RecurringAssignmentFormType }) =>
      id ?
      apiRequest(`/api/learning-paths/recurring-assignments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }) :
      apiRequest("/api/learning-paths/recurring-assignments", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning-paths/recurring-assignments"] });
      toast({ title: "Success", description: "Recurring assignment saved successfully" });
      setIsCreateDialogOpen(false);
      setEditingAssignment(null);
      form.reset();
    }
  });

  // Toggle assignment status mutation
  const toggleAssignmentMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/learning-paths/recurring-assignments/${id}/toggle`, {
      method: "POST"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning-paths/recurring-assignments"] });
      toast({ title: "Success", description: "Assignment status updated" });
    }
  });

  const handleSave = (data: RecurringAssignmentFormType) => {
    saveAssignmentMutation.mutate({ id: editingAssignment?.id, data });
  };

  const handleEdit = (assignment: RecurringAssignment) => {
    setEditingAssignment(assignment);
    form.reset({
      name: assignment.name,
      pathId: assignment.pathId,
      targetAudience: assignment.targetAudience as any,
      recurrenceType: assignment.recurrenceType as any,
      recurrenceInterval: assignment.recurrenceInterval,
      startDate: new Date(assignment.startDate).toISOString().split('T')[0],
      endDate: assignment.endDate ? new Date(assignment.endDate).toISOString().split('T')[0] : undefined,
      relativeDueDays: assignment.relativeDueDays,
      isActive: assignment.isActive,
      description: assignment.description,
    });
    setIsCreateDialogOpen(true);
  };

  const getRecurrenceDescription = (assignment: RecurringAssignment) => {
    const { recurrenceType, recurrenceInterval } = assignment;
    const interval = recurrenceInterval > 1 ? `every ${recurrenceInterval} ` : "";
    
    switch (recurrenceType) {
      case "daily": return `${interval}day${recurrenceInterval > 1 ? 's' : ''}`;
      case "weekly": return `${interval}week${recurrenceInterval > 1 ? 's' : ''}`;
      case "monthly": return `${interval}month${recurrenceInterval > 1 ? 's' : ''}`;
      case "quarterly": return `${interval}quarter${recurrenceInterval > 1 ? 's' : ''}`;
      case "yearly": return `${interval}year${recurrenceInterval > 1 ? 's' : ''}`;
      default: return recurrenceType;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            Recurring Assignments
          </CardTitle>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-recurring-assignment">
            <Plus className="w-4 h-4 mr-2" />
            Create Assignment
          </Button>
        </div>
        <CardDescription>
          Automatically assign learning paths to users on a recurring schedule
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : assignments && assignments.length > 0 ? (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{assignment.name}</h4>
                      <Badge variant={assignment.isActive ? "default" : "secondary"}>
                        {assignment.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">
                        {getRecurrenceDescription(assignment)}
                      </Badge>
                      <Badge variant="outline">
                        Due in {assignment.relativeDueDays} days
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      <strong>Path:</strong> {assignment.pathTitle}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span>Target: {assignment.targetDetails}</span>
                      <span>Next run: {new Date(assignment.nextRun).toLocaleDateString()}</span>
                      <span>Executions: {assignment.successfulExecutions}/{assignment.totalExecutions}</span>
                      {assignment.lastRun && (
                        <span>Last: {new Date(assignment.lastRun).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAssignmentMutation.mutate(assignment.id)}
                      data-testid={`toggle-assignment-${assignment.id}`}
                    >
                      {assignment.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(assignment)}
                      data-testid={`edit-assignment-${assignment.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Repeat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No recurring assignments</h3>
            <p className="text-sm text-muted-foreground">
              Create recurring assignments to automate path enrollments
            </p>
          </div>
        )}

        {/* Create/Edit Assignment Dialog */}
        <Dialog open={isCreateDialogOpen || !!editingAssignment} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingAssignment(null);
            form.reset();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAssignment ? "Edit Recurring Assignment" : "Create Recurring Assignment"}
              </DialogTitle>
              <DialogDescription>
                Configure automatic learning path assignments on a recurring schedule
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignment Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-assignment-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pathId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Learning Path</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-assignment-path">
                              <SelectValue placeholder="Select learning path" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {learningPaths?.map((path) => (
                              <SelectItem key={path.id} value={path.id}>
                                {path.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-target-audience">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all_users">All Users</SelectItem>
                          <SelectItem value="by_role">By Role</SelectItem>
                          <SelectItem value="by_team">By Team</SelectItem>
                          <SelectItem value="specific_users">Specific Users</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="recurrenceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recurrence Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-recurrence-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurrenceInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Every</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" max="12" data-testid="input-recurrence-interval" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="relativeDueDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Days After Assignment</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" max="365" data-testid="input-assignment-due-days" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            data-testid="checkbox-is-active"
                          />
                        </FormControl>
                        <FormLabel className="text-sm">Active assignment</FormLabel>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setEditingAssignment(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={saveAssignmentMutation.isPending}
                      data-testid="button-save-assignment"
                    >
                      {editingAssignment ? "Update Assignment" : "Create Assignment"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Time-Based Automation Analytics
function TimeBasedAnalytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/learning-paths/time-based-stats"]
  }) as { data: TimeBasedStats | undefined; isLoading: boolean };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Paths</p>
                <p className="text-2xl font-bold" data-testid="stat-active-paths">
                  {isLoading ? "-" : stats?.totalActivePaths || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <RotateCcw className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Recurring Assignments</p>
                <p className="text-2xl font-bold" data-testid="stat-recurring-assignments">
                  {isLoading ? "-" : stats?.totalRecurringAssignments || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Due Soon</p>
                <p className="text-2xl font-bold" data-testid="stat-upcoming-due">
                  {isLoading ? "-" : stats?.upcomingDueDates || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Compliance Rate</p>
                <p className="text-2xl font-bold" data-testid="stat-compliance-rate">
                  {isLoading ? "-" : Math.round(stats?.complianceRate || 0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Performance</CardTitle>
          <CardDescription>Overview of time-based automation effectiveness</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {Math.round(stats?.averageCompletionTime || 0)} days
                </div>
                <p className="text-sm text-muted-foreground">Average Completion Time</p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats?.monthlyCompletions || 0}
                </div>
                <p className="text-sm text-muted-foreground">Monthly Completions</p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {Math.round(stats?.automationEfficiency || 0)}%
                </div>
                <p className="text-sm text-muted-foreground">Automation Efficiency</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Main Time-Based Automation Component
export default function TimeBasedAutomation() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("due-dates");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Time-Based Automation</h1>
          <p className="text-muted-foreground">
            Configure relative due dates and recurring assignments for automated learning path management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-refresh-automation">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="due-dates" data-testid="tab-due-dates">Relative Due Dates</TabsTrigger>
          <TabsTrigger value="recurring" data-testid="tab-recurring">Recurring Assignments</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-automation-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="due-dates" className="space-y-6">
          <RelativeDueDateManager />
        </TabsContent>

        <TabsContent value="recurring" className="space-y-6">
          <RecurringAssignmentsManager />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <TimeBasedAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}