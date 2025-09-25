import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Lightbulb,
  BookOpen,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  Zap,
  BarChart3,
  Users,
  Star,
  ArrowRight,
  RefreshCw,
  Settings,
  Route,
  Gauge,
  Activity,
  Sparkles,
  ChevronRight,
  Info
} from "lucide-react";

interface LearnerProfile {
  userId: string;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  preferredPace: 'fast' | 'medium' | 'slow';
  difficultyPreference: 'challenging' | 'moderate' | 'gentle';
  availableTime: number; // minutes per week
  strongCompetencies: string[];
  developmentAreas: string[];
  careerGoals: string[];
  performanceMetrics: {
    averageScore: number;
    completionRate: number;
    engagementLevel: number;
    consistencyScore: number;
    learningVelocity: number;
  };
}

interface AdaptiveRecommendation {
  id: string;
  type: 'learning_path' | 'course' | 'resource' | 'break' | 'review';
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number;
  pathId?: string;
  courseId?: string;
  resourceId?: string;
  adaptations: {
    adjustedDifficulty?: 'easier' | 'harder';
    adjustedPace?: 'faster' | 'slower';
    suggestedFormat?: string;
    prerequisiteReview?: boolean;
  };
  metadata: any;
}

interface PerformanceInsight {
  category: 'strength' | 'improvement' | 'concern' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestedActions: string[];
  data: any;
}

interface AdaptivePathProgress {
  enrollmentId: string;
  pathType: string;
  completionCriteria: any;
  performance: {
    averageScore: number;
    trend: 'improving' | 'declining' | 'stable';
    consistencyScore: number;
    recentScores: number[];
  };
  adaptations: {
    skipBasics: boolean;
    addRemedial: boolean;
    originalRequirement: number;
    adaptedRequirement: number;
  };
  completedSteps: number;
  isCompleted: boolean;
  progressPercentage: number;
  availableSteps: any[];
  stepProgresses: any[];
}

