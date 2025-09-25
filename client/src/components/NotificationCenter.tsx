import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  CheckCircle, 
  Circle, 
  Archive, 
  Trash2,
  Settings,
  AlertTriangle,
  Info,
  CheckSquare,
  Clock,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import NotificationPreferences from "./NotificationPreferences";

type NotificationType = 
  | "course_completion" | "learning_path_completion" | "quiz_passed" | "quiz_failed"
  | "certification_issued" | "certificate_expiring" | "training_due" | "training_overdue"
  | "competency_achieved" | "badge_awarded" | "enrollment_reminder" | "meeting_reminder"
  | "goal_deadline" | "development_plan_update" | "recognition_received" | "system_alert";

type NotificationPriority = "low" | "medium" | "high" | "urgent";

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  metadata?: any;
  isRead: boolean;
  readAt?: string;
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "course_completion":
    case "learning_path_completion":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "quiz_passed":
      return <CheckSquare className="w-4 h-4 text-green-500" />;
    case "quiz_failed":
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case "certification_issued":
    case "badge_awarded":
      return <Star className="w-4 h-4 text-yellow-500" />;
    case "certificate_expiring":
    case "training_due":
    case "training_overdue":
      return <Clock className="w-4 h-4 text-orange-500" />;
    case "system_alert":
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
};

const getPriorityColor = (priority: NotificationPriority) => {
  switch (priority) {
    case "urgent": return "border-l-red-500 bg-red-50 dark:bg-red-900/20";
    case "high": return "border-l-orange-500 bg-orange-50 dark:bg-orange-900/20";
    case "medium": return "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20";
    case "low": return "border-l-gray-500 bg-gray-50 dark:bg-gray-900/20";
    default: return "border-l-gray-500 bg-gray-50 dark:bg-gray-900/20";
  }
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onArchive }: NotificationItemProps) {
  const icon = getNotificationIcon(notification.type);
  const priorityColor = getPriorityColor(notification.priority);
  const [, setLocation] = useLocation();
  
  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      // Check if it's an internal route (starts with /)
      if (notification.actionUrl.startsWith('/')) {
        setLocation(notification.actionUrl);
      } else {
        // External URL - open in new tab for security
        window.open(notification.actionUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <div 
      className={`p-4 border-l-4 ${priorityColor} ${notification.isRead ? 'opacity-75' : ''} 
        ${notification.actionUrl ? 'cursor-pointer hover:bg-muted/50' : ''} transition-colors`}
      onClick={handleClick}
      data-testid={`notification-${notification.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-medium text-sm ${notification.isRead ? '' : 'font-semibold'}`}>
                {notification.title}
              </h4>
              {!notification.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
              <Badge variant="outline" className="text-xs">
                {notification.priority}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {notification.message}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </span>
              {notification.actionLabel && notification.actionUrl && (
                <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                  {notification.actionLabel}
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              data-testid={`button-mark-read-${notification.id}`}
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onArchive(notification.id);
            }}
            data-testid={`button-archive-${notification.id}`}
          >
            <Archive className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface NotificationCenterProps {
  onClose?: () => void;
}

export default function NotificationCenter({ onClose }: NotificationCenterProps) {
  const [activeTab, setActiveTab] = useState<"unread" | "all" | "archived">("unread");
  const [showPreferences, setShowPreferences] = useState(false);
  const { toast } = useToast();

  // Fetch notifications based on active tab
  const { data: notifications = [], isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', { 
      isRead: activeTab === "unread" ? false : undefined,
      isArchived: activeTab === "archived" ? true : false,
      limit: 50 
    }],
    retry: false,
  });

  // Fetch unread count for badge
  const { data: unreadCount = 0 } = useQuery<{count: number}, Error, number>({
    queryKey: ['/api/notifications/count/unread'],
    retry: false,
    refetchInterval: 30000, // Refresh every 30 seconds
    select: (data) => data.count
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiRequest(`/api/notifications/${notificationId}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count/unread'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiRequest(`/api/notifications/${notificationId}/archive`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count/unread'] });
      toast({
        title: "Notification archived",
        description: "Notification has been moved to archive",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive notification",
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest('/api/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count/unread'] });
      toast({
        title: "All notifications marked as read",
        description: "All unread notifications have been marked as read",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleArchive = (notificationId: string) => {
    archiveMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const filteredNotifications = notifications.filter((notification: Notification) => {
    switch (activeTab) {
      case "unread":
        return !notification.isRead && !notification.isArchived;
      case "archived":
        return notification.isArchived;
      case "all":
      default:
        return !notification.isArchived;
    }
  });

  return (
    <Card className="w-[min(96vw,24rem)] max-h-[600px] shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Notifications</CardTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-notification-settings">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <NotificationPreferences />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="unread" className="relative" data-testid="tab-unread">
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="archived" data-testid="tab-archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start gap-3 p-4">
                    <div className="w-4 h-4 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="w-3/4 h-4 bg-muted rounded" />
                      <div className="w-full h-3 bg-muted rounded" />
                      <div className="w-1/4 h-3 bg-muted rounded" />
                    </div>
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No notifications</h3>
              <p className="text-muted-foreground text-sm">
                {activeTab === "unread" && "You're all caught up! No unread notifications."}
                {activeTab === "archived" && "No archived notifications."}
                {activeTab === "all" && "No notifications yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification: Notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Export notification badge component
export function NotificationBadge() {
  const { data: unreadCount = 0 } = useQuery<{count: number}, Error, number>({
    queryKey: ['/api/notifications/count/unread'],
    retry: false,
    refetchInterval: 30000, // Refresh every 30 seconds
    select: (data) => data.count
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              data-testid="notification-badge"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-auto p-0" data-testid="notification-popover">
        <NotificationCenter />
      </PopoverContent>
    </Popover>
  );
}