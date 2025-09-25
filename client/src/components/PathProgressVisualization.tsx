import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { 
  CheckCircle, 
  Circle, 
  Play, 
  Lock, 
  Trophy, 
  Star,
  Clock,
  Target,
  ArrowRight,
  PlayCircle,
  Award,
  BookOpen,
  Video,
  FileText,
  ExternalLink,
  ClipboardList,
  MapPin,
  Flag,
  Sparkles
} from "lucide-react";

interface PathStep {
  id: string;
  title: string;
  description: string;
  stepType: 'course' | 'quiz' | 'video' | 'document' | 'external' | 'assessment';
  isOptional: boolean;
  orderIndex: number;
  estimatedDuration?: number;
  resourceId?: string;
  passingScore?: number;
  isCompleted?: boolean;
  progress?: number;
  status?: 'not_started' | 'in_progress' | 'completed' | 'locked';
  completedAt?: string;
  score?: number;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  pathType: 'linear' | 'non_linear' | 'adaptive';
  category: string;
  estimatedDuration: number;
  steps?: PathStep[];
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
}

interface PathProgressVisualizationProps {
  pathId: string;
  enrollmentId?: string;
  showTitle?: boolean;
  compact?: boolean;
}

export default function PathProgressVisualization({ 
  pathId, 
  enrollmentId, 
  showTitle = true, 
  compact = false 
}: PathProgressVisualizationProps) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);

  // Fetch learning path with steps
  const { data: pathData, isLoading } = useQuery({
    queryKey: [`/api/learning-paths/${pathId}/with-steps`],
    enabled: !!pathId,
  });

  // Fetch user enrollment if enrollmentId provided
  const { data: enrollment } = useQuery({
    queryKey: [`/api/learning-path-enrollments/${enrollmentId}`],
    enabled: !!enrollmentId,
  });

  // Fetch step progress for this enrollment
  const { data: stepProgress = [] } = useQuery({
    queryKey: [`/api/learning-path-enrollments/${enrollmentId}/progress`],
    enabled: !!enrollmentId,
  });

  // Process steps with progress data - fix circular reference bug
  const processedSteps = pathData?.steps?.reduce((acc: PathStep[], step: PathStep, index: number) => {
    const progress = stepProgress.find((p: any) => p.stepId === step.id);
    const isCompleted = progress?.status === 'completed' || progress?.isCompleted;
    const isInProgress = progress?.status === 'in_progress';
    
    // Check if previous step is completed (for linear paths)
    const prevStepCompleted = index === 0 || (acc[index - 1]?.isCompleted || step.isOptional);
    const isLocked = !isCompleted && !isInProgress && !prevStepCompleted;
    
    const processedStep = {
      ...step,
      isCompleted,
      progress: progress?.progress || 0,
      status: (isCompleted ? 'completed' : 
               isInProgress ? 'in_progress' : 
               isLocked ? 'locked' : 
               'not_started') as 'completed' | 'in_progress' | 'locked' | 'not_started',
      completedAt: progress?.completedAt,
      score: progress?.score,
    };
    
    acc.push(processedStep);
    return acc;
  }, []) || [];

  // Calculate overall progress
  const completedSteps = processedSteps.filter(step => step.isCompleted).length;
  const totalSteps = processedSteps.length;
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Get step icon based on type
  const getStepIcon = (stepType: string, status: string) => {
    const iconClass = `h-6 w-6 ${
      status === 'completed' ? 'text-green-600' :
      status === 'in_progress' ? 'text-blue-600' :
      status === 'locked' ? 'text-gray-400' :
      'text-gray-500'
    }`;

    switch (stepType) {
      case 'course':
        return <BookOpen className={iconClass} />;
      case 'video':
        return <Video className={iconClass} />;
      case 'quiz':
        return <ClipboardList className={iconClass} />;
      case 'document':
        return <FileText className={iconClass} />;
      case 'external':
        return <ExternalLink className={iconClass} />;
      case 'assessment':
        return <Target className={iconClass} />;
      default:
        return <Circle className={iconClass} />;
    }
  };

  // Draw journey visualization on canvas with resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || processedSteps.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawCanvas = () => {
      // Set canvas size
      const containerWidth = canvas.offsetWidth;
      const containerHeight = compact ? 120 : 200;
      canvas.width = containerWidth * window.devicePixelRatio;
      canvas.height = containerHeight * window.devicePixelRatio;
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${containerHeight}px`;
      
      // Reset transform before scaling to prevent accumulation
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, containerWidth, containerHeight);

    // Journey path settings
    const padding = 40;
    const pathY = containerHeight / 2;
    const stepRadius = compact ? 12 : 16;
    const pathWidth = containerWidth - (padding * 2);
    const stepSpacing = pathWidth / Math.max(1, processedSteps.length - 1);

    // Draw journey path
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(padding, pathY);
    ctx.lineTo(containerWidth - padding, pathY);
    ctx.stroke();

    // Draw completed path sections
    if (completedSteps > 0) {
      const completedDistance = (completedSteps - 1) * stepSpacing;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(padding, pathY);
      ctx.lineTo(padding + completedDistance, pathY);
      ctx.stroke();
    }

    // Draw steps
    processedSteps.forEach((step, index) => {
      const x = padding + (index * stepSpacing);
      const y = pathY;

      // Step circle
      ctx.beginPath();
      ctx.arc(x, y, stepRadius, 0, Math.PI * 2);
      
      // Fill color based on status
      switch (step.status) {
        case 'completed':
          ctx.fillStyle = '#22c55e';
          break;
        case 'in_progress':
          ctx.fillStyle = '#3b82f6';
          break;
        case 'locked':
          ctx.fillStyle = '#9ca3af';
          break;
        default:
          ctx.fillStyle = '#ffffff';
          break;
      }
      ctx.fill();

      // Border
      ctx.strokeStyle = step.status === 'not_started' ? '#d1d5db' : ctx.fillStyle;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Step number or checkmark
      ctx.fillStyle = step.status === 'completed' || step.status === 'in_progress' ? '#ffffff' : '#6b7280';
      ctx.font = `bold ${compact ? '10' : '12'}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (step.status === 'completed') {
        // Draw checkmark
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x - 1, y + 3);
        ctx.lineTo(x + 4, y - 3);
        ctx.stroke();
      } else {
        // Draw step number
        ctx.fillText(String(index + 1), x, y);
      }

      // Milestone markers for important steps
      if (index === 0 || index === processedSteps.length - 1 || step.stepType === 'assessment') {
        const flagY = y - stepRadius - 15;
        ctx.fillStyle = index === 0 ? '#10b981' : index === processedSteps.length - 1 ? '#f59e0b' : '#8b5cf6';
        ctx.beginPath();
        ctx.moveTo(x, flagY);
        ctx.lineTo(x + 8, flagY + 4);
        ctx.lineTo(x, flagY + 8);
        ctx.lineTo(x - 8, flagY + 4);
        ctx.closePath();
        ctx.fill();
      }
    });
    };

    // Initial draw
    drawCanvas();

    // Add resize observer for responsiveness
    const resizeObserver = new ResizeObserver(() => {
      drawCanvas();
    });
    
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [processedSteps, completedSteps, compact]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="flex space-x-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded flex-1"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pathData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Learning path not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden" data-testid="path-progress-visualization">
      {showTitle && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Flag className="h-5 w-5 text-primary" />
                <span>{pathData.title}</span>
              </CardTitle>
              <CardDescription>{pathData.description}</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{Math.round(overallProgress)}%</div>
              <div className="text-sm text-muted-foreground">
                {completedSteps} of {totalSteps} completed
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Progress value={overallProgress} className="h-2" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Started {enrollment?.enrolledAt ? new Date(enrollment.enrolledAt).toLocaleDateString() : 'recently'}</span>
              {enrollment?.status === 'completed' && enrollment.completedAt && (
                <span className="flex items-center space-x-1">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span>Completed {new Date(enrollment.completedAt).toLocaleDateString()}</span>
                </span>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className={compact ? "p-4" : "p-6"}>
        {/* Journey Visualization Canvas */}
        <div className="mb-6">
          <canvas
            ref={canvasRef}
            className="w-full border-0"
            style={{ height: compact ? '120px' : '200px' }}
          />
        </div>

        {/* Step Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Learning Journey</h3>
            <Badge variant="outline" className="capitalize">
              {pathData.pathType?.replace('_', ' ')} Path
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedSteps.map((step, index) => (
              <Card 
                key={step.id}
                className={`transition-all cursor-pointer ${
                  hoveredStep === step.id ? 'ring-2 ring-primary' : ''
                } ${
                  step.status === 'completed' ? 'bg-green-50 border-green-200' :
                  step.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
                  step.status === 'locked' ? 'bg-gray-50 border-gray-200' :
                  'bg-white'
                }`}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
                data-testid={`step-card-${step.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`p-2 rounded-full ${
                        step.status === 'completed' ? 'bg-green-100' :
                        step.status === 'in_progress' ? 'bg-blue-100' :
                        step.status === 'locked' ? 'bg-gray-100' :
                        'bg-gray-100'
                      }`}>
                        {getStepIcon(step.stepType, step.status)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Step {index + 1}
                        </span>
                        {step.isOptional && (
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        )}
                        {step.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      
                      <h4 className="font-medium text-sm mb-1 truncate">{step.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {step.description}
                      </p>
                      
                      {/* Step progress */}
                      {step.status === 'in_progress' && step.progress && step.progress > 0 && (
                        <div className="mb-2">
                          <Progress value={step.progress} className="h-1" />
                          <span className="text-xs text-muted-foreground">{Math.round(step.progress)}% complete</span>
                        </div>
                      )}

                      {/* Step metadata */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {step.estimatedDuration && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{Math.round(step.estimatedDuration / 60)}min</span>
                          </div>
                        )}
                        
                        {step.status === 'completed' && step.score && (
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span>{step.score}%</span>
                          </div>
                        )}
                      </div>

                      {/* Action button */}
                      <div className="mt-3">
                        {step.status === 'completed' ? (
                          <Button variant="outline" size="sm" className="w-full" disabled>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Button>
                        ) : step.status === 'in_progress' ? (
                          <Link href={`/learning-paths/${pathId}/steps/${step.id}`}>
                            <Button size="sm" className="w-full" data-testid={`button-continue-step-${step.id}`}>
                              <PlayCircle className="h-3 w-3 mr-1" />
                              Continue
                            </Button>
                          </Link>
                        ) : step.status === 'locked' ? (
                          <Button variant="outline" size="sm" className="w-full" disabled>
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </Button>
                        ) : (
                          <Link href={`/learning-paths/${pathId}/steps/${step.id}`}>
                            <Button variant="outline" size="sm" className="w-full" data-testid={`button-start-step-${step.id}`}>
                              <Play className="h-3 w-3 mr-1" />
                              Start
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Completion celebration */}
          {enrollment?.status === 'completed' && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Trophy className="h-8 w-8 text-yellow-600" />
                  <Sparkles className="h-6 w-6 text-yellow-500" />
                </div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Congratulations! 🎉
                </h3>
                <p className="text-yellow-700 mb-4">
                  You have successfully completed the "{pathData.title}" learning path!
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <Button variant="outline" size="sm">
                    <Award className="h-4 w-4 mr-1" />
                    View Certificate
                  </Button>
                  <Button variant="outline" size="sm">
                    <Target className="h-4 w-4 mr-1" />
                    Explore More Paths
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}