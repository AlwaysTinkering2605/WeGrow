import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Award, ExternalLink, Play, Plus, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form schemas
const developmentPlanSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  competencyId: z.string().optional(),
  targetDate: z.string().optional(),
});

const competencyAssessmentSchema = z.object({
  competencyId: z.string().min(1, "Competency is required"),
  currentLevel: z.number().min(0).max(100),
});

type DevelopmentPlanForm = z.infer<typeof developmentPlanSchema>;
type CompetencyAssessmentForm = z.infer<typeof competencyAssessmentSchema>;

export default function Development() {
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: developmentPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/development-plans"],
    retry: false,
  });

  const { data: userCompetencies, isLoading: competenciesLoading } = useQuery({
    queryKey: ["/api/user-competencies"],
    retry: false,
  });

  const { data: learningResources, isLoading: resourcesLoading } = useQuery({
    queryKey: ["/api/learning-resources"],
    retry: false,
  });

  const { data: competencies } = useQuery({
    queryKey: ["/api/competencies"],
    retry: false,
  });

  // Form setup
  const developmentPlanForm = useForm<DevelopmentPlanForm>({
    resolver: zodResolver(developmentPlanSchema),
    defaultValues: {
      title: "",
      description: "",
      competencyId: "",
      targetDate: "",
    },
  });

  const competencyAssessmentForm = useForm<CompetencyAssessmentForm>({
    resolver: zodResolver(competencyAssessmentSchema),
    defaultValues: {
      competencyId: "",
      currentLevel: 50,
    },
  });

  // Mutations
  const createDevelopmentPlanMutation = useMutation({
    mutationFn: async (data: DevelopmentPlanForm) => {
      const payload = {
        ...data,
        targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : undefined,
      };
      await apiRequest("POST", "/api/development-plans", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/development-plans"] });
      setIsCreatePlanOpen(false);
      developmentPlanForm.reset();
      toast({
        title: "Development plan created!",
        description: "Your new development plan has been added.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create development plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createCompetencyAssessmentMutation = useMutation({
    mutationFn: async (data: CompetencyAssessmentForm) => {
      await apiRequest("POST", "/api/user-competencies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-competencies"] });
      setIsAssessmentOpen(false);
      competencyAssessmentForm.reset();
      toast({
        title: "Assessment completed!",
        description: "Your competency assessment has been recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (plansLoading || competenciesLoading || resourcesLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
            <div className="w-48 h-6 bg-muted rounded mb-4"></div>
            <div className="space-y-4">
              <div className="w-full h-16 bg-muted rounded"></div>
              <div className="w-full h-16 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Personal Development Plan */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">My Development Plan</h3>
            <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-create-plan">
                  <Plus className="w-4 h-4 mr-1" />
                  Create Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Development Plan</DialogTitle>
                </DialogHeader>
                <Form {...developmentPlanForm}>
                  <form onSubmit={developmentPlanForm.handleSubmit((data) => createDevelopmentPlanMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={developmentPlanForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Complete Customer Service Training" {...field} data-testid="input-plan-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={developmentPlanForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your development objectives and how you plan to achieve them..." 
                              rows={3}
                              {...field} 
                              data-testid="textarea-plan-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={developmentPlanForm.control}
                      name="competencyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Competency (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-plan-competency">
                                <SelectValue placeholder="Select a competency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(competencies as any[])?.map((competency: any) => (
                                <SelectItem key={competency.id} value={competency.id}>
                                  {competency.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={developmentPlanForm.control}
                      name="targetDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Completion Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-plan-target-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreatePlanOpen(false)} data-testid="button-cancel-plan">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createDevelopmentPlanMutation.isPending} data-testid="button-submit-plan">
                        {createDevelopmentPlanMutation.isPending ? "Creating..." : "Create Plan"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-4">
            {!(developmentPlans as any[]) || (developmentPlans as any[]).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No development plans yet</p>
                <p className="text-sm">Start your learning journey by creating your first development plan</p>
              </div>
            ) : (
              (developmentPlans as any[]).map((plan: any) => (
                <div key={plan.id} className="border border-border rounded-lg p-4" data-testid={`development-plan-${plan.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{plan.title}</h4>
                    <Badge 
                      variant={plan.status === 'completed' ? 'default' : plan.status === 'in_progress' ? 'secondary' : 'outline'}
                      className={
                        plan.status === 'completed' ? 'bg-green-100 text-green-800' :
                        plan.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }
                    >
                      {plan.status === 'completed' ? 'Completed' :
                       plan.status === 'in_progress' ? 'In Progress' : 'On Hold'}
                    </Badge>
                  </div>
                  
                  {plan.targetDate && (
                    <p className="text-sm text-muted-foreground mb-3">
                      Target: {new Date(plan.targetDate).toLocaleDateString()}
                    </p>
                  )}
                  
                  <Progress value={plan.progress || 0} className="mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">
                    {plan.progress || 0}% completed
                  </p>
                  
                  <div className="flex space-x-2">
                    <Button size="sm" data-testid={`button-continue-${plan.id}`}>
                      <Play className="w-4 h-4 mr-1" />
                      {plan.status === 'completed' ? 'View Progress' : 'Continue Learning'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Competency Assessment */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Competency Assessment</h3>
            <Dialog open={isAssessmentOpen} onOpenChange={setIsAssessmentOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-take-assessment">
                  <Target className="w-4 h-4 mr-1" />
                  Take Assessment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Competency Self-Assessment</DialogTitle>
                </DialogHeader>
                <Form {...competencyAssessmentForm}>
                  <form onSubmit={competencyAssessmentForm.handleSubmit((data) => createCompetencyAssessmentMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={competencyAssessmentForm.control}
                      name="competencyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Competency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-assessment-competency">
                                <SelectValue placeholder="Select a competency to assess" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(competencies as any[])?.map((competency: any) => (
                                <SelectItem key={competency.id} value={competency.id}>
                                  <div>
                                    <div className="font-medium">{competency.name}</div>
                                    {competency.description && (
                                      <div className="text-sm text-muted-foreground">{competency.description}</div>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={competencyAssessmentForm.control}
                      name="currentLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Skill Level: {field.value}%</FormLabel>
                          <FormControl>
                            <div className="px-4">
                              <Slider
                                value={[field.value]}
                                onValueChange={(values) => field.onChange(values[0])}
                                max={100}
                                step={5}
                                className="w-full"
                                data-testid="slider-assessment-level"
                              />
                              <div className="flex justify-between text-sm text-muted-foreground mt-1">
                                <span>Beginner</span>
                                <span>Intermediate</span>
                                <span>Expert</span>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsAssessmentOpen(false)} data-testid="button-cancel-assessment">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createCompetencyAssessmentMutation.isPending} data-testid="button-submit-assessment">
                        {createCompetencyAssessmentMutation.isPending ? "Saving..." : "Save Assessment"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          {!(userCompetencies as any[]) || (userCompetencies as any[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No competency assessments yet</p>
              <p className="text-sm">Complete your first assessment to track your skills development</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {(userCompetencies as any[]).map((competency: any, index: number) => (
                <div key={competency.id} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`competency-${index}`}>
                  <span className="font-medium">{competency.competency?.name || `Competency ${index + 1}`}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-background rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${competency.currentLevel >= 90 ? 'bg-green-500' : competency.currentLevel >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${competency.currentLevel || 0}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-medium ${competency.currentLevel >= 90 ? 'text-green-600' : competency.currentLevel >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {competency.currentLevel || 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Hub */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Available Training</h3>
          
          {!(learningResources as any[]) || (learningResources as any[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No learning resources available</p>
              <p className="text-sm">Check back later for new training opportunities</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(learningResources as any[]).map((resource: any) => (
                <div key={resource.id} className="border border-border rounded-lg p-4" data-testid={`learning-resource-${resource.id}`}>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                    {resource.type === 'video' ? (
                      <Play className="w-6 h-6 text-blue-600" />
                    ) : resource.type === 'external_link' ? (
                      <ExternalLink className="w-6 h-6 text-blue-600" />
                    ) : (
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <h4 className="font-medium mb-2">{resource.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{resource.description}</p>
                  <div className="flex items-center justify-between">
                    {resource.duration && (
                      <span className="text-xs text-muted-foreground">
                        {Math.floor(resource.duration / 60)}h {resource.duration % 60}m
                      </span>
                    )}
                    <Button size="sm" data-testid={`button-start-resource-${resource.id}`}>
                      Start
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
