import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Mail, Phone, User } from "lucide-react";
import ProgressRing from "./ProgressRing";

export default function Profile() {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

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
              <ProgressRing value={87} size={64} strokeWidth={4} className="mx-auto mb-2" />
              <p className="font-medium" data-testid="text-goal-completion">Goal Completion</p>
              <p className="text-xs text-muted-foreground">This Quarter</p>
            </div>

            <div className="text-center">
              <ProgressRing value={80} size={64} strokeWidth={4} className="mx-auto mb-2" color="blue" />
              <p className="font-medium" data-testid="text-training-progress">Training Progress</p>
              <p className="text-xs text-muted-foreground">Current Year</p>
            </div>

            <div className="text-center">
              <ProgressRing value={92} size={64} strokeWidth={4} className="mx-auto mb-2" color="purple" />
              <p className="font-medium" data-testid="text-quality-score">Quality Score</p>
              <p className="text-xs text-muted-foreground">Last 30 Days</p>
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
