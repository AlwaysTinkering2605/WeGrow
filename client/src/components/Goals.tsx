import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertGoalSchema } from "@shared/schema";
import GoalAlignment from "./GoalAlignment";
import WeeklyCheckIn from "./WeeklyCheckIn";

// Enhanced form schema with date validation
const goalSchema = insertGoalSchema.omit({ userId: true }).extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  }
);

type GoalForm = z.infer<typeof goalSchema>;

export default function Goals() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: goals, isLoading } = useQuery({
    queryKey: ["/api/goals"],
    retry: false,
  });

  const { data: objectives } = useQuery({
    queryKey: ["/api/objectives"],
    retry: false,
  });

  // Form setup
  const goalForm = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      description: "",
      targetValue: 100,
      unit: "",
      startDate: "",
      endDate: "",
      parentObjectiveId: "",
    },
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (data: GoalForm) => {
      const payload = {
        ...data,
        targetValue: Number(data.targetValue),
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        parentObjectiveId: data.parentObjectiveId || undefined,
      };
      await apiRequest("POST", "/api/goals", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setIsCreateDialogOpen(false);
      goalForm.reset();
      toast({
        title: "Goal created!",
        description: "Your new goal has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-6 animate-pulse">
          <div className="w-48 h-6 bg-muted rounded mb-4"></div>
          <div className="space-y-4">
            <div className="w-full h-24 bg-muted rounded"></div>
            <div className="w-full h-24 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const activeGoals = (goals as any[])?.filter((goal: any) => goal.isActive) || [];

  return (
    <div className="space-y-6">
      {/* Header with Create Goal button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Goals</h2>
          <p className="text-muted-foreground">Track your progress towards success</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-goal">
              <Plus className="w-4 h-4 mr-2" />
              Create Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <Form {...goalForm}>
              <form onSubmit={goalForm.handleSubmit((data) => createGoalMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={goalForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Improve Customer Response Time" {...field} data-testid="input-goal-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={goalForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your goal and how you plan to achieve it..." 
                          rows={3}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-goal-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={goalForm.control}
                    name="targetValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Value</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            data-testid="input-goal-target-value"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={goalForm.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-goal-unit">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="%">Percentage (%)</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
                            <SelectItem value="score">Score</SelectItem>
                            <SelectItem value="rating">Rating</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={goalForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-goal-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={goalForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-goal-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {(objectives as any[])?.length > 0 && (
                  <FormField
                    control={goalForm.control}
                    name="parentObjectiveId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link to Company Objective (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-goal-objective">
                              <SelectValue placeholder="Select company objective" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(objectives as any[])?.map((objective: any) => (
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
                )}
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsCreateDialogOpen(false);
                    goalForm.reset();
                  }} data-testid="button-cancel-goal">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createGoalMutation.isPending} data-testid="button-submit-goal">
                    {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <GoalAlignment goals={activeGoals} objectives={objectives || []} />
      <WeeklyCheckIn goals={activeGoals} />
    </div>
  );
}
