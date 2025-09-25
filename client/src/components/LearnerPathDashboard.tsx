import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Route, 
  Play, 
  CheckCircle, 
  Clock, 
  Award, 
  Target, 
  BookOpen,
  Search,
  Filter,
  Star,
  TrendingUp,
  Calendar,
  Users,
  Trophy,
  ArrowRight,
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  Eye,
  PlayCircle,
  Lock,
  CircleCheck
} from "lucide-react";

interface LearningPath {
  id: string;
  title: string;
  description: string;
  pathType: 'linear' | 'non_linear' | 'adaptive';
  category: string;
  estimatedDuration: number;
  isPublished: boolean;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  enrolledCount?: number;
  averageRating?: number;
}

interface PathEnrollment {
  id: string;
  pathId: string;
  userId: string;
  status: 'enrolled' | 'in_progress' | 'completed' | 'on_hold';
  progress: number;
  enrolledAt: string;
  completedAt?: string;
  currentStepId?: string;
  path: LearningPath;
}

interface PathStep {
  id: string;
  title: string;
  description: string;
  stepType: 'course' | 'quiz' | 'video' | 'document' | 'external' | 'assessment';
  isOptional: boolean;
  orderIndex: number;
  estimatedDuration?: number;
  isCompleted?: boolean;
}

interface LearningStats {
  totalEnrollments: number;
  activeEnrollments: number;
  completedPaths: number;
  totalHoursLearned: number;
  currentStreak: number;
  averageProgress: number;
  upcomingDeadlines: number;
  certificatesEarned: number;
}

