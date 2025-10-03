import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Percent, 
  Hash, 
  DollarSign, 
  CheckCircle,
  Activity,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyResult {
  id: string;
  title: string;
  metricType: "percentage" | "numeric" | "currency" | "boolean";
  startValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  confidenceScore?: number | null;
  lastConfidenceUpdate?: string | null;
  ownerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KeyResultCardProps {
  keyResult: KeyResult;
  ownerName?: string;
  onUpdateProgress?: (keyResult: KeyResult) => void;
  isCompanyLevel?: boolean;
}

export function KeyResultCard({ 
  keyResult, 
  ownerName, 
  onUpdateProgress,
  isCompanyLevel = false 
}: KeyResultCardProps) {
  
  // Calculate progress percentage
  const range = keyResult.targetValue - keyResult.startValue;
  const progress = range === 0 
    ? 100 
    : Math.min(100, Math.max(0, ((keyResult.currentValue - keyResult.startValue) / range) * 100));

  // Get metric type icon and label
  const getMetricInfo = () => {
    switch (keyResult.metricType) {
      case "percentage":
        return { icon: Percent, label: "Percentage", color: "bg-blue-500" };
      case "numeric":
        return { icon: Hash, label: "Numeric", color: "bg-green-500" };
      case "currency":
        return { icon: DollarSign, label: "Currency", color: "bg-purple-500" };
      case "boolean":
        return { icon: CheckCircle, label: "Yes/No", color: "bg-orange-500" };
      default:
        return { icon: Hash, label: "Numeric", color: "bg-gray-500" };
    }
  };

  const metricInfo = getMetricInfo();
  const MetricIcon = metricInfo.icon;

  // Format value based on metric type
  const formatValue = (value: number) => {
    switch (keyResult.metricType) {
      case "percentage":
        return `${value}%`;
      case "currency":
        return `£${value.toLocaleString()}`;
      case "boolean":
        return value > 0 ? "Yes" : "No";
      default:
        return `${value} ${keyResult.unit}`;
    }
  };

  // Get confidence color
  const getConfidenceColor = (score?: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 8) return "text-green-600 dark:text-green-400";
    if (score >= 5) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  // Get progress color
  const getProgressColor = () => {
    if (progress >= 75) return "bg-green-500";
    if (progress >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow" data-testid={`kr-card-${keyResult.id}`}>
      <div className="space-y-3">
        {/* Header: Title and Metric Type Badge */}
        <div className="flex items-start justify-between gap-2">
          <h5 className="font-medium text-sm flex-1" data-testid={`kr-title-${keyResult.id}`}>
            {keyResult.title}
          </h5>
          <Badge 
            variant="secondary" 
            className="flex items-center gap-1 text-xs shrink-0"
            data-testid={`kr-metric-badge-${keyResult.id}`}
          >
            <MetricIcon className="w-3 h-3" />
            {metricInfo.label}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span data-testid={`kr-progress-label-${keyResult.id}`}>
              {progress.toFixed(0)}% Complete
            </span>
            <span className={cn("font-medium", getConfidenceColor(keyResult.confidenceScore))}>
              {keyResult.confidenceScore && (
                <span className="flex items-center gap-1" data-testid={`kr-confidence-${keyResult.id}`}>
                  <Activity className="w-3 h-3" />
                  Confidence: {keyResult.confidenceScore}/10
                </span>
              )}
            </span>
          </div>
          <Progress 
            value={progress} 
            className="h-2"
            data-testid={`kr-progress-bar-${keyResult.id}`}
          />
        </div>

        {/* Values Display */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground mb-0.5">Start</div>
            <div className="font-semibold text-sm" data-testid={`kr-start-value-${keyResult.id}`}>
              {formatValue(keyResult.startValue)}
            </div>
          </div>
          <div className="bg-primary/10 rounded p-2 border-2 border-primary/20">
            <div className="text-xs text-muted-foreground mb-0.5">Current</div>
            <div className="font-bold text-sm" data-testid={`kr-current-value-${keyResult.id}`}>
              {formatValue(keyResult.currentValue)}
            </div>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground mb-0.5">Target</div>
            <div className="font-semibold text-sm" data-testid={`kr-target-value-${keyResult.id}`}>
              {formatValue(keyResult.targetValue)}
            </div>
          </div>
        </div>

        {/* Footer: Owner and Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          {isCompanyLevel && ownerName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span data-testid={`kr-owner-${keyResult.id}`}>{ownerName}</span>
            </div>
          )}
          {!isCompanyLevel && !ownerName && (
            <div className="text-xs text-muted-foreground">Team Key Result</div>
          )}
          {!isCompanyLevel && !ownerName && <div />}
          
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={() => onUpdateProgress?.(keyResult)}
            data-testid={`button-update-kr-${keyResult.id}`}
          >
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            Update Progress
          </Button>
        </div>
      </div>
    </Card>
  );
}
