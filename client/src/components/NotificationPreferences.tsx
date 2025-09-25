import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  Webhook,
  CheckCircle,
  AlertTriangle,
  Star,
  Clock,
  Info,
  Target,
  BookOpen,
  Users,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type NotificationType = 
  | "course_completion" | "learning_path_completion" | "quiz_passed" | "quiz_failed"
  | "certification_issued" | "certificate_expiring" | "training_due" | "training_overdue"
  | "competency_achieved" | "badge_awarded" | "enrollment_reminder" | "meeting_reminder"
  | "goal_deadline" | "development_plan_update" | "recognition_received" | "system_alert";

interface NotificationPreference {
  id: string;
  userId: string;
  notificationType: NotificationType;
  inAppEnabled: boolean;
  webhookEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationTypeLabels: Record<NotificationType, { 
  label: string; 
  description: string; 
  icon: any; 
  category: string;
}> = {
  "course_completion": {
    label: "Course Completions",
    description: "When you complete a course or training module",
    icon: CheckCircle,
    category: "Learning"
  },
  "learning_path_completion": {
    label: "Learning Path Completions", 
    description: "When you complete an entire learning path",
    icon: CheckCircle,
    category: "Learning"
  },
  "quiz_passed": {
    label: "Quiz Passed",
    description: "When you successfully pass a quiz or assessment",
    icon: CheckCircle,
    category: "Learning"
  },
  "quiz_failed": {
    label: "Quiz Failed",
    description: "When you don't pass a quiz (for retake reminders)",
    icon: AlertTriangle,
    category: "Learning"
  },
  "certification_issued": {
    label: "Certifications Issued",
    description: "When you receive a new certification",
    icon: Star,
    category: "Achievements"
  },
  "certificate_expiring": {
    label: "Certificate Expiring",
    description: "When your certificates are about to expire",
    icon: Clock,
    category: "Reminders"
  },
  "training_due": {
    label: "Training Due",
    description: "When training assignments are approaching their due date",
    icon: Clock,
    category: "Reminders"
  },
  "training_overdue": {
    label: "Training Overdue",
    description: "When training assignments are past their due date",
    icon: AlertTriangle,
    category: "Reminders"
  },
  "competency_achieved": {
    label: "Competency Achieved",
    description: "When you achieve or improve a competency level",
    icon: Star,
    category: "Achievements"
  },
  "badge_awarded": {
    label: "Badges Awarded",
    description: "When you earn a new badge or achievement",
    icon: Star,
    category: "Achievements"
  },
  "enrollment_reminder": {
    label: "Enrollment Reminders",
    description: "Reminders about courses you're enrolled in",
    icon: Info,
    category: "Reminders"
  },
  "meeting_reminder": {
    label: "Meeting Reminders",
    description: "Reminders for upcoming 1-on-1 meetings",
    icon: Users,
    category: "Meetings"
  },
  "goal_deadline": {
    label: "Goal Deadlines",
    description: "When your personal goals are approaching deadlines",
    icon: Target,
    category: "Goals"
  },
  "development_plan_update": {
    label: "Development Plan Updates",
    description: "Updates and reminders about your development plans",
    icon: BookOpen,
    category: "Development"
  },
  "recognition_received": {
    label: "Recognition Received",
    description: "When you receive kudos or recognition from teammates",
    icon: Star,
    category: "Recognition"
  },
  "system_alert": {
    label: "System Alerts",
    description: "Important system notifications and announcements",
    icon: AlertTriangle,
    category: "System"
  }
};

const categoryIcons: Record<string, any> = {
  "Learning": BookOpen,
  "Achievements": Star,
  "Reminders": Clock,
  "Meetings": Users,
  "Goals": Target,
  "Development": BookOpen,
  "Recognition": Star,
  "System": Settings
};

export default function NotificationPreferences() {
  const { toast } = useToast();

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['/api/notifications/preferences'],
    retry: false,
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: ({ 
      notificationType, 
      inAppEnabled, 
      webhookEnabled 
    }: { 
      notificationType: NotificationType; 
      inAppEnabled?: boolean; 
      webhookEnabled?: boolean; 
    }) => 
      apiRequest(`/api/notifications/preferences/${notificationType}`, { 
        method: 'PATCH',
        body: JSON.stringify({ inAppEnabled, webhookEnabled })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (
    notificationType: NotificationType, 
    type: 'inApp' | 'webhook', 
    enabled: boolean
  ) => {
    const updates = type === 'inApp' 
      ? { inAppEnabled: enabled }
      : { webhookEnabled: enabled };
    
    updatePreferenceMutation.mutate({
      notificationType,
      ...updates
    });
  };

  // Group preferences by category
  const groupedPreferences = Object.entries(notificationTypeLabels).reduce((acc, [type, config]) => {
    const category = config.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    
    const preference = preferences.find((p: NotificationPreference) => p.notificationType === type);
    acc[category].push({
      type: type as NotificationType,
      config,
      preference: preference || {
        notificationType: type,
        inAppEnabled: true,
        webhookEnabled: false
      }
    });
    
    return acc;
  }, {} as Record<string, any[]>);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="w-48 h-6 bg-muted rounded animate-pulse" />
            <div className="w-96 h-4 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-muted rounded" />
                  <div>
                    <div className="w-32 h-4 bg-muted rounded mb-1" />
                    <div className="w-48 h-3 bg-muted rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-6 bg-muted rounded" />
                  <div className="w-10 h-6 bg-muted rounded" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
          <p className="text-muted-foreground">
            Choose how you want to receive notifications for different events and activities.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedPreferences).map(([category, items]) => {
              const CategoryIcon = categoryIcons[category] || Info;
              
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      {category}
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    {items.map(({ type, config, preference }) => {
                      const Icon = config.icon;
                      
                      return (
                        <div 
                          key={type}
                          className="flex items-center justify-between p-4 border rounded-lg"
                          data-testid={`preference-${type}`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <Label className="font-medium">{config.label}</Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {config.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor={`${type}-in-app`} className="text-sm">
                                In-App
                              </Label>
                              <Switch
                                id={`${type}-in-app`}
                                checked={preference.inAppEnabled}
                                onCheckedChange={(checked) => handleToggle(type, 'inApp', checked)}
                                disabled={updatePreferenceMutation.isPending}
                                data-testid={`switch-${type}-in-app`}
                              />
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Webhook className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor={`${type}-webhook`} className="text-sm">
                                Webhook
                              </Label>
                              <Switch
                                id={`${type}-webhook`}
                                checked={preference.webhookEnabled}
                                onCheckedChange={(checked) => handleToggle(type, 'webhook', checked)}
                                disabled={updatePreferenceMutation.isPending}
                                data-testid={`switch-${type}-webhook`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {category !== "System" && <Separator className="mt-6" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 mt-0.5" />
            <p>
              <strong>In-App:</strong> Notifications appear in your notification center and show badges on the bell icon.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Webhook className="w-4 h-4 mt-0.5" />
            <p>
              <strong>Webhook:</strong> External notifications sent to configured workflows (SMS, email, etc.) via n8n automation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}