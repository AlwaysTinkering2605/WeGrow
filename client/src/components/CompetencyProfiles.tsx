import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Target,
  FileText,
  Award,
  Calendar,
  Clock,
  TrendingUp,
  Plus,
  Upload,
  Download,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BookOpen,
  Star,
  Shield,
  Layers,
  Route,
  BarChart3,
  Users,
  Search,
  Filter,
  RefreshCw,
  PlayCircle,
  PenTool,
  Lightbulb,
  MapPin
} from "lucide-react";

// Types for individual competency profiles
interface UserCompetencyProfile {
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    teamId?: string;
    profileImageUrl?: string;
  };
  competencies: CompetencyProgress[];
  totalCompetencies: number;
  achievedCompetencies: number;
  inProgressCompetencies: number;
  overallCompletionRate: number;
  nextDevelopmentGoals: DevelopmentGoal[];
  recentEvidence: EvidenceRecord[];
  upcomingDeadlines: CompetencyDeadline[];
}

interface CompetencyProgress {
  id: string;
  competencyId: string;
  currentLevel: number;
  targetLevel: number;
  status: "not_started" | "in_progress" | "achieved" | "expired";
  lastAssessed: string;
  nextReview: string;
  priority: "critical" | "important" | "desired";
  competency: {
    id: string;
    title: string;
    description: string;
    category: string;
    skillType: "technical" | "behavioral" | "safety" | "compliance";
    assessmentCriteria?: string;
  };
  evidenceCount: number;
  developmentResources: LearningResource[];
}

interface DevelopmentGoal {
  id: string;
  competencyId: string;
  targetLevel: number;
  deadline: string;
  notes: string;
  progress: number;
  competency: {
    title: string;
    category: string;
  };
}

interface EvidenceRecord {
  id: string;
  competencyId: string;
  title: string;
  description: string;
  evidenceType: "document" | "observation" | "assessment" | "certification";
  url?: string;
  verificationStatus: "pending" | "verified" | "rejected";
  createdAt: string;
  verifiedBy?: string;
  competency: {
    title: string;
  };
}

interface CompetencyDeadline {
  id: string;
  competencyId: string;
  deadline: string;
  daysRemaining: number;
  isOverdue: boolean;
  priority: "critical" | "important" | "desired";
  competency: {
    title: string;
    category: string;
  };
}

interface LearningResource {
  id: string;
  title: string;
  type: "course" | "article" | "video" | "book" | "certification";
  url?: string;
  estimatedHours?: number;
  provider?: string;
}

// Form schemas
const developmentGoalSchema = z.object({
  competencyId: z.string().min(1, "Competency is required"),
  targetLevel: z.coerce.number().min(1).max(5),
  deadline: z.string().min(1, "Deadline is required"),
  notes: z.string().min(10, "Notes must be at least 10 characters"),
});

