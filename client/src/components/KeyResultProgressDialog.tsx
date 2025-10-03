import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  Info,
  Percent,
  Hash,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";

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
  objectiveId?: string;
  teamObjectiveId?: string;
}

interface ProgressUpdate {
  id: string;
  keyResultId: string;
  keyResultType: "company" | "team";
  previousValue: number;
  newValue: number;
  confidenceScore?: number | null;
  notes?: string | null;
  timestamp: string;
  updatedBy: string;
}

interface KeyResultProgressDialogProps {
  keyResult: KeyResult | null;
  isOpen: boolean;
  onClose: () => void;
  keyResultType: "company" | "team";
}

export function KeyResultProgressDialog({
  keyResult,
  isOpen,
  onClose,
  keyResultType
}: KeyResultProgressDialogProps) {
  const [newValue, setNewValue] = useState<string>("");
  const [confidenceScore, setConfidenceScore] = useState<number>(5);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when dialog opens with new key result
  useEffect(() => {
    if (keyResult) {
      setNewValue(keyResult.currentValue.toString());
      setConfidenceScore(keyResult.confidenceScore || 5);
      setNotes("");
    }
  }, [keyResult]);

  // Fetch progress history
  const { data: progressHistory } = useQuery<ProgressUpdate[]>({
    queryKey: ["/api/key-results", keyResult?.id, "progress-history", { type: keyResultType }],
    enabled: isOpen && !!keyResult,
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (data: {
      keyResultId: string;
      keyResultType: "company" | "team";
      previousValue: number;
      newValue: number;
      confidenceScore: number;
      notes: string;
    }) => {
      await apiRequest("POST", "/api/key-results/progress", data);
      
      // Also update the key result's current value
      const endpoint = keyResultType === "company" 
        ? `/api/key-results/${keyResult?.id}`
        : `/api/team-key-results/${keyResult?.id}`;
      
      await apiRequest("PATCH", endpoint, {
        currentValue: data.newValue,
        confidenceScore: data.confidenceScore,
        lastConfidenceUpdate: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      // Invalidate all relevant queries for immediate UI refresh
      if (keyResultType === "company") {
        queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
        // Invalidate the specific objective's key results
        if (keyResult?.objectiveId) {
          queryClient.invalidateQueries({ 
            queryKey: ["/api/objectives", keyResult.objectiveId, "key-results"] 
          });
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/team-objectives"] });
        // Invalidate the specific team objective's key results
        if (keyResult?.teamObjectiveId) {
          queryClient.invalidateQueries({ 
            queryKey: ["/api/team-objectives", keyResult.teamObjectiveId, "key-results"] 
          });
        }
      }
      // Invalidate progress history
      queryClient.invalidateQueries({ 
        queryKey: ["/api/key-results", keyResult?.id, "progress-history"] 
      });
      
      toast({
        title: "Progress updated!",
        description: "Key result has been updated successfully.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keyResult) return;

    const parsedValue = parseFloat(newValue);
    if (isNaN(parsedValue)) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid number.",
        variant: "destructive",
      });
      return;
    }

    updateProgressMutation.mutate({
      keyResultId: keyResult.id,
      keyResultType,
      previousValue: keyResult.currentValue,
      newValue: parsedValue,
      confidenceScore,
      notes: notes.trim() || "",
    });
  };

  if (!keyResult) return null;

  // Calculate new progress
  const range = keyResult.targetValue - keyResult.startValue;
  const currentProgress = range === 0 
    ? 100 
    : Math.min(100, Math.max(0, ((keyResult.currentValue - keyResult.startValue) / range) * 100));
  
  const parsedNewValue = parseFloat(newValue);
  const newProgress = !isNaN(parsedNewValue) && range !== 0
    ? Math.min(100, Math.max(0, ((parsedNewValue - keyResult.startValue) / range) * 100))
    : currentProgress;

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

  const getMetricIcon = () => {
    switch (keyResult.metricType) {
      case "percentage":
        return Percent;
      case "currency":
        return DollarSign;
      case "boolean":
        return CheckCircle;
      default:
        return Hash;
    }
  };

  const MetricIcon = getMetricIcon();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Update Key Result Progress
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Result Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <h4 className="font-medium text-sm flex-1">{keyResult.title}</h4>
              <Badge variant="secondary" className="flex items-center gap-1">
                <MetricIcon className="w-3 h-3" />
                {keyResult.metricType}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Start</div>
                <div className="font-semibold text-sm">{formatValue(keyResult.startValue)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Current</div>
                <div className="font-bold text-sm">{formatValue(keyResult.currentValue)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Target</div>
                <div className="font-semibold text-sm">{formatValue(keyResult.targetValue)}</div>
              </div>
            </div>
          </div>

          {/* Update Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Value Input */}
            <div className="space-y-2">
              <Label htmlFor="newValue">New Value</Label>
              <Input
                id="newValue"
                type="number"
                step={keyResult.metricType === "currency" ? "0.01" : "1"}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={`Enter new ${keyResult.unit} value`}
                data-testid="input-kr-new-value"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="w-4 h-4" />
                <span>
                  Progress: {currentProgress.toFixed(0)}% → {newProgress.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Progress Preview */}
            <div className="space-y-2">
              <Label>Progress Preview</Label>
              <Progress value={newProgress} className="h-3" />
            </div>

            {/* Confidence Score */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="confidence">Confidence Score</Label>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {confidenceScore}/10
                </Badge>
              </div>
              <Slider
                id="confidence"
                min={1}
                max={10}
                step={1}
                value={[confidenceScore]}
                onValueChange={(value) => setConfidenceScore(value[0])}
                className="py-2"
                data-testid="slider-kr-confidence"
              />
              <p className="text-xs text-muted-foreground">
                Rate your confidence in achieving the target (1 = Low, 10 = High)
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add context about this update..."
                rows={3}
                data-testid="textarea-kr-notes"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProgressMutation.isPending}
                data-testid="button-submit-kr-progress"
              >
                {updateProgressMutation.isPending ? "Updating..." : "Update Progress"}
              </Button>
            </div>
          </form>

          {/* Progress History */}
          {progressHistory && progressHistory.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Recent Updates</Label>
              </div>
              <ScrollArea className="h-48 rounded-md border">
                <div className="p-3 space-y-3">
                  {progressHistory.slice(0, 10).map((update, index) => (
                    <div 
                      key={update.id} 
                      className="text-xs pb-3 border-b last:border-0"
                      data-testid={`progress-history-${index}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {formatValue(update.previousValue)} → {formatValue(update.newValue)}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(update.timestamp), "MMM d, HH:mm")}
                        </span>
                      </div>
                      {update.confidenceScore && (
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Activity className="w-3 h-3" />
                          <span>Confidence: {update.confidenceScore}/10</span>
                        </div>
                      )}
                      {update.notes && (
                        <p className="text-muted-foreground mt-1">{update.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
