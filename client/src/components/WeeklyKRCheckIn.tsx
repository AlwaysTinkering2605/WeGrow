import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { TrendingUp, TrendingDown, Minus, Target, CheckCircle2 } from "lucide-react";

interface KeyResult {
  id: string;
  objectiveId: string;
  description: string;
  metricType: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  confidenceScore?: number;
  unit?: string;
  type: 'company' | 'team';
}

interface CheckInFormData {
  keyResultId: string;
  keyResultType: 'company' | 'team';
  previousValue: number;
  newValue: number;
  confidenceScore: number;
  achievements?: string;
  challenges?: string;
  weekOf: Date;
}

export default function WeeklyKRCheckIn() {
  const [selectedKRs, setSelectedKRs] = useState<Set<string>>(new Set());
  const [checkInData, setCheckInData] = useState<Map<string, Partial<CheckInFormData>>>(new Map());
  const [bulkAchievements, setBulkAchievements] = useState("");
  const [bulkChallenges, setBulkChallenges] = useState("");
  const [mode, setMode] = useState<'individual' | 'bulk'>('individual');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company key results
  const { data: companyObjectives = [] } = useQuery({
    queryKey: ['/api/company-objectives'],
  });

  // Fetch team key results
  const { data: teamObjectives = [] } = useQuery({
    queryKey: ['/api/team-objectives'],
  });

  // Flatten all key results from objectives
  const allKeyResults: KeyResult[] = [
    ...((companyObjectives as any[] || []).flatMap((obj: any) => 
      (obj.keyResults || []).map((kr: any) => ({ ...kr, type: 'company' as const }))
    )),
    ...((teamObjectives as any[] || []).flatMap((obj: any) => 
      (obj.keyResults || []).map((kr: any) => ({ ...kr, type: 'team' as const }))
    ))
  ];

  // Get completion stats
  const weekStart = getWeekStart();
  const { data: completionStats } = useQuery({
    queryKey: ['/api/kr-check-ins/stats/completion', weekStart.toISOString()],
    queryFn: async () => {
      const response = await fetch(`/api/kr-check-ins/stats/completion?weekOf=${weekStart.toISOString()}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  // Individual check-in mutation
  const createCheckInMutation = useMutation({
    mutationFn: async (data: CheckInFormData) => {
      await apiRequest("POST", "/api/kr-check-ins", {
        ...data,
        weekOf: data.weekOf.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kr-check-ins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/company-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/team-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kr-check-ins/stats/completion'] });
      toast({
        title: "Check-in submitted!",
        description: "Your KR progress has been recorded.",
      });
    },
    onError: handleError,
  });

  // Bulk check-in mutation
  const createBulkCheckInMutation = useMutation({
    mutationFn: async (checkIns: CheckInFormData[]) => {
      await apiRequest("POST", "/api/kr-check-ins/bulk", {
        checkIns: checkIns.map(ci => ({ ...ci, weekOf: ci.weekOf.toISOString() }))
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kr-check-ins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/company-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/team-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kr-check-ins/stats/completion'] });
      setSelectedKRs(new Set());
      setCheckInData(new Map());
      setBulkAchievements("");
      setBulkChallenges("");
      toast({
        title: "Bulk check-in submitted!",
        description: `Updated ${selectedKRs.size} key results.`,
      });
    },
    onError: handleError,
  });

  function handleError(error: Error) {
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
  }

  function getWeekStart(): Date {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  function toggleKRSelection(krId: string) {
    const newSelected = new Set(selectedKRs);
    if (newSelected.has(krId)) {
      newSelected.delete(krId);
      const newData = new Map(checkInData);
      newData.delete(krId);
      setCheckInData(newData);
    } else {
      newSelected.add(krId);
    }
    setSelectedKRs(newSelected);
  }

  function updateCheckInValue(krId: string, field: keyof CheckInFormData, value: any) {
    const newData = new Map(checkInData);
    const existing = newData.get(krId) || {};
    newData.set(krId, { ...existing, [field]: value });
    setCheckInData(newData);
  }

  function getConfidenceColor(score?: number): string {
    if (!score) return 'text-gray-400';
    if (score >= 8) return 'text-green-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getConfidenceLabel(score?: number): string {
    if (!score) return 'Not set';
    if (score >= 8) return 'On Track';
    if (score >= 5) return 'At Risk';
    return 'Off Track';
  }

  function handleIndividualSubmit(kr: KeyResult) {
    const data = checkInData.get(kr.id);
    if (!data?.newValue && data?.newValue !== 0) {
      toast({
        title: "Missing value",
        description: "Please enter a new value for the key result.",
        variant: "destructive",
      });
      return;
    }

    if (!data?.confidenceScore) {
      toast({
        title: "Missing confidence",
        description: "Please select a confidence level.",
        variant: "destructive",
      });
      return;
    }

    createCheckInMutation.mutate({
      keyResultId: kr.id,
      keyResultType: kr.type,
      previousValue: kr.currentValue || kr.startValue,
      newValue: data.newValue,
      confidenceScore: data.confidenceScore,
      achievements: data.achievements,
      challenges: data.challenges,
      weekOf: getWeekStart(),
    });
  }

  function handleBulkSubmit() {
    if (selectedKRs.size === 0) {
      toast({
        title: "No KRs selected",
        description: "Please select at least one key result.",
        variant: "destructive",
      });
      return;
    }

    const checkIns: CheckInFormData[] = [];
    let hasErrors = false;

    selectedKRs.forEach(krId => {
      const kr = allKeyResults.find(k => k.id === krId);
      const data = checkInData.get(krId);
      
      if (!kr || (!data?.newValue && data?.newValue !== 0) || !data?.confidenceScore) {
        hasErrors = true;
        return;
      }

      checkIns.push({
        keyResultId: kr.id,
        keyResultType: kr.type,
        previousValue: kr.currentValue || kr.startValue,
        newValue: data.newValue,
        confidenceScore: data.confidenceScore,
        achievements: bulkAchievements || data.achievements,
        challenges: bulkChallenges || data.challenges,
        weekOf: getWeekStart(),
      });
    });

    if (hasErrors) {
      toast({
        title: "Incomplete data",
        description: "Please fill in all required fields for selected KRs.",
        variant: "destructive",
      });
      return;
    }

    createBulkCheckInMutation.mutate(checkIns);
  }

  if (!allKeyResults || allKeyResults.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Weekly KR Check-in</h3>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No key results to check in on</p>
            <p className="text-sm">Key results will appear here once objectives are created</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Weekly KR Check-in</h3>
          <div className="flex items-center gap-2">
            {completionStats && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700" data-testid="badge-completion-stats">
                {(completionStats as any).completed}/{(completionStats as any).total} completed
              </Badge>
            )}
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={mode === 'individual' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('individual')}
                data-testid="button-mode-individual"
              >
                Individual
              </Button>
              <Button
                variant={mode === 'bulk' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('bulk')}
                data-testid="button-mode-bulk"
              >
                Bulk Update
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {mode === 'bulk' && selectedKRs.size > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-3">
              <h4 className="font-medium text-sm">Bulk Notes (optional)</h4>
              <Textarea
                value={bulkAchievements}
                onChange={(e) => setBulkAchievements(e.target.value)}
                placeholder="Achievements for all selected KRs..."
                rows={2}
                data-testid="textarea-bulk-achievements"
              />
              <Textarea
                value={bulkChallenges}
                onChange={(e) => setBulkChallenges(e.target.value)}
                placeholder="Challenges for all selected KRs..."
                rows={2}
                data-testid="textarea-bulk-challenges"
              />
            </div>
          )}

          {allKeyResults.map((kr) => {
            const isSelected = selectedKRs.has(kr.id);
            const data = checkInData.get(kr.id);

            return (
              <div
                key={kr.id}
                className={`p-4 border rounded-lg transition-colors ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                data-testid={`kr-checkin-card-${kr.id}`}
              >
                <div className="flex items-start gap-3">
                  {mode === 'bulk' && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleKRSelection(kr.id)}
                      className="mt-1"
                      data-testid={`checkbox-kr-${kr.id}`}
                    />
                  )}
                  
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{kr.description}</div>
                        <Badge variant="outline" className="ml-2">
                          {kr.type === 'company' ? 'Company' : 'Team'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Current: {kr.currentValue || kr.startValue} → Target: {kr.targetValue} {kr.unit || kr.metricType}
                      </div>
                      <div className={`text-sm mt-1 ${getConfidenceColor(kr.confidenceScore)}`}>
                        Confidence: {getConfidenceLabel(kr.confidenceScore)}
                      </div>
                    </div>

                    {(isSelected || mode === 'individual') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            New Value *
                          </label>
                          <Input
                            type="number"
                            value={data?.newValue ?? ''}
                            onChange={(e) => updateCheckInValue(kr.id, 'newValue', parseFloat(e.target.value))}
                            placeholder="Enter new value"
                            data-testid={`input-new-value-${kr.id}`}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Confidence (1-10) *
                          </label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                              <button
                                key={score}
                                type="button"
                                onClick={() => updateCheckInValue(kr.id, 'confidenceScore', score)}
                                className={`flex-1 py-1 text-xs rounded transition-colors ${
                                  data?.confidenceScore === score
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80'
                                }`}
                                data-testid={`button-confidence-${score}-${kr.id}`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>

                        {mode === 'individual' && (
                          <>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium mb-1">
                                Achievements
                              </label>
                              <Textarea
                                value={data?.achievements || ''}
                                onChange={(e) => updateCheckInValue(kr.id, 'achievements', e.target.value)}
                                placeholder="What progress was made this week?"
                                rows={2}
                                data-testid={`textarea-achievements-${kr.id}`}
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium mb-1">
                                Challenges
                              </label>
                              <Textarea
                                value={data?.challenges || ''}
                                onChange={(e) => updateCheckInValue(kr.id, 'challenges', e.target.value)}
                                placeholder="Any obstacles or issues?"
                                rows={2}
                                data-testid={`textarea-challenges-${kr.id}`}
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Button
                                onClick={() => handleIndividualSubmit(kr)}
                                disabled={createCheckInMutation.isPending}
                                data-testid={`button-submit-individual-${kr.id}`}
                              >
                                {createCheckInMutation.isPending ? 'Submitting...' : 'Submit Check-in'}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {mode === 'bulk' && selectedKRs.size > 0 && (
            <Button
              onClick={handleBulkSubmit}
              disabled={createBulkCheckInMutation.isPending}
              className="w-full"
              data-testid="button-submit-bulk"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {createBulkCheckInMutation.isPending ? 'Submitting...' : `Submit ${selectedKRs.size} Check-ins`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