export default function AdaptiveLearningEngine() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("recommendations");
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);

  // Fetch learner profile and performance data
  const { data: learnerProfile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/adaptive-learning/profile/${user?.id}`],
    enabled: !!user?.id,
    initialData: {
      userId: user?.id || '',
      learningStyle: 'visual',
      preferredPace: 'medium',
      difficultyPreference: 'moderate',
      availableTime: 300,
      strongCompetencies: [],
      developmentAreas: [],
      careerGoals: [],
      performanceMetrics: {
        averageScore: 0,
        completionRate: 0,
        engagementLevel: 0,
        consistencyScore: 0,
        learningVelocity: 0,
      },
    } as LearnerProfile
  });

  // Fetch adaptive recommendations
  const { data: recommendations = [], isLoading: recommendationsLoading } = useQuery({
    queryKey: [`/api/adaptive-learning/recommendations/${user?.id}`],
    enabled: !!user?.id,
  }) as { data: AdaptiveRecommendation[]; isLoading: boolean };

  // Fetch performance insights
  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: [`/api/adaptive-learning/insights/${user?.id}`],
    enabled: !!user?.id,
  }) as { data: PerformanceInsight[]; isLoading: boolean };

  // Fetch adaptive path progress for active enrollments
  const { data: adaptiveProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: [`/api/adaptive-learning/path-progress/${user?.id}`],
    enabled: !!user?.id,
  }) as { data: AdaptivePathProgress[]; isLoading: boolean };

  // Accept recommendation mutation
  const acceptRecommendationMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      const response = await apiRequest(`/api/adaptive-learning/accept-recommendation/${recommendationId}`, {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Recommendation Applied",
        description: "Your learning path has been updated based on your personalized recommendation.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/adaptive-learning/recommendations/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/learning-path-enrollments`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply recommendation.",
        variant: "destructive",
      });
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: Partial<LearnerProfile>) => {
      const response = await apiRequest(`/api/adaptive-learning/profile/${user?.id}`, {
        method: 'PATCH',
        body: JSON.stringify(preferences)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your learning preferences have been saved and will improve future recommendations.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/adaptive-learning/profile/${user?.id}`] });
    },
  });

  const getPerformanceColor = (score: number) => {
    if (score >= 85) return "text-green-600 bg-green-100";
    if (score >= 70) return "text-blue-600 bg-blue-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getPriorityColor = (priority: string) => {
    const priorityColors = {
      high: "text-red-600 bg-red-100",
      medium: "text-yellow-600 bg-yellow-100",
      low: "text-green-600 bg-green-100",
    };
    return priorityColors[priority as keyof typeof priorityColors] || "text-gray-600 bg-gray-100";
  };

  const RecommendationCard = ({ recommendation }: { recommendation: AdaptiveRecommendation }) => (
    <Card className="relative group hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-primary/10">
              {recommendation.type === 'learning_path' && <Route className="h-5 w-5 text-primary" />}
              {recommendation.type === 'course' && <BookOpen className="h-5 w-5 text-primary" />}
              {recommendation.type === 'resource' && <Lightbulb className="h-5 w-5 text-primary" />}
              {recommendation.type === 'break' && <Clock className="h-5 w-5 text-primary" />}
              {recommendation.type === 'review' && <RefreshCw className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <CardTitle className="text-lg">{recommendation.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{recommendation.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getPriorityColor(recommendation.priority)}>
              {recommendation.priority}
            </Badge>
            <Badge variant="outline">
              {recommendation.confidence}% match
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-1">Why this recommendation?</p>
          <p className="text-sm text-blue-700">{recommendation.reasoning}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{recommendation.estimatedTime} minutes</span>
          </div>
          <div className="flex items-center space-x-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <span>{recommendation.confidence}% confidence</span>
          </div>
        </div>

        {recommendation.adaptations && Object.keys(recommendation.adaptations).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Personalized Adaptations:</p>
            <div className="space-y-1">
              {recommendation.adaptations.adjustedDifficulty && (
                <Badge variant="outline" className="mr-2">
                  {recommendation.adaptations.adjustedDifficulty === 'easier' ? '📉' : '📈'} 
                  {recommendation.adaptations.adjustedDifficulty} difficulty
                </Badge>
              )}
              {recommendation.adaptations.adjustedPace && (
                <Badge variant="outline" className="mr-2">
                  ⏱️ {recommendation.adaptations.adjustedPace} pace
                </Badge>
              )}
              {recommendation.adaptations.prerequisiteReview && (
                <Badge variant="outline" className="mr-2">
                  🔄 Includes review
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm">
            <Info className="h-4 w-4 mr-2" />
            Learn More
          </Button>
          <Button 
            onClick={() => acceptRecommendationMutation.mutate(recommendation.id)}
            disabled={acceptRecommendationMutation.isPending}
            data-testid={`button-accept-recommendation-${recommendation.id}`}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Apply Recommendation
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const InsightCard = ({ insight }: { insight: PerformanceInsight }) => (
    <Card className={`cursor-pointer transition-all ${selectedInsight === insight.title ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedInsight(selectedInsight === insight.title ? null : insight.title)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {insight.category === 'strength' && <Star className="h-5 w-5 text-green-500" />}
            {insight.category === 'improvement' && <TrendingUp className="h-5 w-5 text-blue-500" />}
            {insight.category === 'concern' && <AlertTriangle className="h-5 w-5 text-red-500" />}
            {insight.category === 'trend' && <Activity className="h-5 w-5 text-purple-500" />}
            <div>
              <CardTitle className="text-base">{insight.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{insight.description}</p>
            </div>
          </div>
          <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'secondary' : 'outline'}>
            {insight.impact} impact
          </Badge>
        </div>
      </CardHeader>
      {selectedInsight === insight.title && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          {insight.actionable && insight.suggestedActions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Suggested Actions:</p>
              <ul className="space-y-1">
                {insight.suggestedActions.map((action, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );

  const AdaptiveProgressCard = ({ progress }: { progress: AdaptivePathProgress }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Adaptive Learning Path Progress</CardTitle>
        <CardDescription>Path automatically adjusting to your performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm">{progress.progressPercentage}%</span>
          </div>
          <Progress value={progress.progressPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">Performance Trend</p>
            <div className="flex items-center space-x-1">
              {progress.performance.trend === 'improving' && <TrendingUp className="h-4 w-4 text-green-500" />}
              {progress.performance.trend === 'declining' && <TrendingDown className="h-4 w-4 text-red-500" />}
              {progress.performance.trend === 'stable' && <Activity className="h-4 w-4 text-blue-500" />}
              <span className="capitalize">{progress.performance.trend}</span>
            </div>
          </div>
          <div>
            <p className="font-medium">Average Score</p>
            <Badge className={getPerformanceColor(progress.performance.averageScore)}>
              {progress.performance.averageScore}%
            </Badge>
          </div>
        </div>

        {progress.adaptations && (
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-sm font-medium text-amber-900 mb-2">Current Adaptations</p>
            <div className="space-y-1 text-sm text-amber-700">
              {progress.adaptations.skipBasics && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Skipping basic content due to strong performance</span>
                </div>
              )}
              {progress.adaptations.addRemedial && (
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Additional practice added for challenging areas</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>
                  Requirements adjusted: {progress.adaptations.originalRequirement} → {progress.adaptations.adaptedRequirement} steps
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="adaptive-learning-engine">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Adaptive Learning Engine</h1>
            <p className="text-muted-foreground">Personalized learning recommendations powered by AI</p>
          </div>
        </div>
        <Button variant="outline" data-testid="button-refresh-recommendations">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(learnerProfile?.performanceMetrics?.averageScore || 0)}%
                </div>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(learnerProfile?.performanceMetrics?.completionRate || 0)}%
                </div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(learnerProfile?.performanceMetrics?.engagementLevel || 0)}%
                </div>
                <p className="text-sm text-muted-foreground">Engagement</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {(learnerProfile?.performanceMetrics?.learningVelocity || 0).toFixed(1)}x
                </div>
                <p className="text-sm text-muted-foreground">Learning Velocity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendations" data-testid="tab-recommendations">Smart Recommendations</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">Performance Insights</TabsTrigger>
          <TabsTrigger value="adaptive-progress" data-testid="tab-adaptive-progress">Adaptive Progress</TabsTrigger>
          <TabsTrigger value="preferences" data-testid="tab-preferences">Learning Preferences</TabsTrigger>
        </TabsList>

        {/* Smart Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Personalized Recommendations</span>
              </CardTitle>
              <CardDescription>
                AI-powered suggestions based on your learning patterns, performance, and goals
              </CardDescription>
            </CardHeader>
          </Card>

          {recommendationsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recommendations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-center mb-2">Analyzing Your Learning Pattern</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Complete a few more learning activities to receive personalized recommendations.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {recommendations.map((recommendation) => (
                <RecommendationCard key={recommendation.id} recommendation={recommendation} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Performance Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Performance Insights</span>
              </CardTitle>
              <CardDescription>
                Deep analysis of your learning patterns and areas for improvement
              </CardDescription>
            </CardHeader>
          </Card>

          {insightsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Adaptive Progress Tab */}
        <TabsContent value="adaptive-progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Adaptive Learning Progress</span>
              </CardTitle>
              <CardDescription>
                See how your learning paths are automatically adjusting to your performance
              </CardDescription>
            </CardHeader>
          </Card>

          {progressLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : adaptiveProgress.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Route className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-center mb-2">No Adaptive Paths Active</h3>
                <p className="text-muted-foreground text-center">
                  Enroll in adaptive learning paths to see intelligent progress tracking here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {adaptiveProgress.map((progress, index) => (
                <AdaptiveProgressCard key={index} progress={progress} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Learning Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Learning Preferences</span>
              </CardTitle>
              <CardDescription>
                Customize your learning experience to get better recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Learning Style</label>
                    <p className="text-sm text-muted-foreground mb-2">How do you learn best?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['visual', 'auditory', 'kinesthetic', 'reading'].map(style => (
                        <Button key={style} variant="outline" size="sm" className="justify-start">
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Preferred Pace</label>
                    <p className="text-sm text-muted-foreground mb-2">How quickly do you like to progress?</p>
                    <div className="flex space-x-2">
                      {['fast', 'medium', 'slow'].map(pace => (
                        <Button key={pace} variant="outline" size="sm">
                          {pace.charAt(0).toUpperCase() + pace.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Difficulty Preference</label>
                    <p className="text-sm text-muted-foreground mb-2">What level of challenge motivates you?</p>
                    <div className="flex space-x-2">
                      {['gentle', 'moderate', 'challenging'].map(difficulty => (
                        <Button key={difficulty} variant="outline" size="sm">
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Weekly Learning Time</label>
                    <p className="text-sm text-muted-foreground mb-2">How much time can you dedicate per week?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['1-2 hours', '3-5 hours', '6-10 hours', '10+ hours'].map(time => (
                        <Button key={time} variant="outline" size="sm">
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button 
                  onClick={() => updatePreferencesMutation.mutate({})}
                  disabled={updatePreferencesMutation.isPending}
                  data-testid="button-save-preferences"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}