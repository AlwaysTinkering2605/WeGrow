import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

type ConfidenceLevel = "green" | "amber" | "red";

export default function WeeklyCheckIn({ goals }: { goals: any[] }) {
  const [selectedGoal, setSelectedGoal] = useState<string>("");
  const [progress, setProgress] = useState<number[]>([0]);
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>("green");
  const [achievements, setAchievements] = useState("");
  const [challenges, setChallenges] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCheckInMutation = useMutation({
    mutationFn: async (data: {
      goalId: string;
      progress: number;
      confidenceLevel: ConfidenceLevel;
      achievements: string;
      challenges?: string;
      weekOf: string;
    }) => {
      await apiRequest("POST", "/api/check-ins", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setSelectedGoal("");
      setProgress([0]);
      setConfidenceLevel("green");
      setAchievements("");
      setChallenges("");
      toast({
        title: "Check-in submitted!",
        description: "Your weekly progress has been recorded.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to submit check-in. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGoal) {
      toast({
        title: "No goal selected",
        description: "Please select a goal to check in on.",
        variant: "destructive",
      });
      return;
    }

    if (!achievements.trim()) {
      toast({
        title: "Missing achievements",
        description: "Please describe what you've achieved this week.",
        variant: "destructive",
      });
      return;
    }

    const weekOf = new Date();
    weekOf.setDate(weekOf.getDate() - weekOf.getDay()); // Start of current week

    createCheckInMutation.mutate({
      goalId: selectedGoal,
      progress: progress[0],
      confidenceLevel,
      achievements: achievements.trim(),
      challenges: challenges.trim() || undefined,
      weekOf: weekOf.toISOString(),
    });
  };

  if (!goals || goals.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Weekly Check-in</h3>
          <div className="text-center py-8 text-muted-foreground">
            <p>No active goals to check in on</p>
            <p className="text-sm">Create a goal first to start tracking your weekly progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Weekly Check-in</h3>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Due in 2 days
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Goal Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Goal</label>
            <div className="space-y-2">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setSelectedGoal(goal.id)}
                  className={`w-full text-left p-3 border rounded-lg transition-colors ${
                    selectedGoal === goal.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary hover:bg-primary/5"
                  }`}
                  data-testid={`button-select-goal-${goal.id}`}
                >
                  <div className="font-medium">{goal.title}</div>
                  <div className="text-sm text-muted-foreground">
                    Current: {goal.currentValue} / {goal.targetValue} {goal.unit}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedGoal && (
            <>
              {/* Progress Slider */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Progress (0-100%)
                </label>
                <div className="px-4">
                  <Slider
                    value={progress}
                    onValueChange={setProgress}
                    max={100}
                    step={1}
                    className="w-full"
                    data-testid="slider-progress"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>0%</span>
                    <span className="font-medium">{progress[0]}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Confidence Level */}
              <div>
                <label className="block text-sm font-medium mb-2">Confidence Level</label>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setConfidenceLevel("green")}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                      confidenceLevel === "green"
                        ? "border-green-300 bg-green-100 text-green-800"
                        : "border-transparent bg-gray-100 text-gray-600 hover:border-green-300"
                    }`}
                    data-testid="button-confidence-green"
                  >
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>On Track</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfidenceLevel("amber")}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                      confidenceLevel === "amber"
                        ? "border-yellow-300 bg-yellow-100 text-yellow-800"
                        : "border-transparent bg-gray-100 text-gray-600 hover:border-yellow-300"
                    }`}
                    data-testid="button-confidence-amber"
                  >
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>At Risk</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfidenceLevel("red")}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                      confidenceLevel === "red"
                        ? "border-red-300 bg-red-100 text-red-800"
                        : "border-transparent bg-gray-100 text-gray-600 hover:border-red-300"
                    }`}
                    data-testid="button-confidence-red"
                  >
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Off Track</span>
                  </button>
                </div>
              </div>

              {/* Achievements */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  What have you achieved this week? *
                </label>
                <Textarea
                  value={achievements}
                  onChange={(e) => setAchievements(e.target.value)}
                  placeholder="Describe your progress, achievements, and any wins..."
                  rows={3}
                  data-testid="textarea-achievements"
                />
              </div>

              {/* Challenges (Optional) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Any challenges or roadblocks? (Optional)
                </label>
                <Textarea
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  placeholder="What obstacles did you face? How can you be supported?"
                  rows={2}
                  data-testid="textarea-challenges"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={createCheckInMutation.isPending || !achievements.trim()}
                  data-testid="button-submit-checkin"
                >
                  {createCheckInMutation.isPending ? "Submitting..." : "Submit Check-in"}
                </Button>
                <Button type="button" variant="outline" data-testid="button-save-draft">
                  Save Draft
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
