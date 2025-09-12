import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Award, ExternalLink, Play } from "lucide-react";

export default function Development() {
  const { data: developmentPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/development-plans"],
    retry: false,
  });

  const { data: userCompetencies, isLoading: competenciesLoading } = useQuery({
    queryKey: ["/api/user-competencies"],
    retry: false,
  });

  const { data: learningResources, isLoading: resourcesLoading } = useQuery({
    queryKey: ["/api/learning-resources"],
    retry: false,
  });

  if (plansLoading || competenciesLoading || resourcesLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
            <div className="w-48 h-6 bg-muted rounded mb-4"></div>
            <div className="space-y-4">
              <div className="w-full h-16 bg-muted rounded"></div>
              <div className="w-full h-16 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Personal Development Plan */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">My Development Plan</h3>
          
          <div className="space-y-4">
            {!(developmentPlans as any[]) || (developmentPlans as any[]).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No development plans yet</p>
                <p className="text-sm">Start your learning journey by creating your first development plan</p>
              </div>
            ) : (
              (developmentPlans as any[]).map((plan: any) => (
                <div key={plan.id} className="border border-border rounded-lg p-4" data-testid={`development-plan-${plan.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{plan.title}</h4>
                    <Badge 
                      variant={plan.status === 'completed' ? 'default' : plan.status === 'in_progress' ? 'secondary' : 'outline'}
                      className={
                        plan.status === 'completed' ? 'bg-green-100 text-green-800' :
                        plan.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }
                    >
                      {plan.status === 'completed' ? 'Completed' :
                       plan.status === 'in_progress' ? 'In Progress' : 'On Hold'}
                    </Badge>
                  </div>
                  
                  {plan.targetDate && (
                    <p className="text-sm text-muted-foreground mb-3">
                      Target: {new Date(plan.targetDate).toLocaleDateString()}
                    </p>
                  )}
                  
                  <Progress value={plan.progress || 0} className="mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">
                    {plan.progress || 0}% completed
                  </p>
                  
                  <div className="flex space-x-2">
                    <Button size="sm" data-testid={`button-continue-${plan.id}`}>
                      <Play className="w-4 h-4 mr-1" />
                      {plan.status === 'completed' ? 'View Progress' : 'Continue Learning'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Competency Assessment */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Competency Assessment</h3>
          
          {!(userCompetencies as any[]) || (userCompetencies as any[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No competency assessments yet</p>
              <p className="text-sm">Complete your first assessment to track your skills development</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {(userCompetencies as any[]).map((competency: any, index: number) => (
                <div key={competency.id} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`competency-${index}`}>
                  <span className="font-medium">{competency.competency?.name || `Competency ${index + 1}`}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-background rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${competency.currentLevel >= 90 ? 'bg-green-500' : competency.currentLevel >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${competency.currentLevel || 0}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-medium ${competency.currentLevel >= 90 ? 'text-green-600' : competency.currentLevel >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {competency.currentLevel || 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Hub */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Available Training</h3>
          
          {!(learningResources as any[]) || (learningResources as any[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No learning resources available</p>
              <p className="text-sm">Check back later for new training opportunities</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(learningResources as any[]).map((resource: any) => (
                <div key={resource.id} className="border border-border rounded-lg p-4" data-testid={`learning-resource-${resource.id}`}>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                    {resource.type === 'video' ? (
                      <Play className="w-6 h-6 text-blue-600" />
                    ) : resource.type === 'external_link' ? (
                      <ExternalLink className="w-6 h-6 text-blue-600" />
                    ) : (
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <h4 className="font-medium mb-2">{resource.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{resource.description}</p>
                  <div className="flex items-center justify-between">
                    {resource.duration && (
                      <span className="text-xs text-muted-foreground">
                        {Math.floor(resource.duration / 60)}h {resource.duration % 60}m
                      </span>
                    )}
                    <Button size="sm" data-testid={`button-start-resource-${resource.id}`}>
                      Start
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