export default function LearnerPathDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("my-paths");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  // Fetch available learning paths
  const { data: availablePaths = [], isLoading: pathsLoading } = useQuery({
    queryKey: ['/api/learning-paths'],
  });

  // Fetch user's learning path enrollments
  const { data: myEnrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: [`/api/users/${user?.id}/learning-path-enrollments`],
    enabled: !!user?.id,
  });

  // Fetch learning statistics
  const { data: learningStats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/users/${user?.id}/learning-stats`],
    enabled: !!user?.id,
    initialData: {
      totalEnrollments: myEnrollments?.length || 0,
      activeEnrollments: myEnrollments?.filter((e: PathEnrollment) => e.status === 'in_progress')?.length || 0,
      completedPaths: myEnrollments?.filter((e: PathEnrollment) => e.status === 'completed')?.length || 0,
      totalHoursLearned: 0,
      currentStreak: 0,
      averageProgress: 0,
      upcomingDeadlines: 0,
      certificatesEarned: 0,
    } as LearningStats
  });

  // Enroll in learning path mutation
  const enrollMutation = useMutation({
    mutationFn: async (pathId: string) => {
      const response = await apiRequest(`/api/learning-paths/${pathId}/enroll`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/learning-path-enrollments`] });
      toast({
        title: "Enrolled Successfully!",
        description: "You have been enrolled in the learning path.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Enrollment Failed",
        description: error.message || "Failed to enroll in learning path.",
        variant: "destructive",
      });
    },
  });

  // Filter available paths
  const filteredPaths = availablePaths.filter((path: LearningPath) => {
    const matchesSearch = path.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         path.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || path.category === categoryFilter;
    const matchesDifficulty = difficultyFilter === 'all' || path.difficulty === difficultyFilter;
    const isPublished = path.isPublished;
    
    // Don't show paths user is already enrolled in
    const notEnrolled = !myEnrollments.some((enrollment: PathEnrollment) => enrollment.pathId === path.id);
    
    return matchesSearch && matchesCategory && matchesDifficulty && isPublished && notEnrolled;
  });

  // Get unique categories for filter
  const categories = [...new Set(availablePaths.map((path: LearningPath) => path.category).filter(Boolean))];

  // Calculate dynamic stats from enrollments
  useEffect(() => {
    if (myEnrollments.length > 0) {
      const totalProgress = myEnrollments.reduce((sum: number, enrollment: PathEnrollment) => 
        sum + (enrollment.progress || 0), 0);
      const averageProgress = Math.round(totalProgress / myEnrollments.length);
      
      // Update the query data without refetching
      queryClient.setQueryData([`/api/users/${user?.id}/learning-stats`], (oldData: LearningStats) => ({
        ...oldData,
        totalEnrollments: myEnrollments.length,
        activeEnrollments: myEnrollments.filter((e: PathEnrollment) => e.status === 'in_progress').length,
        completedPaths: myEnrollments.filter((e: PathEnrollment) => e.status === 'completed').length,
        averageProgress: averageProgress || 0,
      }));
    }
  }, [myEnrollments, user?.id]);

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue" }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
  }) => {
    // Fix dynamic Tailwind classes with explicit mapping
    const colorClasses = {
      blue: { icon: "text-blue-600", text: "text-blue-600" },
      green: { icon: "text-green-600", text: "text-green-600" },
      purple: { icon: "text-purple-600", text: "text-purple-600" },
      yellow: { icon: "text-yellow-600", text: "text-yellow-600" },
      red: { icon: "text-red-600", text: "text-red-600" },
    };
    const selectedColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;
    
    return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2">
          <Icon className={`h-8 w-8 ${selectedColor.icon}`} />
          <div>
            <div className={`text-2xl font-bold ${selectedColor.text}`}>{value}</div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
    );
  };

  const PathCard = ({ path, enrolled = false, enrollment }: {
    path: LearningPath;
    enrolled?: boolean;
    enrollment?: PathEnrollment;
  }) => (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {path.title}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {path.description}
            </CardDescription>
          </div>
          {enrolled && enrollment && (
            <Badge variant={
              enrollment.status === 'completed' ? 'default' :
              enrollment.status === 'in_progress' ? 'secondary' :
              'outline'
            }>
              {enrollment.status === 'completed' ? 'Completed' :
               enrollment.status === 'in_progress' ? 'In Progress' :
               'Enrolled'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Path Info */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{Math.round((path.estimatedDuration || 0) / 60)} hours</span>
            </div>
            <div className="flex items-center space-x-1">
              <Route className="h-4 w-4" />
              <span className="capitalize">{path.pathType?.replace('_', ' ')}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {path.difficulty || 'Beginner'}
            </Badge>
          </div>

          {/* Category */}
          {path.category && (
            <div className="flex items-center space-x-1">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{path.category}</span>
            </div>
          )}

          {/* Progress for enrolled paths */}
          {enrolled && enrollment && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{Math.round(enrollment.progress || 0)}%</span>
              </div>
              <Progress value={enrollment.progress || 0} className="h-2" />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {path.enrolledCount && (
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{path.enrolledCount} enrolled</span>
                </div>
              )}
              {path.averageRating && (
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-current text-yellow-500" />
                  <span>{path.averageRating.toFixed(1)}</span>
                </div>
              )}
            </div>
            
            {enrolled ? (
              <Link href={`/learning-paths/${path.id}`}>
                <Button size="sm" data-testid={`button-view-path-${path.id}`}>
                  <PlayCircle className="h-4 w-4 mr-1" />
                  Continue
                </Button>
              </Link>
            ) : (
              <Button 
                size="sm" 
                onClick={() => enrollMutation.mutate(path.id)}
                disabled={enrollMutation.isPending}
                data-testid={`button-enroll-path-${path.id}`}
              >
                {enrollMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Target className="h-4 w-4 mr-1" />
                )}
                Enroll
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (pathsLoading || enrollmentsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="learner-path-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Paths</h1>
          <p className="text-muted-foreground">
            Discover structured learning journeys tailored to your development goals
          </p>
        </div>
      </div>

      {/* Learning Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Route}
          title="Active Paths"
          value={learningStats?.activeEnrollments || 0}
          color="blue"
        />
        <StatCard
          icon={Trophy}
          title="Completed Paths"
          value={learningStats?.completedPaths || 0}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          title="Average Progress"
          value={`${learningStats?.averageProgress || 0}%`}
          color="purple"
        />
        <StatCard
          icon={Award}
          title="Certificates"
          value={learningStats?.certificatesEarned || 0}
          color="yellow"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-paths" data-testid="tab-my-paths">My Learning Paths</TabsTrigger>
          <TabsTrigger value="discover" data-testid="tab-discover">Discover New Paths</TabsTrigger>
        </TabsList>

        {/* My Learning Paths */}
        <TabsContent value="my-paths" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">My Learning Paths</h2>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {myEnrollments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Route className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-center mb-2">No Learning Paths Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start your learning journey by enrolling in a learning path.
                </p>
                <Button onClick={() => setActiveTab("discover")} data-testid="button-discover-paths">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Discover Learning Paths
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myEnrollments.map((enrollment: PathEnrollment) => (
                <PathCard
                  key={enrollment.id}
                  path={enrollment.path}
                  enrolled={true}
                  enrollment={enrollment}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Discover New Paths */}
        <TabsContent value="discover" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discover Learning Paths</CardTitle>
              <CardDescription>Find the perfect learning path for your goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search learning paths..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-paths"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-48" data-testid="select-category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-full md:w-48" data-testid="select-difficulty">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Available Paths */}
          {filteredPaths.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-center mb-2">No Paths Found</h3>
                <p className="text-muted-foreground text-center">
                  Try adjusting your search criteria or filters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPaths.map((path: LearningPath) => (
                <PathCard key={path.id} path={path} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}