const evidenceSubmissionSchema = z.object({
  competencyId: z.string().min(1, "Competency is required"),
  title: z.string().min(1, "Evidence title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  evidenceType: z.enum(["document", "observation", "assessment", "certification"]),
  url: z.string().url().optional().or(z.literal("")),
});

type DevelopmentGoalFormType = z.infer<typeof developmentGoalSchema>;
type EvidenceSubmissionFormType = z.infer<typeof evidenceSubmissionSchema>;

// Individual Competency Profile Component
function IndividualProfile({ userId }: { userId: string }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/user-competency-profile", userId],
    enabled: !!userId
  }) as { data: UserCompetencyProfile | undefined; isLoading: boolean };

  const filteredCompetencies = profile?.competencies?.filter(comp => {
    const matchesCategory = !selectedCategory || comp.competency.category === selectedCategory;
    const matchesStatus = !selectedStatus || comp.status === selectedStatus;
    return matchesCategory && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    if (status === "achieved") return "bg-green-500";
    if (status === "in_progress") return "bg-yellow-500";
    if (status === "expired") return "bg-red-500";
    return "bg-gray-300";
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === "critical") return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (priority === "important") return <Target className="w-4 h-4 text-yellow-600" />;
    return <Star className="w-4 h-4 text-blue-600" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium mb-2">Profile not found</h3>
        <p className="text-sm text-muted-foreground">Unable to load competency profile for this user</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">
                {profile.user.firstName?.charAt(0) || profile.user.email?.charAt(0) || "U"}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {profile.user.firstName} {profile.user.lastName}
              </h2>
              <p className="text-muted-foreground mb-4">
                {profile.user.role.charAt(0).toUpperCase() + profile.user.role.slice(1)} • {profile.user.email}
              </p>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{profile.achievedCompetencies}</div>
                  <p className="text-sm text-muted-foreground">Achieved</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{profile.inProgressCompetencies}</div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{profile.totalCompetencies}</div>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{Math.round(profile.overallCompletionRate)}%</div>
                  <p className="text-sm text-muted-foreground">Complete</p>
                </div>
              </div>
              
              <Progress value={profile.overallCompletionRate} className="mt-4" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats & Filters */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48" data-testid="select-category-filter">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {Array.from(new Set(profile.competencies.map(c => c.competency.category))).map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="achieved">Achieved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" data-testid="button-export-profile">
          <Download className="w-4 h-4 mr-2" />
          Export Profile
        </Button>
      </div>

      {/* Competency Progress Grid */}
      <div className="grid gap-4">
        {filteredCompetencies && filteredCompetencies.length > 0 ? (
          filteredCompetencies.map((comp) => (
            <Card key={comp.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(comp.priority)}
                      <div>
                        <h4 className="font-medium">{comp.competency.title}</h4>
                        <p className="text-sm text-muted-foreground">{comp.competency.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={comp.competency.skillType === "safety" ? "destructive" : 
                                     comp.competency.skillType === "compliance" ? "secondary" :
                                     comp.competency.skillType === "behavioral" ? "outline" : "default"}>
                        {comp.competency.skillType}
                      </Badge>
                      <Badge variant={comp.priority === "critical" ? "destructive" :
                                     comp.priority === "important" ? "default" : "secondary"}>
                        {comp.priority}
                      </Badge>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">L{comp.currentLevel}</Badge>
                        <Progress 
                          value={(comp.currentLevel / comp.targetLevel) * 100} 
                          className="w-20"
                        />
                        <Badge variant="outline">L{comp.targetLevel}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {comp.evidenceCount} evidence items
                      </p>
                    </div>

                    <div className="text-right">
                      <Badge variant={comp.status === "achieved" ? "default" :
                                     comp.status === "in_progress" ? "secondary" :
                                     comp.status === "expired" ? "destructive" : "outline"}>
                        {comp.status.replace("_", " ")}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Next review: {new Date(comp.nextReview).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" data-testid={`view-competency-${comp.id}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" data-testid={`edit-competency-${comp.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Development Resources */}
                {comp.developmentResources && comp.developmentResources.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h5 className="font-medium mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Recommended Resources
                    </h5>
                    <div className="flex gap-2 flex-wrap">
                      {comp.developmentResources.slice(0, 3).map((resource) => (
                        <Badge key={resource.id} variant="outline" className="text-xs">
                          {resource.title}
                        </Badge>
                      ))}
                      {comp.developmentResources.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{comp.developmentResources.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No competencies found</h3>
            <p className="text-sm text-muted-foreground">
              {selectedCategory || selectedStatus ? 
                "Try adjusting your filters" : 
                "No competencies are assigned to this user"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Development Planning Component
function DevelopmentPlanning({ userId }: { userId: string }) {
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: developmentGoals, isLoading } = useQuery({
    queryKey: ["/api/development-goals", userId],
    enabled: !!userId
  }) as { data: DevelopmentGoal[] | undefined; isLoading: boolean };

  const { data: competencies } = useQuery({
    queryKey: ["/api/competency-library"]
  });

  const createGoalMutation = useMutation({
    mutationFn: (data: DevelopmentGoalFormType) => apiRequest("/api/development-goals", {
      method: "POST",
      body: data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/development-goals"] });
      setIsCreateGoalOpen(false);
      toast({ title: "Development goal created successfully" });
    }
  });

  const form = useForm<DevelopmentGoalFormType>({
    resolver: zodResolver(developmentGoalSchema),
    defaultValues: {
      targetLevel: 3
    }
  });

  const onSubmit = (data: DevelopmentGoalFormType) => {
    createGoalMutation.mutate({ ...data, userId } as any);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="w-5 h-5" />
          Development Planning
        </CardTitle>
        <CardDescription>
          Set and track personal development goals for competency advancement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Active Development Goals</h3>
          <Dialog open={isCreateGoalOpen} onOpenChange={setIsCreateGoalOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-goal">
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Development Goal</DialogTitle>
                <DialogDescription>
                  Set a new competency development goal with target level and deadline
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="competencyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Competency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-goal-competency">
                              <SelectValue placeholder="Select competency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {competencies?.map((comp: any) => (
                              <SelectItem key={comp.id} value={comp.id}>
                                {comp.title} (Level {comp.level})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Level (1-5)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="5" {...field} data-testid="input-target-level" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Deadline</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-goal-deadline" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Development Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} data-testid="input-goal-notes" />
                        </FormControl>
                        <FormDescription>
                          Describe your development plan and approach for achieving this goal
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateGoalOpen(false)}>
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

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : developmentGoals && developmentGoals.length > 0 ? (
          <div className="space-y-4">
            {developmentGoals.map((goal) => (
              <div key={goal.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{goal.competency.title}</h4>
                    <p className="text-sm text-muted-foreground">{goal.competency.category}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">Target L{goal.targetLevel}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due: {new Date(goal.deadline).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Progress</span>
                    <span className="text-sm">{Math.round(goal.progress)}%</span>
                  </div>
                  <Progress value={goal.progress} />
                </div>

                <p className="text-sm text-muted-foreground">{goal.notes}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Route className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No development goals</h3>
            <p className="text-sm text-muted-foreground">Create your first development goal to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Evidence Tracking Component
function EvidenceTracking({ userId }: { userId: string }) {
  const [isSubmitEvidenceOpen, setIsSubmitEvidenceOpen] = useState(false);
  const { toast } = useToast();

  const { data: evidenceRecords, isLoading } = useQuery({
    queryKey: ["/api/competency-evidence", userId],
    enabled: !!userId
  }) as { data: EvidenceRecord[] | undefined; isLoading: boolean };

  const { data: competencies } = useQuery({
    queryKey: ["/api/competency-library"]
  });

  const submitEvidenceMutation = useMutation({
    mutationFn: (data: EvidenceSubmissionFormType) => apiRequest("/api/competency-evidence", {
      method: "POST",
      body: data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competency-evidence"] });
      setIsSubmitEvidenceOpen(false);
      toast({ title: "Evidence submitted successfully" });
    }
  });

  const form = useForm<EvidenceSubmissionFormType>({
    resolver: zodResolver(evidenceSubmissionSchema),
    defaultValues: {
      evidenceType: "document"
    }
  });

  const onSubmit = (data: EvidenceSubmissionFormType) => {
    submitEvidenceMutation.mutate({ ...data, userId } as any);
  };

  const getEvidenceIcon = (type: string) => {
    if (type === "document") return <FileText className="w-4 h-4" />;
    if (type === "observation") return <Eye className="w-4 h-4" />;
    if (type === "assessment") return <PenTool className="w-4 h-4" />;
    if (type === "certification") return <Award className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Evidence Portfolio
        </CardTitle>
        <CardDescription>
          Submit and track evidence of competency achievement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Evidence Records</h3>
          <Dialog open={isSubmitEvidenceOpen} onOpenChange={setIsSubmitEvidenceOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-submit-evidence">
                <Upload className="w-4 h-4 mr-2" />
                Submit Evidence
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Evidence</DialogTitle>
                <DialogDescription>
                  Provide evidence of competency achievement for verification
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="competencyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Competency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-evidence-competency">
                              <SelectValue placeholder="Select competency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {competencies?.map((comp: any) => (
                              <SelectItem key={comp.id} value={comp.id}>
                                {comp.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="evidenceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Evidence Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-evidence-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="document">Document</SelectItem>
                            <SelectItem value="observation">Observation</SelectItem>
                            <SelectItem value="assessment">Assessment</SelectItem>
                            <SelectItem value="certification">Certification</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Evidence Title</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-evidence-title" />
                        </FormControl>
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
                          <Textarea {...field} rows={3} data-testid="input-evidence-description" />
                        </FormControl>
                        <FormDescription>
                          Describe how this evidence demonstrates competency achievement
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Evidence URL (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." data-testid="input-evidence-url" />
                        </FormControl>
                        <FormDescription>
                          Link to the evidence document or resource
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsSubmitEvidenceOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitEvidenceMutation.isPending} data-testid="button-submit-evidence-form">
                      {submitEvidenceMutation.isPending ? "Submitting..." : "Submit Evidence"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : evidenceRecords && evidenceRecords.length > 0 ? (
          <div className="space-y-3">
            {evidenceRecords.map((evidence) => (
              <div key={evidence.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getEvidenceIcon(evidence.evidenceType)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{evidence.title}</h4>
                        <Badge variant="outline">{evidence.evidenceType}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{evidence.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Competency: {evidence.competency.title} | 
                        Submitted: {new Date(evidence.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={evidence.verificationStatus === "verified" ? "default" :
                                   evidence.verificationStatus === "rejected" ? "destructive" : "secondary"}>
                      {evidence.verificationStatus}
                    </Badge>
                    {evidence.url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={evidence.url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No evidence submitted</h3>
            <p className="text-sm text-muted-foreground">Start building your evidence portfolio to demonstrate competency achievement</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Competency Profiles Component
export default function CompetencyProfiles() {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { user } = useAuth();

  const { data: users } = useQuery({
    queryKey: ["/api/users"]
  }) as { data: Array<{ id: string; firstName: string; lastName: string; role: string }> | undefined };

  // Auto-select current user if no selection
  useEffect(() => {
    if (!selectedUserId && user?.id) {
      setSelectedUserId(user.id);
    }
  }, [selectedUserId, user?.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Individual Competency Profiles</h1>
          <p className="text-muted-foreground">
            Track individual competency progress, development goals, and evidence portfolios
          </p>
        </div>
      </div>

      {/* User Selection */}
      <div className="flex items-center gap-4">
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="w-64" data-testid="select-user-profile">
            <SelectValue placeholder="Select a user profile" />
          </SelectTrigger>
          <SelectContent>
            {users?.map((userOption) => (
              <SelectItem key={userOption.id} value={userOption.id}>
                {userOption.firstName} {userOption.lastName} ({userOption.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedUserId && (
        <Tabs defaultValue="profile" className="w-full">
          <TabsList>
            <TabsTrigger value="profile" data-testid="tab-profile">Competency Profile</TabsTrigger>
            <TabsTrigger value="development" data-testid="tab-development">Development Planning</TabsTrigger>
            <TabsTrigger value="evidence" data-testid="tab-evidence">Evidence Portfolio</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <IndividualProfile userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="development" className="space-y-6">
            <DevelopmentPlanning userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="evidence" className="space-y-6">
            <EvidenceTracking userId={selectedUserId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}