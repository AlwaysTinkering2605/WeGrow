import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Clock, 
  Zap,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  Lightbulb
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RealTimeOptimizationProps {
  enrollmentId: string;
  onOptimizationUpdate?: (optimization: any) => void;
}

export default function RealTimeOptimization({ enrollmentId, onOptimizationUpdate }: RealTimeOptimizationProps) {
  const { toast } = useToast();
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Query for current optimization status
  const { data: optimizationStatus, isLoading } = useQuery({
    queryKey: [`/api/learning-paths/optimization-status/${enrollmentId}`],
    enabled: !!enrollmentId,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Mutation for triggering optimization
  const triggerOptimizationMutation = useMutation({
    mutationFn: (data: { triggeredByStepCompletion?: boolean }) => 
      apiRequest(`/api/learning-paths/optimize/${enrollmentId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onMutate: () => setIsOptimizing(true),
    onSuccess: (data) => {
      toast({ 
        title: "Learning Path Optimized", 
        description: `Applied ${data.optimizations.stepReordering.length + data.optimizations.contentAdjustments.length} optimizations based on your performance`
      });
      queryClient.invalidateQueries({ queryKey: [`/api/learning-paths/optimization-status/${enrollmentId}`] });
      if (onOptimizationUpdate) onOptimizationUpdate(data);
      setIsOptimizing(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Optimization Failed", 
        description: error.message, 
        variant: "destructive" 
      });
      setIsOptimizing(false);
    },
  });

  const handleOptimizeNow = () => {
    triggerOptimizationMutation.mutate({ triggeredByStepCompletion: false });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Real-Time Optimization</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!optimizationStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Real-Time Optimization</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No optimization data available for this learning path.</p>
        </CardContent>
      </Card>
    );
  }

  const { currentProgress, performance, adaptations } = optimizationStatus;

  return (
    <div className="space-y-6">
      {/* Optimization Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Real-Time Learning Optimization</span>
            </div>
            <Badge variant={optimizationStatus.optimizationEnabled ? "default" : "secondary"}>
              {optimizationStatus.optimizationEnabled ? "Active" : "Disabled"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg" data-testid="progress-metric">
              <div className="text-2xl font-bold text-blue-600">{currentProgress?.progressPercentage || 0}%</div>
              <div className="text-sm text-muted-foreground">Progress</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg" data-testid="completion-metric">
              <div className="text-2xl font-bold text-green-600">{currentProgress?.completedSteps || 0}</div>
              <div className="text-sm text-muted-foreground">Steps Completed</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg" data-testid="performance-metric">
              <div className="text-2xl font-bold text-purple-600">{performance?.averageScore || 0}%</div>
              <div className="text-sm text-muted-foreground">Avg Score</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg" data-testid="trend-metric">
              <div className="text-2xl font-bold text-orange-600 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 mr-1" />
                {performance?.trend || 'stable'}
              </div>
              <div className="text-sm text-muted-foreground">Trend</div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Current Adaptations */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3 flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Active Adaptations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {adaptations?.skipBasics && (
                <div className="flex items-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded border border-yellow-200">
                  <CheckCircle className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm">Basic content skipped ({adaptations.adaptedRequirement} steps required)</span>
                </div>
              )}
              
              {adaptations?.addRemedial && (
                <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200">
                  <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm">Extra support added ({adaptations.adaptedRequirement} steps required)</span>
                </div>
              )}
              
              {!adaptations?.skipBasics && !adaptations?.addRemedial && (
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-950 rounded border border-gray-200 col-span-2">
                  <Target className="h-4 w-4 text-gray-600 mr-2" />
                  <span className="text-sm">Standard path - no adaptations needed</span>
                </div>
              )}
            </div>
          </div>

          {/* Optimization Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-1" />
              Last optimized: {new Date(optimizationStatus.lastOptimized).toLocaleTimeString()}
            </div>
            
            <Button 
              onClick={handleOptimizeNow}
              disabled={isOptimizing}
              className="flex items-center space-x-2"
              data-testid="optimize-now-button"
            >
              <Brain className="h-4 w-4" />
              <span>{isOptimizing ? 'Optimizing...' : 'Optimize Now'}</span>
              {!isOptimizing && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5" />
            <span>Performance Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Learning Consistency</span>
              <div className="text-right">
                <div className="text-sm font-bold">{performance?.consistencyScore || 0}%</div>
                <Progress value={performance?.consistencyScore || 0} className="w-24 h-2 mt-1" />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Performance Trend</span>
              <div className="flex items-center">
                <TrendingUp className={`h-4 w-4 mr-1 ${
                  performance?.trend === 'improving' ? 'text-green-500' :
                  performance?.trend === 'declining' ? 'text-red-500' :
                  'text-gray-500'
                }`} />
                <span className="text-sm capitalize">{performance?.trend || 'stable'}</span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <strong>Real-time optimization</strong> automatically adjusts your learning path based on performance patterns,
              learning velocity, and competency progress to maximize your learning outcomes.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}