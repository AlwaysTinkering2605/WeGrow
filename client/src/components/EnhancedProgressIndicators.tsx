import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Route,
  Trophy,
  Star,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Award,
  Calendar,
  Users,
  BookOpen,
  PlayCircle,
  Pause,
  RotateCcw,
  Zap,
  Flame,
  Medal,
  Crown,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Circle,
  Lock,
  Unlock,
  Flag,
  Mountain,
  Navigation,
  Compass,
  Map
} from "lucide-react";

// Types for progress visualization
interface LearningJourney {
  enrollmentId: string;
  pathId: string;
  pathTitle: string;
  pathType: "linear" | "non_linear" | "adaptive";
  enrollmentStatus: string;
  progress: number;
  currentStepId?: string;
  startDate: string;
  dueDate?: string;
  completionDate?: string;
  milestones: JourneyMilestone[];
  steps: JourneyStep[];
  analytics: {
    timeSpent: number;
    averageSessionTime: number;
    streakDays: number;
    pointsEarned: number;
    badgesEarned: number;
    completionRate: number;
  };
}

interface JourneyMilestone {
  id: string;
  title: string;
  description: string;
  threshold: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  completedAt?: string;
  reward?: {
    type: "badge" | "points" | "certificate";
    value: string | number;
    description: string;
  };
}

interface JourneyStep {
  id: string;
  title: string;
  stepType: string;
  estimatedDuration: number;
  isOptional: boolean;
  stepOrder: number;
  status: "not_started" | "in_progress" | "completed" | "skipped" | "locked";
  progress: number;
  completedAt?: string;
  timeSpent: number;
  score?: number;
  coordinates?: { x: number; y: number }; // For visual positioning
}

interface ProgressStats {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  averageProgress: number;
  upcomingDeadlines: number;
  milestones: {
    totalMilestones: number;
    unlockedMilestones: number;
    completedMilestones: number;
  };
  streaks: {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
  };
}

