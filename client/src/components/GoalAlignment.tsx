import { Card, CardContent } from "@/components/ui/card";
import { Building, Users, User } from "lucide-react";

export default function GoalAlignment({ goals, objectives }: { goals: any[]; objectives: any[] }) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Goal Alignment</h3>
        <div className="space-y-6">
          {/* Company Level */}
          <div className="relative">
            <div className="bg-primary text-primary-foreground rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Building className="w-5 h-5" />
                <span className="font-medium">Company Objective</span>
              </div>
              {objectives.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-lg">{objectives[0].title}</h4>
                  <p className="text-sm text-primary-foreground/80">{objectives[0].description}</p>
                </div>
              ) : (
                <div>
                  <h4 className="font-semibold text-lg">Company Objectives</h4>
                  <p className="text-sm text-primary-foreground/80">No objectives set yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Team Level */}
          <div className="ml-6 relative">
            <div className="absolute -top-6 left-6 w-px h-6 bg-border"></div>
            <div className="bg-secondary text-secondary-foreground rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5" />
                <span className="font-medium">Team Objective</span>
              </div>
              <h4 className="font-semibold">Team Goals</h4>
              <p className="text-sm text-secondary-foreground/80">Team-level objectives will appear here</p>
            </div>
          </div>

          {/* Individual Level */}
          <div className="ml-12 relative">
            <div className="absolute -top-6 left-6 w-px h-6 bg-border"></div>
            <div className="bg-accent text-accent-foreground rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-5 h-5" />
                <span className="font-medium">My Objectives</span>
              </div>
              {goals.length > 0 ? (
                <div className="space-y-2">
                  {goals.slice(0, 3).map((goal) => (
                    <div key={goal.id}>
                      <h4 className="font-semibold">{goal.title}</h4>
                      <p className="text-sm text-accent-foreground/80">
                        Progress: {goal.currentValue} / {goal.targetValue} {goal.unit}
                      </p>
                    </div>
                  ))}
                  {goals.length > 3 && (
                    <p className="text-sm text-accent-foreground/80">
                      +{goals.length - 3} more goals
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <h4 className="font-semibold">No personal goals yet</h4>
                  <p className="text-sm text-accent-foreground/80">Create your first goal to see alignment</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
