import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Play, Pause, Users, Book, Clock, Target } from "lucide-react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form schemas
const learningPathSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  pathType: z.enum(["linear", "non_linear", "adaptive"]),
  category: z.string().optional(),
  estimatedDuration: z.number().min(1, "Duration must be at least 1 minute").optional(),
});

const pathStepSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  stepType: z.enum(["course", "quiz", "video", "document", "external", "assessment"]),
  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceUrl: z.string().url().optional().or(z.literal("")),
  isOptional: z.boolean().default(false),
  passingScore: z.number().min(0).max(100).optional(),
  estimatedDuration: z.number().min(1).optional(),
});

type LearningPathFormData = z.infer<typeof learningPathSchema>;
type PathStepFormData = z.infer<typeof pathStepSchema>;

export default function LearningPathsManagement() {
  const { toast } = useToast();
  const [selectedPath, setSelectedPath] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<any>(null);

  // Learning Paths queries
  const { data: learningPaths = [], isLoading } = useQuery({
    queryKey: ['/api/learning-paths'],
  });

  const { data: pathSteps = [] } = useQuery({
    queryKey: ['/api/learning-paths', selectedPath?.id, 'steps'],
    enabled: !!selectedPath?.id,
  });

  // Forms
  const pathForm = useForm<LearningPathFormData>({
    resolver: zodResolver(learningPathSchema),
    defaultValues: {
      title: "",
      description: "",
      pathType: "linear",
      category: "",
      estimatedDuration: 60,
    },
  });

  const stepForm = useForm<PathStepFormData>({
    resolver: zodResolver(pathStepSchema),
    defaultValues: {
      title: "",
      description: "",
      stepType: "course",
      resourceId: "",
      resourceType: "",
      resourceUrl: "",
      isOptional: false,
      passingScore: 80,
      estimatedDuration: 30,
    },
  });

  // Mutations
  const createPathMutation = useMutation({
    mutationFn: (data: LearningPathFormData) => apiRequest('/api/learning-paths', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/learning-paths'] });
      toast({ title: "Success", description: "Learning path created successfully" });
      setIsCreateDialogOpen(false);
      pathForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updatePathMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LearningPathFormData> }) => 
      apiRequest(`/api/learning-paths/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/learning-paths'] });
      toast({ title: "Success", description: "Learning path updated successfully" });
    },
  });

  const deletePathMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/learning-paths/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/learning-paths'] });
      toast({ title: "Success", description: "Learning path deleted successfully" });
      setSelectedPath(null);
    },
  });

  const publishPathMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/learning-paths/${id}/publish`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/learning-paths'] });
      toast({ title: "Success", description: "Learning path published successfully" });
    },
  });

  const unpublishPathMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/learning-paths/${id}/unpublish`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/learning-paths'] });
      toast({ title: "Success", description: "Learning path unpublished successfully" });
    },
  });

  const createStepMutation = useMutation({
    mutationFn: (data: PathStepFormData & { pathId: string }) => 
      apiRequest(`/api/learning-paths/${data.pathId}/steps`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          stepOrder: pathSteps.length + 1,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/learning-paths', selectedPath?.id, 'steps'] });
      toast({ title: "Success", description: "Step created successfully" });
      setIsStepDialogOpen(false);
      stepForm.reset();
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ pathId, stepId, data }: { pathId: string; stepId: string; data: Partial<PathStepFormData> }) => 
      apiRequest(`/api/learning-paths/${pathId}/steps/${stepId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/learning-paths', selectedPath?.id, 'steps'] });
      toast({ title: "Success", description: "Step updated successfully" });
      setIsStepDialogOpen(false);
      setEditingStep(null);
      stepForm.reset();
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: ({ pathId, stepId }: { pathId: string; stepId: string }) => 
      apiRequest(`/api/learning-paths/${pathId}/steps/${stepId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/learning-paths', selectedPath?.id, 'steps'] });
      toast({ title: "Success", description: "Step deleted successfully" });
    },
  });

  const handleCreatePath = (data: LearningPathFormData) => {
    createPathMutation.mutate(data);
  };

  const handleCreateStep = (data: PathStepFormData) => {
    if (selectedPath) {
      createStepMutation.mutate({ ...data, pathId: selectedPath.id });
    }
  };

  const handleEditStep = (step: any) => {
    setEditingStep(step);
    stepForm.reset({
      title: step.title,
      description: step.description || "",
      stepType: step.stepType,
      resourceId: step.resourceId || "",
      resourceType: step.resourceType || "",
      resourceUrl: step.resourceUrl || "",
      isOptional: step.isOptional,
      passingScore: step.passingScore || 80,
      estimatedDuration: step.estimatedDuration || 30,
    });
    setIsStepDialogOpen(true);
  };

  const handleUpdateStep = (data: PathStepFormData) => {
    if (selectedPath && editingStep) {
      updateStepMutation.mutate({
        pathId: selectedPath.id,
        stepId: editingStep.id,
        data,
      });
    }
  };

  const getPathTypeLabel = (type: string) => {
    switch (type) {
      case "linear": return "Linear/Sequential";
      case "non_linear": return "Non-Linear/Choice";
      case "adaptive": return "Adaptive";
      default: return type;
    }
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case "course": return <Book className="h-4 w-4" />;
      case "quiz": return <Target className="h-4 w-4" />;
      case "video": return <Play className="h-4 w-4" />;
      default: return <Book className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading learning paths...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Learning Paths Management</h1>
          <p className="text-muted-foreground">Create and manage structured learning experiences</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-path">
              <Plus className="mr-2 h-4 w-4" />
              Create Learning Path
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Learning Path</DialogTitle>
              <DialogDescription>
                Design a structured learning experience with multiple steps and content types.
              </DialogDescription>
            </DialogHeader>
            <Form {...pathForm}>
              <form onSubmit={pathForm.handleSubmit(handleCreatePath)} className="space-y-4">
                <FormField
                  control={pathForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter path title" data-testid="input-path-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={pathForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Describe the learning objectives" data-testid="textarea-path-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={pathForm.control}
                    name="pathType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Path Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-path-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="linear">Linear/Sequential</SelectItem>
                            <SelectItem value="non_linear">Non-Linear/Choice</SelectItem>
                            <SelectItem value="adaptive">Adaptive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Linear: Steps must be completed in order. Non-Linear: Learner chooses order. Adaptive: Path changes based on performance.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={pathForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Onboarding, Compliance" data-testid="input-path-category" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={pathForm.control}
                  name="estimatedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-path-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPathMutation.isPending} data-testid="button-submit-path">
                    {createPathMutation.isPending ? "Creating..." : "Create Path"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Learning Paths List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold">Learning Paths</h2>
          {learningPaths.map((path: any) => (
            <Card 
              key={path.id} 
              className={`cursor-pointer transition-colors ${
                selectedPath?.id === path.id ? 'border-primary' : ''
              }`}
              onClick={() => setSelectedPath(path)}
              data-testid={`card-path-${path.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{path.title}</CardTitle>
                  <div className="flex space-x-1">
                    {path.isPublished ? (
                      <Badge variant="default">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {getPathTypeLabel(path.pathType)} • {path.category || 'Uncategorized'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  {path.estimatedDuration && (
                    <div className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {path.estimatedDuration}m
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Path Details and Steps */}
        <div className="lg:col-span-2">
          {selectedPath ? (
            <div className="space-y-6">
              {/* Path Header */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{selectedPath.title}</span>
                        {selectedPath.isPublished ? (
                          <Badge variant="default">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{selectedPath.description}</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      {selectedPath.isPublished ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => unpublishPathMutation.mutate(selectedPath.id)}
                          disabled={unpublishPathMutation.isPending}
                          data-testid="button-unpublish-path"
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          Unpublish
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => publishPathMutation.mutate(selectedPath.id)}
                          disabled={publishPathMutation.isPending}
                          data-testid="button-publish-path"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Publish
                        </Button>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" data-testid="button-delete-path">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Learning Path</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the learning path and all its steps. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePathMutation.mutate(selectedPath.id)}
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
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Type:</span> {getPathTypeLabel(selectedPath.pathType)}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span> {selectedPath.category || 'Uncategorized'}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {selectedPath.estimatedDuration || 0}m
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Path Steps */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Learning Path Steps</CardTitle>
                    <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-step">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Step
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>{editingStep ? 'Edit Step' : 'Add Step'}</DialogTitle>
                          <DialogDescription>
                            Configure a learning activity for this path.
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...stepForm}>
                          <form onSubmit={stepForm.handleSubmit(editingStep ? handleUpdateStep : handleCreateStep)} className="space-y-4">
                            <FormField
                              control={stepForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Step Title</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter step title" data-testid="input-step-title" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={stepForm.control}
                              name="stepType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Step Type</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-step-type">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="course">Course</SelectItem>
                                      <SelectItem value="quiz">Quiz</SelectItem>
                                      <SelectItem value="video">Video</SelectItem>
                                      <SelectItem value="document">Document</SelectItem>
                                      <SelectItem value="external">External Link</SelectItem>
                                      <SelectItem value="assessment">Assessment</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={stepForm.control}
                                name="resourceUrl"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Resource URL (if external)</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="https://..." data-testid="input-step-url" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={stepForm.control}
                                name="estimatedDuration"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Duration (minutes)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        {...field} 
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        data-testid="input-step-duration"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => {
                                setIsStepDialogOpen(false);
                                setEditingStep(null);
                                stepForm.reset();
                              }}>
                                Cancel
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={editingStep ? updateStepMutation.isPending : createStepMutation.isPending}
                                data-testid="button-submit-step"
                              >
                                {editingStep 
                                  ? (updateStepMutation.isPending ? "Updating..." : "Update Step")
                                  : (createStepMutation.isPending ? "Adding..." : "Add Step")
                                }
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {pathSteps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No steps added yet. Click "Add Step" to get started.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pathSteps.map((step: any, index: number) => (
                        <div 
                          key={step.id} 
                          className="flex items-center justify-between p-3 border rounded-lg"
                          data-testid={`step-${step.id}`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStepTypeIcon(step.stepType)}
                              <div>
                                <div className="font-medium">{step.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {step.stepType} • {step.estimatedDuration || 0}m
                                  {step.isOptional && <Badge variant="outline" className="ml-2">Optional</Badge>}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditStep(step)}
                              data-testid={`button-edit-step-${step.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" data-testid={`button-delete-step-${step.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Step</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this step from the learning path.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteStepMutation.mutate({
                                      pathId: selectedPath.id,
                                      stepId: step.id
                                    })}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Book className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Select a Learning Path</h3>
                  <p className="text-muted-foreground">Choose a learning path from the list to view and edit its steps.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}