// Journey Visualization Component with Visual Path Map
function JourneyVisualization({ journey }: { journey: LearningJourney }) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw the visual path on canvas
  useEffect(() => {
    if (!canvasRef.current || !journey.steps.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 400;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate step positions based on path type
    const steps = journey.steps.map((step, index) => ({
      ...step,
      coordinates: journey.pathType === "linear" 
        ? { x: (index + 1) * (canvas.width / (journey.steps.length + 1)), y: canvas.height / 2 }
        : { 
            x: 100 + (index % 3) * 250, 
            y: 100 + Math.floor(index / 3) * 100 
          }
    }));

    // Draw path connections
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    if (journey.pathType === "linear") {
      steps.forEach((step, index) => {
        if (index === 0) ctx.moveTo(step.coordinates!.x, step.coordinates!.y);
        else ctx.lineTo(step.coordinates!.x, step.coordinates!.y);
      });
    } else {
      // Non-linear paths - connect available steps
      steps.forEach((step, index) => {
        if (index > 0 && step.status !== "locked") {
          const prevStep = steps[index - 1];
          ctx.moveTo(prevStep.coordinates!.x, prevStep.coordinates!.y);
          ctx.lineTo(step.coordinates!.x, step.coordinates!.y);
        }
      });
    }
    ctx.stroke();

    // Draw completed path in different color
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    steps.forEach((step, index) => {
      if (step.status === "completed") {
        if (index === 0 || steps[index - 1].status === "completed") {
          if (index === 0) ctx.moveTo(step.coordinates!.x, step.coordinates!.y);
          else ctx.lineTo(step.coordinates!.x, step.coordinates!.y);
        }
      }
    });
    ctx.stroke();

    // Draw step nodes
    steps.forEach((step, index) => {
      const { x, y } = step.coordinates!;
      
      // Draw step circle
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, 2 * Math.PI);
      
      // Set colors based on status
      switch (step.status) {
        case "completed":
          ctx.fillStyle = '#10b981';
          ctx.strokeStyle = '#059669';
          break;
        case "in_progress":
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#d97706';
          break;
        case "locked":
          ctx.fillStyle = '#9ca3af';
          ctx.strokeStyle = '#6b7280';
          break;
        default:
          ctx.fillStyle = '#e5e7eb';
          ctx.strokeStyle = '#9ca3af';
      }
      
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();

      // Add step number or icon
      ctx.fillStyle = step.status === "completed" ? '#ffffff' : '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((index + 1).toString(), x, y + 4);

      // Add step title below
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(step.title.substring(0, 15), x, y + 35);
    });

    // Draw milestone markers
    journey.milestones.forEach((milestone, index) => {
      const progressPoint = milestone.threshold / 100;
      const x = progressPoint * canvas.width;
      const y = 50;

      ctx.beginPath();
      ctx.arc(x, y, 12, 0, 2 * Math.PI);
      ctx.fillStyle = milestone.isCompleted ? '#dc2626' : '#fbbf24';
      ctx.strokeStyle = milestone.isCompleted ? '#b91c1c' : '#f59e0b';
      ctx.fill();
      ctx.stroke();

      // Milestone flag
      ctx.beginPath();
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x, y - 30);
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Milestone label
      ctx.fillStyle = '#374151';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(milestone.title.substring(0, 10), x, y - 35);
    });

  }, [journey]);

  const handleStepClick = (stepId: string) => {
    setSelectedStep(stepId);
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "in_progress": return <PlayCircle className="w-4 h-4 text-yellow-600" />;
      case "locked": return <Lock className="w-4 h-4 text-gray-400" />;
      default: return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="w-5 h-5" />
          Learning Journey: {journey.pathTitle}
        </CardTitle>
        <CardDescription>
          Visual progress map showing your path through the learning content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-blue-600">{journey.progress}%</div>
              <Progress value={journey.progress} className="w-40" />
              <Badge variant={journey.enrollmentStatus === "completed" ? "default" : "secondary"}>
                {journey.enrollmentStatus.replace("_", " ")}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {journey.analytics.streakDays} day streak
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                {journey.analytics.pointsEarned} points
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                {journey.analytics.badgesEarned} badges
              </span>
            </div>
          </div>

          {/* Visual Journey Map */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg">
            <canvas
              ref={canvasRef}
              className="w-full max-w-4xl mx-auto cursor-pointer"
              style={{ height: "400px" }}
              data-testid="journey-visualization-canvas"
            />
          </div>

          {/* Journey Steps List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {journey.steps.map((step, index) => (
              <motion.div
                key={step.id}
                layoutId={step.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedStep === step.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleStepClick(step.id)}
                data-testid={`journey-step-${step.id}`}
              >
                <div className="flex items-center gap-3">
                  {getStepIcon(step.status)}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Step {step.stepOrder}
                      </Badge>
                      {step.isOptional && (
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {step.progress > 0 && (
                  <Progress value={step.progress} className="mt-2 h-1" />
                )}
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{step.estimatedDuration} min</span>
                  {step.timeSpent > 0 && <span>Spent: {step.timeSpent} min</span>}
                  {step.score !== undefined && <span>Score: {step.score}%</span>}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Milestones */}
          {journey.milestones.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Flag className="w-4 h-4" />
                Milestones
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {journey.milestones.map((milestone) => (
                  <Card 
                    key={milestone.id} 
                    className={`p-4 ${milestone.isCompleted ? 'bg-green-50 border-green-200' : 
                      milestone.isUnlocked ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        milestone.isCompleted ? 'bg-green-600' : 
                        milestone.isUnlocked ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}>
                        {milestone.isCompleted ? 
                          <Trophy className="w-4 h-4 text-white" /> :
                          <Target className="w-4 h-4 text-white" />
                        }
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{milestone.title}</h4>
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {milestone.threshold}% Progress
                          </Badge>
                          {milestone.reward && (
                            <Badge variant="secondary" className="text-xs">
                              Reward: {milestone.reward.description}
                            </Badge>
                          )}
                        </div>
                        {milestone.completedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Completed: {new Date(milestone.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Milestone Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 z-10"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-6xl"
            >
              🎉
            </motion.div>
            <div className="absolute text-center text-white">
              <h2 className="text-2xl font-bold mb-2">Milestone Completed!</h2>
              <p className="text-lg">Great progress on your learning journey!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// Learning Path Dashboard Widget
function LearningPathDashboard() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  // Fetch user's learning journeys
  const { data: journeys, isLoading } = useQuery({
    queryKey: ["/api/learning-paths/my-journeys", { userId: user?.id }]
  }) as { data: LearningJourney[] | undefined; isLoading: boolean };

  // Fetch progress statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/learning-paths/progress-stats", { userId: user?.id }]
  }) as { data: ProgressStats | undefined; isLoading: boolean };

  const getPriorityColor = (dueDate?: string) => {
    if (!dueDate) return "text-gray-500";
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return "text-red-600";
    if (days <= 3) return "text-orange-500";
    if (days <= 7) return "text-yellow-500";
    return "text-green-500";
  };

  const sortedJourneys = journeys?.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Paths</p>
                <p className="text-2xl font-bold" data-testid="stat-active-paths">
                  {stats?.activeEnrollments || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Progress</p>
                <p className="text-2xl font-bold" data-testid="stat-average-progress">
                  {Math.round(stats?.averageProgress || 0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Flame className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold" data-testid="stat-current-streak">
                  {stats?.streaks.currentStreak || 0} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Trophy className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Milestones</p>
                <p className="text-2xl font-bold" data-testid="stat-milestones">
                  {stats?.milestones.completedMilestones || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Paths Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              My Learning Paths
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                data-testid="view-grid"
              >
                Grid
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                data-testid="view-list"
              >
                List
              </Button>
            </div>
          </div>
          <CardDescription>
            Track your progress across all enrolled learning paths
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : sortedJourneys && sortedJourneys.length > 0 ? (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {sortedJourneys.map((journey) => (
                <Card key={journey.enrollmentId} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">{journey.pathTitle}</h3>
                    <Badge 
                      variant={journey.enrollmentStatus === "completed" ? "default" : "secondary"}
                      className={getPriorityColor(journey.dueDate)}
                    >
                      {journey.enrollmentStatus.replace("_", " ")}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Progress</span>
                      <span className="font-medium">{journey.progress}%</span>
                    </div>
                    <Progress value={journey.progress} className="h-2" />
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {journey.steps.filter(s => s.status === "completed").length} / {journey.steps.length} steps
                      </span>
                      {journey.dueDate && (
                        <span className={`font-medium ${getPriorityColor(journey.dueDate)}`}>
                          Due: {new Date(journey.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {journey.analytics.timeSpent}h
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {journey.analytics.streakDays} day streak
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {journey.analytics.pointsEarned} pts
                      </span>
                    </div>

                    {/* Milestone indicators */}
                    {journey.milestones.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        {journey.milestones.map((milestone) => (
                          <div
                            key={milestone.id}
                            className={`w-2 h-2 rounded-full ${
                              milestone.isCompleted ? 'bg-green-500' :
                              milestone.isUnlocked ? 'bg-yellow-500' : 'bg-gray-300'
                            }`}
                            title={milestone.title}
                          />
                        ))}
                      </div>
                    )}
                    
                    <Button 
                      size="sm" 
                      className="w-full mt-3"
                      data-testid={`continue-journey-${journey.enrollmentId}`}
                    >
                      {journey.progress === 100 ? "Review Journey" : "Continue Learning"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Route className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No learning paths enrolled</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start your learning journey by enrolling in a path
              </p>
              <Button data-testid="browse-paths">
                Browse Learning Paths
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Achievement Celebrations Component
function AchievementCelebrations() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<any>(null);

  // Mock achievement trigger for demonstration
  const triggerCelebration = (achievement: any) => {
    setCurrentAchievement(achievement);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  return (
    <div className="relative">
      {/* Achievement Celebration Modal */}
      <AnimatePresence>
        {showCelebration && currentAchievement && (
          <motion.div
            initial={{ opacity: 0, scale: 0, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 50 }}
            className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
              className="bg-white rounded-lg p-8 text-center max-w-md mx-4"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              
              <h2 className="text-2xl font-bold mb-2 text-yellow-600">
                Achievement Unlocked!
              </h2>
              
              <div className="flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-yellow-500 mr-2" />
                <h3 className="text-xl font-semibold">{currentAchievement.title}</h3>
              </div>
              
              <p className="text-muted-foreground mb-4">
                {currentAchievement.description}
              </p>
              
              <div className="flex items-center justify-center gap-4 text-sm">
                {currentAchievement.points && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    +{currentAchievement.points} points
                  </span>
                )}
                {currentAchievement.badge && (
                  <span className="flex items-center gap-1">
                    <Award className="w-4 h-4 text-blue-500" />
                    New badge
                  </span>
                )}
              </div>
              
              <Button
                onClick={() => setShowCelebration(false)}
                className="mt-6"
              >
                Awesome!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo trigger button */}
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Achievement System
          </CardTitle>
          <CardDescription>
            Celebrate milestones and progress with dynamic achievements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => triggerCelebration({
              title: "First Steps",
              description: "You completed your first learning step!",
              points: 50,
              badge: true
            })}
            data-testid="demo-achievement"
          >
            Demo Achievement
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Enhanced Progress Indicators Component
export default function EnhancedProgressIndicators() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Fetch sample journey for visualization
  const { data: sampleJourney } = useQuery({
    queryKey: ["/api/learning-paths/sample-journey"],
    enabled: activeTab === "visualization"
  }) as { data: LearningJourney | undefined; isLoading: boolean };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Progress Indicators</h1>
          <p className="text-muted-foreground">
            Visualize learning journeys with progress maps, milestones, and celebrations
          </p>
        </div>
      </div>

      {/* Always show the dashboard */}
      <LearningPathDashboard />

      {/* Journey Visualization (when sample data available) */}
      {sampleJourney && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Journey Visualization</h2>
          <JourneyVisualization journey={sampleJourney} />
        </div>
      )}

      {/* Achievement Celebrations */}
      <AchievementCelebrations />
    </div>
  );
}