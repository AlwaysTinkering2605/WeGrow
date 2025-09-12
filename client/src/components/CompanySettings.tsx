import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  Users, 
  Target,
  Bell,
  Shield,
  AlertCircle,
  Save
} from "lucide-react";

export default function CompanySettings() {
  const { user } = useAuth();

  if (user?.role !== 'leadership') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">Only leadership can access company settings and configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Company Settings</h1>
        <p className="text-muted-foreground">Configure company-wide policies and objectives</p>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Company Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company-name">Company Name</Label>
              <Input id="company-name" defaultValue="Apex Cleaning Services" data-testid="input-company-name" />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" defaultValue="Commercial Cleaning" data-testid="input-industry" />
            </div>
          </div>
          
          <div>
            <Label htmlFor="mission">Mission Statement</Label>
            <Textarea 
              id="mission" 
              defaultValue="To provide exceptional commercial cleaning services while fostering employee growth and development."
              data-testid="textarea-mission"
            />
          </div>
          
          <div>
            <Label htmlFor="values">Company Values</Label>
            <Textarea 
              id="values" 
              defaultValue="Excellence, Teamwork, Innovation, Reliability"
              data-testid="textarea-values"
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Performance & Goals</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Automatic Goal Reminders</Label>
              <p className="text-sm text-muted-foreground">Send reminders when goals are approaching deadlines</p>
            </div>
            <Switch defaultChecked data-testid="switch-goal-reminders" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Weekly Check-in Reminders</Label>
              <p className="text-sm text-muted-foreground">Remind employees to complete weekly check-ins</p>
            </div>
            <Switch defaultChecked data-testid="switch-checkin-reminders" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Public Recognition Feed</Label>
              <p className="text-sm text-muted-foreground">Allow employees to see public recognition across the company</p>
            </div>
            <Switch defaultChecked data-testid="switch-public-recognition" />
          </div>
        </CardContent>
      </Card>

      {/* Team Management Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Team Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="check-in-frequency">Check-in Frequency</Label>
              <Input id="check-in-frequency" defaultValue="Weekly" data-testid="input-checkin-frequency" />
            </div>
            <div>
              <Label htmlFor="goal-review-cycle">Goal Review Cycle</Label>
              <Input id="goal-review-cycle" defaultValue="Quarterly" data-testid="input-goal-review-cycle" />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Manager Approval Required</Label>
              <p className="text-sm text-muted-foreground">Require manager approval for goal creation and updates</p>
            </div>
            <Switch data-testid="switch-manager-approval" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Cross-Department Recognition</Label>
              <p className="text-sm text-muted-foreground">Allow recognition between different departments</p>
            </div>
            <Switch defaultChecked data-testid="switch-cross-department" />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Send email notifications for important updates</p>
            </div>
            <Switch defaultChecked data-testid="switch-email-notifications" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Real-time Dashboard Updates</Label>
              <p className="text-sm text-muted-foreground">Update dashboards in real-time as data changes</p>
            </div>
            <Switch defaultChecked data-testid="switch-realtime-updates" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Manager Escalation Alerts</Label>
              <p className="text-sm text-muted-foreground">Alert managers when team members need attention</p>
            </div>
            <Switch defaultChecked data-testid="switch-escalation-alerts" />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Security & Privacy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Require 2FA for leadership and supervisor accounts</p>
            </div>
            <Switch data-testid="switch-2fa-required" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Data Export Restrictions</Label>
              <p className="text-sm text-muted-foreground">Restrict data export to authorized users only</p>
            </div>
            <Switch defaultChecked data-testid="switch-export-restrictions" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Anonymous Recognition</Label>
              <p className="text-sm text-muted-foreground">Allow anonymous recognition submissions</p>
            </div>
            <Switch data-testid="switch-anonymous-recognition" />
          </div>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end">
        <Button className="flex items-center space-x-2" data-testid="button-save-settings">
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </Button>
      </div>
    </div>
  );
}