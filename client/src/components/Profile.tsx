import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Mail, Phone, User } from "lucide-react";
import type { Goal, DevelopmentPlan } from "@shared/schema";
// import ProgressRing from "./ProgressRing"; // TODO: Create or fix ProgressRing component

export default function Profile() {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Fetch real data for performance calculations
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    retry: false,
  });

  const { data: developmentPlans = [] } = useQuery<DevelopmentPlan[]>({
    queryKey: ["/api/development-plans"],
    retry: false,
  });

  const { data: recognitionStats } = useQuery({
    queryKey: ["/api/recognition-stats"],
    retry: false,
  });

  // Calculate real performance metrics
  const calculateGoalCompletion = () => {
    if (!goals.length) return 0;
    const completedGoals = goals.filter(goal => 
      goal.targetValue && goal.currentValue !== null && goal.currentValue >= goal.targetValue
    ).length;
    return Math.round((completedGoals / goals.length) * 100);
  };

  const calculateTrainingProgress = () => {
    if (!developmentPlans.length) return 0;
    const completedPlans = developmentPlans.filter(plan => 
      plan.status === 'completed'
    ).length;
    return Math.round((completedPlans / developmentPlans.length) * 100);
  };

  const goalCompletionPercentage = calculateGoalCompletion();
  const trainingProgressPercentage = calculateTrainingProgress();

  const handleSignOut = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary-foreground font-bold text-2xl">
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold" data-testid="text-user-name">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || "User"}
              </h3>
              <p className="text-muted-foreground" data-testid="text-user-role">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Team Member"}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-user-team">
                {user?.teamName ? `${user.teamName} •` : ""} Started {user?.startDate ? new Date(user.startDate).toLocaleDateString() : "Recently"}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Contact Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span data-testid="text-user-email">{user?.email || "No email provided"}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>Phone not provided</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Manager</h4>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Manager</p>
                  <p className="text-sm text-muted-foreground">Supervisor</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                {goals.length > 0 ? (
                  <span className="text-2xl font-bold text-green-600">{goalCompletionPercentage}%</span>
                ) : (
                  <span className="text-sm font-medium text-green-600">No Goals</span>
                )}
              </div>
              <p className="font-medium" data-testid="text-goal-completion">Goal Completion</p>
              <p className="text-xs text-muted-foreground">
                {goals.length > 0 ? `${goals.filter(g => g.targetValue && g.currentValue !== null && g.currentValue >= g.targetValue).length} of ${goals.length} goals` : "Set your first goal"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                {developmentPlans.length > 0 ? (
                  <span className="text-2xl font-bold text-blue-600">{trainingProgressPercentage}%</span>
                ) : (
                  <span className="text-sm font-medium text-blue-600">No Plans</span>
                )}
              </div>
              <p className="font-medium" data-testid="text-training-progress">Training Progress</p>
              <p className="text-xs text-muted-foreground">
                {developmentPlans.length > 0 ? `${developmentPlans.filter(p => p.status === 'completed').length} of ${developmentPlans.length} plans` : "Create development plan"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                {recognitionStats && (recognitionStats as any).received !== undefined ? (
                  <span className="text-2xl font-bold text-purple-600">{(recognitionStats as any).received || 0}</span>
                ) : (
                  <span className="text-sm font-medium text-purple-600">0</span>
                )}
              </div>
              <p className="font-medium" data-testid="text-quality-score">Kudos Received</p>
              <p className="text-xs text-muted-foreground">
                {recognitionStats && (recognitionStats as any).sent ? `${(recognitionStats as any).sent} sent` : "No recognition yet"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive email updates for goals and meetings</p>
              </div>
              <Switch 
                checked={emailNotifications} 
                onCheckedChange={setEmailNotifications}
                data-testid="switch-email-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Get notified about check-in reminders</p>
              </div>
              <Switch 
                checked={pushNotifications} 
                onCheckedChange={setPushNotifications}
                data-testid="switch-push-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Data Privacy</p>
                <p className="text-sm text-muted-foreground">Control how your data is shared</p>
              </div>
              <Button variant="ghost" size="sm" data-testid="button-manage-privacy">
                Manage
              </Button>
            </div>
          </div>

          <hr className="border-border my-6" />

          <Button 
            variant="destructive" 
            onClick={handleSignOut}
            data-testid="button-sign-out"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
